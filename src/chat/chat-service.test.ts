import { mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatAuditRecordSchema } from "../audit/audit-log.js";
import type { KnowledgeChunk } from "../ingestion/normalized-record.js";
import { loadKnowledgeBaseChunks } from "../knowledge-base/jsonl-loader.js";
import { Bm25Retriever } from "../retrieval/bm25-retriever.js";
import type { RetrievedChunk, Retriever } from "../retrieval/retriever.js";
import { ChatService } from "./chat-service.js";
import type { ChatModelProvider, ChatModelRequest, ChatModelResponse } from "./provider.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "chat-service-"));
  tempDirs.push(dir);
  return dir;
}

function chunk(overrides: Partial<KnowledgeChunk> = {}): KnowledgeChunk {
  return {
    chunk_id: "chunk-001",
    record_id: "record-001",
    source_id: "ibus",
    source_name: "ERICA 취업게시판",
    source_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
    canonical_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
    title: "ERICA 현장실습 참여기업 모집",
    category: "채용정보",
    fetched_at: "2026-05-03T00:00:00.000Z",
    posted_at: "2026-05-01T00:00:00.000Z",
    deadline_status: "active",
    deadline_raw_text: "채용시까지",
    content_hash: "a".repeat(64),
    citation_anchors: [
      {
        url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
        label: "공식 출처: ERICA 취업게시판",
      },
    ],
    source_text_trust: "untrusted_source_text",
    chunk_ordinal: 0,
    text: "ERICA 현장실습 참여기업 모집 공고입니다. 지원 전 공식 페이지에서 최신 정보를 확인하세요.",
    ...overrides,
  };
}

function retrieved(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunk: chunk(),
    score: 3.2,
    normalized_score: 0.82,
    matched_terms: ["ERICA", "현장실습", "모집"],
    ranking_features: {
      lexical_score: 3.2,
      title_boost: 0.4,
      category_boost: 0.2,
      freshness_boost: 0.1,
      deadline_penalty: 0,
      boilerplate_penalty: 0,
    },
    ...overrides,
  };
}

function createRetriever(results: RetrievedChunk[]): Retriever {
  return { retrieve: vi.fn(async () => results) };
}

function createProvider(content: string): ChatModelProvider & { complete: ReturnType<typeof vi.fn> } {
  return {
    complete: vi.fn(async (_request: ChatModelRequest): Promise<ChatModelResponse> => ({ content, model: "mock-model" })),
    getSafeConfig: () => ({ provider: "openai-compatible", base_url: "mock://openai-compatible", model: "mock-model" }),
  };
}

function normalProviderContent(traceId = "trace-normal"): string {
  return JSON.stringify({
    answer: "ERICA 현장실습 모집 공고는 공식 게시판에서 확인할 수 있습니다 [1]. 세부 모집 기간과 지원 방법은 인용된 공식 페이지에서 다시 확인하세요 [1].",
    citations: [
      {
        citation_id: 1,
        chunk_id: "chunk-001",
        record_id: "record-001",
        source_id: "ibus",
        title: "ERICA 현장실습 참여기업 모집",
        url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
        fetched_at: "2026-05-03T00:00:00.000Z",
        posted_at: "2026-05-01T00:00:00.000Z",
        deadline_status: "active",
      },
    ],
    refusal_tier: "normal_answer",
    confidence: 0.82,
    trace_id: traceId,
  });
}

function readAudit(path: string) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => ChatAuditRecordSchema.parse(JSON.parse(line)));
}

