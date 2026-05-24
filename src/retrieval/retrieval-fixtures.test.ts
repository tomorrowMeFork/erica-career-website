import { describe, expect, it } from "vitest";

import type { KnowledgeChunk } from "../ingestion/normalized-record.js";
import { loadKnowledgeBaseChunks } from "../knowledge-base/jsonl-loader.js";
import { getCategoryLabelKo } from "../knowledge-base/taxonomy.js";
import { Bm25Retriever } from "./bm25-retriever.js";
import { expandDomainSynonyms } from "./domain-synonyms.js";
import { hangulNgrams } from "./normalize-korean.js";

function fixtureChunk(overrides: {
  chunk_id: string;
  title: string;
  text: string;
  collection_category?: KnowledgeChunk["collection_category"];
  deadline_status?: KnowledgeChunk["deadline_status"];
  deadline_raw_text?: string;
  source_family?: KnowledgeChunk["source_family"];
  source_id?: string;
}): KnowledgeChunk {
  const sourceUrl = `https://example.hanyang.ac.kr/${overrides.chunk_id}`;
  const collectionCategory = overrides.collection_category ?? "job_posting";

  return {
    chunk_id: overrides.chunk_id,
    record_id: `record-${overrides.chunk_id}`,
    source_id: overrides.source_id ?? "test-source",
    source_name: "Test Source",
    source_url: sourceUrl,
    canonical_url: sourceUrl,
    title: overrides.title,
    category: getCategoryLabelKo(collectionCategory),
    collection_category: collectionCategory,
    source_family: overrides.source_family ?? "cdp",
    category_label_ko: getCategoryLabelKo(collectionCategory),
    fetched_at: "2026-05-04T00:00:00.000Z",
    posted_at: "2026-05-01T00:00:00.000Z",
    deadline_status: overrides.deadline_status ?? "active",
    deadline_raw_text: overrides.deadline_raw_text ?? (overrides.deadline_status === "expired" ? "마감" : "2026-06-01 마감"),
    content_hash: "a".repeat(64),
    citation_anchors: [{ url: sourceUrl, label: overrides.title }],
    source_text_trust: "untrusted_source_text",
    chunk_ordinal: 0,
    text: overrides.text,
  };
}

describe("Korean retrieval query processing", () => {
  it("expands only explicit domain synonyms for Korean career-service terms", () => {
    expect(expandDomainSynonyms(["자소서"])).toContain("자기소개서");
    expect(expandDomainSynonyms(["상담"])).toEqual(expect.arrayContaining(["컨설팅", "상담예약"]));
    expect(expandDomainSynonyms(["intern"])).toContain("인턴");
    expect(expandDomainSynonyms(["가이드북"])).toContain("매뉴얼");
  });

  it("generates Hangul 2-grams and 3-grams for service queries", () => {
    const grams = hangulNgrams("상담예약");

    expect(grams).toEqual(expect.arrayContaining(["상담", "담예", "예약", "상담예", "담예약"]));
  });
});

