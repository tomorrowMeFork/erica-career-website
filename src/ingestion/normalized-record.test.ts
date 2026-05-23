import { describe, expect, it } from "vitest";

import {
  CategoryLabelKoByCollectionCategory,
  CollectionCategoryValues,
  getCategoryLabelKo,
  SourceFamilyValues,
} from "../knowledge-base/taxonomy.js";
import {
  CitationAnchorSchema,
  IngestionRunManifestSchema,
  type KnowledgeChunk,
  KnowledgeChunkSchema,
  type NormalizedRecord,
  NormalizedRecordSchema,
} from "./normalized-record.js";

const contentHash = "a".repeat(64);

const validHtmlRecord: NormalizedRecord = {
  record_id: "record-ibus-1",
  source_id: "ibus-employment-board",
  source_name: "경상대학 취업정보 게시판",
  source_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
  canonical_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
  title: "ERICA 채용 공고",
  category: "취업정보",
  collection_category: "job_posting",
  source_family: "ibus",
  category_label_ko: "채용공고",
  fetched_at: "2026-05-03T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active",
  deadline_raw_text: "마감 2026-05-31",
  raw_text: "ERICA 채용 공고\n마감 2026-05-31\nhttps://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
  cleaned_text: "ERICA 채용 공고\n\n마감 2026-05-31\n\n공식 상세 URL: https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
  content_hash: contentHash,
  citation_anchors: [
    {
      url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
      label: "공식 채용 상세 페이지",
    },
  ],
  source_text_trust: "untrusted_source_text",
};

const validPdfRecord: NormalizedRecord = {
  ...validHtmlRecord,
  record_id: "record-cdp-pdf-1",
  source_id: "cdp-student-guide-pdf",
  source_name: "CDP 학생 매뉴얼 PDF",
  source_url: "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf",
  canonical_url: "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf#page=3",
  title: "CDP 학생 매뉴얼 3쪽",
  category: "학생 매뉴얼",
  collection_category: "guide",
  source_family: "cdp",
  category_label_ko: "가이드",
  posted_at: null,
  deadline_status: "unknown",
  deadline_raw_text: "",
  citation_anchors: [
    {
      url: "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf#page=3",
      label: "CDP 학생 매뉴얼 3쪽",
      page_number: 3,
    },
  ],
};

const validChunk: KnowledgeChunk = {
  chunk_id: "chunk-1",
  record_id: validHtmlRecord.record_id,
  source_id: validHtmlRecord.source_id,
  source_name: validHtmlRecord.source_name,
  source_url: validHtmlRecord.source_url,
  canonical_url: validHtmlRecord.canonical_url,
  title: validHtmlRecord.title,
  category: validHtmlRecord.category,
  collection_category: validHtmlRecord.collection_category,
  source_family: validHtmlRecord.source_family,
  category_label_ko: validHtmlRecord.category_label_ko,
  fetched_at: validHtmlRecord.fetched_at,
  posted_at: validHtmlRecord.posted_at,
  deadline_status: validHtmlRecord.deadline_status,
  deadline_raw_text: validHtmlRecord.deadline_raw_text,
  content_hash: validHtmlRecord.content_hash,
  citation_anchors: validHtmlRecord.citation_anchors,
  source_text_trust: "untrusted_source_text",
  chunk_ordinal: 0,
  text: validHtmlRecord.cleaned_text,
};

