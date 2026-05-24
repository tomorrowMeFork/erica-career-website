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
    const response = await POST(
      new Request("https://app.test/api/recommendations", {
        method: "POST",
        body: JSON.stringify({
          query: "채용",
          limit: 5,
          collection_categories: ["job_posting"],
          source_families: ["ibus"],
          deadline_statuses: ["active"],
        }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ recommendations: [item], privacy_metadata: { preference_ranking_enabled: true } });
    expect(recommend).toHaveBeenCalledWith({
      query: "채용",
      limit: 5,
      collection_categories: ["job_posting"],
      source_families: ["ibus"],
      deadline_statuses: ["active"],
    });
  });

  it("returns 400 for invalid request schema input", async () => {
    const recommend = vi.fn();
    overrideServicesForTest({ recommendation: { recommend } });

    const response = await POST(new Request("https://app.test/api/recommendations", { method: "POST", body: JSON.stringify({ query: "채용", limit: 100 }) }));
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).toContain("요청 형식이 올바르지 않아요");
    expect(recommend).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid taxonomy filter values", async () => {
    const recommend = vi.fn();
    overrideServicesForTest({ recommendation: { recommend } });

    const response = await POST(new Request("https://app.test/api/recommendations", { method: "POST", body: JSON.stringify({ query: "채용", collection_categories: ["취업"] }) }));
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).toContain("요청 형식이 올바르지 않아요");
    expect(recommend).not.toHaveBeenCalled();
  });

  it("returns 400 for raw source_id filters in public requests", async () => {
    const recommend = vi.fn();
    overrideServicesForTest({ recommendation: { recommend } });

    const response = await POST(new Request("https://app.test/api/recommendations", { method: "POST", body: JSON.stringify({ query: "채용", source_ids: ["ibus-employment-board"] }) }));
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).toContain("요청 형식이 올바르지 않아요");
    expect(recommend).not.toHaveBeenCalled();
  });

  it("keeps service failures as safe Korean 503 JSON", async () => {
    overrideServicesForTest({ recommendation: { recommend: vi.fn().mockRejectedValue(new Error("DATABASE_URL secret stack")) } });

    const response = await POST(new Request("https://app.test/api/recommendations", { method: "POST", body: JSON.stringify({ query: "채용", limit: 5 }) }));
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(text).toContain("요청을 처리하지 못했어요");
    expect(text).not.toContain("DATABASE_URL");
  });
});
