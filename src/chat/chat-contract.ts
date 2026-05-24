import { z } from "zod";

import { DeadlineStatusSchema } from "../ingestion/normalized-record.js";
import { CategoryLabelKoSchema, CollectionCategorySchema, SourceFamilySchema } from "../knowledge-base/taxonomy.js";
import type { RetrieveFilters } from "../retrieval/retriever.js";

export const RefusalTierSchema = z.enum(["hard_refuse", "soft_hedge", "normal_answer"]);

export const RetrieveRequestFilterFields = {
  collection_categories: z.array(CollectionCategorySchema).optional(),
  source_families: z.array(SourceFamilySchema).optional(),
  deadline_statuses: z.array(DeadlineStatusSchema).optional(),
} as const;

export const RetrieveRequestFiltersSchema = z.strictObject(RetrieveRequestFilterFields);

export const ChatRequestSchema = z.strictObject({
  query: z.string().trim().min(1).max(2000),
  top_k: z.number().int().min(1).max(10).default(5),
  session_key: z.string().trim().min(1).max(120).optional(),
  ...RetrieveRequestFilterFields,
});

export const ChatCitationSchema = z.object({
  citation_id: z.number().int().positive(),
  chunk_id: z.string().min(1),
  record_id: z.string().min(1),
  source_id: z.string().min(1),
  title: z.string().min(1),
  url: z.url().refine((url) => url.startsWith("https://"), "url must use HTTPS"),
  fetched_at: z.iso.datetime(),
  posted_at: z.iso.datetime().nullable(),
  deadline_status: DeadlineStatusSchema,
  collection_category: CollectionCategorySchema.optional(),
  source_family: SourceFamilySchema.optional(),
  category_label_ko: CategoryLabelKoSchema.optional(),
  page_number: z.number().int().positive().optional(),
});

export const ChatResponseSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(ChatCitationSchema),
  refusal_tier: RefusalTierSchema,
  confidence: z.number().min(0).max(1),
  trace_id: z.string().min(1),
});

export type RefusalTier = z.infer<typeof RefusalTierSchema>;
export type RetrieveRequestFilters = z.infer<typeof RetrieveRequestFiltersSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatCitation = z.infer<typeof ChatCitationSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export function extractRetrieveFilters(request: RetrieveRequestFilters): RetrieveFilters | undefined {
  const filters: RetrieveFilters = {
    ...(request.collection_categories !== undefined ? { collection_categories: request.collection_categories } : {}),
    ...(request.source_families !== undefined ? { source_families: request.source_families } : {}),
    ...(request.deadline_statuses !== undefined ? { deadline_statuses: request.deadline_statuses } : {}),
  };

  return Object.keys(filters).length > 0 ? filters : undefined;
}
