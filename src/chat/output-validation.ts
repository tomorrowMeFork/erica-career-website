import { z } from "zod";

import { ChatResponseSchema, type ChatResponse, type RefusalTier } from "./chat-contract.js";

export type ValidateChatResponseOutputInput = {
  response: unknown;
  allowedCitationIds: readonly number[];
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

export function validateChatResponseOutput(input: ValidateChatResponseOutputInput): ValidateChatResponseOutputResult {
  const parsed = ChatResponseSchema.safeParse(input.response);
  if (!parsed.success) {
    return { ok: false, failures: [`schema validation failed: ${summarizeZodError(parsed.error)}`] };
  }

  const response = parsed.data;
  const failures: string[] = [];
  const citationIds = new Set(response.citations.map((citation) => citation.citation_id));
  const allowedCitationIds = new Set(input.allowedCitationIds);
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
    if (!allowedCitationIds.has(markerId)) {
      failures.push(`citation marker [${markerId}] is not allowed for this evidence set`);
    }
  }

  for (const citationId of citationIds) {
    if (!allowedCitationIds.has(citationId)) {
      failures.push(`citation object ${citationId} is not allowed for this evidence set`);
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return { ok: true, response };
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
