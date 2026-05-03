import { describe, expect, it } from "vitest";
import { classifyDeadlineStatus } from "./deadline-status.js";

const referenceDate = new Date("2026-05-03T00:00:00.000Z");

describe("classifyDeadlineStatus", () => {
  it("classifies closed Korean markers as expired", () => {
    expect(classifyDeadlineStatus("접수 마감", referenceDate)).toEqual({
      status: "expired",
      deadline_raw_text: "접수 마감",
    });
    expect(classifyDeadlineStatus("마감", referenceDate)).toEqual({ status: "expired", deadline_raw_text: "마감" });
  });

  it("classifies 채용시까지 and 상시 as active with raw evidence", () => {
    expect(classifyDeadlineStatus("지원기간: 채용시까지", referenceDate)).toEqual({
      status: "active",
      deadline_raw_text: "채용시까지",
    });
    expect(classifyDeadlineStatus("상시채용 공고", referenceDate)).toEqual({
      status: "active",
      deadline_raw_text: "상시채용",
    });
  });

  it("classifies D-day evidence without treating D-0 as active", () => {
    expect(classifyDeadlineStatus("오늘 기준 D-3", referenceDate)).toEqual({
      status: "active",
      deadline_raw_text: "D-3",
    });
    expect(classifyDeadlineStatus("D-0", referenceDate)).toEqual({ status: "expired", deadline_raw_text: "D-0" });
    expect(classifyDeadlineStatus("D+1", referenceDate)).toEqual({ status: "expired", deadline_raw_text: "D+1" });
  });

  it("returns unknown without fabricating dates when no explicit deadline evidence exists", () => {
    expect(classifyDeadlineStatus("한양 ERICA 경상대학 취업정보 게시글", referenceDate)).toEqual({ status: "unknown" });
  });

  it("preserves ambiguous explicit month/day ranges as raw text while returning unknown", () => {
    expect(classifyDeadlineStatus("접수기간 5.10~5.20", referenceDate)).toEqual({
      status: "unknown",
      deadline_raw_text: "5.10~5.20",
    });
  });

  it("normalizes full explicit dates and compares them to the reference date", () => {
    expect(classifyDeadlineStatus("마감일 2026.05.31", referenceDate)).toEqual({
      status: "active",
      deadline_raw_text: "2026.05.31",
      deadline_date: "2026-05-31",
    });
    expect(classifyDeadlineStatus("접수기한 2026-04-30", referenceDate)).toEqual({
      status: "expired",
      deadline_raw_text: "2026-04-30",
      deadline_date: "2026-04-30",
    });
  });
});
