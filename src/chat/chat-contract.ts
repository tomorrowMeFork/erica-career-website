import { z } from "zod";

import { DeadlineStatusSchema } from "../ingestion/normalized-record.js";

export const RefusalTierSchema = z.enum(["hard_refuse", "soft_hedge", "normal_answer"]);

export const ChatRequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  top_k: z.number().int().min(1).max(10).default(5),
  session_key: z.string().trim().min(1).max(120).optional(),
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
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatCitation = z.infer<typeof ChatCitationSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
