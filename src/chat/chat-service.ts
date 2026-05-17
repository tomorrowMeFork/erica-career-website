import { randomUUID } from "node:crypto";

import {
  appendChatAuditRecord,
  hashQuery,
  type ChatAuditRecord,
} from "../audit/audit-log.js";
import type { PreferenceState } from "../personalization/preference-contract.js";
import type { Retriever } from "../retrieval/retriever.js";
import { ChatRequestSchema, type ChatResponse } from "./chat-contract.js";
import {
  buildHardRefusalAnswer,
  DEFAULT_EVIDENCE_POLICY,
  evaluateEvidence,
  type EvidencePolicyConfig,
} from "./evidence-policy.js";
import { evaluateInputSafety } from "./input-safety-policy.js";
import { validateChatResponseOutput } from "./output-validation.js";
import { buildChatPrompt, PROMPT_VERSION, type ExplicitPreferencePromptContext } from "./prompt.js";
import type { ChatModelProvider } from "./provider.js";
import { buildPolicyRefusalAnswer, normalizeSafetyText, redactSensitiveText } from "./safety-policy.js";
import { sanitizeRetrievedResultsForPrompt } from "./source-safety-policy.js";

export type ChatAuditLogger = (record: ChatAuditRecord) => Promise<void>;

export type ChatServiceAskInput = {
  query: string;
  top_k?: number;
  session_key?: string;
};

export type ChatPreferenceReader = {
  readState(sessionKey: string): Promise<PreferenceState>;
};

export type ChatServiceOptions = {
  retriever: Retriever;
  provider: ChatModelProvider;
  auditLogger?: ChatAuditLogger;
  auditLogPath?: string;
  promptVersion?: string;
  preferenceService?: ChatPreferenceReader;
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
  private readonly preferenceService: ChatPreferenceReader | undefined;
  private readonly clock: () => Date;
  private readonly traceIdGenerator: () => string;
  private readonly evidencePolicyConfig: EvidencePolicyConfig;

  constructor(options: ChatServiceOptions) {
    this.retriever = options.retriever;
    this.provider = options.provider;
    this.promptVersion = options.promptVersion ?? PROMPT_VERSION;
    this.preferenceService = options.preferenceService;
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
    const inputSafety = evaluateInputSafety(request.query);
    const baseGuardrails: ChatAuditRecord["guardrail_results"] = {
      context_isolation: true,
      input_sanitized: true,
      input_safety_policy_version: inputSafety.policy_version,
      input_safety_action: inputSafety.action,
      input_safety_categories: inputSafety.categories,
    };
    const queryHashInput = inputSafety.action === "allow" ? request.query : buildRedactedNormalizedQuery(request.query);

    if (inputSafety.action === "refuse") {
      const response = this.buildPolicyRefusalResponse(traceId);
      await this.writeAudit({
        traceId,
        timestamp,
        queryHashInput,
        results: [],
        refusalTier: response.refusal_tier,
        citationIds: [],
        guardrailResults: { ...baseGuardrails, output_validation: "skipped_input_refusal" },
        responseTimestamp: this.nowIso(),
        promptSnapshotReason: "refusal",
      });
      return response;
    }

    const safeQuery = inputSafety.action === "redact" ? inputSafety.redacted_query : request.query;
    const retrievedResults = await this.retriever.retrieve({ query: safeQuery, topK: request.top_k });
    const sourceSafety = sanitizeRetrievedResultsForPrompt(retrievedResults);
    const results = sourceSafety.results;
    const evidence = evaluateEvidence(results, { config: this.evidencePolicyConfig });
    const safetyGuardrails: ChatAuditRecord["guardrail_results"] = {
      ...baseGuardrails,
      evidence_policy: evidence.refusal_tier,
      source_safety_action: sourceSafety.action,
      source_safety_categories: sourceSafety.categories,
      source_safety_unsafe_chunk_ids: sourceSafety.unsafe_chunk_ids,
    };

    if (evidence.refusal_tier === "hard_refuse") {
      const response = this.buildRefusalResponse(traceId, evidence.confidence);
      await this.writeAudit({
        traceId,
        timestamp,
        queryHashInput,
        results,
        refusalTier: response.refusal_tier,
        citationIds: [],
        guardrailResults: { ...safetyGuardrails, output_validation: "skipped_hard_refusal" },
        responseTimestamp: this.nowIso(),
        promptSnapshotReason: "refusal",
      });
      return response;
    }

    const explicitPreferences = await this.resolveExplicitPreferences(request.session_key);
    const builtPrompt = buildChatPrompt({
      query: safeQuery,
      results,
      refusal_tier: evidence.refusal_tier,
      ...(explicitPreferences !== undefined ? { explicit_preferences: explicitPreferences } : {}),
    });
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
        citationMap: builtPrompt.citationMap,
        expectedTier: evidence.refusal_tier,
      });

      if (validation.ok) {
        await this.writeAudit({
          traceId,
          timestamp,
          queryHashInput,
          results,
          refusalTier: validation.response.refusal_tier,
          citationIds: validation.response.citations.map((citation) => citation.citation_id),
          guardrailResults: { ...safetyGuardrails, ...builtPrompt.guardrails, output_validation: "passed" },
          responseTimestamp: this.nowIso(),
        });
        return validation.response;
      }

      const response = this.buildRefusalResponse(traceId, 0);
      await this.writeAudit({
        traceId,
        timestamp,
        queryHashInput,
        results,
        refusalTier: response.refusal_tier,
        citationIds: [],
        guardrailResults: {
          ...safetyGuardrails,
          ...builtPrompt.guardrails,
          output_validation: "failed",
          output_validation_failures: validation.failures,
        },
        responseTimestamp: this.nowIso(),
        promptSnapshotReason: "guardrail",
      });
      return response;
    } catch (error) {
      const response = this.buildRefusalResponse(traceId, 0);
      await this.writeAudit({
        traceId,
        timestamp,
        queryHashInput,
        results,
        refusalTier: response.refusal_tier,
        citationIds: [],
        guardrailResults: {
          ...safetyGuardrails,
          ...builtPrompt.guardrails,
          output_validation: "failed",
          provider_error: summarizeUnknownError(error),
        },
        responseTimestamp: this.nowIso(),
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

  private buildPolicyRefusalResponse(traceId: string): ChatResponse {
    return {
      answer: buildPolicyRefusalAnswer(),
      citations: [],
      refusal_tier: "hard_refuse",
      confidence: 0,
      trace_id: traceId,
    };
  }

  private async writeAudit(input: {
    traceId: string;
    timestamp: string;
    queryHashInput: string;
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
      query_hash: hashQuery(input.queryHashInput),
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

  private async resolveExplicitPreferences(sessionKey: string | undefined): Promise<ExplicitPreferencePromptContext | undefined> {
    if (sessionKey === undefined || this.preferenceService === undefined) return undefined;
    const state = await this.preferenceService.readState(sessionKey);
    if (!state.preference_ranking_enabled || state.profile === null) return undefined;
    return {
      major: state.profile.major,
      target_role: state.profile.target_role,
    };
  }
}

function buildRedactedNormalizedQuery(query: string): string {
  return redactSensitiveText(normalizeSafetyText(query));
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
  } catch {
    return undefined;
  }
}

function summarizeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 200);
  }
  return String(error).slice(0, 200);
}
