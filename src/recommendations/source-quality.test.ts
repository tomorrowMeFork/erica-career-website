import { describe, expect, it } from "vitest";

import type { RetrievedChunk } from "../retrieval/retriever.js";
import { scoreSourceQuality } from "./source-quality.js";

const referenceDate = new Date("2026-05-04T00:00:00.000Z");

function candidate(overrides: {
  chunk_id: string;
  title: string;
  source_url: string;
  anchor_url?: string;
  posted_at: string | null;
  fetched_at: string;
  deadline_status: "active" | "expired" | "unknown";
  text: string;
  boilerplate_penalty: number;
  page_number?: number;
}): RetrievedChunk {
  return {
    chunk: {
      chunk_id: overrides.chunk_id,
      record_id: `record-${overrides.chunk_id}`,
      source_id: "cdp-recruit",
      source_name: "ERICA Career Development",
      source_url: overrides.source_url,
      canonical_url: overrides.source_url,
      title: overrides.title,
      category: "채용",
      fetched_at: overrides.fetched_at,
      posted_at: overrides.posted_at,
      deadline_status: overrides.deadline_status,
      deadline_raw_text: overrides.deadline_status === "active" ? "2026-06-01 마감" : "마감",
      content_hash: "a".repeat(64),
      citation_anchors: [
        {
          url: overrides.anchor_url ?? overrides.source_url,
          label: overrides.title,
          page_number: overrides.page_number,
        },
      ],
      source_text_trust: "untrusted_source_text",
      chunk_ordinal: 0,
      text: overrides.text,
    },
    score: 1,
    normalized_score: 1,
    matched_terms: ["채용"],
    ranking_features: {
      lexical_score: 1,
      title_boost: 0,
      category_boost: 0,
      freshness_boost: 0,
      deadline_penalty: 0,
      boilerplate_penalty: overrides.boilerplate_penalty,
    },
  };
}

describe("scoreSourceQuality", () => {
  it("scores active detailed candidates above a generic root/menu candidate", () => {
    const detailed = candidate({
      chunk_id: "detail",
      title: "백엔드 개발자 채용 공고",
      source_url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=123",
      posted_at: "2026-05-02T00:00:00.000Z",
      fetched_at: "2026-05-03T00:00:00.000Z",
      deadline_status: "active",
      text: "상세 직무와 모집 요강이 포함된 채용 공고입니다.",
      boilerplate_penalty: 0,
    });
    const genericRoot = candidate({
      chunk_id: "root",
      title: "CDP 메뉴",
      source_url: "https://cdp.hanyang.ac.kr/",
      posted_at: null,
      fetched_at: "2025-01-01T00:00:00.000Z",
      deadline_status: "unknown",
      text: "로그인 메뉴 공지사항 채용정보 상담 메뉴 바로가기",
      boilerplate_penalty: 2,
    });

    expect(scoreSourceQuality(detailed, referenceDate).final_score).toBeGreaterThan(scoreSourceQuality(genericRoot, referenceDate).final_score);
    expect(scoreSourceQuality(detailed, referenceDate).citation_detail_score).toBeGreaterThan(scoreSourceQuality(genericRoot, referenceDate).citation_detail_score);
  });

  it("penalizes expired and stale listing-like candidates relative to active candidates", () => {
    const active = candidate({
      chunk_id: "active",
      title: "데이터 엔지니어 인턴 모집",
      source_url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=456",
      posted_at: "2026-05-01T00:00:00.000Z",
      fetched_at: "2026-05-03T00:00:00.000Z",
      deadline_status: "active",
      text: "인턴 모집 상세 내용과 지원 기한이 있습니다.",
      boilerplate_penalty: 0,
    });
    const expired = candidate({
      chunk_id: "expired",
      title: "데이터 엔지니어 인턴 모집 종료",
      source_url: "https://cdp.hanyang.ac.kr/recruit/view.do?seq=457",
      posted_at: "2025-01-01T00:00:00.000Z",
      fetched_at: "2025-01-02T00:00:00.000Z",
      deadline_status: "expired",
      text: "이미 마감된 인턴 모집 상세 내용입니다.",
      boilerplate_penalty: 0.2,
    });

    const activeScore = scoreSourceQuality(active, referenceDate);
    const expiredScore = scoreSourceQuality(expired, referenceDate);

    expect(activeScore.freshness_score).toBeGreaterThan(expiredScore.freshness_score);
    expect(activeScore.final_score).toBeGreaterThan(expiredScore.final_score);
  });

  it("rewards page-level citation anchors for official guide content", () => {
    const pageCited = candidate({
      chunk_id: "guide-page",
      title: "취업 가이드 PDF 5쪽",
      source_url: "https://cdp.hanyang.ac.kr/guide.pdf",
      anchor_url: "https://cdp.hanyang.ac.kr/guide.pdf#page=5",
      page_number: 5,
      posted_at: null,
      fetched_at: "2026-05-01T00:00:00.000Z",
      deadline_status: "unknown",
      text: "진로 상담 절차 안내",
      boilerplate_penalty: 0,
    });

    expect(scoreSourceQuality(pageCited, referenceDate).citation_detail_score).toBe(1);
  });
});
