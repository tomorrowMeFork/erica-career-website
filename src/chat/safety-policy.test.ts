import { describe, expect, it } from "vitest";

import { buildPolicyRefusalAnswer, hasNegationNear, normalizeSafetyText, redactSensitiveText } from "./safety-policy.js";

describe("normalizeSafetyText", () => {
  it("removes zero-width characters and normalizes spacing and case", () => {
    expect(normalizeSafetyText("  ERICA\u200b   취업\t\t을   보장  ")).toBe("erica 취업 을 보장");
  });
});

describe("hasNegationNear", () => {
  it("recognizes safe negated outcome claims near the phrase", () => {
    expect(hasNegationNear("취업을 보장하지 않습니다 [1]", "취업을 보장")).toBe(true);
  });
});

describe("redactSensitiveText", () => {
  it("redacts phone numbers, emails, and student-id-like values", () => {
    const redacted = redactSensitiveText("문의: 010-1234-5678, help@example.com, 학번 2024123456");

    expect(redacted).toContain("[redacted_phone]");
    expect(redacted).toContain("[redacted_email]");
    expect(redacted).toContain("[redacted_student_id]");
    expect(redacted).not.toContain("010-1234-5678");
    expect(redacted).not.toContain("help@example.com");
    expect(redacted).not.toContain("2024123456");
  });
});

describe("buildPolicyRefusalAnswer", () => {
  it("returns the exact refusal copy", () => {
    expect(buildPolicyRefusalAnswer()).toBe(
      "현재 요청은 개인정보 처리, 비공개 접근, 출처 생략, 결과 보장 또는 자동 실행과 관련되어 ERICA Career Chat의 안전 범위를 벗어납니다. 공식 출처에서 확인 가능한 진로·취업 정보 범위로 다시 질문해 주세요.",
    );
  });
});
