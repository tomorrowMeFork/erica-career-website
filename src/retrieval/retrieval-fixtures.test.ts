import { describe, expect, it } from "vitest";

import { expandDomainSynonyms } from "./domain-synonyms.js";
import { hangulNgrams } from "./normalize-korean.js";

describe("Korean retrieval query processing", () => {
  it("expands only explicit domain synonyms for Korean career-service terms", () => {
    expect(expandDomainSynonyms(["자소서"])).toContain("자기소개서");
    expect(expandDomainSynonyms(["상담"])).toEqual(expect.arrayContaining(["컨설팅", "상담예약"]));
    expect(expandDomainSynonyms(["intern"])).toContain("인턴");
    expect(expandDomainSynonyms(["가이드북"])).toContain("매뉴얼");
  });

  it("generates Hangul 2-grams and 3-grams for service queries", () => {
    const grams = hangulNgrams("상담예약");

    expect(grams).toEqual(expect.arrayContaining(["상담", "담예", "예약", "상담예", "담예약"]));
  });
});
