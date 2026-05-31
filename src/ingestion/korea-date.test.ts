import { describe, expect, it } from "vitest";

import { toKoreaDateIso } from "./korea-date.js";

describe("toKoreaDateIso", () => {
  it("uses the Asia/Seoul calendar date instead of the UTC date", () => {
    expect(toKoreaDateIso(new Date("2026-05-23T15:30:00.000Z"))).toBe("2026-05-24T00:00:00.000Z");
  });
});
