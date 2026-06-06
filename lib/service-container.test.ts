import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatService } from "../src/chat/chat-service.js";
import type { KnowledgeChunk } from "../src/ingestion/normalized-record.js";
import type { RecommendationService } from "../src/recommendations/recommendation-service.js";
import type { Retriever } from "../src/retrieval/retriever.js";
import {
  getChatService,
  getKnowledgeBaseRetrieverService,
  getRecommendationService,
  overrideKnowledgeBaseRetrieverForTest,
  resetServiceContainerForTest,
} from "./service-container.js";

function chunk(overrides: Partial<KnowledgeChunk> = {}): KnowledgeChunk {
  return {
    chunk_id: "container-chunk",
    record_id: "container-record",
    source_id: "ibus-employment-board",
    source_name: "ERICA 취업게시판",
    source_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
    canonical_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
    title: "ERICA 현장실습 참여기업 모집",
    category: "채용정보",
    collection_category: "job_posting",
    source_family: "ibus",
    category_label_ko: "채용공고",
    fetched_at: "2026-05-03T00:00:00.000Z",
    posted_at: "2026-05-01T00:00:00.000Z",
    deadline_status: "active",
    deadline_raw_text: "채용시까지",
    content_hash: "a".repeat(64),
    citation_anchors: [{ url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123", label: "공식 출처: ERICA 취업게시판" }],
    source_text_trust: "untrusted_source_text",
    chunk_ordinal: 0,
    text: "ERICA 현장실습 참여기업 모집 공고입니다.",
    ...overrides,
  };
}

function createRetriever(): Retriever {
  return { retrieve: vi.fn(async () => []) };
}

function serviceRetriever(service: Pick<ChatService, "ask"> | Pick<RecommendationService, "recommend">): unknown {
  return (service as unknown as { retriever: unknown }).retriever;
}

function serviceAuditInternals(service: Pick<ChatService, "ask">): { auditLogger: unknown; auditLogPath: unknown } {
  return service as unknown as { auditLogger: unknown; auditLogPath: unknown };
}

describe("service container shared knowledge-base retriever", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetServiceContainerForTest();
  });

  it("wires chat and recommendation services to the same reloadable retriever snapshot", () => {
    const initialChunk = chunk();
    const reloadedChunk = chunk({ chunk_id: "container-reloaded-chunk", source_id: "cdp-root", source_family: "cdp" });
    const retrievers = [createRetriever(), createRetriever()];
    const chunksByLoad = [[initialChunk], [reloadedChunk]];
    vi.stubEnv("OPENAI_COMPAT_BASE_URL", "https://model.test");
    vi.stubEnv("OPENAI_COMPAT_API_KEY", "test-key");
    vi.stubEnv("OPENAI_COMPAT_MODEL", "test-model");
    overrideKnowledgeBaseRetrieverForTest({
      loader: () => chunksByLoad.shift() ?? [reloadedChunk],
      retrieverFactory: () => retrievers.shift() ?? createRetriever(),
      clock: () => new Date("2026-05-22T00:00:00.000Z"),
    });

    const sharedService = getKnowledgeBaseRetrieverService();
    const chatService = getChatService();
    const recommendationService = getRecommendationService();

    expect(serviceRetriever(chatService)).toBe(sharedService);
    expect(serviceRetriever(recommendationService)).toBe(sharedService);
    expect(serviceAuditInternals(chatService).auditLogger).toEqual(expect.any(Function));
    expect(serviceAuditInternals(chatService).auditLogPath).toBeUndefined();
    expect(sharedService.metadata()).toMatchObject({ version: 1, stats: { chunk_count: 1, source_family_counts: { ibus: 1 } } });

    sharedService.reload();

    expect(sharedService.metadata()).toMatchObject({ version: 2, stats: { chunk_count: 1, source_family_counts: { cdp: 1 } } });
    expect(serviceRetriever(chatService)).toBe(sharedService);
    expect(serviceRetriever(recommendationService)).toBe(sharedService);
  });
});
