import { z } from "zod";
import { buildRecordId, sha256 } from "./chunking.js";
import type { NormalizedRecord } from "./normalized-record.js";
import {
	DeadlineStatusSchema,
	NormalizedRecordSchema,
} from "./normalized-record.js";

const cdpHost = "cdp.hanyang.ac.kr";
const cdpDetailPathPattern =
	/(?:\/Career\/Job\/[A-Za-z0-9]*View\d*\.aspx|\/Office\/SiteMgr\/Notice\/FuncScheView\.aspx)$/u;

export const CdpManualBoardSchema = z.enum([
	"채용상담 및 설명회",
	"일반채용공고",
]);

export const CdpManualPostSchema = z.object({
	board: CdpManualBoardSchema,
	title: z.string().trim().min(1),
	detail_url: z
		.url()
		.refine(
			isAllowedCdpDetailUrl,
			"detail_url must be an HTTPS cdp.hanyang.ac.kr URL without credentials",
		),
	posted_at: z.iso.datetime().nullable().optional(),
	deadline_status: DeadlineStatusSchema.default("unknown"),
	deadline_raw_text: z.string().default(""),
	body_text: z.string().trim().min(1),
}).superRefine((post, context) => {
	const expectedBoard = getExpectedBoardForDetailUrl(post.detail_url);
	if (expectedBoard !== null && post.board !== expectedBoard) {
		context.addIssue({
			code: "custom",
			message: `detail_url path requires board ${expectedBoard}`,
			path: ["board"],
		});
	}
});

export const CdpManualPostExportSchema = z.object({
	exported_at: z.iso.datetime(),
	posts: z.array(CdpManualPostSchema).min(1),
});

export type CdpManualPostExport = z.input<typeof CdpManualPostExportSchema>;

export function buildCdpManualPostRecords(
	input: CdpManualPostExport,
): NormalizedRecord[] {
	const exportData = CdpManualPostExportSchema.parse(input);
	return exportData.posts.map((post) =>
		buildRecord(exportData.exported_at, post),
	);
}

function buildRecord(
	fetchedAt: string,
	post: z.infer<typeof CdpManualPostSchema>,
): NormalizedRecord {
	const detailUrl = normalizeUrl(post.detail_url);
	const title = normalizeCdpManualPostTitle(post);
	const sourceId = sourceIdForBoard(post.board);
	const sourceName = sourceNameForBoard(post.board);
	const rawText = [
		`게시판: ${post.board}`,
		`제목: ${title}`,
		post.posted_at ? `등록일: ${post.posted_at}` : undefined,
		post.deadline_raw_text ? `마감 정보: ${post.deadline_raw_text}` : undefined,
		"본문:",
		post.body_text,
		`공식 상세 URL: ${detailUrl}`,
	]
		.filter((part): part is string => part !== undefined && part.length > 0)
		.join("\n");
	const contentHash = sha256([rawText, detailUrl].join("\u001f"));

	return NormalizedRecordSchema.parse({
		record_id: buildRecordId({
			source_id: sourceId,
			canonical_url: detailUrl,
			title: title,
			posted_at: post.posted_at ?? null,
			content_hash: contentHash,
		}),
		source_id: sourceId,
		source_name: sourceName,
		source_url: detailUrl,
		canonical_url: detailUrl,
		title: title,
		category: `CDP 채용정보 > ${post.board}`,
		fetched_at: fetchedAt,
		posted_at: post.posted_at ?? null,
		deadline_status: post.deadline_status,
		deadline_raw_text: post.deadline_raw_text,
		raw_text: rawText,
		cleaned_text: rawText,
		content_hash: contentHash,
		citation_anchors: [{ url: detailUrl, label: `원문: ${title}` }],
		source_text_trust: "untrusted_source_text",
	});
}

function sourceIdForBoard(board: z.infer<typeof CdpManualBoardSchema>): string {
	return board === "일반채용공고"
		? "cdp-recruit-general-board"
		: "cdp-recruit-event-board";
}

function sourceNameForBoard(board: z.infer<typeof CdpManualBoardSchema>): string {
	return board === "일반채용공고" ? "CDP 일반채용공고" : "CDP 채용상담 및 설명회";
}

function normalizeCdpManualPostTitle(
	post: z.infer<typeof CdpManualPostSchema>,
): string {
	if (post.board !== "채용상담 및 설명회") {
		return post.title;
	}
	if (!isGenericEventTitle(post.title)) {
		return post.title;
	}

	const labeledTitle = extractLabeledBodyValue(post.body_text, "제목");
	return labeledTitle ?? post.title;
}

function isGenericEventTitle(value: string): boolean {
	return ["채용설명회", "채용박람회", "채용상담회"].includes(value.trim());
}

function extractLabeledBodyValue(bodyText: string, label: string): string | null {
	const fieldLabels = new Set([
		"행사구분",
		"제목",
		"기간",
		"기업명",
		"주관 캠퍼스",
		"장소",
		"비고",
		"게시범위(학과)",
		"참가대상",
		"내용",
		"첨부파일",
	]);
	const lines = bodyText.split(/\r?\n/).map((line) => line.trim());
	const labelIndex = lines.indexOf(label);
	if (labelIndex === -1) {
		return null;
	}

	const values: string[] = [];
	for (const line of lines.slice(labelIndex + 1)) {
		if (fieldLabels.has(line)) {
			break;
		}
		if (line.length > 0) {
			values.push(line);
		}
	}

	const value = values.join(" ").replace(/\s+/g, " ").trim();
	if (value.length === 0 || value.length > 200) {
		return null;
	}
	return value;
}

function isAllowedCdpDetailUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			url.hostname === cdpHost &&
			url.username === "" &&
			url.password === "" &&
			cdpDetailPathPattern.test(url.pathname) &&
			!hasCredentialLikeSearchParam(url)
		);
	} catch (_error) {
		return false;
	}
}

function hasCredentialLikeSearchParam(url: URL): boolean {
	for (const key of url.searchParams.keys()) {
		if (/token|password|passwd|session|jsessionid|authorization|auth/iu.test(key)) {
			return true;
		}
	}
	return false;
}

function getExpectedBoardForDetailUrl(
	value: string,
): z.infer<typeof CdpManualBoardSchema> | null {
	let pathname: string;
	try {
		pathname = new URL(value).pathname.toLowerCase();
	} catch (_error) {
		return null;
	}
	if (pathname === "/office/sitemgr/notice/funcscheview.aspx") {
		return "채용상담 및 설명회";
	}
	if (pathname.startsWith("/career/job/") && pathname.endsWith(".aspx")) {
		return "일반채용공고";
	}
	return null;
}

function normalizeUrl(value: string): string {
	const url = new URL(value);
	url.hash = "";
	return url.toString();
}
