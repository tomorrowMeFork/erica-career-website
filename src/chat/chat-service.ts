import { randomUUID } from "node:crypto";

import {
  appendChatAuditRecord,
  hashQuery,
  type ChatAuditRecord,
} from "../audit/audit-log.js";
import type { Retriever } from "../retrieval/retriever.js";
import { ChatRequestSchema, type ChatResponse } from "./chat-contract.js";
import {
  buildHardRefusalAnswer,
  DEFAULT_EVIDENCE_POLICY,
  evaluateEvidence,
  type EvidencePolicyConfig,
} from "./evidence-policy.js";
import { buildChatPrompt, PROMPT_VERSION, sanitizePromptText } from "./prompt.js";
import type { ChatModelProvider } from "./provider.js";
import { validateChatResponseOutput } from "./output-validation.js";

export type ChatAuditLogger = (record: ChatAuditRecord) => Promise<void>;

export type ChatServiceAskInput = {
  query: string;
  top_k?: number;
};

export type ChatServiceOptions = {
  retriever: Retriever;
  provider: ChatModelProvider;
  auditLogger?: ChatAuditLogger;
  auditLogPath?: string;
  promptVersion?: string;
  clock?: () => Date;
  traceIdGenerator?: () => string;
  evidencePolicyConfig?: EvidencePolicyConfig;
};

const DEFAULT_AUDIT_LOG_PATH = "data/audit/chat-audit.jsonl";

export class ChatService {
  private readonly retriever: Retriever;
  private readonly provider: ChatModelProvider;
  private readonly auditLogger: ChatAuditLogger;
  private readonly promptVersion: string;
  private readonly clock: () => Date;
  private readonly traceIdGenerator: () => string;
  private readonly evidencePolicyConfig: EvidencePolicyConfig;

  constructor(options: ChatServiceOptions) {
    this.retriever = options.retriever;
    this.provider = options.provider;
    this.promptVersion = options.promptVersion ?? PROMPT_VERSION;
    this.clock = options.clock ?? (() => new Date());
    this.traceIdGenerator = options.traceIdGenerator ?? randomUUID;
    this.evidencePolicyConfig = options.evidencePolicyConfig ?? DEFAULT_EVIDENCE_POLICY;
    this.auditLogger =
      options.auditLogger ??
      ((record) => appendChatAuditRecord(options.auditLogPath ?? DEFAULT_AUDIT_LOG_PATH, record));
  }

  async ask(input: ChatServiceAskInput): Promise<ChatResponse> {
    const request = ChatRequestSchema.parse(input);
    const traceId = this.traceIdGenerator();
    const timestamp = this.nowIso();
    const results = await this.retriever.retrieve({ query: request.query, topK: request.top_k });
    const evidence = evaluateEvidence(results, { config: this.evidencePolicyConfig });
    const baseGuardrails: ChatAuditRecord["guardrail_results"] = {
      evidence_policy: evidence.refusal_tier,
      context_isolation: true,
      input_sanitized: true,
    };

    if (evidence.refusal_tier === "hard_refuse") {
      const response = this.buildRefusalResponse(traceId, evidence.confidence);
      await this.writeAudit({
        traceId,
        timestamp,
        query: request.query,
        results,
        refusalTier: response.refusal_tier,
        citationIds: [],
        guardrailResults: { ...baseGuardrails, output_validation: "skipped_hard_refusal" },
        responseTimestamp: this.nowIso(),
        promptSnapshot: limitedPromptSnapshot(request.query),
        promptSnapshotReason: "refusal",
      });
      return response;
    }

    const builtPrompt = buildChatPrompt({ query: request.query, results, refusal_tier: evidence.refusal_tier });
    const allowedCitationIds = builtPrompt.citationMap.map((citation) => citation.citation_id);

    try {
      const providerResponse = await this.provider.complete({ messages: builtPrompt.messages });
      const candidate = candidateFromProviderContent(providerResponse.content, {
        traceId,
        citations: builtPrompt.citationMap,
        refusalTier: evidence.refusal_tier,
        confidence: evidence.confidence,
      });
      const validation = validateChatResponseOutput({
        response: candidate,
        allowedCitationIds,
        expectedTier: evidence.refusal_tier,
      });

      if (validation.ok) {
        await this.writeAudit({
          traceId,
          timestamp,
          query: request.query,
          results,
          refusalTier: validation.response.refusal_tier,
          citationIds: validation.response.citations.map((citation) => citation.citation_id),
          guardrailResults: { ...baseGuardrails, ...builtPrompt.guardrails, output_validation: "passed" },
          responseTimestamp: this.nowIso(),
        });
        return validation.response;
      }

      const response = this.buildRefusalResponse(traceId, 0);
      await this.writeAudit({
        traceId,
        timestamp,
        query: request.query,
        results,
        refusalTier: response.refusal_tier,
        citationIds: [],
        guardrailResults: {
          ...baseGuardrails,
          ...builtPrompt.guardrails,
          output_validation: "failed",
          output_validation_failures: validation.failures,
        },
        responseTimestamp: this.nowIso(),
        promptSnapshot: limitedPromptSnapshot(request.query),
        promptSnapshotReason: "guardrail",
      });
      return response;
    } catch (error) {
      const response = this.buildRefusalResponse(traceId, 0);
      await this.writeAudit({
        traceId,
        timestamp,
        query: request.query,
        results,
        refusalTier: response.refusal_tier,
        citationIds: [],
        guardrailResults: {
          ...baseGuardrails,
          ...builtPrompt.guardrails,
          output_validation: "failed",
          provider_error: summarizeUnknownError(error),
        },
        responseTimestamp: this.nowIso(),
        promptSnapshot: limitedPromptSnapshot(request.query),
        promptSnapshotReason: "failure",
      });
      return response;
    }
  }

