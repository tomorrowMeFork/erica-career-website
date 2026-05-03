import { mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ChatAuditRecordSchema,
  appendChatAuditRecord,
  hashQuery,
  stableJsonStringify,
  type ChatAuditRecord,
} from "./audit-log.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "chat-audit-"));
  tempDirs.push(dir);
  return dir;
}

function baseRecord(overrides: Partial<ChatAuditRecord> = {}): ChatAuditRecord {
  return ChatAuditRecordSchema.parse({
    trace_id: "trace-001",
    timestamp: "2026-05-03T00:00:00.000Z",
    query_hash: hashQuery("ERICA 현장실습 모집 공고 알려줘"),
    retrieved_chunks: [
      {
        chunk_id: "chunk-001",
        record_id: "record-001",
        source_id: "ibus",
        score: 3.5,
        normalized_score: 0.82,
      },
    ],
    refusal_tier: "normal_answer",
    model_config: {
      provider: "openai-compatible",
      base_url: "mock://openai-compatible",
      model: "mock-model",
      temperature: 0.2,
      max_tokens: 700,
    },
    prompt_version: "phase3-rag-chat-mvp",
    citation_ids: [1],
    guardrail_results: {
      evidence_policy: "normal_answer",
      context_isolation: true,
      output_validation: "passed",
    },
    response_timestamp: "2026-05-03T00:00:01.000Z",
    ...overrides,
  });
}

function readJsonl(path: string): ChatAuditRecord[] {
  const text = readFileSync(path, "utf8");
  expect(text.endsWith("\n")).toBe(true);
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => ChatAuditRecordSchema.parse(JSON.parse(line)));
}

describe("appendChatAuditRecord", () => {
  it("appends two stable JSONL records and validates each line", async () => {
    const auditPath = join(createTempDir(), "nested", "chat-audit.jsonl");

    await appendChatAuditRecord(auditPath, baseRecord({ trace_id: "trace-001" }));
    await appendChatAuditRecord(auditPath, baseRecord({ trace_id: "trace-002", citation_ids: [] }));

    const lines = readFileSync(auditPath, "utf8").split("\n").filter((line) => line.length > 0);
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => ChatAuditRecordSchema.parse(JSON.parse(line)).trace_id)).toEqual([
      "trace-001",
      "trace-002",
    ]);
    expect(lines[0]?.startsWith('{"citation_ids":[1],"guardrail_results"')).toBe(true);
  });

  it("stores metadata-only normal answers without prompts or secrets", async () => {
    const auditPath = join(createTempDir(), "chat-audit.jsonl");
    const record = baseRecord({
      model_config: {
        provider: "openai-compatible",
        base_url: "https://llm.example.test",
        model: "mock-model",
      },
    });

    await appendChatAuditRecord(auditPath, record);

    const written = readFileSync(auditPath, "utf8");
    expect(written).not.toContain("prompt_snapshot");
    expect(written).not.toContain("OPENAI_COMPAT_API_KEY");
    expect(written).not.toContain("secret-test-key");
    expect(written).toContain(record.query_hash);
    expect(written).not.toContain("ERICA 현장실습 모집 공고 알려줘");
  });

  it("allows limited refusal snapshots with a reason", async () => {
    const auditPath = join(createTempDir(), "chat-audit.jsonl");

    await appendChatAuditRecord(
      auditPath,
      baseRecord({
        refusal_tier: "hard_refuse",
        citation_ids: [],
        prompt_snapshot: "사용자 질문: ERICA 기숙사 식단 알려줘",
        prompt_snapshot_reason: "refusal",
        guardrail_results: {
          evidence_policy: "hard_refuse",
          context_isolation: true,
          output_validation: "skipped_hard_refusal",
        },
      }),
    );

    const [record] = readJsonl(auditPath);
    expect(record?.prompt_snapshot_reason).toBe("refusal");
    expect(record?.prompt_snapshot).toContain("ERICA 기숙사 식단");
  });

  it("hashes queries and serializes nested object keys deterministically", () => {
    expect(hashQuery("ERICA 현장실습 모집 공고 알려줘")).toMatch(/^[a-f0-9]{64}$/u);
    expect(stableJsonStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });
});
