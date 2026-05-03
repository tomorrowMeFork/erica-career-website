import { describe, expect, it } from "vitest";

import type { PreferenceProfile } from "../personalization/preference-contract.js";
import type { RetrievedChunk } from "../retrieval/retriever.js";
import { rankRecommendationCandidates, scoreRecommendationCandidate } from "./ranking.js";

const referenceDate = new Date("2026-05-04T00:00:00.000Z");
const profile: PreferenceProfile = {
  major: "컴퓨터학부",
  target_role: "백엔드 개발자",
  industry: ["핀테크"],
  region: ["서울"],
  employment_type: ["인턴"],
  deadline_sensitivity: "urgent_first",
};

function candidate(overrides: {
  chunk_id: string;
  title: string;
  text: string;
  source_url?: string;
  anchor_url?: string;
  normalized_score?: number;
  posted_at?: string | null;
  fetched_at?: string;
  deadline_status?: "active" | "expired" | "unknown";
  boilerplate_penalty?: number;
}): RetrievedChunk {
  const sourceUrl = overrides.source_url ?? `https://cdp.hanyang.ac.kr/recruit/view.do?seq=${overrides.chunk_id}`;
  return {
    chunk: {
      chunk_id: overrides.chunk_id,
      record_id: `record-${overrides.chunk_id}`,
      source_id: "cdp-recruit",
      source_name: "ERICA Career Development",
      source_url: sourceUrl,
      canonical_url: sourceUrl,
      title: overrides.title,
      category: "채용",
      fetched_at: overrides.fetched_at ?? "2026-05-03T00:00:00.000Z",
      posted_at: overrides.posted_at ?? "2026-05-01T00:00:00.000Z",
      deadline_status: overrides.deadline_status ?? "active",
      deadline_raw_text: overrides.deadline_status === "expired" ? "마감" : "2026-06-01 마감",
      content_hash: "b".repeat(64),
      citation_anchors: [
        {
          url: overrides.anchor_url ?? sourceUrl,
          label: overrides.title,
        },
      ],
      source_text_trust: "untrusted_source_text",
      chunk_ordinal: 0,
      text: overrides.text,
    },
    score: overrides.normalized_score ?? 0.5,
    normalized_score: overrides.normalized_score ?? 0.5,
    matched_terms: ["채용", "인턴"],
    ranking_features: {
      lexical_score: overrides.normalized_score ?? 0.5,
      title_boost: 0,
      category_boost: 0,
      freshness_boost: 0,
      deadline_penalty: 0,
      boilerplate_penalty: overrides.boilerplate_penalty ?? 0,
    },
  };
}

describe("scoreRecommendationCandidate", () => {
  it("uses equal 0.20 primary weights for major and target_role matches", () => {
    const majorOnly = scoreRecommendationCandidate({
      candidate: candidate({
        chunk_id: "major-only",
        title: "컴퓨터학부 대상 추천 프로그램",
        text: "컴퓨터학부 학생 대상 공고입니다.",
      }),
      profile,
      referenceDate,
    });
    const roleOnly = scoreRecommendationCandidate({
      candidate: candidate({
        chunk_id: "role-only",
        title: "백엔드 개발자 추천 프로그램",
        text: "백엔드 개발자 직무 공고입니다.",
      }),
      profile,
      referenceDate,
    });

    expect(majorOnly.score_breakdown.major_match_score).toBe(1);
    expect(majorOnly.score_breakdown.target_role_match_score).toBe(0);
    expect(roleOnly.score_breakdown.major_match_score).toBe(0);
    expect(roleOnly.score_breakdown.target_role_match_score).toBe(1);
    expect(majorOnly.score_breakdown.final_score).toBe(roleOnly.score_breakdown.final_score);
  });

  it("clamps final scores into the schema range", () => {
    const scored = scoreRecommendationCandidate({
      candidate: candidate({
        chunk_id: "large-score",
        title: "컴퓨터학부 백엔드 개발자 인턴",
        text: "컴퓨터학부 백엔드 개발자 핀테크 서울 인턴",
        normalized_score: 5,
      }),
      profile,
      referenceDate,
    });

    expect(scored.score_breakdown.final_score).toBeLessThanOrEqual(1);
    expect(scored.score_breakdown.final_score).toBeGreaterThanOrEqual(0);
  });
});

