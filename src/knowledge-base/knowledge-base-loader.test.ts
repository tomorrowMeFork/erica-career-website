import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  CDP_AUTHENTICATED_SOURCES_DATASET_NAME,
  CDP_AUTHENTICATED_SPLIT_DATASET_NAMES,
  DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES,
  EWIL_AUTHENTICATED_SOURCES_ROOT_NAME,
  EWIL_AUTHENTICATED_SPLIT_DATASET_NAMES,
  resolveKnowledgeBaseDatasets,
} from "./dataset-registry.js";
import { DEFAULT_KNOWLEDGE_BASE_DIRS, loadKnowledgeBaseChunks, OPTIONAL_KNOWLEDGE_BASE_DIRS } from "./jsonl-loader.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "kb-loader-"));
  tempDirs.push(dir);
  return dir;
}

function createLegacyChunk(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    chunk_id: "legacy-chunk",
    record_id: "legacy-record",
    source_id: "ibus-employment-board",
    source_name: "경상대학 취업정보 게시판",
    source_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
    canonical_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
    title: "Legacy chunk",
    category: "ERICA 경상대학 취업정보",
    fetched_at: "2026-05-03T00:00:00.000Z",
    posted_at: null,
    deadline_status: "unknown",
    deadline_raw_text: "",
    content_hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    citation_anchors: [{ url: "https://ibus.hanyang.ac.kr/front/recruit/r-1", label: "경상대학 취업정보 게시판" }],
    source_text_trust: "untrusted_source_text",
    chunk_ordinal: 0,
    text: "legacy citation anchor fixture",
    ...overrides,
  };
}

function writeDefaultDatasetChunks(rootDir: string): void {
  for (const name of DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES) {
    writeDatasetChunk(rootDir, name, {
      chunk_id: `${name}-chunk`,
      record_id: `${name}-record`,
      title: `${name} chunk`,
    });
  }
}

function writeDatasetChunk(rootDir: string, datasetName: string, chunk: Record<string, unknown>): void {
  const outputDir = join(rootDir, datasetName);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "chunks.jsonl"), `${JSON.stringify(createLegacyChunk(chunk))}\n`, "utf8");
}

function writeDatasetManifest(rootDir: string, datasetName: string, options: { chunkIds: string[]; chunkCount?: number; sourceIds?: string[] }): void {
  const outputDir = join(rootDir, datasetName);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, "manifest.json"),
    `${JSON.stringify({
      schema_version: "phase2-jsonl-kb-v1",
      run_id: `${datasetName}-run`,
      generated_at: "2026-05-03T00:00:00.000Z",
      source_ids: options.sourceIds ?? ["ibus-employment-board"],
      fetched_at: ["2026-05-03T00:00:00.000Z"],
      record_count: options.chunkIds.length,
      chunk_count: options.chunkCount ?? options.chunkIds.length,
      record_ids: options.chunkIds.map((chunkId) => `${chunkId}-record`),
      chunk_ids: options.chunkIds,
    })}\n`,
    "utf8",
  );
}

function ewilNoticeChunk(chunkId: string, title: string): Record<string, unknown> {
  return createLegacyChunk({
    chunk_id: chunkId,
    record_id: `${chunkId}-record`,
    source_id: "ewil-notice-board",
    source_name: "ERICA 현장실습 지원 시스템 공지사항",
    source_url: "https://e-wil.hanyang.ac.kr/notice/view.do?id=1",
    canonical_url: "https://e-wil.hanyang.ac.kr/notice/view.do?id=1",
    title,
    category: "ERICA 현장실습 지원 시스템 > 공지사항/인턴공고",
    collection_category: "internship_notice",
    source_family: "ewil",
    category_label_ko: "현장실습/인턴십 안내",
    citation_anchors: [{ url: "https://e-wil.hanyang.ac.kr/notice/view.do?id=1", label: "E-WIL 공지사항" }],
  });
}

function ewilReviewChunk(chunkId: string, title: string): Record<string, unknown> {
  return createLegacyChunk({
    chunk_id: chunkId,
    record_id: `${chunkId}-record`,
    source_id: "ewil-internship-reviews",
    source_name: "ERICA 현장실습 지원 시스템 실습 후기",
    source_url: "https://e-wil.hanyang.ac.kr/review/view.do?id=1",
    canonical_url: "https://e-wil.hanyang.ac.kr/review/view.do?id=1",
    title,
    category: "ERICA 현장실습 지원 시스템 > 실습 후기",
    collection_category: "internship_review",
    source_family: "ewil",
    category_label_ko: "현장실습 후기",
    citation_anchors: [{ url: "https://e-wil.hanyang.ac.kr/review/view.do?id=1", label: "E-WIL 실습 후기" }],
  });
}

