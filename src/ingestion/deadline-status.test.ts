import { describe, expect, it } from "vitest";
import { classifyDeadlineStatus, extractEventPeriodDeadlineRawText, resolveEffectiveDeadlineStatus } from "./deadline-status.js";

const referenceDate = new Date("2026-05-03T00:00:00.000Z");

describe("classifyDeadlineStatus", () => {
	it("classifies closed Korean markers as expired", () => {
		expect(classifyDeadlineStatus("접수 마감", referenceDate)).toEqual({
			status: "expired",
			deadline_raw_text: "접수 마감",
		});
		expect(classifyDeadlineStatus("마감", referenceDate)).toEqual({
			status: "expired",
			deadline_raw_text: "마감",
		});
	});

	it("classifies 채용시까지 and 상시 as active with raw evidence", () => {
		expect(
			classifyDeadlineStatus("지원기간: 채용시까지", referenceDate),
		).toEqual({
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
		expect(classifyDeadlineStatus("D-0", referenceDate)).toEqual({
			status: "expired",
			deadline_raw_text: "D-0",
		});
		expect(classifyDeadlineStatus("D+1", referenceDate)).toEqual({
			status: "expired",
			deadline_raw_text: "D+1",
		});
	});

	it("returns unknown without fabricating dates when no explicit deadline evidence exists", () => {
		expect(
			classifyDeadlineStatus(
				"한양 ERICA 경상대학 취업정보 게시글",
				referenceDate,
			),
		).toEqual({ status: "unknown" });
	});

	it("preserves ambiguous explicit month/day ranges as raw text while returning unknown", () => {
		expect(classifyDeadlineStatus("접수기간 5.10~5.20", referenceDate)).toEqual(
			{
				status: "unknown",
				deadline_raw_text: "5.10~5.20",
			},
		);
	});

	it("normalizes full explicit dates and compares them to the reference date", () => {
		expect(classifyDeadlineStatus("마감일 2026.05.31", referenceDate)).toEqual({
			status: "active",
			deadline_raw_text: "마감일 2026.05.31",
			deadline_date: "2026-05-31",
		});
		expect(
			classifyDeadlineStatus("접수기한 2026-04-30", referenceDate),
		).toEqual({
			status: "expired",
			deadline_raw_text: "접수기한 2026-04-30",
			deadline_date: "2026-04-30",
		});
	});

	it("normalizes tilde-prefixed full dates and compares them to the reference date", () => {
		expect(classifyDeadlineStatus("~ 2026-05-31", referenceDate)).toEqual({
			status: "active",
			deadline_raw_text: "~ 2026-05-31",
			deadline_date: "2026-05-31",
		});
		expect(classifyDeadlineStatus("~2026.04.30", referenceDate)).toEqual({
			status: "expired",
			deadline_raw_text: "~2026.04.30",
			deadline_date: "2026-04-30",
		});
	});

	it("normalizes full dates followed by a deadline label", () => {
		expect(classifyDeadlineStatus("2026-06-01 마감", referenceDate)).toEqual({
			status: "active",
			deadline_raw_text: "2026-06-01 마감",
			deadline_date: "2026-06-01",
		});
	});

	it("does not treat generic posted dates as deadline evidence", () => {
		expect(
			classifyDeadlineStatus(
				"[창업진흥원] 2026년 제3차 체험형 청년인턴(일반) 채용\n작성일 2026-04-30",
				referenceDate,
			),
		).toEqual({ status: "unknown" });
	});

	it("uses labelled event dates as freshness/deadline evidence", () => {
		expect(
			classifyDeadlineStatus(
				"설명회 일정 일시: 2026년 5월 14일",
				referenceDate,
			),
		).toEqual({
			status: "active",
			deadline_raw_text: "일시: 2026년 5월 14일",
			deadline_date: "2026-05-14",
		});
	});

	it("prefers short deadline evidence in titles over posted dates in page body", () => {
		expect(
			classifyDeadlineStatus(
				"[서울에너지공사] 2026년도 상반기 신규직원 채용 공고(~5/14)\n작성일 2026-04-30",
				referenceDate,
			),
		).toEqual({
			status: "active",
			deadline_raw_text: "~5/14",
			deadline_date: "2026-05-14",
		});
	});

	it("uses posted date context for yearless short deadlines", () => {
		expect(
			classifyDeadlineStatus(
				"[신한은행/신한금융희망재단] 신한 커리어업 10기 교육생 모집 (~9/23)",
				new Date("2026-05-24T00:00:00.000Z"),
				{ postedAt: "2025-09-16T00:00:00.000Z" },
			),
		).toEqual({
			status: "expired",
			deadline_raw_text: "~9/23",
			deadline_date: "2025-09-23",
		});
	});

	it("prefers application period end dates over later education period dates", () => {
		expect(
			classifyDeadlineStatus(
				"[LIG넥스원] 임베디드SW 스쿨 3기 모집 신청기간: 2025.10.24(금) ~ 11.10(월) 09:00 교육기간: 2025.12.01(월) ~ 2026.06.10(수)",
				new Date("2026-05-24T00:00:00.000Z"),
				{ postedAt: "2025-10-24T00:00:00.000Z" },
			),
		).toEqual({
			status: "expired",
			deadline_raw_text: "신청기간: 2025.10.24(금) ~ 11.10(월)",
			deadline_date: "2025-11-10",
		});
	});

	it("extracts event period end dates before open-ended hiring text", () => {
		const rawEventDeadline = extractEventPeriodDeadlineRawText(
			"행사구분\n채용설명회\n기간\n2025-09-05 ~ 2025-09-26 12시 00분 ~ 12시 45분\n내용\n모집기한: 상시채용",
		);

		expect(rawEventDeadline).toBe("~ 2025-09-26");
		expect(
			classifyDeadlineStatus(
				rawEventDeadline ?? "",
				new Date("2026-05-23T00:00:00.000Z"),
			),
		).toEqual({
			status: "expired",
			deadline_raw_text: "~ 2025-09-26",
			deadline_date: "2025-09-26",
		});
	});
});

describe("resolveEffectiveDeadlineStatus", () => {
	it("recomputes stored active deadlines against the current reference date", () => {
		expect(
			resolveEffectiveDeadlineStatus({
				deadline_status: "active",
				deadline_raw_text: "~5/14",
				referenceDate: new Date("2026-05-22T00:00:00.000Z"),
			}),
		).toBe("expired");
	});

	it("falls back to stored status when raw deadline text has no parseable date", () => {
		expect(
			resolveEffectiveDeadlineStatus({
				deadline_status: "active",
				deadline_raw_text: "추후 공지",
				referenceDate,
			}),
		).toBe("active");
	});

	it("uses posted date context when recomputing stored active yearless deadlines", () => {
		expect(
			resolveEffectiveDeadlineStatus({
				deadline_status: "active",
				deadline_raw_text: "~9/23",
				posted_at: "2025-09-16T00:00:00.000Z",
				referenceDate: new Date("2026-05-24T00:00:00.000Z"),
			}),
		).toBe("expired");
	});
});
