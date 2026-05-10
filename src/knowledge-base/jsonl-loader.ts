import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";

import { type KnowledgeChunk, KnowledgeChunkSchema } from "../ingestion/normalized-record.js";

export const DEFAULT_KNOWLEDGE_BASE_DIRS = ["data/knowledge-base/fixture-ibus", "data/knowledge-base/fixture-cdp-pdf", "data/knowledge-base/playwright-sources"] as const;
export const OPTIONAL_KNOWLEDGE_BASE_DIRS = ["data/knowledge-base/manual-cdp-posts"] as const;

export type LoadKnowledgeBaseChunksInput = {
  directories?: readonly string[];
};

export function loadKnowledgeBaseChunks(input: LoadKnowledgeBaseChunksInput = {}): KnowledgeChunk[] {
  const directories = input.directories ?? [...DEFAULT_KNOWLEDGE_BASE_DIRS, ...OPTIONAL_KNOWLEDGE_BASE_DIRS.filter((directory) => existsSync(directory))];
  const failures: string[] = [];
  const chunksByDirectory = directories.map((directory) => readChunksJsonl(directory, failures));

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

  return chunksByDirectory.flat();
}

function readChunksJsonl(outputDir: string, failures: string[]): KnowledgeChunk[] {
  return readJsonl(outputDir, "chunks.jsonl", KnowledgeChunkSchema, failures).map((chunk) => {
    const chunkFailures = validateChunkInvariants(chunk);
    if (chunkFailures.length > 0) {
      failures.push(...chunkFailures.map((failure) => `${join(outputDir, "chunks.jsonl")}:${failure}`));
    }
    return chunk;
  });
}

function readJsonl<T>(outputDir: string, fileName: string, schema: z.ZodType<T>, failures: string[]): T[] {
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
    try {
      const parsed = JSON.parse(line);
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

function summarizeZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