describe("loadKnowledgeBaseChunks", () => {
  it("loads chunks from every default Phase 2 knowledge-base directory", () => {
    const chunks = loadKnowledgeBaseChunks();
    const sourceIds = new Set(chunks.map((chunk) => chunk.source_id));

    expect(DEFAULT_KNOWLEDGE_BASE_DIRS).toEqual([
      "data/knowledge-base/ibus-employment-board",
      "data/knowledge-base/fixture-cdp-pdf",
    ]);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(sourceIds).toContain("ibus-employment-board");
    expect(sourceIds).toContain("cdp-student-guide-pdf");
  });

  it("looks for split authenticated E-WIL category directories when present", () => {
    expect(OPTIONAL_KNOWLEDGE_BASE_DIRS).toEqual([
      "data/knowledge-base/cdp-authenticated-sources/일반채용공고",
      "data/knowledge-base/cdp-authenticated-sources/채용상담및설명회",
      "data/knowledge-base/ewil-authenticated-sources/공지사항",
      "data/knowledge-base/ewil-authenticated-sources/현장실습후기",
    ]);
  });

  it("reports explicit default and optional disabled dataset states", () => {
    const rootDir = createTempDir();

    const datasets = resolveKnowledgeBaseDatasets({ rootDir });

    for (const name of DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES) {
      expect(datasets).toContainEqual(expect.objectContaining({ id: name, state: "active" }));
    }
    expect(datasets).toContainEqual(expect.objectContaining({ id: CDP_AUTHENTICATED_SOURCES_DATASET_NAME, state: "disabled" }));
    expect(datasets).toContainEqual(expect.objectContaining({ id: EWIL_AUTHENTICATED_SOURCES_ROOT_NAME, state: "disabled" }));
  });

  it("loads the legacy bounded manual-session CDP authenticated root when split outputs are absent", () => {
    const rootDir = createTempDir();
    writeDefaultDatasetChunks(rootDir);
    writeDatasetChunk(rootDir, CDP_AUTHENTICATED_SOURCES_DATASET_NAME, {
      chunk_id: "cdp-authenticated-active-chunk",
      record_id: "cdp-authenticated-active-record",
      source_id: "cdp-recruit-event-board",
      source_name: "CDP 채용상담 및 설명회",
      source_url: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=12345",
      canonical_url: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=12345",
      title: "CDP authenticated active chunk",
      category: "CDP 채용정보 > 채용상담 및 설명회",
      collection_category: "career_program",
      source_family: "cdp",
      category_label_ko: "취업 프로그램",
    });

    const datasets = resolveKnowledgeBaseDatasets({ rootDir });
    const chunks = loadKnowledgeBaseChunks({ rootDir });

    expect(datasets).toContainEqual(expect.objectContaining({ id: CDP_AUTHENTICATED_SOURCES_DATASET_NAME, state: "legacy_fallback" }));
    expect(chunks.map((chunk) => chunk.chunk_id)).toContain("cdp-authenticated-active-chunk");
  });

  it("prefers split CDP authenticated source directories and never double-loads the legacy root", () => {
    const rootDir = createTempDir();
    writeDefaultDatasetChunks(rootDir);
    writeDatasetChunk(rootDir, CDP_AUTHENTICATED_SOURCES_DATASET_NAME, {
      chunk_id: "cdp-root-duplicate-chunk",
      record_id: "cdp-root-duplicate-record",
      source_id: "cdp-recruit-event-board",
      source_name: "CDP 채용상담 및 설명회",
      source_url: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=12345",
      canonical_url: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=12345",
      title: "legacy root CDP event",
      category: "CDP 채용정보 > 채용상담 및 설명회",
      collection_category: "career_program",
      source_family: "cdp",
      category_label_ko: "취업 프로그램",
    });
    writeDatasetChunk(rootDir, CDP_AUTHENTICATED_SPLIT_DATASET_NAMES[0], {
      chunk_id: "cdp-split-general-chunk",
      record_id: "cdp-split-general-record",
      source_id: "cdp-recruit-general-board",
      source_name: "CDP 일반채용공고",
      source_url: "https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?rcdx=AD86DBF4C11CD57FB2B7F210888D659A",
      canonical_url: "https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?rcdx=AD86DBF4C11CD57FB2B7F210888D659A",
      title: "split CDP general posting",
      category: "CDP 채용정보 > 일반채용공고",
      collection_category: "job_posting",
      source_family: "cdp",
      category_label_ko: "채용공고",
    });
    writeDatasetChunk(rootDir, CDP_AUTHENTICATED_SPLIT_DATASET_NAMES[1], {
      chunk_id: "cdp-split-event-chunk",
      record_id: "cdp-split-event-record",
      source_id: "cdp-recruit-event-board",
      source_name: "CDP 채용상담 및 설명회",
      source_url: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=12345",
      canonical_url: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=12345",
      title: "split CDP event",
      category: "CDP 채용정보 > 채용상담 및 설명회",
      collection_category: "career_program",
      source_family: "cdp",
      category_label_ko: "취업 프로그램",
    });

    const datasets = resolveKnowledgeBaseDatasets({ rootDir });
    const chunks = loadKnowledgeBaseChunks({ rootDir });
    const chunkIds = chunks.map((chunk) => chunk.chunk_id);

    expect(datasets).toContainEqual(expect.objectContaining({ id: CDP_AUTHENTICATED_SOURCES_DATASET_NAME, state: "disabled" }));
    expect(chunkIds).toContain("cdp-split-general-chunk");
    expect(chunkIds).toContain("cdp-split-event-chunk");
    expect(chunkIds).not.toContain("cdp-root-duplicate-chunk");
  });

  it("fails when a manifest chunk_count does not match loaded chunks", () => {
    const outputDir = createTempDir();
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "chunks.jsonl"), `${JSON.stringify(createLegacyChunk())}\n`, "utf8");
    writeDatasetManifest(outputDir, ".", { chunkIds: ["legacy-chunk"], chunkCount: 2 });

    expect(() => loadKnowledgeBaseChunks({ directories: [outputDir] })).toThrow("chunk_count 2 does not match chunks 1");
  });

  it("fails registry-loaded active datasets when manifest chunk ids do not align", () => {
    const rootDir = createTempDir();
    writeDefaultDatasetChunks(rootDir);
    writeDatasetManifest(rootDir, DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES[0], { chunkIds: ["different-chunk"] });

    expect(() => loadKnowledgeBaseChunks({ rootDir })).toThrow("manifest.json chunk_ids do not align");
  });

  it("loads the legacy E-WIL authenticated root when split category directories are absent", () => {
    const rootDir = createTempDir();
    writeDefaultDatasetChunks(rootDir);
    writeDatasetChunk(rootDir, EWIL_AUTHENTICATED_SOURCES_ROOT_NAME, ewilNoticeChunk("ewil-root-fallback-chunk", "legacy root E-WIL notice"));

    const datasets = resolveKnowledgeBaseDatasets({ rootDir });
    const chunks = loadKnowledgeBaseChunks({ rootDir });

    expect(datasets).toContainEqual(expect.objectContaining({ id: EWIL_AUTHENTICATED_SOURCES_ROOT_NAME, state: "legacy_fallback" }));
    expect(chunks.map((chunk) => chunk.chunk_id)).toContain("ewil-root-fallback-chunk");
  });

  it("prefers split E-WIL authenticated category directories and never double-loads the legacy root", () => {
    const rootDir = createTempDir();
    writeDefaultDatasetChunks(rootDir);
    writeDatasetChunk(rootDir, EWIL_AUTHENTICATED_SOURCES_ROOT_NAME, ewilNoticeChunk("ewil-root-duplicate-chunk", "legacy root duplicate"));
    writeDatasetChunk(rootDir, EWIL_AUTHENTICATED_SPLIT_DATASET_NAMES[0], ewilNoticeChunk("ewil-split-notice-chunk", "split E-WIL notice"));
    writeDatasetChunk(rootDir, EWIL_AUTHENTICATED_SPLIT_DATASET_NAMES[1], ewilReviewChunk("ewil-split-review-chunk", "split E-WIL review"));

    const datasets = resolveKnowledgeBaseDatasets({ rootDir });
    const chunks = loadKnowledgeBaseChunks({ rootDir });
    const chunkIds = chunks.map((chunk) => chunk.chunk_id);

    expect(datasets).toContainEqual(expect.objectContaining({ id: EWIL_AUTHENTICATED_SOURCES_ROOT_NAME, state: "disabled" }));
    expect(chunkIds).toContain("ewil-split-notice-chunk");
    expect(chunkIds).toContain("ewil-split-review-chunk");
    expect(chunkIds).not.toContain("ewil-root-duplicate-chunk");
    expect(chunks).toHaveLength(DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES.length + 2);
  });

  it("requires citation anchors and untrusted source text markers on every chunk", () => {
    const chunks = loadKnowledgeBaseChunks();

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.citation_anchors.length).toBeGreaterThan(0);
      expect(chunk.source_text_trust).toBe("untrusted_source_text");
    }
  });

  it("backfills taxonomy for known legacy chunks without taxonomy fields", () => {
    const outputDir = createTempDir();
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "chunks.jsonl"), `${JSON.stringify(createLegacyChunk())}\n`, "utf8");

    const chunks = loadKnowledgeBaseChunks({ directories: [outputDir] });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      source_id: "ibus-employment-board",
      category: "ERICA 경상대학 취업정보",
      collection_category: "job_posting",
      source_family: "ibus",
      category_label_ko: "채용공고",
    });
  });

  it("keeps explicit taxonomy on new chunks and validates it normally", () => {
    const outputDir = createTempDir();
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, "chunks.jsonl"),
      `${JSON.stringify(
        createLegacyChunk({
          collection_category: "guide",
          source_family: "cdp",
          category_label_ko: "채용공고",
        }),
      )}\n`,
      "utf8",
    );

    expect(() => loadKnowledgeBaseChunks({ directories: [outputDir] })).toThrow("category_label_ko must be 가이드 for collection_category guide");
  });

  it("fails closed for unknown legacy taxonomy mappings", () => {
    const outputDir = createTempDir();
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, "chunks.jsonl"),
      `${JSON.stringify(createLegacyChunk({ source_id: "unknown-active-source", category: "Unknown active category" }))}\n`,
      "utf8",
    );

    expect(() => loadKnowledgeBaseChunks({ directories: [outputDir] })).toThrow(
      `${join(outputDir, "chunks.jsonl")}:1 missing legacy taxonomy mapping for source_id "unknown-active-source" category "Unknown active category"`,
    );
  });

  it("throws before returning partial chunks for malformed JSONL", () => {
    const outputDir = createTempDir();
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "chunks.jsonl"), "{not valid json}\n", "utf8");

    expect(() => loadKnowledgeBaseChunks({ directories: [outputDir] })).toThrow(`${join(outputDir, "chunks.jsonl")}:1 invalid JSON`);
  });

  it("throws before returning chunks with missing citation anchors", () => {
    const outputDir = createTempDir();
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, "chunks.jsonl"),
      `${JSON.stringify({
        chunk_id: "bad-chunk",
        record_id: "bad-record",
        source_id: "ibus-employment-board",
        source_name: "Bad Source",
        source_url: "https://example.com/source",
        canonical_url: "https://example.com/source",
        title: "Bad chunk",
        category: "ERICA 경상대학 취업정보",
        collection_category: "job_posting",
        source_family: "ibus",
        category_label_ko: "채용공고",
        fetched_at: "2026-05-03T00:00:00.000Z",
        posted_at: null,
        deadline_status: "unknown",
        deadline_raw_text: "",
        content_hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        citation_anchors: [],
        source_text_trust: "untrusted_source_text",
        chunk_ordinal: 0,
        text: "invalid citation anchor fixture",
      })}\n`,
      "utf8",
    );

    expect(() => loadKnowledgeBaseChunks({ directories: [outputDir] })).toThrow("schema invalid");
  });

  it("throws before returning chunks with trusted source text markers", () => {
    const outputDir = createTempDir();
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, "chunks.jsonl"),
      `${JSON.stringify({
        chunk_id: "bad-trust-chunk",
        record_id: "bad-record",
        source_id: "ibus-employment-board",
        source_name: "Bad Source",
        source_url: "https://example.com/source",
        canonical_url: "https://example.com/source",
        title: "Bad chunk",
        category: "ERICA 경상대학 취업정보",
        collection_category: "job_posting",
        source_family: "ibus",
        category_label_ko: "채용공고",
        fetched_at: "2026-05-03T00:00:00.000Z",
        posted_at: null,
        deadline_status: "unknown",
        deadline_raw_text: "",
        content_hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        citation_anchors: [{ url: "https://example.com/source", label: "Example" }],
        source_text_trust: "trusted_source_text",
        chunk_ordinal: 0,
        text: "invalid trust marker fixture",
      })}\n`,
      "utf8",
    );

    expect(() => loadKnowledgeBaseChunks({ directories: [outputDir] })).toThrow("schema invalid");
  });

  it("throws when a configured knowledge-base directory is missing chunks.jsonl", () => {
    const outputDir = createTempDir();

    expect(() => loadKnowledgeBaseChunks({ directories: [outputDir] })).toThrow(`${join(outputDir, "chunks.jsonl")} is missing`);
  });
});
