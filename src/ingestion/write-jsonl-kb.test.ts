import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { chunkNormalizedRecord, sha256 } from "./chunking.js";
import type { KnowledgeChunk, NormalizedRecord } from "./normalized-record.js";
import { KnowledgeBaseManifestFileSchema, writeKnowledgeBaseJsonl } from "./write-jsonl-kb.js";

const tempDirs: string[] = [];

const recordA: NormalizedRecord = {
  record_id: "record-a",
  source_id: "ibus-employment-board",
  source_name: "경상대학 취업정보 게시판",
  source_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
  canonical_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=1",
  title: "ERICA 채용 공고 A",
  category: "ERICA 경상대학 취업정보",
  fetched_at: "2026-05-03T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active",
  deadline_raw_text: "채용시까지",
  raw_text: "ERICA 채용 공고 A\n공식 상세 URL: https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=1",
  cleaned_text: "ERICA 채용 공고 A\n공식 상세 URL: https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=1",
  content_hash: sha256("record-a"),
  citation_anchors: [{ url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=1", label: "공식 상세" }],
  source_text_trust: "untrusted_source_text",
};

const recordB: NormalizedRecord = {
  ...recordA,
  record_id: "record-b",
  source_id: "cdp-student-guide-pdf",
  source_name: "CDP 학생 매뉴얼 PDF",
  source_url: "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf",
  canonical_url: "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf",
  title: "CDP 학생 매뉴얼 PDF 1쪽",
  category: "CDP 학생 매뉴얼",
  posted_at: null,
  deadline_status: "unknown",
  deadline_raw_text: "",
  raw_text: "CDP 매뉴얼 fixture",
  cleaned_text: "CDP 매뉴얼 fixture",
  content_hash: sha256("record-b"),
  citation_anchors: [
    {
      url: "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf#page=1",
      label: "CDP 학생 매뉴얼 PDF 1쪽",
      page_number: 1,
    },
  ],
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "kb-writer-"));
  tempDirs.push(dir);
  return dir;
}

describe("writeKnowledgeBaseJsonl", () => {
  it("creates deterministic records, chunks, and manifest files in stable order", async () => {
    const outputDir = createTempDir();
    const chunks = [...chunkNormalizedRecord(recordB), ...chunkNormalizedRecord(recordA)];

    const manifest = await writeKnowledgeBaseJsonl({
      records: [recordB, recordA],
      chunks,
      outputDir,
      manifest: {
        run_id: "fixture-run",
        generated_at: "2026-05-03T00:00:00.000Z",
        source_ids: [recordB.source_id, recordA.source_id],
      },
    });

    const recordsJsonl = readFileSync(join(outputDir, "records.jsonl"), "utf8");
    const chunksJsonl = readFileSync(join(outputDir, "chunks.jsonl"), "utf8");
    const manifestJson = readFileSync(join(outputDir, "manifest.json"), "utf8");

    expect(recordsJsonl.endsWith("\n")).toBe(true);
    expect(chunksJsonl.endsWith("\n")).toBe(true);
    expect(recordsJsonl.indexOf("record-b")).toBeLessThan(recordsJsonl.indexOf("record-a"));
    expect(manifest).toMatchObject({ run_id: "fixture-run", record_count: 2, chunk_count: chunks.length });
    expect(KnowledgeBaseManifestFileSchema.safeParse(JSON.parse(manifestJson)).success).toBe(true);
  });

  it("rejects invalid records before writing partial output", async () => {
    const outputDir = createTempDir();
    const invalidRecord: NormalizedRecord = { ...recordA, source_url: "http://ibus.hanyang.ac.kr/front/recruit/r-1" };

    await expect(
      writeKnowledgeBaseJsonl({
        records: [invalidRecord],
        chunks: [],
        outputDir,
        manifest: { run_id: "bad-run", generated_at: "2026-05-03T00:00:00.000Z", source_ids: [recordA.source_id] },
      }),
    ).rejects.toThrow();

    expect(existsSync(join(outputDir, "records.jsonl"))).toBe(false);
    expect(existsSync(join(outputDir, "chunks.jsonl"))).toBe(false);
    expect(existsSync(join(outputDir, "manifest.json"))).toBe(false);
  });

  it("rejects invalid chunks before writing partial output", async () => {
    const outputDir = createTempDir();
    const [chunk] = chunkNormalizedRecord(recordA);
    const invalidChunk: KnowledgeChunk = { ...chunk, citation_anchors: [] };

    await expect(
      writeKnowledgeBaseJsonl({
        records: [recordA],
        chunks: [invalidChunk],
        outputDir,
        manifest: { run_id: "bad-chunk", generated_at: "2026-05-03T00:00:00.000Z", source_ids: [recordA.source_id] },
      }),
    ).rejects.toThrow();

    expect(existsSync(join(outputDir, "records.jsonl"))).toBe(false);
  });

  it("rejects duplicate record and chunk IDs through manifest validation", async () => {
    const outputDir = createTempDir();
    const [chunk] = chunkNormalizedRecord(recordA);

    await expect(
      writeKnowledgeBaseJsonl({
        records: [recordA, { ...recordA }],
        chunks: [chunk, { ...chunk }],
        outputDir,
        manifest: { run_id: "dupes", generated_at: "2026-05-03T00:00:00.000Z", source_ids: [recordA.source_id] },
      }),
    ).rejects.toThrow("Duplicate record_id");
  });

  it("requires generated knowledge-base outputs to be ignored without ignoring fixtures", () => {
    const gitignore = readFileSync(".gitignore", "utf8");

    expect(gitignore).toContain("data/knowledge-base/");
    expect(gitignore).not.toContain("fixtures/ingestion/");
  });
});
