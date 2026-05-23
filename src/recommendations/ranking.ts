import { ChatCitationSchema } from "../chat/chat-contract.js";
import { resolveEffectiveDeadlineStatus } from "../ingestion/deadline-status.js";
import type { PreferenceProfile } from "../personalization/preference-contract.js";
import type { RetrievedChunk } from "../retrieval/retriever.js";
import {
  type MatchStrength,
  type RecommendationItem,
  RecommendationItemSchema,
  type RecommendationScoreBreakdown,
} from "./recommendation-contract.js";
import { scoreSourceQuality } from "./source-quality.js";

export type ScoreRecommendationCandidateInput = {
  candidate: RetrievedChunk;
  profile?: PreferenceProfile;
  referenceDate?: Date;
};

export type RankRecommendationCandidatesInput = {
  candidates: RetrievedChunk[];
  profile?: PreferenceProfile;
  limit?: number;
  referenceDate?: Date;
};

export type ScoredRecommendationCandidate = {
  candidate: RetrievedChunk;
  deadline_status: RetrievedChunk["chunk"]["deadline_status"];
  score_breakdown: RecommendationScoreBreakdown;
  match_strength: MatchStrength;
};

const BASE_RETRIEVAL_WEIGHT = 0.30;
const MAJOR_MATCH_WEIGHT = 0.20;
const TARGET_ROLE_MATCH_WEIGHT = 0.20;
const OPTIONAL_PREFERENCE_WEIGHT = 0.10;
const SOURCE_QUALITY_WEIGHT = 0.15;
const FRESHNESS_WEIGHT = 0.05;

