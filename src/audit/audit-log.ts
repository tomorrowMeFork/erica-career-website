import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

import { RefusalTierSchema } from "../chat/chat-contract.js";

const SafeModelConfigSchema = z.object({
  provider: z.literal("openai-compatible"),
  base_url: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().optional(),
  max_tokens: z.number().int().positive().optional(),
});

const RetrievedAuditChunkSchema = z.object({
  chunk_id: z.string().min(1),
  record_id: z.string().min(1),
  source_id: z.string().min(1),
  score: z.number(),
  normalized_score: z.number(),
});

export const ChatAuditRecordSchema = z
  .object({
    trace_id: z.string().min(1),
    timestamp: z.iso.datetime(),
    query_hash: z.string().regex(/^[a-f0-9]{64}$/u),
    retrieved_chunks: z.array(RetrievedAuditChunkSchema),
    refusal_tier: RefusalTierSchema,
    model_config: SafeModelConfigSchema,
    prompt_version: z.string().min(1),
    citation_ids: z.array(z.number().int().positive()),
    guardrail_results: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
    response_timestamp: z.iso.datetime(),
    prompt_snapshot: z.string().max(2000).optional(),
    prompt_snapshot_reason: z.enum(["refusal", "guardrail", "failure"]).optional(),
  })
  .superRefine((record, context) => {
    if (record.prompt_snapshot !== undefined && record.prompt_snapshot_reason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["prompt_snapshot_reason"],
        message: "prompt_snapshot_reason is required when prompt_snapshot is stored",
      });
    }
    if (record.refusal_tier === "normal_answer" && record.prompt_snapshot !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["prompt_snapshot"],
        message: "normal answers must not store prompt snapshots by default",
      });
    }
  });

export type ChatAuditRecord = z.infer<typeof ChatAuditRecordSchema>;

export async function appendChatAuditRecord(path: string, record: ChatAuditRecord): Promise<void> {
  const parsed = ChatAuditRecordSchema.parse(record);
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${stableJsonStringify(parsed)}\n`, "utf8");
}

export function hashQuery(query: string): string {
  return createHash("sha256").update(query, "utf8").digest("hex");
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

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, "en");
}
