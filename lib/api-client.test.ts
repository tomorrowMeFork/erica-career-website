import { afterEach, describe, expect, it, vi } from "vitest";

import { clearPreferences, fetchRecommendations, readPreferences, savePreferences, sendChatMessage, updatePreferences } from "./api-client.js";
import { getOrCreateSessionKey } from "./session-key.js";

const preferenceState = { preference_ranking_enabled: true, profile: { major: "컴퓨터학부", target_role: "백엔드 개발자", industry: [], region: [], employment_type: [], deadline_sensitivity: "balanced" }, storage_scope: "session" };
const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: null, deadline_status: "unknown" };
const recommendation = { recommendation_id: "rec-1", chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용", category: "jobs", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: null, deadline_status: "unknown", score: 0.7, match_strength: "general_recommendation", score_breakdown: { base_retrieval_score: 0.4, major_match_score: 0, target_role_match_score: 0, optional_preference_score: 0, source_quality_score: 0.2, freshness_score: 0.1, final_score: 0.7 }, citations: [citation] };

describe("browser API helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("validates chat responses and returns Korean safe errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: "답변 [1]", citations: [citation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendChatMessage({ query: "채용", top_k: 5, session_key: " session-a " })).resolves.toMatchObject({ ok: true, data: { trace_id: "trace" } });
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.objectContaining({ body: JSON.stringify({ query: "채용", top_k: 5, session_key: "session-a" }) }));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "boom" }), { status: 500 })));
    await expect(sendChatMessage({ query: "채용", top_k: 5 })).resolves.toMatchObject({ ok: false, message: expect.stringContaining("요청을 처리하지 못했어요") });
  });

  it("preserves recommendation metadata and preference lifecycle results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ recommendations: [recommendation], generated_at: "2026-05-03T00:00:00.000Z", trace_id: "trace-rec", preference_mode: "no_preference", privacy_metadata: { preference_ranking_enabled: false, profile_source: "none", storage_scope: "none" } }), { status: 200 }))));
    await expect(fetchRecommendations({ session_key: "session-a", limit: 5 })).resolves.toMatchObject({ ok: true, data: { recommendations: [recommendation] } });

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(preferenceState), { status: 200 }))));
    await expect(readPreferences("session-a")).resolves.toMatchObject({ ok: true, data: preferenceState });
    await expect(savePreferences("session-a", { major: "컴퓨터학부", target_role: "백엔드 개발자" })).resolves.toMatchObject({ ok: true, data: preferenceState });
    await expect(updatePreferences("session-a", { region: ["서울"] })).resolves.toMatchObject({ ok: true, data: preferenceState });
    await expect(clearPreferences("session-a")).resolves.toMatchObject({ ok: true, data: preferenceState });
  });

  it("uses sessionStorage scoped session keys", () => {
    const backing = new Map<string, string>();
    const storage = { getItem: (key: string) => backing.get(key) ?? null, setItem: (key: string, value: string) => backing.set(key, value), removeItem: (key: string) => backing.delete(key), clear: () => backing.clear(), key: () => null, length: 0 } satisfies Storage;
    expect(getOrCreateSessionKey(storage)).toContain("erica-career-chat:");
    expect(getOrCreateSessionKey(storage)).toBe(getOrCreateSessionKey(storage));
  });
});
