import { describe, expect, it } from "vitest";

import { DEFAULT_EVIDENCE_POLICY, buildHardRefusalAnswer, evaluateEvidence } from "./evidence-policy.js";
import type { KnowledgeChunk } from "../ingestion/normalized-record.js";
import type { RetrievedChunk } from "../retrieval/retriever.js";

const baseChunk: KnowledgeChunk = {
  chunk_id: "chunk-1",
  record_id: "record-1",
  source_id: "source-1",
  source_name: "한양대학교 ERICA 커리어개발센터",
  source_url: "https://cdp.hanyang.ac.kr/job/notice",
  canonical_url: "https://cdp.hanyang.ac.kr/job/notice",
  title: "ERICA 취업 상담 안내",
  category: "career-service",
  fetched_at: "2026-05-03T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active",
  deadline_raw_text: "채용시까지",
  content_hash: "a".repeat(64),
  citation_anchors: [{ url: "https://cdp.hanyang.ac.kr/job/notice", label: "공식 출처" }],
  source_text_trust: "untrusted_source_text",
  chunk_ordinal: 0,
  text: "ERICA 학생은 상담예약과 전문가 상담 정보를 공식 페이지에서 확인할 수 있습니다.",
};

function retrievedChunk(normalizedScore: number, overrides: Partial<KnowledgeChunk> = {}): RetrievedChunk {
  const chunk: KnowledgeChunk = { ...baseChunk, ...overrides };

  return {
    chunk,
    score: normalizedScore * 10,
    normalized_score: normalizedScore,
    matched_terms: ["상담"],
    ranking_features: {
      lexical_score: normalizedScore * 10,
      title_boost: 0,
      category_boost: 0,
      freshness_boost: 0,
      deadline_penalty: 0,
      boilerplate_penalty: 0,
    },
  };
}

describe("evaluateEvidence", () => {
  it("hard-refuses when no chunks are available", () => {
    expect(evaluateEvidence([])).toMatchObject({
      refusal_tier: "hard_refuse",
      confidence: 0,
      reasons: ["zero_chunks"],
    });
  });

  it.each([
    { score: 0.29, tier: "hard_refuse" },
    { score: 0.30, tier: "soft_hedge" },
    { score: 0.50, tier: "soft_hedge" },
    { score: 0.51, tier: "normal_answer" },
  ] as const)("maps normalized score $score to $tier", ({ score, tier }) => {
    const evaluation = evaluateEvidence([retrievedChunk(score)]);

    expect(evaluation.refusal_tier).toBe(tier);
    expect(evaluation.confidence).toBe(score);
    if (tier === "soft_hedge") {
      expect(evaluation.soft_hedge_prefix).toBe("현재 수집된 자료 기준으로는");
      expect(evaluation.soft_hedge_prefix).toBe(DEFAULT_EVIDENCE_POLICY.soft_hedge_prefix);
    }
  });

  it("hard-refuses when every returned chunk is boilerplate-only", () => {
    const result = evaluateEvidence([retrievedChunk(0.91)], { boilerplateOnlyChunkIds: new Set(["chunk-1"]) });

    expect(result.refusal_tier).toBe("hard_refuse");
    expect(result.reasons).toContain("boilerplate_only_results");
  });

  it("hard-refuses citationless chunks even when score is high", () => {
    const result = evaluateEvidence([retrievedChunk(0.91, { citation_anchors: [] })]);

    expect(result.refusal_tier).toBe("hard_refuse");
    expect(result.reasons).toContain("missing_citation_anchors");
  });

  it("builds a short Korean no-answer refusal", () => {
    expect(buildHardRefusalAnswer()).toContain("현재 수집된 자료");
    expect(buildHardRefusalAnswer()).toContain("공식 페이지");
  });
});
