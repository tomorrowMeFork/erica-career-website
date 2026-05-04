import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { KnowledgeChunkSchema, NormalizedRecordSchema } from "../ingestion/normalized-record.js";
import { KnowledgeBaseManifestFileSchema } from "../ingestion/write-jsonl-kb.js";
import { DEFAULT_KNOWLEDGE_BASE_DIRS } from "../knowledge-base/jsonl-loader.js";

export const FreshnessSourceStatusSchema = z.object({
  source_id: z.string().min(1),
  last_successful_ingestion: z.iso.datetime().nullable(),
  record_count: z.number().int().nonnegative(),
  chunk_count: z.number().int().nonnegative(),
  status: z.enum(["fresh", "stale", "unknown"]),
  warnings: z.array(z.string()),
});

export const ReleaseEvaluationStatusSchema = z.object({
  status: z.enum(["passed", "failed", "unknown"]),
  checked_at: z.iso.datetime().nullable(),
});

export const FreshnessStatusSchema = z.object({
  generated_at: z.iso.datetime(),
  stale_after_days: z.number().int().positive(),
  total_record_count: z.number().int().nonnegative(),
  total_chunk_count: z.number().int().nonnegative(),
  sources: z.array(FreshnessSourceStatusSchema),
  warnings: z.array(z.string()),
  release_evaluation: ReleaseEvaluationStatusSchema,
});

export type FreshnessSourceStatus = z.infer<typeof FreshnessSourceStatusSchema>;
export type ReleaseEvaluationStatus = z.infer<typeof ReleaseEvaluationStatusSchema>;
export type FreshnessStatus = z.infer<typeof FreshnessStatusSchema>;

export type GetFreshnessStatusInput = {
  directories?: readonly string[];
  now?: Date;
  staleAfterDays?: number;
  releaseEvaluation?: ReleaseEvaluationStatus;
  warnings?: readonly string[];
};

type SourceAggregate = {
  source_id: string;
  fetched_at: string[];
  record_count: number;
  chunk_count: number;
  warnings: string[];
};

export function getFreshnessStatus(input: GetFreshnessStatusInput = {}): FreshnessStatus {
  const directories = input.directories ?? DEFAULT_KNOWLEDGE_BASE_DIRS;
  const now = input.now ?? new Date();
  const staleAfterDays = input.staleAfterDays ?? 14;
  const warnings: string[] = [...(input.warnings ?? [])];
  const aggregates = new Map<string, SourceAggregate>();

  for (const directory of directories) {
    readDirectoryStatus(directory, warnings, aggregates);
  }

  const sources = [...aggregates.values()]
    .map((aggregate) => sourceStatus(aggregate, now, staleAfterDays))
    .sort((left, right) => left.source_id.localeCompare(right.source_id, "en"));

  if (sources.length === 0) warnings.push("no local knowledge-base sources were readable");
  for (const source of sources) warnings.push(...source.warnings.map((warning) => `${source.source_id}: ${warning}`));

  return FreshnessStatusSchema.parse({
    generated_at: now.toISOString(),
    stale_after_days: staleAfterDays,
    total_record_count: sources.reduce((sum, source) => sum + source.record_count, 0),
    total_chunk_count: sources.reduce((sum, source) => sum + source.chunk_count, 0),
    sources,
    warnings,
    release_evaluation: input.releaseEvaluation ?? { status: "unknown", checked_at: null },
  });
}

function readDirectoryStatus(directory: string, warnings: string[], aggregates: Map<string, SourceAggregate>): void {
  const manifest = readManifest(directory, warnings);
  const records = readJsonl(directory, "records.jsonl", NormalizedRecordSchema, warnings);
  const chunks = readJsonl(directory, "chunks.jsonl", KnowledgeChunkSchema, warnings);
  const sourceIds = new Set<string>([...(manifest?.source_ids ?? []), ...records.map((record) => record.source_id), ...chunks.map((chunk) => chunk.source_id)]);

  if (sourceIds.size === 0) {
    const sourceId = directory.split(/[\\/]/u).filter(Boolean).at(-1) ?? "unknown-source";
    sourceIds.add(sourceId);
  }

  for (const sourceId of sourceIds) {
    const aggregate = getAggregate(aggregates, sourceId);
    aggregate.record_count += records.filter((record) => record.source_id === sourceId).length;
    aggregate.chunk_count += chunks.filter((chunk) => chunk.source_id === sourceId).length;
    aggregate.fetched_at.push(...records.filter((record) => record.source_id === sourceId).map((record) => record.fetched_at));
    aggregate.fetched_at.push(...chunks.filter((chunk) => chunk.source_id === sourceId).map((chunk) => chunk.fetched_at));
    if (manifest !== undefined) aggregate.fetched_at.push(...manifest.fetched_at);
    if (manifest === undefined) aggregate.warnings.push(`missing or invalid manifest in ${safeBase(directory)}`);
  }
}

