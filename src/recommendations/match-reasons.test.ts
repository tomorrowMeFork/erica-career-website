import { describe, expect, it } from "vitest";

import type { PreferenceProfile } from "../personalization/preference-contract.js";
import type { RecommendationItem } from "./recommendation-contract.js";
import { buildMatchReasons, validateRecommendationReasons } from "./match-reasons.js";

const profile: PreferenceProfile = {
  major: "컴퓨터학부",
  target_role: "백엔드 개발자",
  industry: ["핀테크"],
  region: ["서울"],
  employment_type: ["인턴"],
  deadline_sensitivity: "urgent_first",
};

function recommendation(overrides: Partial<RecommendationItem> = {}): RecommendationItem {
  return {
    recommendation_id: "rec-1",
    chunk_id: "chunk-1",
    record_id: "record-1",
    source_id: "cdp-recruit",
    title: "컴퓨터학부 백엔드 개발자 인턴 모집",
    category: "채용",
    url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=1",
    fetched_at: "2026-05-04T00:00:00.000Z",
    posted_at: "2026-05-01T00:00:00.000Z",
    deadline_status: "active",
    score: 0.82,
    match_strength: "personalized_match",
    score_breakdown: {
      base_retrieval_score: 0.7,
      major_match_score: 1,
      target_role_match_score: 1,
      optional_preference_score: 0.8,
      source_quality_score: 0.9,
      freshness_score: 1,
      final_score: 0.82,
    },
    citations: [
      {
        citation_id: 1,
        chunk_id: "chunk-1",
        record_id: "record-1",
        source_id: "cdp-recruit",
        title: "컴퓨터학부 백엔드 개발자 인턴 모집",
        url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=1",
        fetched_at: "2026-05-04T00:00:00.000Z",
        posted_at: "2026-05-01T00:00:00.000Z",
        deadline_status: "active",
      },
    ],
    ...overrides,
  };
}

describe("buildMatchReasons", () => {
  it("returns 2-3 Korean personalized bullets with allowed inline [1] citations", () => {
    const reasons = buildMatchReasons(recommendation(), 1, profile);

    expect(reasons.length).toBeGreaterThanOrEqual(2);
    expect(reasons.length).toBeLessThanOrEqual(3);
    expect(reasons.every((reason) => reason.includes("[1]") && /[가-힣]/u.test(reason))).toBe(true);
    expect(validateRecommendationReasons(reasons, [1])).toEqual({ ok: true, reasons });
  });

  it("connects explicit 전공 and 관심직무 labels only when corresponding score evidence exists", () => {
    const roleOnly = buildMatchReasons(
      recommendation({
        score_breakdown: {
          base_retrieval_score: 0.7,
          major_match_score: 0,
          target_role_match_score: 1,
          optional_preference_score: 0.3,
          source_quality_score: 0.9,
          freshness_score: 1,
          final_score: 0.7,
        },
      }),
      1,
      profile,
    );

    expect(roleOnly.join(" ")).toContain("관심직무");
    expect(roleOnly.join(" ")).not.toContain("전공(");
    expect(roleOnly.join(" ")).toContain("출처 근거");
    expect(roleOnly.join(" ")).toContain("마감/최신성");
  });

  it("labels weak matches as 일반 안내 or 참고 정보 instead of strong 맞춤 추천", () => {
    const reasons = buildMatchReasons(recommendation({ match_strength: "partial_match" }), 1, profile);

    expect(reasons.join(" ")).toContain("참고 정보");
    expect(reasons.join(" ")).not.toContain("맞춤 추천");
    expect(reasons.every((reason) => reason.includes("[1]"))).toBe(true);

    const generalReasons = buildMatchReasons(recommendation({ match_strength: "general_recommendation" }), 1);
    expect(generalReasons.join(" ")).toContain("일반 안내");
  });
});

describe("validateRecommendationReasons", () => {
  it("rejects markers outside allowed citation IDs", () => {
    const result = validateRecommendationReasons(["- 출처 근거: 허용되지 않은 표시입니다 [2]"], [1]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.join(" ")).toContain("[2]");
    }
  });

  it("rejects unsupported endorsement or guarantee phrases such as 합격 보장", () => {
    const result = validateRecommendationReasons(["- 합격 보장 문구는 허용되지 않습니다 [1]"], [1]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.join(" ")).toContain("합격 보장");
    }
  });
});
