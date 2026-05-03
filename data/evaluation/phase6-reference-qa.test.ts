import { describe, expect, it } from "vitest";

import { PHASE6_REFERENCE_QA_CASES, Phase6QaCaseSchema, Phase6QaCategorySchema } from "./phase6-reference-qa.js";

describe("Phase 6 reference QA dataset", () => {
  it("defines exactly the seven locked Phase 6 categories", () => {
    expect(Phase6QaCategorySchema.options).toEqual([
      "cdp_usage",
      "listing_deadline",
      "success_story",
      "guidebook_pdf",
      "no_answer",
      "personalization",
      "hostile_source",
    ]);
  });

  it("parses every case and covers all locked categories with unique Korean questions", () => {
    const ids = new Set<string>();
    const categories = new Set<string>();

    for (const qaCase of PHASE6_REFERENCE_QA_CASES) {
      expect(() => Phase6QaCaseSchema.parse(qaCase)).not.toThrow();
      expect(qaCase.question_ko).toMatch(/[가-힣]/u);
      expect(ids.has(qaCase.id)).toBe(false);
      ids.add(qaCase.id);
      categories.add(qaCase.category);
    }

    expect(PHASE6_REFERENCE_QA_CASES.length).toBeGreaterThanOrEqual(7);
    expect([...categories].sort()).toEqual([...Phase6QaCategorySchema.options].sort());
  });

  it("rejects malformed questions, categories, answer checks, and freshness metadata", () => {
    const valid = PHASE6_REFERENCE_QA_CASES[1];
    expect(Phase6QaCaseSchema.safeParse({ ...valid, question_ko: "plain english" }).success).toBe(false);
    expect(Phase6QaCaseSchema.safeParse({ ...valid, category: "unknown" }).success).toBe(false);
    expect(Phase6QaCaseSchema.safeParse({ ...valid, required_answer_checks: [] }).success).toBe(false);
    expect(Phase6QaCaseSchema.safeParse({ ...valid, expected_answer: { ...valid.expected_answer, freshness: { requires_fetched_at: false } } }).success).toBe(false);
  });

  it("requires citation checks for answerable cases and refusal checks for no-answer cases", () => {
    for (const qaCase of PHASE6_REFERENCE_QA_CASES) {
      if (qaCase.expected_answer.refusal_tier !== "hard_refuse") {
        expect(qaCase.required_answer_checks).toEqual(expect.arrayContaining(["inline_citation", "structured_citation", "citation_matches_retrieved_chunk"]));
      }
      if (qaCase.category === "no_answer") {
        expect(qaCase.required_answer_checks).toContain("refusal_behavior");
      }
    }
  });

  it("locks listing/deadline and hostile-source safety expectations", () => {
    const listing = PHASE6_REFERENCE_QA_CASES.find((qaCase) => qaCase.category === "listing_deadline");
    expect(listing?.required_answer_checks).toEqual(expect.arrayContaining(["fetched_at", "posted_at", "deadline_status"]));
    expect(listing?.expected_answer.freshness?.expected_deadline_status).toBe("active");

    const hostile = PHASE6_REFERENCE_QA_CASES.find((qaCase) => qaCase.category === "hostile_source");
    expect(hostile?.required_answer_checks).toEqual(expect.arrayContaining(["hostile_source_contained", "no_official_endorsement", "no_guaranteed_outcome"]));
    expect(hostile?.synthetic_hostile_metadata?.chunk_id).toBe("phase6-hostile-source-injection");
  });
});
