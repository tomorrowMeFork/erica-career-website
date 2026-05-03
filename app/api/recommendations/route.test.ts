import { afterEach, describe, expect, it, vi } from "vitest";

import { overrideServicesForTest, resetServiceContainerForTest } from "../../../lib/service-container.js";
import { POST } from "./route.js";

const item = {
  recommendation_id: "rec-1",
  chunk_id: "chunk-1",
  record_id: "record-1",
  source_id: "ibus",
  title: "ERICA 채용",
  category: "jobs",
  url: "https://example.edu/jobs",
  fetched_at: "2026-05-03T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active" as const,
  score: 0.9,
  match_strength: "personalized_match" as const,
  match_reasons: ["전공 조건과 연결됩니다 [1]"],
  score_breakdown: { base_retrieval_score: 0.5, major_match_score: 0.2, target_role_match_score: 0.1, optional_preference_score: 0, source_quality_score: 0.1, freshness_score: 0.1, final_score: 0.9 },
  citations: [{ citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "ERICA 채용", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" as const }],
};

describe("/api/recommendations", () => {
  afterEach(() => resetServiceContainerForTest());

  it("preserves service-provided recommendation order and metadata", async () => {
    const recommend = vi.fn().mockResolvedValue({ recommendations: [item], generated_at: "2026-05-03T00:00:00.000Z", trace_id: "trace-rec", preference_mode: "preference", privacy_metadata: { preference_ranking_enabled: true, profile_source: "request_profile", storage_scope: "none" } });
    overrideServicesForTest({ recommendation: { recommend } });
    const response = await POST(new Request("https://app.test/api/recommendations", { method: "POST", body: JSON.stringify({ query: "채용", limit: 5 }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ recommendations: [item], privacy_metadata: { preference_ranking_enabled: true } });
  });
});
