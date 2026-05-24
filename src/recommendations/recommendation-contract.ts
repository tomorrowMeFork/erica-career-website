import { z } from "zod";

import { ChatCitationSchema, RetrieveRequestFilterFields } from "../chat/chat-contract.js";
import { DeadlineStatusSchema } from "../ingestion/normalized-record.js";
import { CategoryLabelKoSchema, CollectionCategorySchema, SourceFamilySchema } from "../knowledge-base/taxonomy.js";
import { PreferenceProfileSchema } from "../personalization/preference-contract.js";

export const MatchStrengthSchema = z.enum(["personalized_match", "partial_match", "general_recommendation"]);

export const RecommendationRequestSchema = z.strictObject({
  query: z.string().trim().min(1).max(2000).optional(),
  session_key: z.string().trim().min(1).max(120).optional(),
  profile: PreferenceProfileSchema.optional(),
  limit: z.number().int().min(1).max(10).default(5),
  ...RetrieveRequestFilterFields,
});

export const RecommendationScoreBreakdownSchema = z.strictObject({
  base_retrieval_score: z.number().min(0).max(1),
  major_match_score: z.number().min(0).max(1),
  target_role_match_score: z.number().min(0).max(1),
  optional_preference_score: z.number().min(0).max(1),
  source_quality_score: z.number().min(0).max(1),
  freshness_score: z.number().min(0).max(1),
  final_score: z.number().min(0).max(1),
});

export const RecommendationItemSchema = z.strictObject({
  recommendation_id: z.string().min(1),
  chunk_id: z.string().min(1),
  record_id: z.string().min(1),
  source_id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  collection_category: CollectionCategorySchema.optional(),
  source_family: SourceFamilySchema.optional(),
  category_label_ko: CategoryLabelKoSchema.optional(),
  url: z.url(),
  fetched_at: z.iso.datetime(),
  posted_at: z.iso.datetime().nullable(),
  deadline_status: DeadlineStatusSchema,
  score: z.number().min(0).max(1),
  match_strength: MatchStrengthSchema,
  match_reasons: z.array(z.string().trim().min(1)).min(1).max(3).optional(),
  score_breakdown: RecommendationScoreBreakdownSchema,
  citations: z.array(ChatCitationSchema).min(1),
});

export const RecommendationPrivacyMetadataSchema = z.strictObject({
  preference_ranking_enabled: z.boolean(),
  profile_source: z.enum(["request_profile", "preference_service", "none"]),
  storage_scope: z.enum(["none", "session", "persistent"]),
});

export const RecommendationResponseSchema = z.strictObject({
  recommendations: z.array(RecommendationItemSchema),
  generated_at: z.iso.datetime(),
  trace_id: z.string().min(1),
  preference_mode: z.enum(["preference", "no_preference"]),
  privacy_metadata: RecommendationPrivacyMetadataSchema,
});

export type MatchStrength = z.infer<typeof MatchStrengthSchema>;
export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;
export type RecommendationScoreBreakdown = z.infer<typeof RecommendationScoreBreakdownSchema>;
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;
export type RecommendationPrivacyMetadata = z.infer<typeof RecommendationPrivacyMetadataSchema>;
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;
