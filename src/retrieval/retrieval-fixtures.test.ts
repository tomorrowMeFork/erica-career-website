import { describe, expect, it } from "vitest";

import { loadKnowledgeBaseChunks } from "../knowledge-base/jsonl-loader.js";
import { Bm25Retriever } from "./bm25-retriever.js";
import { expandDomainSynonyms } from "./domain-synonyms.js";
import { hangulNgrams } from "./normalize-korean.js";

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
