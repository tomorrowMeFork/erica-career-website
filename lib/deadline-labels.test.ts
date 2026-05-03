import { describe, expect, it } from "vitest";

import { getDeadlineStatusLabel, getMatchStrengthLabel, getRefusalTierMeta } from "./deadline-labels.js";

describe("deadline and semantic Korean labels", () => {
  it("maps deadline, match, and refusal labels exactly", () => {
    expect(getDeadlineStatusLabel("active")).toBe("모집중");
    expect(getDeadlineStatusLabel("expired")).toBe("마감됨");
    expect(getDeadlineStatusLabel("unknown")).toBe("마감일 확인 필요");
    expect(getMatchStrengthLabel("personalized_match")).toBe("맞춤 추천");
    expect(getMatchStrengthLabel("partial_match")).toBe("일부 조건 일치");
    expect(getMatchStrengthLabel("general_recommendation")).toBe("일반 안내");
    expect(getRefusalTierMeta("hard_refuse").label).toBe("답변 근거 부족");
    expect(getRefusalTierMeta("soft_hedge").label).toBe("확인 필요");
  });
});
