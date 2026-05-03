import { describe, expect, it } from "vitest";

import { JUDGE_DIMENSIONS, runRagMvpEvaluation } from "./evaluate-rag-mvp.js";

describe("runRagMvpEvaluation", () => {
  it("passes the deterministic default gate without OpenAI-compatible credentials", async () => {
    const result = await runRagMvpEvaluation({
      env: {},
      writeOutput: false,
    });

    expect(result.ok).toBe(true);
    expect(result.judge.enabled).toBe(false);
    expect(result.message).toBe("rag mvp evaluation passed");
    expect(result.cases.find((testCase) => testCase.label === "ERICA 기숙사 식단")?.response.refusal_tier).toBe("hard_refuse");
    expect(result.cases.map((testCase) => testCase.label)).toEqual(
      expect.arrayContaining([
        "현장실습 참여기업",
        "상담예약",
        "컨설팅룸예약",
        "취업프로그램",
        "직무부트캠프",
        "CDP 학생 가이드북",
        "취업준비도검사",
        "취업성공후기",
        "ERICA 기숙사 식단",
        "hostile source injection",
      ]),
    );
  });

  it("uses the optional D-27 judge only when all safe env names are present", async () => {
    const judgedPrompts: string[] = [];
    const result = await runRagMvpEvaluation({
      env: {
        OPENAI_COMPAT_BASE_URL: "https://judge.example.test",
        OPENAI_COMPAT_API_KEY: "secret-test-key",
        OPENAI_COMPAT_MODEL: "judge-model",
      },
      writeOutput: false,
      judgeComplete: async (prompt) => {
        judgedPrompts.push(prompt);
        return JSON.stringify({
          dimensions: {
            faithfulness: { score: 0.9, passed: true, reason: "cited evidence supports the answer" },
            citation_quality: { score: 0.9, passed: true, reason: "citations map to structured source metadata" },
            korean_quality: { score: 0.9, passed: true, reason: "natural Korean answer" },
          },
        });
      },
    });

    expect(result.ok).toBe(true);
    expect(result.judge.enabled).toBe(true);
    expect(judgedPrompts.length).toBeGreaterThan(0);
    expect(judgedPrompts.join("\n")).toContain("faithfulness");
    expect(judgedPrompts.join("\n")).toContain("citation_quality");
    expect(judgedPrompts.join("\n")).toContain("korean_quality");
    expect(judgedPrompts.join("\n")).not.toContain("secret-test-key");
    expect(JUDGE_DIMENSIONS).toEqual(["faithfulness", "citation_quality", "korean_quality"]);
  });

  it("does not enable live judging from ambient process env by default", async () => {
    const previousBaseUrl = process.env.OPENAI_COMPAT_BASE_URL;
    const previousApiKey = process.env.OPENAI_COMPAT_API_KEY;
    const previousModel = process.env.OPENAI_COMPAT_MODEL;
    process.env.OPENAI_COMPAT_BASE_URL = "https://ambient-judge.example.test";
    process.env.OPENAI_COMPAT_API_KEY = "ambient-secret-test-key";
    process.env.OPENAI_COMPAT_MODEL = "ambient-judge-model";

    try {
      const result = await runRagMvpEvaluation({ writeOutput: false });

      expect(result.ok).toBe(true);
      expect(result.judge.enabled).toBe(false);
      expect(JSON.stringify(result)).not.toContain("ambient-secret-test-key");
    } finally {
      restoreEnv("OPENAI_COMPAT_BASE_URL", previousBaseUrl);
      restoreEnv("OPENAI_COMPAT_API_KEY", previousApiKey);
      restoreEnv("OPENAI_COMPAT_MODEL", previousModel);
    }
  });

  it("reports threshold failures from the mocked env-present D-27 judge path", async () => {
    const result = await runRagMvpEvaluation({
      env: {
        OPENAI_COMPAT_BASE_URL: "https://judge.example.test",
        OPENAI_COMPAT_API_KEY: "secret-test-key",
        OPENAI_COMPAT_MODEL: "judge-model",
      },
      writeOutput: false,
      judgeComplete: async () =>
        JSON.stringify({
          dimensions: {
            faithfulness: { score: 0.4, passed: false, reason: "unsupported claim" },
            citation_quality: { score: 0.9, passed: true, reason: "citations are present" },
            korean_quality: { score: 0.9, passed: true, reason: "Korean is natural" },
          },
        }),
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContainEqual(expect.stringContaining("faithfulness"));
    expect(result.failures).toContainEqual(expect.stringContaining("unsupported claim"));
  });
});

function restoreEnv(name: "OPENAI_COMPAT_BASE_URL" | "OPENAI_COMPAT_API_KEY" | "OPENAI_COMPAT_MODEL", value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
