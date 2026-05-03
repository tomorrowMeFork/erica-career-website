import { randomUUID } from "node:crypto";
import type { z } from "zod";

import type { PreferenceProfile, PreferenceState } from "../personalization/preference-contract.js";
import type { PreferenceService } from "../personalization/preference-service.js";
import type { Retriever } from "../retrieval/retriever.js";
import { buildMatchReasons, validateRecommendationReasons } from "./match-reasons.js";
import {
  RecommendationRequestSchema,
  RecommendationResponseSchema,
  type RecommendationItem,
  type RecommendationRequest,
  type RecommendationResponse,
} from "./recommendation-contract.js";
import { rankRecommendationCandidates } from "./ranking.js";

export type RecommendationServiceInput = z.input<typeof RecommendationRequestSchema>;

export type RecommendationServiceOptions = {
  retriever: Retriever;
  preferenceService?: PreferenceService;
  clock?: () => Date;
  traceIdGenerator?: () => string;
};

type ResolvedProfile = {
  profile?: PreferenceProfile;
  profileSource: "request_profile" | "preference_service" | "none";
  storageScope: PreferenceState["storage_scope"];
};

const NO_PREFERENCE_QUERY = "채용 모집 공고 취업 프로그램";

export class RecommendationService {
  private readonly retriever: Retriever;
  private readonly preferenceService?: PreferenceService;
  private readonly clock: () => Date;
  private readonly traceIdGenerator: () => string;

  constructor(options: RecommendationServiceOptions) {
    this.retriever = options.retriever;
    this.preferenceService = options.preferenceService;
    this.clock = options.clock ?? (() => new Date());
    this.traceIdGenerator = options.traceIdGenerator ?? randomUUID;
  }

  async recommend(input: RecommendationServiceInput): Promise<RecommendationResponse> {
    const request = RecommendationRequestSchema.parse(input);
    const resolvedProfile = await this.resolveProfile(request);
    const preferenceRankingEnabled = resolvedProfile.profile !== undefined;
    const retrievalQuery = preferenceRankingEnabled ? buildProfileQuery(resolvedProfile.profile, request.query) : request.query ?? NO_PREFERENCE_QUERY;
    const candidates = await this.retriever.retrieve({ query: retrievalQuery, topK: request.limit });
    const ranked = rankRecommendationCandidates({
      candidates,
      profile: resolvedProfile.profile,
      limit: request.limit,
      referenceDate: this.clock(),
    });
    const recommendations = ranked.map((recommendation, index) => withMatchReasons(recommendation, index + 1, resolvedProfile.profile));

    return RecommendationResponseSchema.parse({
      recommendations,
      generated_at: this.clock().toISOString(),
      trace_id: this.traceIdGenerator(),
      preference_mode: preferenceRankingEnabled ? "preference" : "no_preference",
      privacy_metadata: {
        preference_ranking_enabled: preferenceRankingEnabled,
        profile_source: resolvedProfile.profileSource,
        storage_scope: resolvedProfile.storageScope,
      },
    });
  }

  private async resolveProfile(request: RecommendationRequest): Promise<ResolvedProfile> {
    if (request.profile !== undefined) {
      return { profile: request.profile, profileSource: "request_profile", storageScope: "none" };
    }

    if (this.preferenceService !== undefined && request.session_key !== undefined) {
      const state = await this.preferenceService.readState(request.session_key);
      if (state.preference_ranking_enabled && state.profile !== null) {
        return { profile: state.profile, profileSource: "preference_service", storageScope: state.storage_scope };
      }
      return { profileSource: "none", storageScope: state.storage_scope };
    }

    return { profileSource: "none", storageScope: "none" };
  }
}

function withMatchReasons(recommendation: RecommendationItem, citationId: number, profile?: PreferenceProfile): RecommendationItem {
  const allowedCitationIds = recommendation.citations.map((citation) => citation.citation_id);
  const primaryCitationId = allowedCitationIds.includes(citationId) ? citationId : allowedCitationIds[0];
  if (primaryCitationId === undefined) {
    return recommendation;
  }

  const match_reasons = buildMatchReasons(recommendation, primaryCitationId, profile);
  const validation = validateRecommendationReasons(match_reasons, allowedCitationIds);
  if (!validation.ok) {
    throw new Error(`Recommendation reason validation failed: ${validation.failures.join("; ")}`);
  }
  return { ...recommendation, match_reasons: validation.reasons };
}

function buildProfileQuery(profile: PreferenceProfile | undefined, query: string | undefined): string {
  if (profile === undefined) {
    return query ?? NO_PREFERENCE_QUERY;
  }

  const structuredTerms = [
    profile.major,
    profile.target_role,
    ...profile.industry,
    ...profile.region,
    ...profile.employment_type,
    deadlineSensitivityTerm(profile.deadline_sensitivity),
    query,
  ].filter((term): term is string => term !== undefined && term.trim().length > 0);

  return structuredTerms.join(" ");
}

function deadlineSensitivityTerm(value: PreferenceProfile["deadline_sensitivity"]): string {
  if (value === "urgent_first") {
    return "마감 임박 진행 중";
  }
  if (value === "include_unknown") {
    return "마감 미정 포함";
  }
  return "채용 모집 공고";
}
