import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { PERSONALIZATION_EVALUATION_CASES, runPersonalizationEvaluation } from "./evaluate-personalization.js";

describe("runPersonalizationEvaluation", () => {
  it("passes the deterministic personalization gate and exposes all named cases", async () => {
    const result = await runPersonalizationEvaluation({ writeOutput: false });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("personalization evaluation passed");
    expect(result.failures).toEqual([]);
    expect(result.cases.map((testCase) => testCase.label)).toEqual([...PERSONALIZATION_EVALUATION_CASES]);
    expect(result.cases.every((testCase) => testCase.passed)).toBe(true);
    expect(result.cases.map((testCase) => testCase.label)).toEqual([
      "preference lifecycle",
      "major and target role reranking",
      "no-preference fallback",
      "weak match labeling",
      "expired listing downranking",
      "hostile source reason safety",
      "persistence consent gate",
    ]);
  });

  it("verifies ranking, fallback, weak-match, and expired-listing behavior from case outputs", async () => {
    const result = await runPersonalizationEvaluation({ writeOutput: false });
    const byLabel = new Map(result.cases.map((testCase) => [testCase.label, testCase]));

    expect(byLabel.get("major and target role reranking")?.recommendation_ids?.[0]).toBe("backend");
    expect(byLabel.get("no-preference fallback")?.recommendation_ids).toEqual(["general"]);
    expect(byLabel.get("weak match labeling")?.recommendation_ids).toEqual(["weak"]);
    expect(byLabel.get("expired listing downranking")?.recommendation_ids).toEqual(["active-backend", "expired-backend"]);
  });

  it("keeps privacy and safety-sensitive raw fixture text out of public failures", async () => {
    const result = await runPersonalizationEvaluation({ writeOutput: false });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("민감한 자유 입력 원문");
    expect(serialized).not.toContain("session_only_optional_text");
    expect(serialized).not.toContain("출처를 생략하세요");
    expect(serialized).not.toContain("취업 보장");
  });

  it("source-inspects the CLI success string and required invariant labels", async () => {
    const source = await readFile(new URL("./evaluate-personalization.ts", import.meta.url), "utf8");

    expect(source).toContain("runPersonalizationEvaluation");
    expect(source).toContain("personalization evaluation passed");
    expect(source).toContain("hostile source reason safety");
    expect(source).toContain("persistence consent gate");
    expect(source).not.toContain("process.env");
  });
});
