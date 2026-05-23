import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";

import { type KnowledgeChunk, KnowledgeChunkSchema } from "../ingestion/normalized-record.js";
import { type KnowledgeBaseManifestFile, KnowledgeBaseManifestFileSchema } from "../ingestion/write-jsonl-kb.js";
import {
  CDP_AUTHENTICATED_SPLIT_DATASET_NAMES,
  DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES,
  EWIL_AUTHENTICATED_SPLIT_DATASET_NAMES,
  KNOWLEDGE_BASE_ROOT_DIR,
  loadableKnowledgeBaseDirectories,
  resolveKnowledgeBaseDatasets,
} from "./dataset-registry.js";
import { backfillLegacyTaxonomy } from "./legacy-taxonomy.js";

export const DEFAULT_KNOWLEDGE_BASE_DIRS = DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES.map((name) => join(KNOWLEDGE_BASE_ROOT_DIR, name)) as readonly string[];
export const OPTIONAL_KNOWLEDGE_BASE_DIRS = [
  ...CDP_AUTHENTICATED_SPLIT_DATASET_NAMES.map((name) => join(KNOWLEDGE_BASE_ROOT_DIR, name)),
  ...EWIL_AUTHENTICATED_SPLIT_DATASET_NAMES.map((name) => join(KNOWLEDGE_BASE_ROOT_DIR, name)),
] as readonly string[];

export type LoadKnowledgeBaseChunksInput = {
  directories?: readonly string[];
  rootDir?: string;
};

export function loadKnowledgeBaseChunks(input: LoadKnowledgeBaseChunksInput = {}): KnowledgeChunk[] {
  const directories = input.directories ?? loadableKnowledgeBaseDirectories(resolveKnowledgeBaseDatasets({ rootDir: input.rootDir }));
  const failures: string[] = [];
  const chunksByDirectory = directories.map((directory) => readChunksJsonl(directory, failures));

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

  return chunksByDirectory.flat();
}

function readChunksJsonl(outputDir: string, failures: string[]): KnowledgeChunk[] {
  const chunks = readJsonl(outputDir, "chunks.jsonl", KnowledgeChunkSchema, failures, backfillLegacyTaxonomy).map((chunk) => {
    const chunkFailures = validateChunkInvariants(chunk);
    if (chunkFailures.length > 0) {
      failures.push(...chunkFailures.map((failure) => `${join(outputDir, "chunks.jsonl")}:${failure}`));
    }
    return chunk;
  });
  const manifest = readManifestIfExists(outputDir, failures);
  if (manifest !== undefined) {
    validateManifestChunkAlignment(outputDir, manifest, chunks, failures);
  }
  return chunks;
}

function readManifestIfExists(outputDir: string, failures: string[]): KnowledgeBaseManifestFile | undefined {
  const path = join(outputDir, "manifest.json");
  if (!existsSync(path)) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
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

function validateManifestChunkAlignment(outputDir: string, manifest: KnowledgeBaseManifestFile, chunks: readonly KnowledgeChunk[], failures: string[]): void {
  if (manifest.chunk_count !== chunks.length) {
    failures.push(`${join(outputDir, "manifest.json")} chunk_count ${manifest.chunk_count} does not match chunks ${chunks.length}`);
  }
  compareSets(`${join(outputDir, "manifest.json")} chunk_ids`, manifest.chunk_ids, chunks.map((chunk) => chunk.chunk_id), failures);
  compareSets(`${join(outputDir, "manifest.json")} source_ids`, manifest.source_ids, chunks.map((chunk) => chunk.source_id), failures);
}

function readJsonl<T>(outputDir: string, fileName: string, schema: z.ZodType<T>, failures: string[], transform: (value: unknown) => unknown = (value) => value): T[] {
  const path = join(outputDir, fileName);
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return [];
  }

  const text = readFileSync(path, "utf8");
  if (text.length > 0 && !text.endsWith("\n")) {
    failures.push(`${path} must end with a final newline`);
  }

  const values: T[] = [];
  const lines = text.split("\n").filter((line) => line.length > 0);
  for (const [index, line] of lines.entries()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${path}:${index + 1} invalid JSON: ${message}`);
      continue;
    }

    let transformed: unknown;
    try {
      transformed = transform(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${path}:${index + 1} ${message}`);
      continue;
    }

    const result = schema.safeParse(transformed);
    if (!result.success) {
      failures.push(`${path}:${index + 1} schema invalid: ${summarizeZodError(result.error)}`);
      continue;
    }
    values.push(result.data);
  }

  return values;
}

function validateChunkInvariants(chunk: KnowledgeChunk): string[] {
  const failures: string[] = [];
  if (chunk.citation_anchors.length === 0) {
    failures.push(`chunk ${chunk.chunk_id} lacks citation_anchors`);
  }
  if (chunk.source_text_trust !== "untrusted_source_text") {
    failures.push(`chunk ${chunk.chunk_id} has unexpected source_text_trust ${chunk.source_text_trust}`);
  }
  return failures;
}

function compareSets(label: string, left: readonly string[], right: readonly string[], failures: string[]): void {
  const normalize = (values: readonly string[]) => [...new Set(values)].sort().join("\u001f");
  if (normalize(left) !== normalize(right)) {
    failures.push(`${label} do not align`);
  }
}

function summarizeZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
