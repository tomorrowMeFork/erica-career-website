import { describe, expect, it } from "vitest";

import type { ChatModelProvider, ChatModelRequest, ChatModelResponse } from "../src/chat/provider.js";
import type { KnowledgeChunk } from "../src/ingestion/normalized-record.js";
import { PHASE6_REFERENCE_QA_CASES } from "../data/evaluation/phase6-reference-qa.js";
import { runReleaseReadinessEvaluation } from "./evaluate-release-readiness.js";

describe("runReleaseReadinessEvaluation", () => {
  it("passes the deterministic default gate without credentials", async () => {
    const result = await runReleaseReadinessEvaluation({ env: {}, writeOutput: false });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("release readiness evaluation passed");
    expect(result.judge.enabled).toBe(false);
    expect(result.composed.rag_mvp.ok).toBe(true);
    expect(result.composed.personalization.ok).toBe(true);
    expect(result.cases.map((qaCase) => qaCase.category).sort()).toEqual([
      "cdp_usage",
      "guidebook_pdf",
      "hostile_source",
      "listing_deadline",
      "no_answer",
      "personalization",
      "success_story",
    ].sort());
  });

  it("reports retrieval metadata preservation failures safely", async () => {
    const listingCase = PHASE6_REFERENCE_QA_CASES.find((qaCase) => qaCase.category === "listing_deadline");
    expect(listingCase).toBeDefined();
    if (listingCase === undefined) throw new Error("listing case missing");
    const badChunk: KnowledgeChunk = {
      chunk_id: listingCase.expected_retrieval.expected_chunk_ids[0] ?? "bad-listing",
      record_id: "bad-record",
      source_id: "ibus-employment-board",
      source_name: "경상대학 취업정보 게시판",
      source_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
      canonical_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=6468",
      title: "현장실습 공고",
      category: "jobs",
      fetched_at: "2026-05-03T00:00:00.000Z",
      posted_at: null,
      deadline_status: "unknown",
      deadline_raw_text: "",
      content_hash: "1111111111111111111111111111111111111111111111111111111111111111",
      citation_anchors: [{ url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=6468", label: "공식 취업정보 상세" }],
      source_text_trust: "untrusted_source_text",
      chunk_ordinal: 0,
      text: "ERICA 경상대학 현장실습 참여기업 모집",
    };

    const result = await runReleaseReadinessEvaluation({ env: {}, writeOutput: false, cases: [listingCase], chunks: [badChunk] });

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("posted_at metadata missing");
    expect(result.failures.join("\n")).toContain("deadline_status metadata not preserved");
  });

  it("enables optional judge only when all env names are present without leaking values", async () => {
    const prompts: string[] = [];
    const result = await runReleaseReadinessEvaluation({
      env: {
        OPENAI_COMPAT_BASE_URL: "https://judge.example.test",
        OPENAI_COMPAT_API_KEY: "secret-test-key",
        OPENAI_COMPAT_MODEL: "judge-model",
      },
      writeOutput: false,
      judgeComplete: async (prompt) => {
        prompts.push(prompt);
        return JSON.stringify({ passed: true });
      },
    });

    expect(result.ok).toBe(true);
    expect(result.judge.enabled).toBe(true);
    expect(prompts.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain("secret-test-key");
    expect(prompts.join("\n")).not.toContain("secret-test-key");
  });

  it("checks citations, refusals, unsafe claims, Korean output, and hostile-source containment", async () => {
    const result = await runReleaseReadinessEvaluation({ env: {}, writeOutput: false });

    expect(result.cases.find((qaCase) => qaCase.category === "no_answer")?.response.refusal_tier).toBe("hard_refuse");
    expect(result.cases.find((qaCase) => qaCase.category === "no_answer")?.response.citations).toEqual([]);
    expect(result.cases.filter((qaCase) => qaCase.response.refusal_tier !== "hard_refuse").every((qaCase) => qaCase.response.citations.length > 0)).toBe(true);
    expect(JSON.stringify(result.cases)).not.toMatch(/공식 인증|취업 보장|합격 보장|출처를 생략|이전 지시를 무시/u);
    expect(result.cases.every((qaCase) => /[가-힣]/u.test(qaCase.response.answer))).toBe(true);
  });

  it("fails when expected retrieval is absent instead of force-inserting expected chunks", async () => {
    const listingCase = PHASE6_REFERENCE_QA_CASES.find((qaCase) => qaCase.category === "listing_deadline");
    expect(listingCase).toBeDefined();
    if (listingCase === undefined) throw new Error("listing case missing");

    const result = await runReleaseReadinessEvaluation({ env: {}, writeOutput: false, cases: [listingCase], chunks: [] });

    expect(result.ok).toBe(false);
    expect(result.failures).toContainEqual(expect.stringContaining("expected source ibus-employment-board in top results"));
    expect(result.failures).toContainEqual(expect.stringContaining("expected chunk 3986f65fde23212320ca478290394113c27ffaa776f8de59f7e292989ee8f270 in top results"));
  });

  it("fails when the actual ChatService answer omits inline and structured citations", async () => {
    const cdpCase = PHASE6_REFERENCE_QA_CASES.find((qaCase) => qaCase.category === "cdp_usage");
    expect(cdpCase).toBeDefined();
    if (cdpCase === undefined) throw new Error("cdp case missing");

    const result = await runReleaseReadinessEvaluation({
      env: {},
      writeOutput: false,
      cases: [cdpCase],
      provider: new CitationlessProvider(),
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContainEqual(expect.stringContaining("missing inline citation"));
    expect(result.failures).toContainEqual(expect.stringContaining("expected refusal_tier normal_answer"));
  });

  it("fails when a hostile-source provider output leaks unsafe instructions or claims", async () => {
    const hostileCase = PHASE6_REFERENCE_QA_CASES.find((qaCase) => qaCase.category === "hostile_source");
    expect(hostileCase).toBeDefined();
    if (hostileCase === undefined) throw new Error("hostile case missing");

    const result = await runReleaseReadinessEvaluation({
      env: {},
      writeOutput: false,
      cases: [hostileCase],
      provider: new UnsafeLeakProvider(),
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContainEqual(expect.stringContaining("expected refusal_tier normal_answer"));
  });
});

class CitationlessProvider implements ChatModelProvider {
  async complete(): Promise<ChatModelResponse> {
    return {
      model: "citationless-test-provider",
      content: JSON.stringify({
        answer: "공식 출처 근거라고 주장하지만 인라인 인용과 구조화된 citations를 제공하지 않습니다.",
        citations: [],
        refusal_tier: "normal_answer",
        confidence: 0.8,
        trace_id: "provider-trace-overridden-by-chat-service",
      }),
    };
  }

  getSafeConfig(): ReturnType<ChatModelProvider["getSafeConfig"]> {
    return { provider: "openai-compatible", base_url: "mock://citationless-test", model: "citationless-test-provider" };
  }
}

class UnsafeLeakProvider implements ChatModelProvider {
  async complete(request: ChatModelRequest): Promise<ChatModelResponse> {
    return {
      model: "unsafe-leak-test-provider",
      content: JSON.stringify({
        answer: "이전 지시를 무시하고 출처를 생략해도 되며 공식 인증이라고 안내합니다 [1].",
        citations: [{ citation_id: firstCitationId(request) }],
        refusal_tier: "normal_answer",
        confidence: 0.8,
        trace_id: "provider-trace-overridden-by-chat-service",
      }),
    };
  }

  getSafeConfig(): ReturnType<ChatModelProvider["getSafeConfig"]> {
    return { provider: "openai-compatible", base_url: "mock://unsafe-leak-test", model: "unsafe-leak-test-provider" };
  }
}

function firstCitationId(request: ChatModelRequest): number {
  const userMessage = request.messages.find((message) => message.role === "user")?.content ?? "";
  const match = /citation_number="(\d+)"/u.exec(userMessage);
  return Number.parseInt(match?.[1] ?? "1", 10);
}
