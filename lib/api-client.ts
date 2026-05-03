import type { z } from "zod";

import { ChatRequestSchema, ChatResponseSchema, type ChatResponse } from "../src/chat/chat-contract.js";
import { PreferenceProfileSchema, PreferenceStateSchema, type PreferenceState } from "../src/personalization/preference-contract.js";
import { RecommendationRequestSchema, RecommendationResponseSchema, type RecommendationResponse } from "../src/recommendations/recommendation-contract.js";

type ChatRequestInput = z.input<typeof ChatRequestSchema>;
type RecommendationRequestInput = z.input<typeof RecommendationRequestSchema>;
type PreferenceProfileInput = z.input<typeof PreferenceProfileSchema>;

export type UiApiError = { ok: false; message: string };
export type UiApiResult<T> = { ok: true; data: T } | UiApiError;

const uiSafeError = "요청을 처리하지 못했어요. 잠시 후 다시 시도하거나 공식 출처 페이지에서 직접 확인해 주세요.";

export async function sendChatMessage(input: ChatRequestInput): Promise<UiApiResult<ChatResponse>> {
  const request = ChatRequestSchema.parse(input);
  return postAndParse("/api/chat", request, ChatResponseSchema);
}

export async function fetchRecommendations(input: RecommendationRequestInput = {}): Promise<UiApiResult<RecommendationResponse>> {
  const request = RecommendationRequestSchema.parse(input);
  return postAndParse("/api/recommendations", request, RecommendationResponseSchema);
}

export async function readPreferences(sessionKey: string): Promise<UiApiResult<PreferenceState>> {
  return fetchAndParse(`/api/preferences?session_key=${encodeURIComponent(sessionKey)}`, { method: "GET" }, PreferenceStateSchema);
}

export async function savePreferences(sessionKey: string, profile: PreferenceProfileInput): Promise<UiApiResult<PreferenceState>> {
  return postAndParse("/api/preferences", { session_key: sessionKey, profile: PreferenceProfileSchema.parse(profile) }, PreferenceStateSchema);
}

export async function updatePreferences(sessionKey: string, profile: Partial<PreferenceProfileInput>): Promise<UiApiResult<PreferenceState>> {
  return fetchAndParse("/api/preferences", jsonInit("PATCH", { session_key: sessionKey, profile }), PreferenceStateSchema);
}

export async function clearPreferences(sessionKey: string): Promise<UiApiResult<PreferenceState>> {
  return fetchAndParse(`/api/preferences?session_key=${encodeURIComponent(sessionKey)}`, { method: "DELETE" }, PreferenceStateSchema);
}

async function postAndParse<T>(url: string, body: unknown, schema: { parse: (input: unknown) => T }): Promise<UiApiResult<T>> {
  return fetchAndParse(url, jsonInit("POST", body), schema);
}

async function fetchAndParse<T>(url: string, init: RequestInit, schema: { parse: (input: unknown) => T }): Promise<UiApiResult<T>> {
  try {
    const response = await fetch(url, init);
    const payload = await response.json();
    if (!response.ok) {
      return { ok: false, message: uiSafeError };
    }
    return { ok: true, data: schema.parse(payload) };
  } catch (_error) {
    return { ok: false, message: uiSafeError };
  }
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