  private buildRefusalResponse(traceId: string, confidence: number): ChatResponse {
    return {
      answer: buildHardRefusalAnswer(),
      citations: [],
      refusal_tier: "hard_refuse",
      confidence,
      trace_id: traceId,
    };
  }

  private async writeAudit(input: {
    traceId: string;
    timestamp: string;
    query: string;
    results: Awaited<ReturnType<Retriever["retrieve"]>>;
    refusalTier: ChatAuditRecord["refusal_tier"];
    citationIds: number[];
    guardrailResults: ChatAuditRecord["guardrail_results"];
    responseTimestamp: string;
    promptSnapshot?: string;
    promptSnapshotReason?: ChatAuditRecord["prompt_snapshot_reason"];
  }): Promise<void> {
    await this.auditLogger({
      trace_id: input.traceId,
      timestamp: input.timestamp,
      query_hash: hashQuery(input.query),
      retrieved_chunks: input.results.map((result) => ({
        chunk_id: result.chunk.chunk_id,
        record_id: result.chunk.record_id,
        source_id: result.chunk.source_id,
        score: result.score,
        normalized_score: result.normalized_score,
      })),
      refusal_tier: input.refusalTier,
      model_config: this.provider.getSafeConfig(),
      prompt_version: this.promptVersion,
      citation_ids: input.citationIds,
      guardrail_results: input.guardrailResults,
      response_timestamp: input.responseTimestamp,
      ...(input.promptSnapshot !== undefined ? { prompt_snapshot: input.promptSnapshot } : {}),
      ...(input.promptSnapshotReason !== undefined ? { prompt_snapshot_reason: input.promptSnapshotReason } : {}),
    });
  }

  private nowIso(): string {
    return this.clock().toISOString();
  }
}

function candidateFromProviderContent(
  content: string,
  fallback: { traceId: string; citations: ChatResponse["citations"]; refusalTier: ChatResponse["refusal_tier"]; confidence: number },
): ChatResponse | Record<string, unknown> {
  const parsed = parseJsonObject(content);
  if (parsed !== undefined) {
    return { ...parsed, trace_id: fallback.traceId };
  }

  return {
    answer: content,
    citations: fallback.citations,
    refusal_tier: fallback.refusalTier,
    confidence: fallback.confidence,
    trace_id: fallback.traceId,
  };
}

function parseJsonObject(content: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
}

function limitedPromptSnapshot(query: string): string {
  return sanitizePromptText(`사용자 질문: ${query}`).slice(0, 500);
}

function summarizeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 200);
  }
  return String(error).slice(0, 200);
}
