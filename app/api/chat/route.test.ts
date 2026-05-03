import { afterEach, describe, expect, it, vi } from "vitest";

import { overrideServicesForTest, resetServiceContainerForTest } from "../../../lib/service-container.js";
import { POST } from "./route.js";

const citation = {
  citation_id: 1,
  chunk_id: "chunk-1",
  record_id: "record-1",
  source_id: "ibus",
  title: "채용 공고",
  url: "https://example.edu/jobs",
  fetched_at: "2026-05-03T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active" as const,
};

describe("/api/chat", () => {
  afterEach(() => resetServiceContainerForTest());

  it("returns schema-valid complete chat responses", async () => {
    const ask = vi.fn().mockResolvedValue({ answer: "채용 공고입니다 [1]", citations: [citation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace-chat" });
    overrideServicesForTest({ chat: { ask } });

    const response = await POST(new Request("https://app.test/api/chat", { method: "POST", body: JSON.stringify({ query: "채용 공고 알려줘", top_k: 5 }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ trace_id: "trace-chat", citations: [citation] });
    expect(ask).toHaveBeenCalledWith({ query: "채용 공고 알려줘", top_k: 5 });
  });

  it("converts setup errors to safe Korean 503 JSON", async () => {
    overrideServicesForTest({ chat: { ask: vi.fn().mockRejectedValue(new Error("OPENAI_COMPAT_API_KEY secret stack")) } });
    const response = await POST(new Request("https://app.test/api/chat", { method: "POST", body: JSON.stringify({ query: "채용", top_k: 5 }) }));
    const text = await response.text();
    expect(response.status).toBe(503);
    expect(text).toContain("요청을 처리하지 못했어요");
    expect(text).not.toContain("OPENAI_COMPAT_API_KEY");
  });

  it("returns 400 for invalid request schema input", async () => {
    const ask = vi.fn();
    overrideServicesForTest({ chat: { ask } });

    const response = await POST(new Request("https://app.test/api/chat", { method: "POST", body: JSON.stringify({ query: "", top_k: 99 }) }));
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).toContain("요청 형식이 올바르지 않아요");
    expect(ask).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const ask = vi.fn();
    overrideServicesForTest({ chat: { ask } });

    const response = await POST(new Request("https://app.test/api/chat", { method: "POST", body: "{" }));

    expect(response.status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });
});
