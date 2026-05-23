import { describe, expect, it } from "vitest";

import type { DeadlineStatus } from "../ingestion/normalized-record.js";
import { type CollectionCategory, getCategoryLabelKo, type SourceFamily } from "../knowledge-base/taxonomy.js";
import { PreferenceService } from "../personalization/preference-service.js";
import { InMemoryPreferenceStore } from "../personalization/preference-store.js";
import type { RetrievedChunk, RetrieveInput, Retriever } from "../retrieval/retriever.js";
import { RecommendationService } from "./recommendation-service.js";

const referenceDate = new Date("2026-05-04T00:00:00.000Z");

function candidate(overrides: {
  chunk_id: string;
  title: string;
  text: string;
  normalized_score?: number;
  posted_at?: string | null;
  deadline_status?: DeadlineStatus;
  source_id?: string;
  source_family?: SourceFamily;
  collection_category?: CollectionCategory;
}): RetrievedChunk {
  const sourceUrl = `https://cdp.hanyang.ac.kr/recruit/view.do?seq=${overrides.chunk_id}`;
  const sourceId = overrides.source_id ?? "cdp-recruit";
  return {
    chunk: {
      chunk_id: overrides.chunk_id,
      record_id: `record-${overrides.chunk_id}`,
      source_id: sourceId,
      source_name: "ERICA Career Development",
      source_url: sourceUrl,
      canonical_url: sourceUrl,
      title: overrides.title,
      category: "채용",
      collection_category: overrides.collection_category ?? "job_posting",
      source_family: overrides.source_family ?? "cdp",
      category_label_ko: getCategoryLabelKo(overrides.collection_category ?? "job_posting"),
      fetched_at: "2026-05-04T00:00:00.000Z",
      posted_at: overrides.posted_at ?? "2026-05-01T00:00:00.000Z",
      deadline_status: overrides.deadline_status ?? "active",
      deadline_raw_text: overrides.deadline_status === "expired" ? "마감" : "2026-06-01 마감",
      content_hash: "c".repeat(64),
      citation_anchors: [{ url: sourceUrl, label: overrides.title }],
      source_text_trust: "untrusted_source_text",
      chunk_ordinal: 0,
      text: overrides.text,
    },
    score: overrides.normalized_score ?? 0.5,
    normalized_score: overrides.normalized_score ?? 0.5,
    matched_terms: ["채용", "인턴"],
    ranking_features: {
      lexical_score: overrides.normalized_score ?? 0.5,
      title_boost: 0,
      category_boost: 0,
      freshness_boost: 0,
      deadline_penalty: 0,
      boilerplate_penalty: 0,
    },
  };
}

function retrieverWith(candidates: RetrievedChunk[], calls: RetrieveInput[]): Retriever {
  return {
    async retrieve(input) {
      calls.push(input);
      return candidates;
    },
  };
}

function filteredRetrieverWith(candidates: RetrievedChunk[], calls: RetrieveInput[]): Retriever {
  return {
    async retrieve(input) {
      calls.push(input);
      return candidates.filter(
        (candidate) =>
          (input.filters?.collection_categories === undefined || input.filters.collection_categories.includes(candidate.chunk.collection_category)) &&
          (input.filters?.source_families === undefined || input.filters.source_families.includes(candidate.chunk.source_family)) &&
          (input.filters?.source_ids === undefined || input.filters.source_ids.includes(candidate.chunk.source_id)) &&
          (input.filters?.deadline_statuses === undefined || input.filters.deadline_statuses.includes(candidate.chunk.deadline_status)),
      );
    },
  };
}

