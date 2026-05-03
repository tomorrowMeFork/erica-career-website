import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  IngestionRunManifestSchema,
  KnowledgeChunkSchema,
  NormalizedRecordSchema,
  type IngestionRunManifest,
  type KnowledgeChunk,
  type NormalizedRecord,
} from "./normalized-record.js";

export const KnowledgeBaseManifestFileSchema = z.object({
  schema_version: z.literal("phase2-jsonl-kb-v1"),
  run_id: z.string().min(1),
  generated_at: z.iso.datetime(),
  source_ids: z.array(z.string().min(1)),
  fetched_at: z.array(z.iso.datetime()),
  record_count: z.number().int().nonnegative(),
  chunk_count: z.number().int().nonnegative(),
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
  };
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
    generated_at: manifestForValidation.generated_at,
    source_ids: sourceIds,
    fetched_at: sortedUnique(records.map((record) => record.fetched_at)),
    record_count: records.length,
    chunk_count: chunks.length,
    record_ids: records.map((record) => record.record_id),
    chunk_ids: chunks.map((chunk) => chunk.chunk_id),
  });

  await mkdir(input.outputDir, { recursive: true });
  await writeFile(`${input.outputDir}/records.jsonl`, toJsonl(records), "utf8");
  await writeFile(`${input.outputDir}/chunks.jsonl`, toJsonl(chunks), "utf8");
  await writeFile(`${input.outputDir}/manifest.json`, `${stableJsonStringify(manifestFile)}\n`, "utf8");

  return manifestFile;
}

function assertChunkRecordLinks(records: readonly NormalizedRecord[], chunks: readonly KnowledgeChunk[]): void {
  const recordIds = new Set(records.map((record) => record.record_id));
  for (const chunk of chunks) {
    if (!recordIds.has(chunk.record_id)) {
      throw new Error(`Chunk ${chunk.chunk_id} references missing record_id ${chunk.record_id}`);
    }
  }
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
