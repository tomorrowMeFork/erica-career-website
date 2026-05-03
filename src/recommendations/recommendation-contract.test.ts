import { describe, expect, it } from "vitest";

import {
  MatchStrengthSchema,
  RecommendationItemSchema,
  RecommendationRequestSchema,
  RecommendationResponseSchema,
} from "./recommendation-contract.js";

const scoreBreakdown = {
  base_retrieval_score: 0.7,
  major_match_score: 1,
  target_role_match_score: 0.5,
  optional_preference_score: 0.25,
  source_quality_score: 0.8,
  freshness_score: 0.9,
  final_score: 0.715,
};

const citation = {
  citation_id: 1,
  chunk_id: "chunk-1",
  record_id: "record-1",
  source_id: "cdp-recruit",
  title: "ERICA 채용 공고",
  url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=1",
  fetched_at: "2026-05-04T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active",
};

describe("MatchStrengthSchema", () => {
  it("exports deterministic recommendation match strength values", () => {
    expect(MatchStrengthSchema.options).toEqual(["personalized_match", "partial_match", "general_recommendation"]);
  });
});

describe("RecommendationRequestSchema", () => {
  it("accepts no-preference requests without a profile", () => {
    expect(RecommendationRequestSchema.parse({ query: "최신 채용", limit: 3 })).toEqual({
      query: "최신 채용",
      limit: 3,
    });
  });

  it("accepts explicit profiles when preference ranking is requested", () => {
    const parsed = RecommendationRequestSchema.parse({
      profile: {
        major: "컴퓨터학부",
        target_role: "백엔드 개발자",
      },
    });

    expect(parsed.profile).toEqual({
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      industry: [],
      region: [],
      employment_type: [],
      deadline_sensitivity: "balanced",
    });
    expect(parsed.limit).toBe(5);
  });
});

describe("RecommendationItemSchema", () => {
  it("requires structured ChatCitationSchema-compatible citations and score breakdown", () => {
    const parsed = RecommendationItemSchema.parse({
      recommendation_id: "rec-1",
      chunk_id: "chunk-1",
      record_id: "record-1",
      source_id: "cdp-recruit",
      title: "ERICA 채용 공고",
      category: "채용",
      url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=1",
      fetched_at: "2026-05-04T00:00:00.000Z",
      posted_at: "2026-05-01T00:00:00.000Z",
      deadline_status: "active",
      score: 0.715,
      match_strength: "personalized_match",
      score_breakdown: scoreBreakdown,
      citations: [citation],
    });

    expect(parsed.citations[0]).toEqual(citation);
    expect(parsed.score_breakdown.major_match_score).toBe(1);
  });

  it("rejects raw source text fields from normal recommendation item output", () => {
    const forbiddenPayloads = [
      { text: "전체 원문" },
      { raw_text: "원문" },
      { cleaned_text: "정제 원문" },
      { session_only_optional_text: "저장/노출하지 않을 자유 입력" },
    ].map((extraField) => ({
      recommendation_id: "rec-1",
      chunk_id: "chunk-1",
      record_id: "record-1",
      source_id: "cdp-recruit",
      title: "ERICA 채용 공고",
      category: "채용",
      url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=1",
      fetched_at: "2026-05-04T00:00:00.000Z",
      posted_at: "2026-05-01T00:00:00.000Z",
      deadline_status: "active",
      score: 0.715,
      match_strength: "personalized_match",
      score_breakdown: scoreBreakdown,
      citations: [citation],
      ...extraField,
    }));

    expect(forbiddenPayloads.every((payload) => !RecommendationItemSchema.safeParse(payload).success)).toBe(true);
  });
});

describe("RecommendationResponseSchema", () => {
  it("preserves citation and freshness metadata in response items", () => {
    const parsed = RecommendationResponseSchema.parse({
      recommendations: [
        {
          recommendation_id: "rec-1",
          chunk_id: "chunk-1",
          record_id: "record-1",
          source_id: "cdp-recruit",
          title: "ERICA 채용 공고",
          category: "채용",
          url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=1",
          fetched_at: "2026-05-04T00:00:00.000Z",
          posted_at: "2026-05-01T00:00:00.000Z",
          deadline_status: "active",
          score: 0.715,
          match_strength: "general_recommendation",
          score_breakdown: scoreBreakdown,
          citations: [citation],
        },
      ],
      generated_at: "2026-05-04T00:00:00.000Z",
      trace_id: "trace-1",
      preference_mode: "no_preference",
      privacy_metadata: {
        preference_ranking_enabled: false,
        profile_source: "none",
        storage_scope: "none",
      },
    });

    expect(parsed.recommendations[0]?.posted_at).toBe("2026-05-01T00:00:00.000Z");
    expect(parsed.recommendations[0]?.citations[0]?.deadline_status).toBe("active");
    expect(parsed.privacy_metadata.preference_ranking_enabled).toBe(false);
  });
});
