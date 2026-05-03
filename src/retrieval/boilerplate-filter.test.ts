import { describe, expect, it } from "vitest";

import { classifyBoilerplate } from "./boilerplate-filter.js";

describe("classifyBoilerplate", () => {
  it("classifies login prompts as boilerplate_only", () => {
    const result = classifyBoilerplate("포털시스템 로그인 후 아이디/비밀번호를 입력하세요.");

    expect(result.label).toBe("boilerplate_only");
    expect(result.matched_boilerplate_signals).toEqual(expect.arrayContaining(["포털시스템 로그인", "아이디/비밀번호"]));
  });

  it("classifies viewer controls as boilerplate_only", () => {
    const result = classifyBoilerplate("공유 인쇄 다운로드 전체화면 PRINT 목차 exit_to_app subjectclose");

    expect(result.label).toBe("boilerplate_only");
    expect(result.boilerplate_score).toBeGreaterThan(result.answer_signal_score);
  });

  it("classifies site chrome as boilerplate_only", () => {
    expect(classifyBoilerplate("MAIN HOME 다운로드 PRINT").label).toBe("boilerplate_only");
  });

  it("keeps mixed CDP service menu text retrievable", () => {
    const result = classifyBoilerplate("MAIN HOME 포털시스템 로그인 상담예약 전문가 상담 컨설팅룸예약 취업프로그램");

    expect(result.label).toBe("mixed");
    expect(result.matched_answer_signals).toEqual(expect.arrayContaining(["상담예약", "전문가 상담", "컨설팅룸예약", "취업프로그램"]));
  });

  it("keeps listing and 자기소개서 첨삭 text answerable", () => {
    const result = classifyBoilerplate("채용정보 현장실습 모집 자기소개서 첨삭 신청 안내");

    expect(result.label).toBe("answerable");
    expect(result.matched_answer_signals).toEqual(expect.arrayContaining(["채용정보", "자기소개서 첨삭"]));
  });

  it("normalizes control characters before matching", () => {
    const result = classifyBoilerplate("포털시스템\u0000 로그인\n아이디/비밀번호");

    expect(result.label).toBe("boilerplate_only");
  });
});
