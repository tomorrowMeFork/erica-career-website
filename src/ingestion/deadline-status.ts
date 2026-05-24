import { z } from "zod";

export const ClassifiedDeadlineStatusSchema = z.object({
	status: z.enum(["active", "expired", "unknown"]),
	deadline_raw_text: z.string().optional(),
	deadline_date: z.string().optional(),
});

export type ClassifiedDeadlineStatus = z.infer<
	typeof ClassifiedDeadlineStatusSchema
>;

const activeUntilFilledPattern =
	/채용\s*시\s*까지|채용시까지|상시(?:채용|모집)?/u;
const dDayPattern = /D\s*([+-])\s*(\d+)/iu;
const dayPattern = "(?:3[01]|[12]\\d|0?[1-9])";
const shortDeadlinePattern = new RegExp(
	String.raw`(?<!\d)(?:~|마감(?:일)?\s*[:：]?\s*|접수\s*(?:기한|마감)\s*[:：]?\s*)(0?[1-9]|1[0-2])[.\-/월]\s*${dayPattern}(?:일)?`,
	"u",
);
const closedPattern =
	/(?<!일)(?:접수\s*)?마감(?:됨|완료)?(?!\s*(?:일|기한|기간))/u;
const labelledFullDatePattern = new RegExp(
	`(?:(?:~\\s*|마감(?:일)?\\s*[:：]?\\s*|접수\\s*(?:기한|마감)\\s*[:：]?\\s*|일시\\s*[:：]?\\s*)(?:20\\d{2})[.\\-/년]\\s*(?:0?[1-9]|1[0-2])[.\\-/월]\\s*${dayPattern}(?:일)?|(?:20\\d{2})[.\\-/년]\\s*(?:0?[1-9]|1[0-2])[.\\-/월]\\s*${dayPattern}(?:일)?\\s*마감)`,
	"u",
);
const ambiguousMonthDayPattern = new RegExp(
	`(?<![\\d.-])(?:0?[1-9]|1[0-2])[.\\-/월]\\s*${dayPattern}(?:일)?(?:\\s*[~–-]\\s*(?:0?[1-9]|1[0-2])?[.\\-/월]?\\s*${dayPattern}(?:일)?)?`,
	"u",
);

export function classifyDeadlineStatus(
	text: string,
	referenceDate = new Date(),
): ClassifiedDeadlineStatus {
	const normalizedText = text.replace(/\s+/gu, " ").trim();
	if (normalizedText.length === 0) {
		return { status: "unknown" };
	}

	const activeUntilFilledMatch = normalizedText.match(activeUntilFilledPattern);
	if (activeUntilFilledMatch?.[0]) {
		return ClassifiedDeadlineStatusSchema.parse({
			status: "active",
			deadline_raw_text: activeUntilFilledMatch[0],
		});
	}

	const dDayMatch = normalizedText.match(dDayPattern);
	if (dDayMatch?.[0] && dDayMatch[1] && dDayMatch[2]) {
		const direction = dDayMatch[1];
		const dayCount = Number.parseInt(dDayMatch[2], 10);
		return ClassifiedDeadlineStatusSchema.parse({
			status: direction === "-" && dayCount > 0 ? "active" : "expired",
			deadline_raw_text: dDayMatch[0].replace(/\s+/gu, ""),
		});
	}

	const shortDeadlineMatch = normalizedText.match(shortDeadlinePattern);
	if (shortDeadlineMatch?.[0] && shortDeadlineMatch[1]) {
		const deadlineDate = normalizeMonthDay(
			shortDeadlineMatch[1],
			shortDeadlineMatch[0],
			referenceDate,
		);
		return ClassifiedDeadlineStatusSchema.parse({
			status: deadlineDate >= toDateOnly(referenceDate) ? "active" : "expired",
			deadline_raw_text: shortDeadlineMatch[0]
				.replace(/^[\s([]+/u, "")
				.replace(/[\s)\]]+$/u, ""),
			deadline_date: deadlineDate,
		});
	}

	const fullDateMatch = normalizedText.match(labelledFullDatePattern);
	if (fullDateMatch?.[0]) {
		const deadlineDate = normalizeFullDate(fullDateMatch[0]);
		if (!deadlineDate) {
			return ClassifiedDeadlineStatusSchema.parse({
				status: "unknown",
				deadline_raw_text: fullDateMatch[0],
			});
		}

		return ClassifiedDeadlineStatusSchema.parse({
			status: deadlineDate >= toDateOnly(referenceDate) ? "active" : "expired",
			deadline_raw_text: fullDateMatch[0],
			deadline_date: deadlineDate,
		});
	}

	const closedMatch = normalizedText.match(closedPattern);
	if (closedMatch?.[0]) {
		return ClassifiedDeadlineStatusSchema.parse({
			status: "expired",
			deadline_raw_text: closedMatch[0].replace(/\s+/gu, " ").trim(),
		});
	}

	const ambiguousMonthDayMatch = normalizedText.match(ambiguousMonthDayPattern);
	if (ambiguousMonthDayMatch?.[0]) {
		return ClassifiedDeadlineStatusSchema.parse({
			status: "unknown",
			deadline_raw_text: ambiguousMonthDayMatch[0],
		});
	}

	return { status: "unknown" };
}

export function resolveEffectiveDeadlineStatus(input: {
	deadline_raw_text: string;
	deadline_status: "active" | "expired" | "unknown";
	referenceDate?: Date;
}): "active" | "expired" | "unknown" {
	const classified = classifyDeadlineStatus(
		input.deadline_raw_text,
		input.referenceDate ?? new Date(),
	);
	return classified.status === "unknown" ? input.deadline_status : classified.status;
}

function normalizeFullDate(rawDate: string): string | undefined {
	const match = rawDate.match(
		/(20\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/u,
	);
	if (!match?.[1] || !match[2] || !match[3]) {
		return undefined;
	}

	const year = match[1];
	const month = match[2].padStart(2, "0");
	const day = match[3].padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function normalizeMonthDay(
	monthText: string,
	rawDate: string,
	referenceDate: Date,
): string {
	const dayMatch = rawDate.match(
		/(?:0?[1-9]|1[0-2])[.\-/월]\s*(3[01]|[12]\d|0?[1-9])/u,
	);
	const month = monthText.padStart(2, "0");
	const day = (dayMatch?.[1] ?? "1").padStart(2, "0");
	return `${referenceDate.getUTCFullYear()}-${month}-${day}`;
}

function toDateOnly(date: Date): string {
	return date.toISOString().slice(0, 10);
}
