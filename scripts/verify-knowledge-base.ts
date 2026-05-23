import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { IngestionRunManifestSchema, type KnowledgeChunk, KnowledgeChunkSchema, type NormalizedRecord, NormalizedRecordSchema } from "../src/ingestion/normalized-record.js";
import { KnowledgeBaseManifestFileSchema } from "../src/ingestion/write-jsonl-kb.js";
import { backfillLegacyTaxonomy } from "../src/knowledge-base/legacy-taxonomy.js";

const failures: string[] = [];

function runCli(): void {
  const outputDir = process.argv[2];
  if (!outputDir) {
    failures.push("usage: npm run verify:knowledge-base -- <output-dir>");
    report();
    return;
  }

  const records = readJsonl(outputDir, "records.jsonl", NormalizedRecordSchema);
  const chunks = readJsonl(outputDir, "chunks.jsonl", KnowledgeChunkSchema);
  const manifest = readManifest(outputDir);

  if (records && chunks) {
    const schemaResult = IngestionRunManifestSchema.safeParse({
      run_id: manifest?.run_id ?? "verification-placeholder",
      generated_at: manifest?.generated_at ?? "2026-05-03T00:00:00.000Z",
      source_ids: manifest?.source_ids ?? [],
      records,
      chunks,
    });
    if (!schemaResult.success) {
      failures.push(`records/chunks fail Phase 2 manifest validation: ${summarizeZodError(schemaResult.error)}`);
    }
    verifyRecordInvariants(records);
    verifyChunkInvariants(chunks);
  }

  if (manifest && records && chunks) {
    verifyManifestAlignment(manifest, records, chunks);
  }

  report();
}

function readJsonl<T>(outputDir: string, fileName: string, schema: z.ZodType<T>): T[] | undefined {
  const path = join(outputDir, fileName);
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return undefined;
  }

  const text = readFileSync(path, "utf8");
  if (text.length > 0 && !text.endsWith("\n")) {
    failures.push(`${path} must end with a final newline`);
  }

  const values: T[] = [];
  const lines = text.split("\n").filter((line) => line.length > 0);
  for (const [index, line] of lines.entries()) {
    try {
      const parsed = backfillLegacyTaxonomy(JSON.parse(line));
      const result = schema.safeParse(parsed);
      if (!result.success) {
        failures.push(`${path}:${index + 1} schema invalid: ${summarizeZodError(result.error)}`);
        continue;
      }
      values.push(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${path}:${index + 1} invalid JSON: ${message}`);
    }
  }
  return values;
}

function readManifest(outputDir: string): z.infer<typeof KnowledgeBaseManifestFileSchema> | undefined {
  const path = join(outputDir, "manifest.json");
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const result = KnowledgeBaseManifestFileSchema.safeParse(parsed);
    if (!result.success) {
      failures.push(`${path} schema invalid: ${summarizeZodError(result.error)}`);
      return undefined;
    }
    return result.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${path} invalid JSON: ${message}`);
    return undefined;
  }
}

function verifyRecordInvariants(records: readonly NormalizedRecord[]): void {
  for (const record of records) {
    const missing = requiredRecordFields.filter((field) => isMissing(record[field]));
    if (missing.length > 0) {
      failures.push(`record ${record.record_id} missing required metadata: ${missing.join(", ")}`);
    }
    if (record.citation_anchors.length === 0) {
      failures.push(`record ${record.record_id} lacks citation_anchors`);
    }
    if (record.source_text_trust !== "untrusted_source_text") {
      failures.push(`record ${record.record_id} has unexpected source_text_trust ${record.source_text_trust}`);
    }
  }
}

function verifyChunkInvariants(chunks: readonly KnowledgeChunk[]): void {
  for (const chunk of chunks) {
    const missing = requiredChunkFields.filter((field) => isMissing(chunk[field]));
    if (missing.length > 0) {
      failures.push(`chunk ${chunk.chunk_id} missing required metadata: ${missing.join(", ")}`);
    }
    if (chunk.citation_anchors.length === 0) {
      failures.push(`chunk ${chunk.chunk_id} lacks citation_anchors`);
    }
    if (chunk.source_text_trust !== "untrusted_source_text") {
      failures.push(`chunk ${chunk.chunk_id} has unexpected source_text_trust ${chunk.source_text_trust}`);
    }
  }
}

function verifyManifestAlignment(
  manifest: z.infer<typeof KnowledgeBaseManifestFileSchema>,
  records: readonly NormalizedRecord[],
  chunks: readonly KnowledgeChunk[],
): void {
  if (manifest.record_count !== records.length) {
    failures.push(`manifest record_count ${manifest.record_count} does not match records ${records.length}`);
  }
  if (manifest.chunk_count !== chunks.length) {
    failures.push(`manifest chunk_count ${manifest.chunk_count} does not match chunks ${chunks.length}`);
  }
  compareSets("manifest record_ids", manifest.record_ids, records.map((record) => record.record_id));
  compareSets("manifest chunk_ids", manifest.chunk_ids, chunks.map((chunk) => chunk.chunk_id));
  compareSets("manifest source_ids", manifest.source_ids, records.map((record) => record.source_id));

  const recordIds = new Set(records.map((record) => record.record_id));
  for (const chunk of chunks) {
    if (!recordIds.has(chunk.record_id)) {
      failures.push(`chunk ${chunk.chunk_id} references missing record_id ${chunk.record_id}`);
    }
  }
}

const requiredRecordFields = [
  "source_url",
  "canonical_url",
  "fetched_at",
  "citation_anchors",
  "content_hash",
  "deadline_status",
  "source_text_trust",
] as const;

const requiredChunkFields = [
  "source_url",
  "canonical_url",
  "fetched_at",
  "citation_anchors",
  "content_hash",
  "deadline_status",
  "source_text_trust",
] as const;

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function compareSets(label: string, left: readonly string[], right: readonly string[]): void {
  const normalize = (values: readonly string[]) => [...new Set(values)].sort().join("\u001f");
  if (normalize(left) !== normalize(right)) {
    failures.push(`${label} do not align`);
  }
}

function summarizeZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

function report(): void {
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exitCode = 1;
    return;
  }
  console.log("knowledge base verification passed");
}

runCli();
