import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_KNOWLEDGE_BASE_DIRS, loadKnowledgeBaseChunks } from "./jsonl-loader.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "kb-loader-"));
  tempDirs.push(dir);
  return dir;
}

describe("loadKnowledgeBaseChunks", () => {
  it("loads chunks from every default Phase 2 knowledge-base directory", () => {
    const chunks = loadKnowledgeBaseChunks();
    const sourceIds = new Set(chunks.map((chunk) => chunk.source_id));

    expect(DEFAULT_KNOWLEDGE_BASE_DIRS).toEqual([
      "data/knowledge-base/fixture-ibus",
      "data/knowledge-base/fixture-cdp-pdf",
      "data/knowledge-base/playwright-sources",
    ]);
    expect(chunks.length).toBeGreaterThanOrEqual(11);
    expect(sourceIds).toContain("ibus-employment-board");
    expect(sourceIds).toContain("cdp-student-guide-pdf");
    expect(sourceIds).toContain("cdp-root");
    expect(sourceIds).toContain("cdp-career-category-discovery");
    expect(sourceIds).toContain("cdp-recruit-category-discovery");
    expect(sourceIds).toContain("book-success-story-viewer");
  });

  it("requires citation anchors and untrusted source text markers on every chunk", () => {
    const chunks = loadKnowledgeBaseChunks();

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.citation_anchors.length).toBeGreaterThan(0);
      expect(chunk.source_text_trust).toBe("untrusted_source_text");
    }
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
        source_id: "bad-source",
        source_name: "Bad Source",
        source_url: "https://example.com/source",
        canonical_url: "https://example.com/source",
        title: "Bad chunk",
        category: "test",
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
        source_id: "bad-source",
        source_name: "Bad Source",
        source_url: "https://example.com/source",
        canonical_url: "https://example.com/source",
        title: "Bad chunk",
        category: "test",
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