describe("NormalizedRecordSchema", () => {
  it("accepts a valid HTML listing record with an official detail URL", () => {
    expect(NormalizedRecordSchema.safeParse(validHtmlRecord).success).toBe(true);
  });

  it("accepts a valid PDF page record with page_number and #page= citation anchor", () => {
    expect(NormalizedRecordSchema.safeParse(validPdfRecord).success).toBe(true);
  });

  it("accepts every canonical collection category with its Korean label", () => {
    for (const collectionCategory of CollectionCategoryValues) {
      expect(
        NormalizedRecordSchema.safeParse({
          ...validHtmlRecord,
          collection_category: collectionCategory,
          category_label_ko: getCategoryLabelKo(collectionCategory),
        }).success,
      ).toBe(true);
    }
  });

  it("accepts every canonical source family", () => {
    for (const sourceFamily of SourceFamilyValues) {
      expect(NormalizedRecordSchema.safeParse({ ...validHtmlRecord, source_family: sourceFamily }).success).toBe(true);
    }
  });

  it("rejects raw Korean taxonomy enum values while preserving category as a breadcrumb", () => {
    expect(
      NormalizedRecordSchema.safeParse({
        ...validHtmlRecord,
        category: "취업 > 채용공고 > 2026 상반기",
      }).success,
    ).toBe(true);

    expect(
      NormalizedRecordSchema.safeParse({
        ...validHtmlRecord,
        collection_category: "취업",
        category_label_ko: "취업",
      }).success,
    ).toBe(false);
    expect(NormalizedRecordSchema.safeParse({ ...validHtmlRecord, source_family: "한양대" }).success).toBe(false);
  });

  it("rejects category_label_ko values that do not match the canonical collection category", () => {
    const result = NormalizedRecordSchema.safeParse({
      ...validHtmlRecord,
      collection_category: "career_review",
      category_label_ko: CategoryLabelKoByCollectionCategory.job_posting,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "category_label_ko")).toBe(true);
    }
  });

  it("rejects records without citation anchors", () => {
    const result = NormalizedRecordSchema.safeParse({ ...validHtmlRecord, citation_anchors: [] });

    expect(result.success).toBe(false);
  });

  it("rejects malformed citation URLs and malformed content hashes", () => {
    expect(
      NormalizedRecordSchema.safeParse({
        ...validHtmlRecord,
        canonical_url: "not-a-url",
      }).success,
    ).toBe(false);
    expect(NormalizedRecordSchema.safeParse({ ...validHtmlRecord, content_hash: "ABC" }).success).toBe(false);
  });

  it("rejects unsafe official URL schemes in source, canonical, and citation fields", () => {
    for (const unsafeUrl of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://example.com/file"] as const) {
      expect(NormalizedRecordSchema.safeParse({ ...validHtmlRecord, source_url: unsafeUrl }).success).toBe(false);
      expect(NormalizedRecordSchema.safeParse({ ...validHtmlRecord, canonical_url: unsafeUrl }).success).toBe(false);
      expect(
        NormalizedRecordSchema.safeParse({
          ...validHtmlRecord,
          citation_anchors: [{ url: unsafeUrl, label: "unsafe citation" }],
        }).success,
      ).toBe(false);
    }
  });

  it("rejects missing source_text_trust: untrusted_source_text", () => {
    const candidate: Partial<NormalizedRecord> = { ...validHtmlRecord };
    delete candidate.source_text_trust;

    expect(NormalizedRecordSchema.safeParse(candidate).success).toBe(false);
    expect(NormalizedRecordSchema.safeParse({ ...validHtmlRecord, source_text_trust: "trusted" }).success).toBe(false);
  });
});

describe("CitationAnchorSchema", () => {
  it("requires positive page_number for PDF #page anchors", () => {
    expect(
      CitationAnchorSchema.safeParse({
        url: "https://cdp.hanyang.ac.kr/office/manual.pdf#page=2",
        label: "PDF 2쪽",
      }).success,
    ).toBe(false);
    expect(
      CitationAnchorSchema.safeParse({
        url: "https://cdp.hanyang.ac.kr/office/manual.pdf#page=2",
        label: "PDF 2쪽",
        page_number: 0,
      }).success,
    ).toBe(false);
  });
});

describe("KnowledgeChunkSchema", () => {
  it("preserves source metadata, citation anchors, content hash, and source text trust", () => {
    expect(KnowledgeChunkSchema.safeParse(validChunk).success).toBe(true);
  });

  it("requires canonical taxonomy fields while leaving category free-form", () => {
    expect(
      KnowledgeChunkSchema.safeParse({
        ...validChunk,
        category: "취업 > 추천 채용",
        collection_category: "job_posting",
        source_family: "ibus",
        category_label_ko: "채용공고",
      }).success,
    ).toBe(true);
    expect(KnowledgeChunkSchema.safeParse({ ...validChunk, collection_category: "취업" }).success).toBe(false);
  });

  it("rejects chunks without the untrusted source text marker", () => {
    expect(KnowledgeChunkSchema.safeParse({ ...validChunk, source_text_trust: "trusted" }).success).toBe(false);
  });
});

describe("IngestionRunManifestSchema", () => {
  it("rejects duplicate record IDs", () => {
    const result = IngestionRunManifestSchema.safeParse({
      run_id: "run-1",
      generated_at: "2026-05-03T00:00:00.000Z",
      source_ids: [validHtmlRecord.source_id],
      records: [validHtmlRecord, { ...validHtmlRecord }],
      chunks: [validChunk],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("Duplicate record_id"))).toBe(true);
    }
  });

  it("rejects duplicate chunk IDs", () => {
    const result = IngestionRunManifestSchema.safeParse({
      run_id: "run-1",
      generated_at: "2026-05-03T00:00:00.000Z",
      source_ids: [validHtmlRecord.source_id],
      records: [validHtmlRecord],
      chunks: [validChunk, { ...validChunk }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("Duplicate chunk_id"))).toBe(true);
    }
  });
});