function sourceStatus(aggregate: SourceAggregate, now: Date, staleAfterDays: number): FreshnessSourceStatus {
  const validDates = aggregate.fetched_at
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => right - left);
  const lastTime = validDates[0];
  const warnings = [...aggregate.warnings];
  if (lastTime === undefined) warnings.push("unknown freshness timestamp");
  if (aggregate.chunk_count === 0) warnings.push("no chunks found for source");
  const ageDays = lastTime === undefined ? undefined : (now.getTime() - lastTime) / 86_400_000;
  const status = lastTime === undefined ? "unknown" : ageDays !== undefined && ageDays > staleAfterDays ? "stale" : "fresh";
  if (status === "stale") warnings.push(`last ingestion is older than ${staleAfterDays} days`);
  return FreshnessSourceStatusSchema.parse({
    source_id: aggregate.source_id,
    last_successful_ingestion: lastTime === undefined ? null : new Date(lastTime).toISOString(),
    record_count: aggregate.record_count,
    chunk_count: aggregate.chunk_count,
    status,
    warnings,
  });
}

function readManifest(directory: string, warnings: string[]): z.infer<typeof KnowledgeBaseManifestFileSchema> | undefined {
  const path = join(directory, "manifest.json");
  if (!existsSync(path)) {
    warnings.push(`${safeBase(directory)}/manifest.json is missing`);
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    const result = KnowledgeBaseManifestFileSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(`${safeBase(directory)}/manifest.json schema invalid`);
      return undefined;
    }
    return result.data;
  } catch (error) {
    warnings.push(`${safeBase(directory)}/manifest.json invalid JSON: ${safeErrorMessage(error)}`);
    return undefined;
  }
}

function readJsonl<T>(directory: string, fileName: string, schema: z.ZodType<T>, warnings: string[]): T[] {
  const path = join(directory, fileName);
  if (!existsSync(path)) {
    warnings.push(`${safeBase(directory)}/${fileName} is missing`);
    return [];
  }
  const text = readFileSync(path, "utf8");
  if (text.length > 0 && !text.endsWith("\n")) warnings.push(`${safeBase(directory)}/${fileName} must end with a final newline`);
  const values: T[] = [];
  for (const [index, line] of text.split("\n").filter((candidate) => candidate.length > 0).entries()) {
    try {
      const parsed: unknown = JSON.parse(line);
      const result = schema.safeParse(parsed);
      if (result.success) values.push(result.data);
      else warnings.push(`${safeBase(directory)}/${fileName}:${index + 1} schema invalid`);
    } catch (error) {
      warnings.push(`${safeBase(directory)}/${fileName}:${index + 1} invalid JSON: ${safeErrorMessage(error)}`);
    }
  }
  return values;
}

function getAggregate(aggregates: Map<string, SourceAggregate>, sourceId: string): SourceAggregate {
  const existing = aggregates.get(sourceId);
  if (existing !== undefined) return existing;
  const created: SourceAggregate = { source_id: sourceId, fetched_at: [], record_count: 0, chunk_count: 0, warnings: [] };
  aggregates.set(sourceId, created);
  return created;
}

function safeBase(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).slice(-2).join("/");
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[A-Za-z0-9_-]{24,}/gu, "[redacted]");
}

export function listLocalKnowledgeBaseDirs(rootDir: string): string[] {
  const root = join(rootDir, "data/knowledge-base");
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((entry) => join(root, entry))
    .filter((entry) => statSync(entry).isDirectory());
}
