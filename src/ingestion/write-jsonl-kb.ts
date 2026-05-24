import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { backfillLegacyTaxonomy } from "../knowledge-base/legacy-taxonomy.js";
import type { CollectionCategory, SourceFamily } from "../knowledge-base/taxonomy.js";
import {
  type DeadlineStatus,
  type IngestionRunManifest,
  IngestionRunManifestSchema,
  type KnowledgeChunk,
  KnowledgeChunkSchema,
  type NormalizedRecord,
  NormalizedRecordSchema,
} from "./normalized-record.js";

const ManifestCountsSchema = z.record(z.string().min(1), z.number().int().nonnegative());

export const KnowledgeBaseManifestFileSchema = z.object({
  schema_version: z.literal("phase2-jsonl-kb-v1"),
  run_id: z.string().min(1),
  collector: z.string().min(1).optional(),
  generated_at: z.iso.datetime(),
  source_ids: z.array(z.string().min(1)),
  fetched_at: z.array(z.iso.datetime()),
  record_count: z.number().int().nonnegative(),
  chunk_count: z.number().int().nonnegative(),
  collection_category_counts: ManifestCountsSchema.optional(),
  source_family_counts: ManifestCountsSchema.optional(),
  deadline_status_counts: ManifestCountsSchema.optional(),
  record_ids: z.array(z.string().min(1)),
  chunk_ids: z.array(z.string().min(1)),
});

export type KnowledgeBaseManifestFile = z.infer<typeof KnowledgeBaseManifestFileSchema>;

export type WriteKnowledgeBaseJsonlInput = {
  records: NormalizedRecord[];
  chunks: KnowledgeChunk[];
  outputDir: string;
  manifest: Pick<IngestionRunManifest, "run_id" | "generated_at" | "source_ids"> & {
    schema_version?: "phase2-jsonl-kb-v1";
    collector?: string;
  };
};

export type KnowledgeBaseJsonlData = {
  records: NormalizedRecord[];
  chunks: KnowledgeChunk[];
};

export async function writeKnowledgeBaseJsonl(input: WriteKnowledgeBaseJsonlInput): Promise<KnowledgeBaseManifestFile> {
  const records = sortRecords(input.records.map((record) => NormalizedRecordSchema.parse(record)));
  const chunks = sortChunks(input.chunks.map((chunk) => KnowledgeChunkSchema.parse(chunk)));
  const sourceIds = sortedUnique(input.manifest.source_ids);

  const manifestForValidation = IngestionRunManifestSchema.parse({
    run_id: input.manifest.run_id,
    generated_at: input.manifest.generated_at,
    source_ids: sourceIds,
    records,
    chunks,
  });
  assertChunkRecordLinks(records, chunks);

  const manifestFile = KnowledgeBaseManifestFileSchema.parse({
    schema_version: input.manifest.schema_version ?? "phase2-jsonl-kb-v1",
    run_id: manifestForValidation.run_id,
    collector: input.manifest.collector ?? "writeKnowledgeBaseJsonl",
    generated_at: manifestForValidation.generated_at,
    source_ids: sourceIds,
    fetched_at: sortedUnique(records.map((record) => record.fetched_at)),
    record_count: records.length,
    chunk_count: chunks.length,
    collection_category_counts: countBy(records, (record) => record.collection_category),
    source_family_counts: countBy(records, (record) => record.source_family),
    deadline_status_counts: countBy(records, (record) => record.deadline_status),
    record_ids: records.map((record) => record.record_id),
    chunk_ids: chunks.map((chunk) => chunk.chunk_id),
  });

  await mkdir(input.outputDir, { recursive: true });
  await writeFile(`${input.outputDir}/records.jsonl`, toJsonl(records), "utf8");
  await writeFile(`${input.outputDir}/chunks.jsonl`, toJsonl(chunks), "utf8");
  await writeFile(`${input.outputDir}/manifest.json`, `${stableJsonStringify(manifestFile)}\n`, "utf8");

  return manifestFile;
}

export async function readKnowledgeBaseJsonl(outputDir: string): Promise<KnowledgeBaseJsonlData> {
  const [recordLines, chunkLines] = await Promise.all([
    readJsonlIfExists(`${outputDir}/records.jsonl`),
    readJsonlIfExists(`${outputDir}/chunks.jsonl`),
  ]);

  const records = recordLines.map((record) => NormalizedRecordSchema.parse(backfillLegacyTaxonomy(record)));
  const chunks = chunkLines.map((chunk) => KnowledgeChunkSchema.parse(backfillLegacyTaxonomy(chunk)));
  assertChunkRecordLinks(records, chunks);

  return { records, chunks };
}

export function mergeKnowledgeBaseJsonl(
  existing: KnowledgeBaseJsonlData,
  next: KnowledgeBaseJsonlData,
): KnowledgeBaseJsonlData {
  return {
    records: mergeById(existing.records, next.records, (record) => record.record_id),
    chunks: mergeById(existing.chunks, next.chunks, (chunk) => chunk.chunk_id),
  };
}

function assertChunkRecordLinks(records: readonly NormalizedRecord[], chunks: readonly KnowledgeChunk[]): void {
  const recordIds = new Set(records.map((record) => record.record_id));
  for (const chunk of chunks) {
    if (!recordIds.has(chunk.record_id)) {
      throw new Error(`Chunk ${chunk.chunk_id} references missing record_id ${chunk.record_id}`);
    }
  }
}

async function readJsonlIfExists(filePath: string): Promise<unknown[]> {
  let contents: string;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }

  return contents
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as unknown);
}

function mergeById<T>(
  existing: readonly T[],
  next: readonly T[],
  getId: (value: T) => string,
): T[] {
  const merged = new Map<string, T>();
  for (const value of existing) {
    merged.set(getId(value), value);
  }
  for (const value of next) {
    merged.set(getId(value), value);
  }
  return [...merged.values()];
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function sortRecords(records: readonly NormalizedRecord[]): NormalizedRecord[] {
  return [...records].sort((left, right) => compareStrings(recordSortKey(left), recordSortKey(right)));
}

function sortChunks(chunks: readonly KnowledgeChunk[]): KnowledgeChunk[] {
  return [...chunks].sort((left, right) => compareStrings(chunkSortKey(left), chunkSortKey(right)));
}

function recordSortKey(record: NormalizedRecord): string {
  return [record.source_id, record.record_id].join("\u001f");
}

function chunkSortKey(chunk: KnowledgeChunk): string {
  return [chunk.source_id, chunk.record_id, chunk.chunk_id].join("\u001f");
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => compareStrings(left, right));
}

function countBy<T, K extends CollectionCategory | SourceFamily | DeadlineStatus>(
  values: readonly T[],
  getKey: (value: T) => K,
): Record<K, number> {
  const counts = new Map<K, number>();
  for (const value of values) {
    const key = getKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => compareStrings(left, right))) as Record<K, number>;
}

function toJsonl(values: readonly unknown[]): string {
  if (values.length === 0) {
    return "";
  }
  return `${values.map((value) => stableJsonStringify(value)).join("\n")}\n`;
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    );
  }
  return value;
}
