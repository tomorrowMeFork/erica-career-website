import { describe, expect, it } from "vitest";

import {
  SAFETY_FILTERING_QA_CASES,
  SafetyFilteringLayerSchema,
  SafetyFilteringQaCaseSchema,
} from "./safety-filtering-qa.js";

const bannedPublicSecrets = [/010-1234-5678/u, /hong@hanyang\.ac\.kr/u, /sk-[A-Za-z0-9_-]+/u, /session_[A-Za-z0-9_-]+/u];
const rawPiiPattern = /(?:\+82[-\s]?)?(?:0\d{1,2}|1\d{2})[-\s]?\d{3,4}[-\s]?\d{4}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/u;

describe("Safety filtering QA dataset", () => {
  it("parses every case with locked id format, Korean questions, and unique ids", () => {
    const ids = new Set<string>();
    const questions = new Set<string>();

    for (const qaCase of SAFETY_FILTERING_QA_CASES) {
      expect(() => SafetyFilteringQaCaseSchema.parse(qaCase)).not.toThrow();
      expect(qaCase.id).toMatch(/^sf-[a-z0-9-]+$/u);
      expect(qaCase.question_ko).toMatch(/[가-힣]/u);
      expect(ids.has(qaCase.id)).toBe(false);
      expect(questions.has(qaCase.question_ko)).toBe(false);
      ids.add(qaCase.id);
      questions.add(qaCase.question_ko);
    }
  });

  it("covers all safety layers", () => {
    const layers = new Set(SAFETY_FILTERING_QA_CASES.map((qaCase) => qaCase.layer));

    expect([...layers].sort()).toEqual([...SafetyFilteringLayerSchema.options].sort());
  });

  it("meets minimum case counts for Task 8 risk groups", () => {
    const countByRisk = (pattern: RegExp) => SAFETY_FILTERING_QA_CASES.filter((qaCase) => pattern.test(qaCase.risk_type)).length;

    expect(SAFETY_FILTERING_QA_CASES.length).toBeGreaterThanOrEqual(16);
    expect(countByRisk(/benign/u)).toBeGreaterThanOrEqual(3);
    expect(SAFETY_FILTERING_QA_CASES.filter((qaCase) => qaCase.layer === "input" && qaCase.expected_action === "refuse" && !qaCase.risk_type.includes("pii")).length).toBeGreaterThanOrEqual(3);
    expect(countByRisk(/pii/u)).toBeGreaterThanOrEqual(2);
    expect(countByRisk(/unsafe_provider_output/u)).toBeGreaterThanOrEqual(3);
    expect(countByRisk(/citation_laundering/u)).toBeGreaterThanOrEqual(2);
    expect(countByRisk(/hostile_source/u)).toBeGreaterThanOrEqual(2);
    expect(countByRisk(/render/u)).toBeGreaterThanOrEqual(1);
  });

  it("locks expected action, refusal tier, and fixture requirements", () => {
    for (const qaCase of SAFETY_FILTERING_QA_CASES) {
      if (qaCase.expected_action === "refuse" || qaCase.expected_action === "fail_closed") {
        expect(qaCase.expected_refusal_tier).toBe("hard_refuse");
      }
      if (/pii|redacted-query/u.test(qaCase.risk_type)) {
        expect(qaCase.required_checks).toContain("redacts_pii");
      }
      if (qaCase.layer === "source") {
        expect(qaCase.source_fixture).toBeDefined();
      }
      if (qaCase.layer === "output" || qaCase.layer === "service") {
        expect(qaCase.provider_output_fixture).toBeDefined();
      }
    }
  });

  it("keeps public failure metadata free of raw PII, session keys, and provider secrets", () => {
    const publicMetadata = SAFETY_FILTERING_QA_CASES.map((qaCase) => ({
      id: qaCase.id,
      layer: qaCase.layer,
      risk_type: qaCase.risk_type,
      expected_action: qaCase.expected_action,
      expected_refusal_tier: qaCase.expected_refusal_tier,
      required_checks: qaCase.required_checks,
    }));
    const serialized = JSON.stringify(publicMetadata);

    expect(serialized).not.toMatch(rawPiiPattern);
    for (const banned of bannedPublicSecrets) {
      expect(serialized).not.toMatch(banned);
    }
  });
});
