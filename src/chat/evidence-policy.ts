import type { RefusalTier } from "./chat-contract.js";
import type { RetrievedChunk } from "../retrieval/retriever.js";

export type EvidencePolicyConfig = {
  hard_refuse_below: number;
  soft_hedge_through: number;
  soft_hedge_prefix: string;
};

export const DEFAULT_EVIDENCE_POLICY: EvidencePolicyConfig = {
  hard_refuse_below: 0.30,
  soft_hedge_through: 0.50,
  soft_hedge_prefix: "현재 수집된 자료 기준으로는",
};

export type EvidenceEvaluation = {
  refusal_tier: RefusalTier;
  confidence: number;
  reasons: string[];
  soft_hedge_prefix?: string;
};

export type EvaluateEvidenceOptions = {
  boilerplateOnlyChunkIds?: ReadonlySet<string>;
  config?: EvidencePolicyConfig;
};

export function evaluateEvidence(
  results: readonly RetrievedChunk[],
  options: EvaluateEvidenceOptions = {},
): EvidenceEvaluation {
  const config = options.config ?? DEFAULT_EVIDENCE_POLICY;
  const reasons: string[] = [];

  if (results.length === 0) {
    return { refusal_tier: "hard_refuse", confidence: 0, reasons: ["zero_chunks"] };
  }

  const topConfidence = clampConfidence(results[0]?.normalized_score ?? 0);
  const boilerplateOnlyChunkIds = options.boilerplateOnlyChunkIds ?? new Set<string>();
  const everyResultIsBoilerplateOnly = results.every((result) => boilerplateOnlyChunkIds.has(result.chunk.chunk_id));
  const hasMissingCitationAnchors = results.some((result) => result.chunk.citation_anchors.length === 0);

  if (everyResultIsBoilerplateOnly) {
    reasons.push("boilerplate_only_results");
  }

  if (hasMissingCitationAnchors) {
    reasons.push("missing_citation_anchors");
  }

  if (topConfidence < config.hard_refuse_below) {
    reasons.push("below_hard_refuse_threshold");
  }

  if (reasons.length > 0) {
    return { refusal_tier: "hard_refuse", confidence: topConfidence, reasons };
  }

  if (topConfidence <= config.soft_hedge_through) {
    return {
      refusal_tier: "soft_hedge",
      confidence: topConfidence,
      reasons: ["within_soft_hedge_threshold"],
      soft_hedge_prefix: config.soft_hedge_prefix,
    };
  }

  return { refusal_tier: "normal_answer", confidence: topConfidence, reasons: ["above_soft_hedge_threshold"] };
}

export function buildHardRefusalAnswer(): string {
  return "현재 수집된 자료만으로는 답변을 뒷받침할 충분한 근거를 찾지 못했습니다. 공식 페이지를 확인하거나 더 구체적으로 질문해 주세요.";
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