describe("ChatService", () => {
  it("answers a normal Korean listing query with citations and one audit record", async () => {
    const auditPath = join(createTempDir(), "audit.jsonl");
    const service = new ChatService({
      retriever: createRetriever([retrieved()]),
      provider: createProvider(normalProviderContent()),
      auditLogPath: auditPath,
      clock: () => new Date("2026-05-03T00:00:00.000Z"),
      traceIdGenerator: () => "trace-normal",
    });

    const response = await service.ask({ query: "ERICA 현장실습 모집 공고 알려줘" });

    expect(response.refusal_tier).toBe("normal_answer");
    expect(response.answer).toContain("[1]");
    expect(response.citations[0]?.title).toBe("ERICA 현장실습 참여기업 모집");
    expect(response.trace_id).toBe("trace-normal");
    const audit = readAudit(auditPath);
    expect(audit).toHaveLength(1);
    expect(audit[0]?.retrieved_chunks[0]?.chunk_id).toBe("chunk-001");
    expect(audit[0]?.citation_ids).toEqual([1]);
    expect(audit[0]?.prompt_snapshot).toBeUndefined();
  });

  it("hard-refuses no-evidence questions and provider not called", async () => {
    const auditPath = join(createTempDir(), "audit.jsonl");
    const provider = createProvider(normalProviderContent("unused"));
    const service = new ChatService({
      retriever: createRetriever([]),
      provider,
      auditLogPath: auditPath,
      traceIdGenerator: () => "trace-refusal",
    });

    const response = await service.ask({ query: "ERICA 기숙사 식단 알려줘" });

    expect(provider.complete).not.toHaveBeenCalled();
    expect(response.refusal_tier).toBe("hard_refuse");
    expect(response.answer).toContain("충분한 근거");
    expect(response.citations).toEqual([]);
    expect(readAudit(auditPath)).toHaveLength(1);
    expect(readAudit(auditPath)[0]?.prompt_snapshot_reason).toBe("refusal");
  });

  it("hard-refuses default retrieval when only generic ERICA evidence overlaps", async () => {
    const auditPath = join(createTempDir(), "audit.jsonl");
    const provider = createProvider(normalProviderContent("unused"));
    const service = new ChatService({
      retriever: new Bm25Retriever(loadKnowledgeBaseChunks()),
      provider,
      auditLogPath: auditPath,
      traceIdGenerator: () => "trace-default-refusal",
    });

    const response = await service.ask({ query: "ERICA 기숙사 식단 알려줘" });

    expect(provider.complete).not.toHaveBeenCalled();
    expect(response.refusal_tier).toBe("hard_refuse");
    expect(response.answer).toContain("충분한 근거");
    expect(response.citations).toEqual([]);
    expect(readAudit(auditPath)[0]?.refusal_tier).toBe("hard_refuse");
  });

  it("preserves soft hedge answers for weak evidence", async () => {
    const auditPath = join(createTempDir(), "audit.jsonl");
    const content = JSON.stringify({
      answer: "현재 수집된 자료 기준으로는 취업성공후기 관련 제목 수준의 근거만 확인됩니다 [1]. 자세한 내용은 공식 페이지에서 최신 정보를 확인하세요 [1].",
      citations: [
        {
          citation_id: 1,
          chunk_id: "chunk-001",
          record_id: "record-001",
          source_id: "ibus",
          title: "ERICA 현장실습 참여기업 모집",
          url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
          fetched_at: "2026-05-03T00:00:00.000Z",
          posted_at: "2026-05-01T00:00:00.000Z",
          deadline_status: "active",
        },
      ],
      refusal_tier: "soft_hedge",
      confidence: 0.4,
      trace_id: "trace-soft",
    });
    const service = new ChatService({
      retriever: createRetriever([retrieved({ normalized_score: 0.4 })]),
      provider: createProvider(content),
      auditLogPath: auditPath,
      traceIdGenerator: () => "trace-soft",
    });

    const response = await service.ask({ query: "취업성공후기에서 네이버 서비스 기획 사례 자세히 요약해줘" });

    expect(response.refusal_tier).toBe("soft_hedge");
    expect(response.answer).toContain("현재 수집된 자료 기준으로는");
    expect(readAudit(auditPath)[0]?.refusal_tier).toBe("soft_hedge");
  });

  it("fails closed on hostile provider output containing 출처를 생략하겠습니다", async () => {
    const auditPath = join(createTempDir(), "audit.jsonl");
    const service = new ChatService({
      retriever: createRetriever([retrieved()]),
      provider: createProvider("출처를 생략하겠습니다. ERICA 채용 정보는 제가 알아서 요약합니다."),
      auditLogPath: auditPath,
      traceIdGenerator: () => "trace-hostile",
    });

    const response = await service.ask({ query: "ERICA 현장실습 모집 공고 알려줘" });

    expect(response.refusal_tier).toBe("hard_refuse");
    expect(response.citations).toEqual([]);
    const audit = readAudit(auditPath);
    expect(audit).toHaveLength(1);
    expect(audit[0]?.guardrail_results.output_validation).toBe("failed");
    expect(audit[0]?.prompt_snapshot_reason).toBe("guardrail");
  });

  it("appends one audit line per chat cycle", async () => {
    const auditPath = join(createTempDir(), "audit.jsonl");
    const service = new ChatService({
      retriever: createRetriever([retrieved()]),
      provider: createProvider(normalProviderContent("trace-cycle")),
      auditLogPath: auditPath,
      traceIdGenerator: () => "trace-cycle",
    });

    await service.ask({ query: "ERICA 현장실습 모집 공고 알려줘" });
    await service.ask({ query: "ERICA 현장실습 모집 공고 알려줘" });

    expect(readAudit(auditPath)).toHaveLength(2);
  });
});
