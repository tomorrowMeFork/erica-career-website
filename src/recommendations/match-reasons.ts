import type { PreferenceProfile } from "../personalization/preference-contract.js";
import type { RecommendationItem } from "./recommendation-contract.js";

export type RecommendationReasonValidationResult =
  | { ok: true; reasons: string[] }
  | { ok: false; failures: string[] };

const citationMarkerPattern = /\[(\d+)\]/gu;
const hangulSyllablePattern = /[가-힣]/u;
const unsupportedPhrases = ["공식 인증", "합격 보장", "취업 보장", "출처를 생략", "개인정보를 입력"] as const;

export function buildMatchReasons(
  scoredCandidate: RecommendationItem,
  citationId: number,
  profile?: PreferenceProfile,
): string[] {
  const citationMarker = `[${citationId}]`;
  const sourceEvidence = sourceEvidenceReason(scoredCandidate, citationMarker);
  const freshnessEvidence = freshnessReason(scoredCandidate, citationMarker);

  if (scoredCandidate.match_strength !== "personalized_match" || profile === undefined) {
    const prefix = scoredCandidate.match_strength === "partial_match" ? "참고 정보" : "일반 안내";
    return [
      `- ${prefix}: 현재 공고/프로그램 정보와 출처 메타데이터를 기준으로 확인할 수 있는 항목입니다 ${citationMarker}`,
      freshnessEvidence,
    ];
  }

  const reasons: string[] = [];
  if (scoredCandidate.score_breakdown.major_match_score > 0) {
    reasons.push(`- 맞춤 추천: 전공(${profile.major}) 관련 근거가 공고 정보에서 확인됩니다 ${citationMarker}`);
  }
  if (scoredCandidate.score_breakdown.target_role_match_score > 0) {
    reasons.push(`- 맞춤 추천: 관심직무(${profile.target_role})와 연결되는 모집/프로그램 단서가 있습니다 ${citationMarker}`);
  }
  if (reasons.length === 0 && scoredCandidate.score_breakdown.optional_preference_score > 0) {
    reasons.push(`- 맞춤 추천: 입력한 선택 선호와 일부 맞는 조건이 확인됩니다 ${citationMarker}`);
  }

  reasons.push(sourceEvidence);
  if (reasons.length < 3) {
    reasons.push(freshnessEvidence);
  }

  return reasons.slice(0, 3);
}

export function validateRecommendationReasons(
  reasons: readonly string[],
  allowedCitationIds: readonly number[],
): RecommendationReasonValidationResult {
  const failures: string[] = [];
  const allowed = new Set(allowedCitationIds);

  if (reasons.length === 0 || reasons.length > 3) {
    failures.push("recommendation reasons must contain 1-3 bullets");
  }

  for (const [index, reason] of reasons.entries()) {
    if (!hangulSyllablePattern.test(reason)) {
      failures.push(`reason ${index + 1} must be Korean-first and contain Hangul`);
    }
    for (const phrase of unsupportedPhrases) {
      if (reason.includes(phrase)) {
        failures.push(`unsupported recommendation phrase rejected: ${phrase}`);
      }
    }

    const markerIds = extractCitationMarkerIds(reason);
    if (markerIds.length === 0) {
      failures.push(`reason ${index + 1} must include an inline numeric citation`);
    }
    for (const markerId of markerIds) {
      if (!allowed.has(markerId)) {
        failures.push(`citation marker [${markerId}] is not allowed for recommendation reasons`);
      }
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }
  return { ok: true, reasons: [...reasons] };
}

function sourceEvidenceReason(candidate: RecommendationItem, citationMarker: string): string {
  return `- 출처 근거: ${candidate.category} 항목의 제목·분류·출처 메타데이터를 함께 확인했습니다 ${citationMarker}`;
}

function freshnessReason(candidate: RecommendationItem, citationMarker: string): string {
  if (candidate.deadline_status === "active") {
    return `- 마감/최신성: 현재 마감 상태가 진행 중인 정보로 표시되어 우선 확인할 가치가 있습니다 ${citationMarker}`;
  }
  if (candidate.deadline_status === "expired") {
    return `- 마감/최신성: 마감된 정보일 수 있어 지원 전 원문 날짜를 다시 확인하세요 ${citationMarker}`;
  }
  return `- 마감/최신성: 마감 상태가 불명확하므로 원문과 게시·수집일을 함께 확인하세요 ${citationMarker}`;
}

function extractCitationMarkerIds(reason: string): number[] {
  const ids: number[] = [];
  for (const match of reason.matchAll(citationMarkerPattern)) {
    const marker = match[1];
    if (marker !== undefined) {
      ids.push(Number.parseInt(marker, 10));
    }
  }
  return ids;
}
