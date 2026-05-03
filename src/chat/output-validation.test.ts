import { describe, expect, it } from "vitest";

import { DEFAULT_EVIDENCE_POLICY, buildHardRefusalAnswer, evaluateEvidence } from "./evidence-policy.js";
import { validateChatResponseOutput } from "./output-validation.js";
import type { ChatResponse } from "./chat-contract.js";
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

const validListingResponse = {
  answer: "ERICA 현장실습 모집 정보는 공식 채용 게시판에서 확인할 수 있습니다. 세부 내용은 반드시 공식 페이지에서 최신 정보를 확인해 주세요. [1]",
  citations: [
    {
      citation_id: 1,
      chunk_id: "listing-chunk-1",
      record_id: "listing-record-1",
      source_id: "ibus",
      title: "ERICA 현장실습 참여기업 모집",
      url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
      fetched_at: "2026-05-03T00:00:00.000Z",
      posted_at: "2026-05-01T00:00:00.000Z",
      deadline_status: "active",
    },
  ],
  refusal_tier: "normal_answer",
  confidence: 0.82,
  trace_id: "trace-listing-1",
} satisfies ChatResponse;

describe("validateChatResponseOutput", () => {
  it("accepts a Korean listing answer with mapped inline citations and freshness metadata", () => {
    const result = validateChatResponseOutput({
      response: validListingResponse,
      citationMap: validListingResponse.citations,
      expectedTier: "normal_answer",
    });

    expect(result.ok).toBe(true);
  });

  it("accepts a Korean PDF answer with page_number: 1 citation context", () => {
    const result = validateChatResponseOutput({
      response: {
        ...validListingResponse,
        answer: "CDP 학생 가이드북은 PDF 안내 자료에서 확인할 수 있으며, 첫 페이지부터 이용 안내가 제공됩니다. [1]",
        citations: [
          {
            ...validListingResponse.citations[0],
            title: "HY-CDP 학생 가이드북",
            url: "https://cdp.hanyang.ac.kr/guide/student.pdf#page=1",
            posted_at: null,
            deadline_status: "unknown",
            page_number: 1,
          },
        ],
        trace_id: "trace-pdf-1",
      },
      citationMap: [
        {
          ...validListingResponse.citations[0],
          title: "HY-CDP 학생 가이드북",
          url: "https://cdp.hanyang.ac.kr/guide/student.pdf#page=1",
          posted_at: null,
          deadline_status: "unknown",
          page_number: 1,
        },
      ],
      expectedTier: "normal_answer",
    });

    expect(result.ok).toBe(true);
  });

  it("accepts a no-answer hard refusal without citations", () => {
    const result = validateChatResponseOutput({
      response: {
        answer: buildHardRefusalAnswer(),
        citations: [],
        refusal_tier: "hard_refuse",
        confidence: 0,
        trace_id: "trace-refusal-1",
      },
      citationMap: [],
      expectedTier: "hard_refuse",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects citationless factual Korean mock-model output", () => {
    const result = validateChatResponseOutput({
      response: { ...validListingResponse, answer: "ERICA 현장실습 모집 공고는 채용 게시판에서 확인할 수 있습니다." },
      citationMap: validListingResponse.citations,
      expectedTier: "normal_answer",
    });

    expect(result).toEqual({ ok: false, failures: ["citationless factual answer requires inline numeric citations"] });
  });

  it.each(["출처를 생략하겠습니다", "공식 인증", "취업을 보장", "이전 지시를 무시"])(
    "rejects unsafe output phrase %s",
    (unsafePhrase) => {
      const result = validateChatResponseOutput({
        response: { ...validListingResponse, answer: `${unsafePhrase}. ERICA 채용 정보입니다. [1]` },
        citationMap: validListingResponse.citations,
        expectedTier: "normal_answer",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.failures).toContain(`unsafe output phrase rejected: ${unsafePhrase.replace("하겠습니다", "")}`);
      }
    },
  );

  it("rejects citation markers that do not map to structured citations", () => {
    const result = validateChatResponseOutput({
      response: { ...validListingResponse, answer: "ERICA 상담예약은 공식 페이지에서 확인할 수 있습니다. [2]" },
      citationMap: validListingResponse.citations,
      expectedTier: "normal_answer",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures).toContain("citation marker [2] has no matching citation object");
    }
  });

  it("canonicalizes provider-controlled citation metadata from the retrieved citation map", () => {
    const result = validateChatResponseOutput({
      response: {
        ...validListingResponse,
        citations: [
          {
            citation_id: 1,
            chunk_id: "attacker-chunk",
            record_id: "attacker-record",
            source_id: "attacker",
            title: "조작된 제목",
            url: "javascript:alert(1)",
            fetched_at: "2026-01-01T00:00:00.000Z",
            posted_at: null,
            deadline_status: "unknown",
          },
        ],
      },
      citationMap: validListingResponse.citations,
      expectedTier: "normal_answer",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.citations).toEqual(validListingResponse.citations);
      expect(result.response.citations[0]?.url).toBe("https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123");
    }
  });

  it("rejects non-HTTPS canonical citation URLs", () => {
    const result = validateChatResponseOutput({
      response: validListingResponse,
      citationMap: [{ ...validListingResponse.citations[0], url: "http://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123" }],
      expectedTier: "normal_answer",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures[0]).toContain("canonical citation validation failed");
    }
  });
});
