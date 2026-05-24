import { describe, expect, it, vi } from "vitest";

import type { KnowledgeChunk } from "../ingestion/normalized-record.js";
import type { RetrievedChunk, Retriever } from "../retrieval/retriever.js";
import { ReloadableKnowledgeBaseRetriever } from "./reloadable-retriever-service.js";

function chunk(overrides: Partial<KnowledgeChunk> = {}): KnowledgeChunk {
  return {
    chunk_id: "chunk-001",
    record_id: "record-001",
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

function retrieved(sourceChunk: KnowledgeChunk): RetrievedChunk {
  return {
    chunk: sourceChunk,
    score: 1,
    normalized_score: 1,
    matched_terms: ["ERICA"],
    ranking_features: {
      lexical_score: 1,
      title_boost: 0,
      category_boost: 0,
      freshness_boost: 0,
      deadline_penalty: 0,
      boilerplate_penalty: 0,
    },
  };
}

function retrieverFor(sourceChunk: KnowledgeChunk): Retriever {
  return { retrieve: vi.fn(async () => [retrieved(sourceChunk)]) };
}

describe("ReloadableKnowledgeBaseRetriever", () => {
  it("exposes current snapshot metadata, stats, version, and retriever access", async () => {
    const sourceChunk = chunk();
    const retriever = retrieverFor(sourceChunk);
    const service = new ReloadableKnowledgeBaseRetriever({
      loader: () => [sourceChunk],
      retrieverFactory: () => retriever,
      clock: () => new Date("2026-05-22T00:00:00.000Z"),
    });

    expect(service.currentRetriever()).toBe(retriever);
    expect(service.metadata()).toEqual({
      version: 1,
      loaded_at: "2026-05-22T00:00:00.000Z",
      stats: {
        chunk_count: 1,
        source_count: 1,
        collection_category_counts: { job_posting: 1 },
        source_family_counts: { ibus: 1 },
      },
    });
    await expect(service.retrieve({ query: "ERICA" })).resolves.toEqual([retrieved(sourceChunk)]);
  });

  it("swaps to a newly built retriever snapshot on successful reload", async () => {
    const firstChunk = chunk({ chunk_id: "first-chunk" });
    const secondChunk = chunk({ chunk_id: "second-chunk", source_id: "cdp-root", source_family: "cdp" });
    const chunksByLoad = [[firstChunk], [secondChunk]];
    const retrievers = [retrieverFor(firstChunk), retrieverFor(secondChunk)];
    const service = new ReloadableKnowledgeBaseRetriever({
      loader: () => chunksByLoad.shift() ?? [secondChunk],
      retrieverFactory: () => retrievers.shift() ?? retrieverFor(secondChunk),
      clock: () => new Date("2026-05-22T00:00:00.000Z"),
    });
    const firstRetriever = service.currentRetriever();

    const metadata = service.reload();

    expect(metadata.version).toBe(2);
    expect(service.currentRetriever()).not.toBe(firstRetriever);
    expect(service.stats()).toMatchObject({
      chunk_count: 1,
      source_count: 1,
      source_family_counts: { cdp: 1 },
    });
    await expect(service.retrieve({ query: "ERICA" })).resolves.toEqual([retrieved(secondChunk)]);
  });

  it("keeps the old snapshot active when reload fails before the swap", async () => {
    const sourceChunk = chunk();
    const oldRetriever = retrieverFor(sourceChunk);
    const service = new ReloadableKnowledgeBaseRetriever({
      loader: () => [sourceChunk],
      retrieverFactory: vi.fn().mockReturnValueOnce(oldRetriever).mockImplementationOnce(() => {
        throw new Error("failed to build retriever");
      }),
      clock: () => new Date("2026-05-22T00:00:00.000Z"),
    });
    const oldMetadata = service.metadata();

    expect(() => service.reload()).toThrow("failed to build retriever");

    expect(service.currentRetriever()).toBe(oldRetriever);
    expect(service.metadata()).toEqual(oldMetadata);
    await expect(service.retrieve({ query: "ERICA" })).resolves.toEqual([retrieved(sourceChunk)]);
  });
});