describe("RecommendationService", () => {
  it("returns ranked Korean cited recommendations whose order changes with explicit preferences", async () => {
    const backend = candidate({
      chunk_id: "backend",
      title: "컴퓨터학부 백엔드 개발자 인턴 모집",
      text: "컴퓨터학부 백엔드 개발자 핀테크 서울 인턴 채용",
      normalized_score: 0.4,
    });
    const design = candidate({
      chunk_id: "design",
      title: "디자인학부 UX 디자이너 채용",
      text: "디자인학부 UX 디자이너 서울 채용",
      normalized_score: 0.4,
    });
    const calls: RetrieveInput[] = [];
    const service = new RecommendationService({
      retriever: retrieverWith([design, backend], calls),
      clock: () => referenceDate,
      traceIdGenerator: () => "trace-preference",
    });

    const backendResponse = await service.recommend({
      profile: { major: "컴퓨터학부", target_role: "백엔드 개발자", industry: [], region: [], employment_type: [], deadline_sensitivity: "balanced" },
      limit: 2,
    });
    const designResponse = await service.recommend({
      profile: { major: "디자인학부", target_role: "UX 디자이너", industry: [], region: [], employment_type: [], deadline_sensitivity: "balanced" },
      limit: 2,
    });

    expect(backendResponse.recommendations[0]?.chunk_id).toBe("backend");
    expect(designResponse.recommendations[0]?.chunk_id).toBe("design");
    expect(backendResponse.privacy_metadata.preference_ranking_enabled).toBe(true);
    expect(backendResponse.recommendations[0]?.match_reasons?.join(" ")).toContain("[1]");
    expect(calls[0]?.query).toContain("컴퓨터학부");
    expect(calls[0]?.query).toContain("백엔드 개발자");
  });

  it("retrieves a larger candidate pool than the final limit before reranking", async () => {
    const broadMatch = candidate({
      chunk_id: "broad",
      title: "일반 채용 공고",
      text: "일반 채용 모집 안내",
      normalized_score: 0.9,
    });
    const backend = candidate({
      chunk_id: "backend",
      title: "컴퓨터학부 백엔드 개발자 인턴 모집",
      text: "컴퓨터학부 백엔드 개발자 핀테크 서울 인턴 채용",
      normalized_score: 0.4,
    });
    const candidates = [broadMatch, backend];
    const calls: RetrieveInput[] = [];
    const service = new RecommendationService({
      retriever: {
        async retrieve(input) {
          calls.push(input);
          return candidates.slice(0, input.topK ?? candidates.length);
        },
      },
      clock: () => referenceDate,
      traceIdGenerator: () => "trace-pool",
    });

    const response = await service.recommend({
      profile: { major: "컴퓨터학부", target_role: "백엔드 개발자", industry: [], region: [], employment_type: [], deadline_sensitivity: "balanced" },
      limit: 1,
    });

    expect(calls[0]?.topK).toBeGreaterThan(1);
    expect(response.recommendations.map((recommendation) => recommendation.chunk_id)).toEqual(["backend"]);
  });

  it("supports no profile requests with general_recommendation items and citations", async () => {
    const calls: RetrieveInput[] = [];
    const service = new RecommendationService({
      retriever: retrieverWith(
        [candidate({ chunk_id: "general", title: "최신 채용 공고", text: "취업 프로그램과 채용 모집 안내", normalized_score: 0.7 })],
        calls,
      ),
      clock: () => referenceDate,
      traceIdGenerator: () => "trace-general",
    });

    const response = await service.recommend({ limit: 1 });

    expect(calls[0]).toEqual({
      query: "채용 모집 공고 취업 프로그램",
      topK: 3,
      filters: { collection_categories: ["job_posting", "career_program"] },
    });
    expect(response.preference_mode).toBe("no_preference");
    expect(response.privacy_metadata).toEqual({
      preference_ranking_enabled: false,
      profile_source: "none",
      storage_scope: "none",
    });
    expect(response.recommendations[0]?.match_strength).toBe("general_recommendation");
    expect(response.recommendations[0]?.citations[0]?.citation_id).toBe(1);
    expect(response.recommendations[0]?.match_reasons?.join(" ")).toContain("일반 안내");
  });

  it("passes taxonomy filters to retrieval and returns matching recommendations", async () => {
    const cdpCandidate = candidate({
      chunk_id: "cdp-job",
      title: "CDP 채용 공고",
      text: "CDP 채용 모집 안내",
      source_id: "cdp-recruit-general-board",
      source_family: "cdp",
      normalized_score: 0.9,
    });
    const ibusCandidate = candidate({
      chunk_id: "ibus-job",
      title: "ERICA 취업게시판 채용 공고",
      text: "ERICA 취업게시판 채용 모집 안내",
      source_id: "ibus-employment-board",
      source_family: "ibus",
      normalized_score: 0.7,
    });
    const calls: RetrieveInput[] = [];
    const service = new RecommendationService({
      retriever: filteredRetrieverWith([cdpCandidate, ibusCandidate], calls),
      clock: () => referenceDate,
      traceIdGenerator: () => "trace-filters",
    });

    const response = await service.recommend({
      query: "채용 공고",
      limit: 2,
      collection_categories: ["job_posting"],
      source_families: ["ibus"],
      deadline_statuses: ["active"],
    });

    expect(calls[0]).toEqual({
      query: "채용 공고",
      topK: 6,
      filters: {
        collection_categories: ["job_posting"],
        source_families: ["ibus"],
        deadline_statuses: ["active"],
      },
    });
    expect(response.recommendations.map((recommendation) => recommendation.source_id)).toEqual(["ibus-employment-board"]);
    expect(response.recommendations[0]).toMatchObject({
      collection_category: "job_posting",
      source_family: "ibus",
      category_label_ko: "채용공고",
    });
    expect(response.recommendations[0]?.citations[0]).toMatchObject({
      collection_category: "job_posting",
      source_family: "ibus",
      category_label_ko: "채용공고",
    });
  });

  it("uses opportunity categories by default so reviews and guides do not become recommendation cards", async () => {
    const job = candidate({ chunk_id: "job", title: "백엔드 채용 공고", text: "백엔드 채용 모집", collection_category: "job_posting" });
    const review = candidate({ chunk_id: "review", title: "백엔드 취업후기", text: "면접 준비 후기", collection_category: "career_review", source_family: "book" });
    const guide = candidate({ chunk_id: "guide", title: "CDP 상담 가이드", text: "상담예약 절차", collection_category: "guide" });
    const calls: RetrieveInput[] = [];
    const service = new RecommendationService({
      retriever: filteredRetrieverWith([review, guide, job], calls),
      clock: () => referenceDate,
      traceIdGenerator: () => "trace-opportunities-only",
    });

    const response = await service.recommend({ query: "백엔드 취업 준비에 볼 만한 것", limit: 3 });

    expect(calls[0]?.filters?.collection_categories).toEqual(["job_posting", "career_program"]);
    expect(response.recommendations.map((recommendation) => recommendation.chunk_id)).toEqual(["job"]);
  });

  it("includes internship notices as recommendation candidates for internship intent", async () => {
    const internship = candidate({
      chunk_id: "internship",
      title: "현장실습 참여기업 모집",
      text: "현장실습 인턴십 참여기업 모집 안내",
      collection_category: "internship_notice",
      source_family: "ewil",
    });
    const calls: RetrieveInput[] = [];
    const service = new RecommendationService({
      retriever: filteredRetrieverWith([internship], calls),
      clock: () => referenceDate,
      traceIdGenerator: () => "trace-internship",
    });

    const response = await service.recommend({ query: "현장실습 인턴 기회 추천해줘", limit: 1 });

    expect(calls[0]?.filters?.collection_categories).toEqual(["job_posting", "career_program", "internship_notice"]);
    expect(response.recommendations[0]?.collection_category).toBe("internship_notice");
  });

  it("uses preference service state when enabled without exposing session-only optional text", async () => {
    const store = new InMemoryPreferenceStore();
    const preferenceService = new PreferenceService(store);
    await preferenceService.setPreferences("session-1", {
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      session_only_optional_text: "원문에 노출되면 안 되는 자유 입력",
    });
    const calls: RetrieveInput[] = [];
    const service = new RecommendationService({
      retriever: retrieverWith(
        [candidate({ chunk_id: "backend", title: "컴퓨터학부 백엔드 개발자", text: "컴퓨터학부 백엔드 개발자 인턴" })],
        calls,
      ),
      preferenceService,
      clock: () => referenceDate,
      traceIdGenerator: () => "trace-state",
    });

    const response = await service.recommend({ session_key: "session-1", limit: 1 });
    const serialized = JSON.stringify(response);

    expect(response.privacy_metadata.profile_source).toBe("preference_service");
    expect(response.privacy_metadata.storage_scope).toBe("session");
    expect(calls[0]?.query).toContain("컴퓨터학부");
    expect(serialized).not.toContain("원문에 노출되면 안 되는 자유 입력");
    expect(serialized).not.toContain("session_only_optional_text");
  });

  it("does not expose raw source text or unmapped reason citations", async () => {
    const service = new RecommendationService({
      retriever: retrieverWith(
        [candidate({ chunk_id: "raw", title: "채용 공고", text: "RAW_SOURCE_SECRET 전체 원문 상세" })],
        [],
      ),
      clock: () => referenceDate,
      traceIdGenerator: () => "trace-safe",
    });

    const response = await service.recommend({ limit: 1 });
    const serialized = JSON.stringify(response);
    const allowedCitationIds = new Set(response.recommendations.flatMap((item) => item.citations.map((citation) => citation.citation_id)));
    const reasonMarkers = response.recommendations.flatMap((item) =>
      (item.match_reasons ?? []).flatMap((reason) => [...reason.matchAll(/\[(\d+)\]/gu)].map((match) => Number.parseInt(match[1] ?? "0", 10))),
    );

    expect(serialized).not.toContain("RAW_SOURCE_SECRET");
    expect(serialized).not.toContain("text");
    expect(reasonMarkers.every((marker) => allowedCitationIds.has(marker))).toBe(true);
  });
});