function clampScore(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function roundScore(value: number): number {
  return Math.round(clampScore(value) * 10000) / 10000;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ko-KR").replace(/[\s\p{Punctuation}\p{Symbol}]+/gu, " ").trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 0);
}

function candidateEvidence(candidate: RetrievedChunk): string {
  return normalize(
    [
      candidate.chunk.title,
      candidate.chunk.category,
      candidate.chunk.deadline_raw_text,
      candidate.chunk.text,
      candidate.matched_terms.join(" "),
    ].join(" "),
  );
}

function matchTextScore(preference: string, evidence: string): number {
  const normalizedPreference = normalize(preference);
  if (normalizedPreference.length === 0) {
    return 0;
  }
  if (evidence.includes(normalizedPreference)) {
    return 1;
  }

  const preferenceTokens = tokens(preference);
  if (preferenceTokens.length === 0) {
    return 0;
  }

  const matchedTokens = preferenceTokens.filter((token) => evidence.includes(token)).length;
  return roundScore(matchedTokens / preferenceTokens.length);
}

function scoreOptionalPreferences(
  profile: PreferenceProfile | undefined,
  deadlineStatus: RetrievedChunk["chunk"]["deadline_status"],
  evidence: string,
): number {
  if (profile === undefined) {
    return 0;
  }

  const optionalScores = [...profile.industry, ...profile.region, ...profile.employment_type].map((preference) =>
    matchTextScore(preference, evidence),
  );
  const structuredPreferenceScore =
    optionalScores.length === 0 ? 0 : optionalScores.reduce((total, score) => total + score, 0) / optionalScores.length;
  const deadlineScore =
    profile.deadline_sensitivity === "include_unknown"
      ? deadlineStatus === "expired"
        ? 0
        : 1
      : profile.deadline_sensitivity === "urgent_first"
        ? deadlineStatus === "active"
          ? 1
          : 0
        : deadlineStatus === "expired"
          ? 0.25
          : 0.75;

  return roundScore(structuredPreferenceScore * 0.65 + deadlineScore * 0.35);
}

function selectMatchStrength(profile: PreferenceProfile | undefined, scoreBreakdown: RecommendationScoreBreakdown): MatchStrength {
  if (profile === undefined) {
    return "general_recommendation";
  }

  const coreScore = Math.max(scoreBreakdown.major_match_score, scoreBreakdown.target_role_match_score);
  if (coreScore >= 0.75 && scoreBreakdown.source_quality_score >= 0.45) {
    return "personalized_match";
  }
  return "partial_match";
}

function buildCitation(candidate: RetrievedChunk, citationId: number, deadlineStatus: RetrievedChunk["chunk"]["deadline_status"]) {
  const primaryAnchor = candidate.chunk.citation_anchors[0];
  if (primaryAnchor === undefined) {
    return undefined;
  }

  return ChatCitationSchema.safeParse({
    citation_id: citationId,
    chunk_id: candidate.chunk.chunk_id,
    record_id: candidate.chunk.record_id,
    source_id: candidate.chunk.source_id,
    title: primaryAnchor.label || candidate.chunk.title,
    url: primaryAnchor.url,
    fetched_at: candidate.chunk.fetched_at,
    posted_at: candidate.chunk.posted_at,
    deadline_status: deadlineStatus,
    collection_category: candidate.chunk.collection_category,
    source_family: candidate.chunk.source_family,
    category_label_ko: candidate.chunk.category_label_ko,
    page_number: primaryAnchor.page_number,
  });
}

function toRecommendationItem(scored: ScoredRecommendationCandidate, recommendationIndex: number): RecommendationItem | undefined {
  const citationResult = buildCitation(scored.candidate, recommendationIndex + 1, scored.deadline_status);
  if (citationResult === undefined || !citationResult.success) {
    return undefined;
  }

  const itemResult = RecommendationItemSchema.safeParse({
    recommendation_id: `rec-${recommendationIndex + 1}`,
    chunk_id: scored.candidate.chunk.chunk_id,
    record_id: scored.candidate.chunk.record_id,
    source_id: scored.candidate.chunk.source_id,
    title: scored.candidate.chunk.title,
    category: scored.candidate.chunk.category,
    collection_category: scored.candidate.chunk.collection_category,
    source_family: scored.candidate.chunk.source_family,
    category_label_ko: scored.candidate.chunk.category_label_ko,
    url: scored.candidate.chunk.source_url,
    fetched_at: scored.candidate.chunk.fetched_at,
    posted_at: scored.candidate.chunk.posted_at,
    deadline_status: scored.deadline_status,
    score: scored.score_breakdown.final_score,
    match_strength: scored.match_strength,
    score_breakdown: scored.score_breakdown,
    citations: [citationResult.data],
  });

  return itemResult.success ? itemResult.data : undefined;
}

export function scoreRecommendationCandidate(input: ScoreRecommendationCandidateInput): ScoredRecommendationCandidate {
  const referenceDate = input.referenceDate ?? new Date();
  const deadline_status = effectiveDeadlineStatus(input.candidate, referenceDate);
  const sourceQuality = scoreSourceQuality(input.candidate, referenceDate);
  const evidence = candidateEvidence(input.candidate);
  const base_retrieval_score = roundScore(input.candidate.normalized_score);
  const major_match_score = input.profile === undefined ? 0 : matchTextScore(input.profile.major, evidence);
  const target_role_match_score = input.profile === undefined ? 0 : matchTextScore(input.profile.target_role, evidence);
  const optional_preference_score = scoreOptionalPreferences(input.profile, deadline_status, evidence);
  const source_quality_score = sourceQuality.final_score;
  const freshness_score = sourceQuality.freshness_score;
  const final_score = roundScore(
    base_retrieval_score * BASE_RETRIEVAL_WEIGHT +
      major_match_score * MAJOR_MATCH_WEIGHT +
      target_role_match_score * TARGET_ROLE_MATCH_WEIGHT +
      optional_preference_score * OPTIONAL_PREFERENCE_WEIGHT +
      source_quality_score * SOURCE_QUALITY_WEIGHT +
      freshness_score * FRESHNESS_WEIGHT,
  );
  const score_breakdown = {
    base_retrieval_score,
    major_match_score,
    target_role_match_score,
    optional_preference_score,
    source_quality_score,
    freshness_score,
    final_score,
  };

  return {
    candidate: input.candidate,
    deadline_status,
    score_breakdown,
    match_strength: selectMatchStrength(input.profile, score_breakdown),
  };
}

function effectiveDeadlineStatus(candidate: RetrievedChunk, referenceDate: Date): RetrievedChunk["chunk"]["deadline_status"] {
  return resolveEffectiveDeadlineStatus({
    deadline_raw_text: candidate.chunk.deadline_raw_text,
    deadline_status: candidate.chunk.deadline_status,
    referenceDate,
  });
}

export function rankRecommendationCandidates(input: RankRecommendationCandidatesInput): RecommendationItem[] {
  const limit = input.limit ?? 5;
  const scoredCandidates = input.candidates
    .map((candidate, index) => ({ index, scored: scoreRecommendationCandidate({ candidate, profile: input.profile, referenceDate: input.referenceDate }) }))
    .sort((left, right) => {
      const scoreDelta = right.scored.score_breakdown.final_score - left.scored.score_breakdown.final_score;
      return scoreDelta === 0 ? left.index - right.index : scoreDelta;
    });

  const recommendations: RecommendationItem[] = [];
  for (const { scored } of scoredCandidates) {
    if (recommendations.length >= limit) {
      break;
    }

    const item = toRecommendationItem(scored, recommendations.length);
    if (item !== undefined) {
      recommendations.push(item);
    }
  }

  return recommendations;
}