describe("rankRecommendationCandidates", () => {
  it("does not filter preference mismatches and only reorders by score", () => {
    const strongMatch = candidate({
      chunk_id: "strong",
      title: "컴퓨터학부 백엔드 개발자 인턴",
      text: "컴퓨터학부 백엔드 개발자 핀테크 서울 인턴 공고",
      normalized_score: 0.4,
    });
    const preferenceMismatch = candidate({
      chunk_id: "mismatch",
      title: "디자인 마케팅 공고",
      text: "디자인 마케팅 직무 안내입니다.",
      normalized_score: 0.9,
    });

    const ranked = rankRecommendationCandidates({ candidates: [preferenceMismatch, strongMatch], profile, limit: 5, referenceDate });

    expect(ranked.map((item) => item.chunk_id)).toEqual(["strong", "mismatch"]);
    expect(ranked).toHaveLength(2);
    expect(ranked[1]?.match_strength).toBe("partial_match");
  });

  it("supports no-preference ranking and marks items as general_recommendation", () => {
    const staleRoot = candidate({
      chunk_id: "stale-root",
      title: "CDP 메뉴",
      text: "로그인 메뉴 채용정보 상담 바로가기",
      source_url: "https://cdp.hanyang.ac.kr/",
      normalized_score: 0.95,
      posted_at: null,
      fetched_at: "2025-01-01T00:00:00.000Z",
      deadline_status: "unknown",
      boilerplate_penalty: 2,
    });
    const activeLatest = candidate({
      chunk_id: "active-latest",
      title: "최신 인턴 채용 공고",
      text: "상세 직무와 지원 기한이 있는 최신 인턴 채용입니다.",
      normalized_score: 0.6,
      posted_at: "2026-05-03T00:00:00.000Z",
      deadline_status: "active",
    });

    const ranked = rankRecommendationCandidates({ candidates: [staleRoot, activeLatest], referenceDate });

    expect(ranked[0]?.chunk_id).toBe("active-latest");
    expect(ranked.every((item) => item.match_strength === "general_recommendation")).toBe(true);
  });

  it("uses source quality and freshness to break preference score ties", () => {
    const staleGeneric = candidate({
      chunk_id: "stale-generic",
      title: "컴퓨터학부 백엔드 개발자 안내",
      text: "컴퓨터학부 백엔드 개발자 안내 메뉴",
      source_url: "https://cdp.hanyang.ac.kr/",
      normalized_score: 0.5,
      posted_at: null,
      fetched_at: "2025-01-01T00:00:00.000Z",
      deadline_status: "unknown",
      boilerplate_penalty: 2,
    });
    const freshSpecific = candidate({
      chunk_id: "fresh-specific",
      title: "컴퓨터학부 백엔드 개발자 안내",
      text: "컴퓨터학부 백엔드 개발자 상세 채용 안내",
      normalized_score: 0.5,
      posted_at: "2026-05-02T00:00:00.000Z",
      deadline_status: "active",
    });

    const ranked = rankRecommendationCandidates({ candidates: [staleGeneric, freshSpecific], profile, referenceDate });

    expect(ranked[0]?.chunk_id).toBe("fresh-specific");
    expect(ranked[0]?.score_breakdown.source_quality_score).toBeGreaterThan(ranked[1]?.score_breakdown.source_quality_score ?? 0);
  });

  it("uses original candidate order as a stable tie-break", () => {
    const first = candidate({ chunk_id: "first", title: "동일 공고", text: "동일 내용", normalized_score: 0.5 });
    const second = candidate({ chunk_id: "second", title: "동일 공고", text: "동일 내용", normalized_score: 0.5 });

    const ranked = rankRecommendationCandidates({ candidates: [first, second], limit: 2, referenceDate });

    expect(ranked.map((item) => item.chunk_id)).toEqual(["first", "second"]);
  });

  it("excludes only candidates whose recommendation item or citation schema parsing fails", () => {
    const invalidCitation = candidate({
      chunk_id: "invalid-citation",
      title: "깨진 인용 공고",
      text: "인용 URL이 깨진 공고",
      source_url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=bad",
      anchor_url: "not-a-url",
      normalized_score: 1,
    });
    const valid = candidate({
      chunk_id: "valid",
      title: "정상 인용 공고",
      text: "정상 인용 공고",
      normalized_score: 0.1,
    });

    const ranked = rankRecommendationCandidates({ candidates: [invalidCitation, valid], profile, limit: 5, referenceDate });

    expect(ranked.map((item) => item.chunk_id)).toEqual(["valid"]);
  });
});
