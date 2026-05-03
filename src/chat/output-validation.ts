import { z } from "zod";

import { ChatCitationSchema, ChatResponseSchema, RefusalTierSchema, type ChatResponse, type RefusalTier } from "./chat-contract.js";

export type ValidateChatResponseOutputInput = {
  response: unknown;
  citationMap: readonly ChatResponse["citations"][number][];
  expectedTier: RefusalTier;
};

export type ValidateChatResponseOutputResult =
  | { ok: true; response: ChatResponse }
  | { ok: false; failures: string[] };

const citationMarkerPattern = /\[(\d+)\]/gu;
const hangulSyllablePattern = /[가-힣]/u;
const unsafeOutputPhrases = [
  "출처를 생략",
  "공식 인증",
  "취업을 보장",
  "이전 지시를 무시",
] as const;

const ProviderCitationChoiceSchema = z.looseObject({ citation_id: z.number().int().positive() });
const ProviderChatResponseCandidateSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(ProviderCitationChoiceSchema),
  refusal_tier: RefusalTierSchema,
  confidence: z.number().min(0).max(1),
  trace_id: z.string().min(1),
});

export function validateChatResponseOutput(input: ValidateChatResponseOutputInput): ValidateChatResponseOutputResult {
  const parsed = ProviderChatResponseCandidateSchema.safeParse(input.response);
  if (!parsed.success) {
    return { ok: false, failures: [`schema validation failed: ${summarizeZodError(parsed.error)}`] };
  }

  const canonicalCitations = new Map<number, ChatResponse["citations"][number]>();
  for (const citation of input.citationMap) {
    const canonical = ChatCitationSchema.safeParse(citation);
    if (!canonical.success) {
      return { ok: false, failures: [`canonical citation validation failed: ${summarizeZodError(canonical.error)}`] };
    }
    canonicalCitations.set(canonical.data.citation_id, canonical.data);
  }

  const response = {
    ...parsed.data,
    citations: parsed.data.citations.flatMap((citation) => {
      const canonical = canonicalCitations.get(citation.citation_id);
      return canonical === undefined ? [] : [canonical];
    }),
  };
  const failures: string[] = [];
  const citationIds = new Set(parsed.data.citations.map((citation) => citation.citation_id));
  const markerIds = extractCitationMarkerIds(response.answer);

  if (!hangulSyllablePattern.test(response.answer)) {
    failures.push("answer must be Korean-first and contain Hangul");
  }

  if (response.refusal_tier !== input.expectedTier) {
    failures.push(`refusal tier mismatch: expected ${input.expectedTier}, received ${response.refusal_tier}`);
  }

  for (const phrase of unsafeOutputPhrases) {
    if (response.answer.includes(phrase)) {
      failures.push(`unsafe output phrase rejected: ${phrase}`);
    }
  }

  if (response.refusal_tier !== "hard_refuse" && markerIds.length === 0) {
    failures.push("citationless factual answer requires inline numeric citations");
  }

  for (const markerId of markerIds) {
    if (!citationIds.has(markerId)) {
      failures.push(`citation marker [${markerId}] has no matching citation object`);
    }
    if (!canonicalCitations.has(markerId)) {
      failures.push(`citation marker [${markerId}] is not allowed for this evidence set`);
    }
  }

  for (const citationId of citationIds) {
    if (!canonicalCitations.has(citationId)) {
      failures.push(`citation object ${citationId} is not allowed for this evidence set`);
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  const finalResponse = ChatResponseSchema.safeParse(response);
  if (!finalResponse.success) {
    return { ok: false, failures: [`canonical response validation failed: ${summarizeZodError(finalResponse.error)}`] };
  }

  return { ok: true, response: finalResponse.data };
}

function extractCitationMarkerIds(answer: string): number[] {
  const ids: number[] = [];
  for (const match of answer.matchAll(citationMarkerPattern)) {
    const rawId = match[1];
    if (rawId !== undefined) {
      ids.push(Number.parseInt(rawId, 10));
    }
  }
  return ids;
}

function summarizeZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
