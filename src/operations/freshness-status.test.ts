import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { FreshnessStatusSchema, getFreshnessStatus } from "./freshness-status.js";

describe("getFreshnessStatus", () => {
  it("summarizes fresh source counts from local manifests and JSONL", () => {
    const root = fixtureDir();
    writeKb(root, { sourceId: "fresh-source", fetchedAt: "2026-05-03T00:00:00.000Z" });

    const status = getFreshnessStatus({ directories: [root], now: new Date("2026-05-04T00:00:00.000Z"), staleAfterDays: 14 });

    expect(FreshnessStatusSchema.safeParse(status).success).toBe(true);
    expect(status.total_chunk_count).toBe(1);
    expect(status.sources[0]).toMatchObject({ source_id: "fresh-source", status: "fresh", record_count: 1, chunk_count: 1 });
  });

  it("marks stale sources with warnings", () => {
    const root = fixtureDir();
    writeKb(root, { sourceId: "stale-source", fetchedAt: "2026-04-01T00:00:00.000Z" });

    const status = getFreshnessStatus({ directories: [root], now: new Date("2026-05-04T00:00:00.000Z"), staleAfterDays: 14 });

    expect(status.sources[0]?.status).toBe("stale");
    expect(status.warnings.join("\n")).toContain("older than 14 days");
  });

  it("reports unknown missing manifests without crawling", () => {
    const root = fixtureDir();
    writeFileSync(join(root, "records.jsonl"), "", "utf8");
    writeFileSync(join(root, "chunks.jsonl"), "", "utf8");

    const status = getFreshnessStatus({ directories: [root], now: new Date("2026-05-04T00:00:00.000Z") });

    expect(status.sources[0]?.status).toBe("unknown");
    expect(status.warnings.join("\n")).toContain("missing");
  });

  it("reports invalid JSON and missing final newline as warnings", () => {
    const root = fixtureDir();
    writeKb(root, { sourceId: "bad-jsonl", fetchedAt: "2026-05-03T00:00:00.000Z", finalNewline: false });
    writeFileSync(join(root, "records.jsonl"), "{bad json\n", "utf8");

    const status = getFreshnessStatus({ directories: [root], now: new Date("2026-05-04T00:00:00.000Z") });

    expect(status.warnings.join("\n")).toContain("invalid JSON");
    expect(status.warnings.join("\n")).toContain("final newline");
  });

  it("aggregates multiple directories for the same source", () => {
    const first = fixtureDir();
    const second = fixtureDir();
    writeKb(first, { sourceId: "same-source", fetchedAt: "2026-05-01T00:00:00.000Z" });
    writeKb(second, { sourceId: "same-source", fetchedAt: "2026-05-03T00:00:00.000Z" });

    const status = getFreshnessStatus({ directories: [first, second], now: new Date("2026-05-04T00:00:00.000Z") });

    expect(status.sources).toHaveLength(1);
    expect(status.sources[0]).toMatchObject({ source_id: "same-source", record_count: 2, chunk_count: 2, last_successful_ingestion: "2026-05-03T00:00:00.000Z" });
  });

  it("reports explicit deterministic release evaluation readiness", () => {
    const root = fixtureDir();
    writeKb(root, { sourceId: "release-ready-source", fetchedAt: "2026-05-03T00:00:00.000Z" });

    const status = getFreshnessStatus({
      directories: [root],
      now: new Date("2026-05-04T00:00:00.000Z"),
      releaseEvaluation: { status: "passed", checked_at: "2026-05-04T00:00:00.000Z" },
    });

    expect(FreshnessStatusSchema.safeParse(status).success).toBe(true);
    expect(status.release_evaluation).toEqual({ status: "passed", checked_at: "2026-05-04T00:00:00.000Z" });
  });

  it("includes safe operator warnings in schema-valid output", () => {
    const root = fixtureDir();
    writeKb(root, { sourceId: "operator-warning-source", fetchedAt: "2026-05-03T00:00:00.000Z" });

    const status = getFreshnessStatus({
      directories: [root],
      now: new Date("2026-05-04T00:00:00.000Z"),
      warnings: ["release readiness evaluation could not be completed deterministically"],
    });

    expect(FreshnessStatusSchema.safeParse(status).success).toBe(true);
    expect(status.warnings).toContain("release readiness evaluation could not be completed deterministically");
  });
});

function fixtureDir(): string {
  const root = mkdtempSync(join(tmpdir(), "freshness-status-"));
  mkdirSync(root, { recursive: true });
  return root;
}

function writeKb(root: string, options: { sourceId: string; fetchedAt: string; finalNewline?: boolean }) {
  const record = {
    record_id: `${options.sourceId}-record`,
    source_id: options.sourceId,
    source_name: "테스트 출처",
    source_url: "https://example.edu/source",
    canonical_url: "https://example.edu/source/1",
    title: "테스트 공고",
    category: "jobs",
    fetched_at: options.fetchedAt,
    posted_at: "2026-05-01T00:00:00.000Z",
    deadline_status: "active",
    deadline_raw_text: "채용시까지",
    raw_text: "테스트 원문",
    cleaned_text: "테스트 원문",
    content_hash: "2222222222222222222222222222222222222222222222222222222222222222",
    citation_anchors: [{ url: "https://example.edu/source/1", label: "공식 출처" }],
    source_text_trust: "untrusted_source_text",
  };
  const chunk = {
    ...record,
    chunk_id: `${options.sourceId}-chunk`,
    chunk_ordinal: 0,
    text: "테스트 청크",
  };
  const suffix = options.finalNewline === false ? "" : "\n";
  writeFileSync(join(root, "manifest.json"), `${JSON.stringify({ schema_version: "phase2-jsonl-kb-v1", run_id: `${options.sourceId}-run`, generated_at: options.fetchedAt, source_ids: [options.sourceId], fetched_at: [options.fetchedAt], record_count: 1, chunk_count: 1, record_ids: [record.record_id], chunk_ids: [chunk.chunk_id] })}\n`, "utf8");
  writeFileSync(join(root, "records.jsonl"), `${JSON.stringify(record)}${suffix}`, "utf8");
  writeFileSync(join(root, "chunks.jsonl"), `${JSON.stringify(chunk)}${suffix}`, "utf8");
}
