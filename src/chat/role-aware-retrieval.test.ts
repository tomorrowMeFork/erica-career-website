import { describe, expect, it, vi } from "vitest";

import type { KnowledgeChunk } from "../ingestion/normalized-record.js";
import { type CollectionCategory, getCategoryLabelKo } from "../knowledge-base/taxonomy.js";
import type { RetrievedChunk, RetrieveInput, Retriever } from "../retrieval/retriever.js";
import { retrieveRoleAwareEvidence } from "./role-aware-retrieval.js";

function chunk(collectionCategory: CollectionCategory, suffix = collectionCategory): KnowledgeChunk {
  return {
    chunk_id: `chunk-${suffix}`,
    record_id: `record-${suffix}`,
    source_id: `source-${suffix}`,
    source_name: "ERICA Career Source",
    source_url: `https://example.edu/${suffix}`,
    canonical_url: `https://example.edu/${suffix}`,
    title: `${getCategoryLabelKo(collectionCategory)} 자료`,
    category: getCategoryLabelKo(collectionCategory),
    collection_category: collectionCategory,
    source_family: collectionCategory.includes("review") ? "book" : "cdp",
    category_label_ko: getCategoryLabelKo(collectionCategory),
    fetched_at: "2026-05-04T00:00:00.000Z",
    posted_at: "2026-05-01T00:00:00.000Z",
    deadline_status: "active",
    deadline_raw_text: "진행 중",
    content_hash: "d".repeat(64),
    citation_anchors: [{ url: `https://example.edu/${suffix}`, label: `${getCategoryLabelKo(collectionCategory)} 출처` }],
    source_text_trust: "untrusted_source_text",
    chunk_ordinal: 0,
    text: `${getCategoryLabelKo(collectionCategory)} 근거 텍스트`,
  };
}

function result(collectionCategory: CollectionCategory, suffix = collectionCategory): RetrievedChunk {
  return {
    chunk: chunk(collectionCategory, suffix),
    score: 1,
    normalized_score: 1,
    matched_terms: ["취업"],
    ranking_features: { lexical_score: 1, title_boost: 0, category_boost: 0, freshness_boost: 0, deadline_penalty: 0, boilerplate_penalty: 0 },
  };
}

function filteringRetriever(calls: RetrieveInput[]): Retriever {
  const results = [result("job_posting"), result("career_review"), result("guide"), result("internship_notice")];
  return {
    retrieve: vi.fn(async (input: RetrieveInput) => {
      calls.push(input);
      const categories = input.filters?.collection_categories;
      return categories === undefined ? results : results.filter((item) => categories.includes(item.chunk.collection_category));
    }),
  };
}

describe("retrieveRoleAwareEvidence", () => {
  it("retrieves a balanced mix of opportunities, reviews, and guides for career advice questions", async () => {
    const calls: RetrieveInput[] = [];
    const results = await retrieveRoleAwareEvidence({
      retriever: filteringRetriever(calls),
      query: "백엔드 취업 준비가 고민인데 뭘 보면 좋을까?",
      topK: 5,
    });

    expect(calls.map((call) => call.filters?.collection_categories)).toEqual([
      ["job_posting", "career_program"],
      ["career_review", "internship_review"],
      ["guide", "notice"],
      undefined,
    ]);
    expect(results.map((item) => item.chunk.collection_category)).toEqual(expect.arrayContaining(["job_posting", "career_review", "guide", "internship_notice"]));
  });

  it("recognizes broad CS-major career-planning questions as mixed evidence requests", async () => {
    const calls: RetrieveInput[] = [];

    await retrieveRoleAwareEvidence({
      retriever: filteringRetriever(calls),
      query: "난 대학교2학년인데 취업을 위해 뭔 활동을 하면 좋을까? 지금 컴퓨터공학과고 컴공쪽으로 하려고 해. 세부분야는 못 정했어",
      topK: 5,
    });

    expect(calls.map((call) => call.filters?.collection_categories)).toEqual([
      ["job_posting", "career_program"],
      ["career_review", "internship_review"],
      ["guide", "notice"],
      undefined,
    ]);
  });

  it("keeps explicit category filters as hard constraints", async () => {
    const calls: RetrieveInput[] = [];
    const results = await retrieveRoleAwareEvidence({
      retriever: filteringRetriever(calls),
      query: "취업후기만 참고해서 조언해줘",
      topK: 5,
      filters: { collection_categories: ["career_review"] },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.filters).toEqual({ collection_categories: ["career_review"] });
    expect(results.map((item) => item.chunk.collection_category)).toEqual(["career_review"]);
  });
});