describe("Bm25Retriever over Phase 2 fixtures", () => {
  it("applies collection category filters before scoring and topK", async () => {
    const retriever = new Bm25Retriever([
      fixtureChunk({
        chunk_id: "job-posting",
        title: "백엔드 채용 공고",
        text: "백엔드 채용 모집 공고 취업성공후기 키워드가 포함된 채용 안내",
        collection_category: "job_posting",
      }),
      fixtureChunk({
        chunk_id: "career-review",
        title: "선배 취업성공후기",
        text: "선배 취업성공후기와 백엔드 면접 준비 경험 공유",
        collection_category: "career_review",
      }),
    ]);

    const results = await retriever.retrieve({ query: "백엔드 채용 취업성공후기", topK: 5, filters: { collection_categories: ["career_review"] } });

    expect(results.map((result) => result.chunk.chunk_id)).toEqual(["career-review"]);
    expect(results.every((result) => result.chunk.collection_category === "career_review")).toBe(true);
  });

  it("treats empty filters as unfiltered retrieval", async () => {
    const retriever = new Bm25Retriever([
      fixtureChunk({ chunk_id: "job-posting", title: "백엔드 채용 공고", text: "백엔드 채용 모집 공고" }),
      fixtureChunk({ chunk_id: "career-review", title: "선배 취업성공후기", text: "백엔드 취업성공후기 면접 경험", collection_category: "career_review" }),
    ]);

    const unfiltered = await retriever.retrieve({ query: "백엔드 채용 취업성공후기", topK: 5 });
    const emptyFiltered = await retriever.retrieve({
      query: "백엔드 채용 취업성공후기",
      topK: 5,
      filters: { collection_categories: [], source_families: [], source_ids: [], deadline_statuses: [] },
    });

    expect(emptyFiltered.map((result) => result.chunk.chunk_id)).toEqual(unfiltered.map((result) => result.chunk.chunk_id));
    expect(emptyFiltered.map((result) => result.score)).toEqual(unfiltered.map((result) => result.score));
  });

  it("does not widen results when hard filters leave no scoring candidates", async () => {
    const retriever = new Bm25Retriever([
      fixtureChunk({ chunk_id: "job-posting", title: "백엔드 채용 공고", text: "백엔드 채용 모집 공고", collection_category: "job_posting" }),
    ]);

    const results = await retriever.retrieve({ query: "백엔드 채용", topK: 5, filters: { collection_categories: ["career_review"] } });

    expect(results).toEqual([]);
  });

  it("applies deadline filters using the retrieval date rather than stale stored status", async () => {
    const retriever = new Bm25Retriever(
      [
        fixtureChunk({
          chunk_id: "expired-now",
          title: "백엔드 인턴 채용",
          text: "백엔드 인턴 채용 공고",
          deadline_status: "active",
          deadline_raw_text: "~5/14",
        }),
        fixtureChunk({
          chunk_id: "active-now",
          title: "프론트엔드 인턴 채용",
          text: "프론트엔드 인턴 채용 공고",
          deadline_status: "active",
          deadline_raw_text: "~5/31",
        }),
      ],
      { referenceDate: new Date("2026-05-22T00:00:00.000Z") },
    );

    const activeResults = await retriever.retrieve({ query: "인턴 채용", topK: 5, filters: { deadline_statuses: ["active"] } });
    const expiredResults = await retriever.retrieve({ query: "인턴 채용", topK: 5, filters: { deadline_statuses: ["expired"] } });

    expect(activeResults.map((result) => result.chunk.chunk_id)).toEqual(["active-now"]);
    expect(activeResults[0]?.chunk.deadline_status).toBe("active");
    expect(expiredResults.map((result) => result.chunk.chunk_id)).toEqual(["expired-now"]);
    expect(expiredResults[0]?.chunk.deadline_status).toBe("expired");
  });

  it("retrieves top-five counseling and consulting service evidence", async () => {
    const retriever = new Bm25Retriever(loadKnowledgeBaseChunks());

    const results = await retriever.retrieve({ query: "상담예약이나 전문가 상담은 어디서 확인해?" });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
    expect(results[0]?.chunk.source_text_trust).toBe("untrusted_source_text");
    expect(results.some((result) => /상담|컨설팅/u.test(`${result.chunk.title} ${result.chunk.text}`))).toBe(true);
    expect(results[0]?.ranking_features.boilerplate_penalty).toBeLessThan(2);
  });

  it("preserves CDP 학생 가이드북 page citation anchors", async () => {
    const retriever = new Bm25Retriever(loadKnowledgeBaseChunks());

    const results = await retriever.retrieve({ query: "CDP 학생 가이드북" });
    const guideResult = results.find((result) => result.chunk.citation_anchors.some((anchor) => anchor.page_number === 1 || anchor.url.includes("#page=1")));

    expect(guideResult).toBeDefined();
  });

  it("downranks boilerplate-only login and viewer-control chunks below answerable service evidence", async () => {
    const retriever = new Bm25Retriever(loadKnowledgeBaseChunks());

    const results = await retriever.retrieve({ query: "상담예약 컨설팅룸예약 취업프로그램" });
    const answerableIndex = results.findIndex((result) => result.ranking_features.boilerplate_penalty === 0);
    const boilerplateIndex = results.findIndex((result) => result.ranking_features.boilerplate_penalty >= 2);

    expect(answerableIndex).toBeGreaterThanOrEqual(0);
    if (boilerplateIndex >= 0) {
      expect(answerableIndex).toBeLessThan(boilerplateIndex);
    }
  });

  it("does not treat generic ERICA-only overlap as answerable library-seat evidence", async () => {
    const retriever = new Bm25Retriever(loadKnowledgeBaseChunks());

    const results = await retriever.retrieve({ query: "ERICA 도서관 좌석 알려줘" });
    const meaningfulMatches = results[0]?.matched_terms.filter((term) => term.toLowerCase() !== "erica") ?? [];

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.matched_terms).toEqual(["erica"]);
    expect(meaningfulMatches).toEqual([]);
  });

  it.each([
    "현장실습 참여기업",
    "컨설팅룸예약",
    "자기소개서 첨삭",
    "취업준비도검사",
    "취업프로그램 직무부트캠프",
    "진로설계 경력개발 포트폴리오",
    "취업성공후기 선배 사례 인터뷰",
  ])("retrieves meaningful listing or campus-service chunks for %s", async (query) => {
    const retriever = new Bm25Retriever(loadKnowledgeBaseChunks());

    const results = await retriever.retrieve({ query });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.normalized_score).toBeGreaterThan(0);
    expect(results[0]?.chunk.citation_anchors.length).toBeGreaterThan(0);
  });
});
