import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import {
	assertCanIngestSource,
	loadSourceRegistryForIngestion,
} from "../src/ingestion/access-gate.js";
import {
	buildRecordId,
	chunkNormalizedRecord,
	sha256,
} from "../src/ingestion/chunking.js";
import type {
	CitationAnchor,
	DeadlineStatus,
	NormalizedRecord,
} from "../src/ingestion/normalized-record.js";
import { NormalizedRecordSchema } from "../src/ingestion/normalized-record.js";
import { extractPdfPages } from "../src/ingestion/pdf/pdf-page-parser.js";
import { writeKnowledgeBaseJsonl } from "../src/ingestion/write-jsonl-kb.js";
import type { KBTaxonomyMetadata } from "../src/knowledge-base/taxonomy.js";

type EwilSource = {
	source_id: string;
	source_name: string;
	canonical_url: string;
	category: string;
	taxonomy: KBTaxonomyMetadata;
	title: string;
	purpose: string;
};

type EwilOutputGroup = {
	key: "notice-materials" | "internship-reviews";
	directoryName: string;
	sourceIds: readonly string[];
};

type CliArgs = {
	outputDir: string;
	maxListPages: number;
	maxDetailPages: number;
	headless: boolean;
	sourceIds: readonly string[];
};

type CollectedPage = {
	source: EwilSource;
	url: string;
	title: string;
	text: string;
	posted_at: string | null;
	deadline_status: DeadlineStatus;
	deadline_raw_text: string;
	citation_anchors?: CitationAnchor[];
};

type AttachmentLink = {
	url: string;
	label: string;
};

type DetailLinkCandidate = {
	elementIndex: number;
	key: string;
	selector: string;
	url: string;
};

type ClickedDetailPage = {
	html: string;
	url: string;
	candidate: DetailLinkCandidate;
};

const ewilOrigin = "https://e-wil.hanyang.ac.kr";
const defaultOutputDir = "data/knowledge-base/ewil-authenticated-sources";
const defaultMaxListPages = 5;
const defaultMaxDetailPages = 30;
const maxAllowedDetailPages = 10_000;
const navigationTimeoutMs = 20_000;
const renderedContentTimeoutMs = 5_000;
const requestDelayMs = 1_200;
const maxPdfAttachmentsPerPage = 5;
const maxPdfBytes = 25 * 1024 * 1024;
const sourceRegistryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";

const ewilSources: readonly EwilSource[] = [
	{
		source_id: "ewil-notice-board",
		source_name: "E-WIL 공지사항",
		canonical_url: `${ewilOrigin}/data/list.do?type=NOTICE`,
		category: "ERICA 현장실습 지원 시스템 > 공지사항/인턴공고",
		taxonomy: {
			collection_category: "internship_notice",
			source_family: "ewil",
			category_label_ko: "현장실습/인턴십 안내",
		},
		title: "E-WIL 공지사항/인턴공고",
		purpose: "공지사항과 인턴/현장실습 공고 목록",
	},
	{
		source_id: "ewil-info-board",
		source_name: "E-WIL 설명회",
		canonical_url: `${ewilOrigin}/data/list.do?type=INFO`,
		category: "ERICA 현장실습 지원 시스템 > 설명회",
		taxonomy: {
			collection_category: "career_program",
			source_family: "ewil",
			category_label_ko: "취업 프로그램",
		},
		title: "E-WIL 설명회",
		purpose: "현장실습 관련 설명회 및 안내 자료",
	},
	{
		source_id: "ewil-internship-reviews",
		source_name: "E-WIL 실습 후기",
		canonical_url: `${ewilOrigin}/internphoto/compList.do`,
		category: "ERICA 현장실습 지원 시스템 > 실습 후기",
		taxonomy: {
			collection_category: "internship_review",
			source_family: "ewil",
			category_label_ko: "현장실습 후기",
		},
		title: "E-WIL 실습 후기",
		purpose: "현장실습 참여 기업/실습 후기 목록",
	},
] as const;

const ewilOutputGroups: readonly EwilOutputGroup[] = [
	{
		key: "notice-materials",
		directoryName: "공지사항",
		sourceIds: ["ewil-notice-board", "ewil-info-board"],
	},
	{
		key: "internship-reviews",
		directoryName: "현장실습후기",
		sourceIds: ["ewil-internship-reviews"],
	},
] as const;

async function runCli(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const fetchedAt = new Date().toISOString();
	const browser = await chromium.launch({ headless: args.headless });
	const records: NormalizedRecord[] = [];
	const selectedSources = ewilSources.filter((source) =>
		args.sourceIds.includes(source.source_id),
	);
	const registry = loadSourceRegistryForIngestion(sourceRegistryPath);
	for (const source of selectedSources) {
		assertCanIngestSource(registry, source.source_id, "manual_login_session");
	}

	try {
		const context = await browser.newContext({
			storageState: { cookies: [], origins: [] },
		});
		try {
			await restrictContextToEwil(context);
			const page = await context.newPage();
			await promptForManualLogin(page, args.headless);

			for (const source of selectedSources) {
				const collected = await collectSource(
					page,
					source,
					args.maxListPages,
					args.maxDetailPages,
				);
				records.push(...collected.map((item) => buildRecord(item, fetchedAt)));
				await delay(requestDelayMs);
			}
		} finally {
			await context.clearCookies();
			await context.close();
		}
	} finally {
		await browser.close();
	}

	const groupedRecords = groupEwilRecordsByOutputCategory(records);
	let totalRecordCount = 0;
	let totalChunkCount = 0;
	for (const group of groupedRecords) {
		const chunks = group.records.flatMap((record) => chunkNormalizedRecord(record));
		const outputDir = `${args.outputDir}/${group.directoryName}`;
		const manifest = await writeKnowledgeBaseJsonl({
			records: group.records,
			chunks,
			outputDir,
			manifest: {
				run_id: `ewil-authenticated-sources-${group.key}-${fetchedAt}`,
				generated_at: fetchedAt,
				source_ids: [...new Set(group.records.map((record) => record.source_id))],
			},
		});
		totalRecordCount += manifest.record_count;
		totalChunkCount += manifest.chunk_count;
		console.log(
			`ewil authenticated source ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${outputDir}`,
		);
	}

	console.log(
		`ewil authenticated source ingestion wrote ${totalRecordCount} records and ${totalChunkCount} chunks across ${groupedRecords.length} category directories under ${args.outputDir}`,
	);
}

export function groupEwilRecordsByOutputCategory(
	records: readonly NormalizedRecord[],
): { key: EwilOutputGroup["key"]; directoryName: string; records: NormalizedRecord[] }[] {
	return ewilOutputGroups
		.map((group) => ({
			key: group.key,
			directoryName: group.directoryName,
			records: records.filter((record) => group.sourceIds.includes(record.source_id)),
		}))
		.filter((group) => group.records.length > 0);
}

async function promptForManualLogin(
	page: Page,
	headless: boolean,
): Promise<void> {
	if (headless) {
		throw new Error(
			"Manual E-WIL login requires a headed browser. Remove --headless and run again.",
		);
	}

	await page.goto(`${ewilOrigin}/index.do`, {
		waitUntil: "domcontentloaded",
		timeout: navigationTimeoutMs,
	});
	console.log("Opened E-WIL in a non-persistent browser context.");
	console.log(
		"Log in manually in the opened browser window. No cookies, storage state, screenshots, traces, IDs, or passwords will be written by this script.",
	);
	const readline = createInterface({ input, output });
	try {
		await readline.question(
			"After login completes, press Enter here to collect only the three approved E-WIL URLs...",
		);
	} finally {
		readline.close();
	}
}

async function restrictContextToEwil(context: BrowserContext): Promise<void> {
	await context.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (
			url.origin === ewilOrigin ||
			url.origin === "https://api.hanyang.ac.kr"
		) {
			await route.continue();
			return;
		}
		await route.abort();
	});
}

async function collectSource(
	page: Page,
	source: EwilSource,
	maxListPages: number,
	maxDetailPages: number,
): Promise<CollectedPage[]> {
	const listPages = await collectListPages(page, source, maxListPages);
	const pages: CollectedPage[] = [];
	const detailCandidateGroups: {
		listPage: ListPage;
		candidates: DetailLinkCandidate[];
	}[] = [];
	const seenDetailKeys = new Set<string>();
	let collectedDetailPageCount = 0;

	if (source.source_id === "ewil-internship-reviews") {
		return collectInternshipReviewPages(
			page,
			source,
			listPages,
			maxDetailPages,
		);
	}

	for (const listPage of listPages) {
		const { html: listHtml, url: listUrl } = listPage;
		pages.push(
			...(await collectPageAndPdfAttachments(
				page,
				source,
				listUrl,
				listHtml,
				source.title,
			)),
		);

		const candidates: DetailLinkCandidate[] = [];
		for (const candidate of extractDetailLinkCandidates(listHtml, listUrl)) {
			if (!seenDetailKeys.has(candidate.key)) {
				seenDetailKeys.add(candidate.key);
				candidates.push(candidate);
			}
		}
		detailCandidateGroups.push({ listPage, candidates });
	}

	for (const { listPage, candidates } of detailCandidateGroups) {
		for (const candidate of candidates) {
			if (collectedDetailPageCount >= maxDetailPages) {
				return pages;
			}

			await delay(requestDelayMs);
			const detailPages = await collectClickedDetailPages(
				page,
				listPage,
				candidate,
				maxDetailPages - collectedDetailPageCount,
			);
			for (const detailPage of detailPages) {
				pages.push(
					...(await collectPageAndPdfAttachments(
						page,
						source,
						buildDetailCitationUrl(
							detailPage.url,
							listPage.url,
							detailPage.candidate,
						),
						detailPage.html,
						source.title,
					)),
				);
				collectedDetailPageCount += 1;
			}
		}
	}

	return pages;
}

type ListPage = {
	url: string;
	html: string;
	pagingTarget?: string;
};

async function collectListPages(
	page: Page,
	source: EwilSource,
	maxListPages: number,
): Promise<ListPage[]> {
	const visited = new Set<string>();
	const pages: ListPage[] = [];
	const queue = [source.canonical_url];

	while (queue.length > 0 && visited.size < maxListPages) {
		const listUrl = queue.shift();
		if (listUrl === undefined || visited.has(listUrl)) {
			continue;
		}
		visited.add(listUrl);

		const html = await collectHtml(page, listUrl);
		pages.push({ url: listUrl, html });
		const seenPageContent = new Set<string>([fingerprintListPage(html)]);
		for (const target of extractClickablePagingTargets(html)) {
			if (pages.length >= maxListPages) {
				break;
			}
			await delay(requestDelayMs);
			const clickedHtml = await collectClickedListPage(page, listUrl, target);
			const fingerprint = fingerprintListPage(clickedHtml);
			if (seenPageContent.has(fingerprint)) {
				continue;
			}
			seenPageContent.add(fingerprint);
			pages.push({
				url: listUrl,
				html: clickedHtml,
				pagingTarget: target,
			});
		}
		for (const nextListUrl of extractListPageUrls(html, listUrl, source)) {
			if (
				!visited.has(nextListUrl) &&
				queue.length + visited.size < maxListPages
			) {
				queue.push(nextListUrl);
			}
		}
	}

	return pages;
}

async function collectClickedListPage(
	page: Page,
	listUrl: string,
	target: string,
): Promise<string> {
	await clickPagingTargetOnCurrentPage(page, target);
	return collectCurrentHtml(page, listUrl);
}

async function openListPage(
	page: Page,
	listUrl: string,
	pagingTarget: string | undefined,
): Promise<void> {
	await collectHtml(page, listUrl);
	if (pagingTarget === undefined) {
		return;
	}
	await clickPagingTargetOnCurrentPage(page, pagingTarget);
}

async function clickPagingTargetOnCurrentPage(
	page: Page,
	pagingTarget: string,
): Promise<void> {
	const beforeClickText = await readableBodyText(page);
	const clicked = await page.evaluate((target) => {
		const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
		const targetAnchor = anchors.find((anchor) => {
			const href = anchor.getAttribute("href") ?? "";
			return new RegExp(`^javascript\\s*:\\s*Paging\\s*\\(\\s*${target}\\s*\\)`, "iu").test(
				href,
			);
		});
		if (targetAnchor === undefined) {
			return false;
		}
		targetAnchor.click();
		return true;
	}, pagingTarget);
	if (!clicked) {
		throw new Error(`E-WIL pagination link moved before click: Paging(${pagingTarget})`);
	}
	await waitForReadableTextChange(page, beforeClickText);
}

async function collectInternshipReviewPages(
	page: Page,
	source: EwilSource,
	listPages: readonly ListPage[],
	maxDetailPages: number,
): Promise<CollectedPage[]> {
	const pages: CollectedPage[] = [];
	const seenCompanyKeys = new Set<string>();
	const seenReviewKeys = new Set<string>();
	let discoveredReviewCandidateCount = 0;
	let collectedReviewPageCount = 0;
	let skippedReviewCandidateCount = 0;

	for (const listPage of listPages) {
		const companyCandidates = extractInternshipCompanyCandidates(
			listPage.html,
			listPage.url,
		).filter((candidate) => {
			if (seenCompanyKeys.has(candidate.key)) {
				return false;
			}
			seenCompanyKeys.add(candidate.key);
			return true;
		});
		console.log(
			`E-WIL reviews: ${listPage.url} yielded ${companyCandidates.length} company candidates`,
		);

		for (const companyCandidate of companyCandidates) {
			if (collectedReviewPageCount >= maxDetailPages) {
				logInternshipReviewCollectionSummary({
					status: "stopped after reaching --max-detail-pages",
					discoveredReviewCandidateCount,
					collectedReviewPageCount,
					skippedReviewCandidateCount,
					maxDetailPages,
				});
				return pages;
			}

			await delay(requestDelayMs);
			let companyPage: ClickedDetailPage;
			try {
				await openListPage(page, listPage.url, listPage.pagingTarget);
				companyPage = await clickCandidateFromPage(
					page,
					undefined,
					companyCandidate,
				);
			} catch (error) {
				console.log(
					formatInternshipReviewCompanyCandidateSkip(companyCandidate.key, error),
				);
				skippedReviewCandidateCount += 1;
				continue;
			}
			const reviewCandidates = extractInternshipReviewCandidates(
				companyPage.html,
				companyCandidate.url,
				companyCandidate.key,
			).filter((candidate) => {
				if (seenReviewKeys.has(candidate.key)) {
					return false;
				}
				seenReviewKeys.add(candidate.key);
				return true;
			});
			console.log(
				`E-WIL reviews: company ${companyCandidate.key} yielded ${reviewCandidates.length} review candidates`,
			);
			discoveredReviewCandidateCount += reviewCandidates.length;

			for (const reviewCandidate of reviewCandidates) {
				if (collectedReviewPageCount >= maxDetailPages) {
					logInternshipReviewCollectionSummary({
						status: "stopped after reaching --max-detail-pages",
						discoveredReviewCandidateCount,
						collectedReviewPageCount,
						skippedReviewCandidateCount,
						maxDetailPages,
					});
					return pages;
				}

				await delay(requestDelayMs);
				let reviewHtml: string;
				try {
					reviewHtml = await collectHtml(page, reviewCandidate.url);
				} catch (error) {
					console.log(
						`E-WIL reviews: skipped ${reviewCandidate.key}; ${formatInternshipReviewSkipReason(error)}`,
					);
					skippedReviewCandidateCount += 1;
					continue;
				}
				const recordability = classifyInternshipReviewRecordability(reviewHtml);
				if (!recordability.recordable) {
					console.log(
						`E-WIL reviews: skipped ${reviewCandidate.key}; ${recordability.reason}`,
					);
					skippedReviewCandidateCount += 1;
					continue;
				}
				let collectedPages: CollectedPage[];
				try {
					collectedPages = await collectPageAndPdfAttachments(
						page,
						source,
						reviewCandidate.url,
						reviewHtml,
						source.title,
					);
				} catch (error) {
					console.log(
						`E-WIL reviews: skipped ${reviewCandidate.key}; ${formatInternshipReviewSkipReason(error)}`,
					);
					skippedReviewCandidateCount += 1;
					continue;
				}
				pages.push(...collectedPages);
				collectedReviewPageCount += 1;
				console.log(
					`E-WIL reviews: collected ${reviewCandidate.key} (${summarizeCollectedPageForLog(collectedPages[0])})`,
				);
			}
		}
	}

	logInternshipReviewCollectionSummary({
		status: "completed",
		discoveredReviewCandidateCount,
		collectedReviewPageCount,
		skippedReviewCandidateCount,
		maxDetailPages,
	});
	return pages;
}

type InternshipReviewCollectionSummary = {
	status: "completed" | "stopped after reaching --max-detail-pages";
	discoveredReviewCandidateCount: number;
	collectedReviewPageCount: number;
	skippedReviewCandidateCount: number;
	maxDetailPages: number;
};

function logInternshipReviewCollectionSummary(
	summary: InternshipReviewCollectionSummary,
): void {
	console.log(formatInternshipReviewCollectionSummary(summary));
}

export function formatInternshipReviewCollectionSummary(
	summary: InternshipReviewCollectionSummary,
): string {
	const capHint =
		summary.status === "stopped after reaching --max-detail-pages"
			? "; pass a higher --max-detail-pages value to collect more discovered reviews"
			: "";
	return [
		`E-WIL reviews: ${summary.status}`,
		`discovered=${summary.discoveredReviewCandidateCount}`,
		`collected=${summary.collectedReviewPageCount}`,
		`skipped=${summary.skippedReviewCandidateCount}`,
		`max-detail-pages=${summary.maxDetailPages}${capHint}`,
	].join("; ");
}

export function formatInternshipReviewCompanyCandidateSkip(
	companyKey: string,
	error: unknown,
): string {
	return `E-WIL reviews: skipped company candidate ${companyKey}; ${formatInternshipReviewSkipReason(error)}`;
}

export function formatInternshipReviewSkipReason(error: unknown): string {
	if (error instanceof Error) {
		return sanitizeErrorMessageForLog(error.message);
	}
	return "unknown collection error";
}

function sanitizeErrorMessageForLog(message: string): string {
	const firstLine = cleanInlineText(message.split("\n")[0] ?? "");
	if (firstLine.length === 0) {
		return "unknown collection error";
	}
	return truncateForLog(firstLine, 180);
}

async function collectHtml(page: Page, url: string): Promise<string> {
	const response = await page.goto(url, {
		waitUntil: "domcontentloaded",
		timeout: navigationTimeoutMs,
	});
	if (!response) {
		throw new Error(`E-WIL navigation returned no response for ${url}`);
	}
	if (response.status() >= 400) {
		throw new Error(
			`E-WIL navigation stopped on HTTP ${response.status()} for ${url}. Make sure the headed browser is logged in and authorized for this page.`,
		);
	}

	return collectCurrentHtml(page, url);
}

async function collectClickedDetailPages(
	page: Page,
	listPage: ListPage,
	candidate: DetailLinkCandidate,
	remainingDetailPages: number,
): Promise<ClickedDetailPage[]> {
	await openListPage(page, listPage.url, listPage.pagingTarget);
	const firstPage = await clickCandidateFromPage(page, undefined, candidate);
	if (!looksLikeNestedEwilList(firstPage.html) || remainingDetailPages <= 1) {
		return [firstPage];
	}

	const nestedCandidates = extractDetailLinkCandidates(firstPage.html, firstPage.url)
		.filter((nestedCandidate) => nestedCandidate.key !== candidate.key)
		.slice(0, remainingDetailPages);
	if (nestedCandidates.length === 0) {
		return [firstPage];
	}

	const nestedPages: ClickedDetailPage[] = [];
	for (const nestedCandidate of nestedCandidates) {
		await delay(requestDelayMs);
		await openListPage(page, listPage.url, listPage.pagingTarget);
		await clickCandidateFromPage(page, undefined, candidate);
		nestedPages.push(
			await clickCandidateOnCurrentPage(page, firstPage.url, nestedCandidate),
		);
	}
	return nestedPages;
}

async function clickCandidateFromPage(
	page: Page,
	url: string | undefined,
	candidate: DetailLinkCandidate,
): Promise<ClickedDetailPage> {
	if (url !== undefined) {
		await collectHtml(page, url);
	}
	return clickCandidateOnCurrentPage(page, url ?? page.url(), candidate);
}

async function clickCandidateOnCurrentPage(
	page: Page,
	baseUrl: string,
	candidate: DetailLinkCandidate,
): Promise<ClickedDetailPage> {
	const elements = page.locator(candidate.selector);
	const elementCount = await elements.count();
	if (candidate.elementIndex >= elementCount) {
		throw new Error(
			`E-WIL detail link moved before click for ${baseUrl} at ${candidate.selector} index ${candidate.elementIndex}`,
		);
	}

	const beforeClickText = await readableBodyText(page);
	await Promise.all([
		page
			.waitForLoadState("domcontentloaded", { timeout: navigationTimeoutMs })
			.catch(() => undefined),
		elements.nth(candidate.elementIndex).click({ timeout: navigationTimeoutMs }),
	]);
	await waitForReadableTextChange(page, beforeClickText);
	return {
		html: await collectCurrentHtml(page, candidate.url),
		url: page.url(),
		candidate,
	};
}

async function collectCurrentHtml(page: Page, url: string): Promise<string> {
	await waitForRenderedReadableText(page);
	const html = await page.content();
	if (looksLikeLoginOrError(html)) {
		throw new Error(
			`E-WIL page did not expose collectable content for ${url}. It appears to be a login/error boundary.`,
		);
	}
	return html;
}

async function waitForRenderedReadableText(page: Page): Promise<void> {
	await page
		.waitForLoadState("networkidle", { timeout: renderedContentTimeoutMs })
		.catch(() => undefined);
	await page
		.waitForFunction(
			() => {
				const body = document.body;
				if (body === null) {
					return false;
				}
				const clone = body.cloneNode(true) as HTMLElement;
				clone
					.querySelectorAll(
						"script, style, noscript, svg, iframe, input[type=password]",
					)
					.forEach((node) => {
						node.remove();
					});
				return (clone.textContent ?? "").replace(/\s+/gu, " ").trim().length > 0;
			},
			undefined,
			{ timeout: renderedContentTimeoutMs },
		)
		.catch(() => undefined);
}

async function waitForReadableTextChange(
	page: Page,
	previousText: string,
): Promise<void> {
	await page
		.waitForFunction(
			(previous) => {
				const body = document.body;
				if (body === null) {
					return false;
				}
				const clone = body.cloneNode(true) as HTMLElement;
				clone
					.querySelectorAll(
						"script, style, noscript, svg, iframe, input[type=password]",
					)
					.forEach((node) => {
						node.remove();
					});
				return (
					(clone.textContent ?? "").replace(/\s+/gu, " ").trim() !== previous
				);
			},
			previousText,
			{ timeout: renderedContentTimeoutMs },
		)
		.catch(() => undefined);
}

async function readableBodyText(page: Page): Promise<string> {
	return page.evaluate(() => {
		const body = document.body;
		if (body === null) {
			return "";
		}
		const clone = body.cloneNode(true) as HTMLElement;
		clone
			.querySelectorAll("script, style, noscript, svg, iframe, input[type=password]")
			.forEach((node) => {
				node.remove();
			});
		return (clone.textContent ?? "").replace(/\s+/gu, " ").trim();
	});
}

function pageFromHtml(
	source: EwilSource,
	url: string,
	html: string,
	fallbackTitle: string,
): CollectedPage {
	const $ = cheerio.load(html);
	$("script, style, noscript, svg, iframe, input[type=password]").remove();
	const title = cleanInlineText($("title").first().text()) || fallbackTitle;
	const bodyText = cleanCollectedBodyText($("body").text());
	if (bodyText.length === 0) {
		throw new Error(`E-WIL page had no readable text: ${url}`);
	}

	return {
		source,
		url,
		title,
		text: bodyText,
		posted_at: extractPostedAt(bodyText),
		deadline_status: classifyDeadline(bodyText),
		deadline_raw_text: extractDeadlineRawText(bodyText),
		citation_anchors: [
			{ url, label: `원문: ${title}` },
			...extractAttachmentLinks(html, url).map((attachment) => ({
				url: attachment.url,
				label: `첨부: ${attachment.label}`,
			})),
		],
	};
}

async function collectPageAndPdfAttachments(
	page: Page,
	source: EwilSource,
	url: string,
	html: string,
	fallbackTitle: string,
): Promise<CollectedPage[]> {
	const parent = pageFromHtml(source, url, html, fallbackTitle);
	const pdfPages = await collectPdfAttachmentPages(page, source, parent, html, url);
	return [parent, ...pdfPages];
}

async function collectPdfAttachmentPages(
	page: Page,
	source: EwilSource,
	parent: CollectedPage,
	html: string,
	baseUrl: string,
): Promise<CollectedPage[]> {
	const attachments = extractAttachmentLinks(html, baseUrl)
		.filter((attachment) => looksLikePdfAttachment(attachment))
		.slice(0, maxPdfAttachmentsPerPage);
	const records: CollectedPage[] = [];

	for (const attachment of attachments) {
		await delay(requestDelayMs);
		const bytes = await fetchAuthenticatedPdfBytes(page, attachment.url);
		if (bytes === undefined) {
			continue;
		}
		const pages = await extractPdfPages(bytes);
		for (const pdfPage of pages) {
			if (pdfPage.cleaned_text.trim().length === 0) {
				continue;
			}
			const pageUrl = `${attachment.url}#page=${pdfPage.page_number}`;
			records.push({
				source,
				url: pageUrl,
				title: `${parent.title} 첨부 ${attachment.label} ${pdfPage.page_number}쪽`,
				text: [
					`상위 문서: ${parent.title}`,
					`상위 URL: ${parent.url}`,
					`첨부파일: ${attachment.label}`,
					`쪽: ${pdfPage.page_number}`,
					pdfPage.cleaned_text,
				].join("\n"),
				posted_at: parent.posted_at,
				deadline_status: parent.deadline_status,
				deadline_raw_text: parent.deadline_raw_text,
				citation_anchors: [
					{
						url: pageUrl,
						label: `${attachment.label} ${pdfPage.page_number}쪽`,
						page_number: pdfPage.page_number,
					},
					{ url: parent.url, label: `상위 문서: ${parent.title}` },
				],
			});
		}
	}

	return records;
}

function buildRecord(page: CollectedPage, fetchedAt: string): NormalizedRecord {
	const rawText = [
		`출처: ${page.source.source_name}`,
		`분류: ${page.source.category}`,
		`수집 범위: ${page.source.purpose}`,
		`제목: ${page.title}`,
		page.posted_at ? `게시일: ${page.posted_at}` : undefined,
		page.deadline_raw_text ? `마감 정보: ${page.deadline_raw_text}` : undefined,
		"본문:",
		page.text,
		`공식 URL: ${page.url}`,
	]
		.filter((part): part is string => part !== undefined && part.length > 0)
		.join("\n");
	const contentHash = sha256([rawText, page.url].join("\u001f"));

	return NormalizedRecordSchema.parse({
		record_id: buildRecordId({
			source_id: page.source.source_id,
			canonical_url: page.url,
			title: page.title,
			posted_at: page.posted_at,
			content_hash: contentHash,
		}),
		source_id: page.source.source_id,
		source_name: page.source.source_name,
		source_url: page.url,
		canonical_url: page.url,
		title: page.title,
		category: page.source.category,
		...page.source.taxonomy,
		fetched_at: fetchedAt,
		posted_at: page.posted_at,
		deadline_status: page.deadline_status,
		deadline_raw_text: page.deadline_raw_text,
		raw_text: rawText,
		cleaned_text: rawText,
		content_hash: contentHash,
		citation_anchors: page.citation_anchors ?? [
			{ url: page.url, label: `원문: ${page.title}` },
		],
		source_text_trust: "untrusted_source_text",
	});
}

function summarizeCollectedPageForLog(page: CollectedPage | undefined): string {
	if (page === undefined) {
		return "no parsed page summary";
	}
	const title = cleanInlineText(page.text.match(/(?:제목|기관명)\n([^\n]+)/u)?.[1] ?? page.title);
	const postedAt = page.posted_at?.slice(0, 10) ?? "no-date";
	return `title=${truncateForLog(title, 80)}; posted=${postedAt}; chars=${page.text.length}`;
}

function truncateForLog(value: string, maxLength: number): string {
	if (value.length <= maxLength) {
		return value;
	}
	return `${value.slice(0, maxLength - 1)}…`;
}

function extractDetailLinkCandidates(
	html: string,
	baseUrl: string,
): DetailLinkCandidate[] {
	const $ = cheerio.load(html);
	const candidates: DetailLinkCandidate[] = [];
	for (const selector of detailCandidateSelectors) {
		$(selector).each((elementIndex, element) => {
			const candidateUrl = extractCandidateUrl($(element), baseUrl);
			const normalized = normalizeDetailUrl(candidateUrl, baseUrl);
			if (candidateUrl !== undefined && normalized !== undefined) {
				candidates.push({
					elementIndex,
					key: buildDetailCandidateKey(candidateUrl, normalized),
					selector,
					url: normalized,
				});
			}
		});
	}
	const seenKeys = new Set<string>();
	return candidates
		.filter((candidate) => {
			if (seenKeys.has(candidate.key)) {
				return false;
			}
			seenKeys.add(candidate.key);
			return true;
		});
}

const detailCandidateSelectors = ["a", "button", "tr", "td", "span", "li"] as const;

function extractInternshipCompanyCandidates(
	html: string,
	baseUrl: string,
): DetailLinkCandidate[] {
	return extractDetailLinkCandidates(html, baseUrl).filter((candidate) => {
		try {
			const url = new URL(candidate.url);
			return url.pathname === "/internphoto/read.do";
		} catch (_error) {
			return false;
		}
	});
}

function extractInternshipReviewCandidates(
	html: string,
	baseUrl: string,
	companyKey: string,
): DetailLinkCandidate[] {
	const $ = cheerio.load(html);
	const candidates: DetailLinkCandidate[] = [];
	for (const selector of detailCandidateSelectors) {
		$(selector).each((elementIndex, element) => {
			const node = $(element);
			const candidateUrl = extractInternshipReviewCandidateUrl(
				node,
				baseUrl,
				companyKey,
			);
			const normalized = normalizeDetailUrl(candidateUrl, baseUrl);
			if (candidateUrl === undefined || normalized === undefined) {
				return;
			}
			try {
				if (new URL(normalized).pathname !== "/internphoto/view.do") {
					return;
				}
			} catch (_error) {
				return;
			}
			candidates.push({
				elementIndex,
				key: buildDetailCandidateKey(candidateUrl, normalized),
				selector,
				url: normalized,
			});
		});
	}

	const seenKeys = new Set<string>();
	return candidates.filter((candidate) => {
		if (seenKeys.has(candidate.key)) {
			return false;
		}
		seenKeys.add(candidate.key);
		return true;
	});
}

function extractInternshipReviewCandidateUrl(
	element: cheerio.Cheerio<Element>,
	baseUrl: string,
	companyKey: string,
): string | undefined {
	const candidateUrl = extractCandidateUrl(element, baseUrl);
	const normalized = normalizeDetailUrl(candidateUrl, baseUrl);
	if (normalized !== undefined) {
		try {
			if (new URL(normalized).pathname === "/internphoto/view.do") {
				return candidateUrl;
			}
		} catch (_error) {
			return undefined;
		}
	}

	const script = [element.attr("href"), element.attr("onclick")]
		.filter((value): value is string => value !== undefined)
		.join("\n");
	return internphotoReviewUrlFromScript(script, baseUrl, companyKey);
}

export function internphotoReviewUrlFromScript(
	script: string,
	baseUrl: string,
	companyKey: string,
): string | undefined {
	if (script.trim().length === 0 || !looksLikeInternphotoViewScript(script)) {
		return undefined;
	}
	const base = new URL(baseUrl);
	if (base.pathname !== "/internphoto/read.do") {
		return undefined;
	}
	const companyId = companyKey.match(/^\d{1,10}$/u)?.[0] ?? base.searchParams.get("idx");
	if (companyId === null) {
		return undefined;
	}
	const numericArgs = [...script.matchAll(/\d{1,10}/gu)].map((match) => match[0]);
	const reviewId = numericArgs.find((value) => value !== companyId);
	if (reviewId === undefined) {
		return undefined;
	}
	const next = new URL("/internphoto/view.do", ewilOrigin);
	next.searchParams.set("jid_seq", reviewId);
	next.searchParams.set("jim_seq", companyId);
	return next.toString();
}

function extractAttachmentLinks(html: string, baseUrl: string): AttachmentLink[] {
	const $ = cheerio.load(html);
	const links: AttachmentLink[] = [];
	for (const selector of ["a", "button", "span", "td"] as const) {
		$(selector).each((_index, element) => {
			const node = $(element);
			const candidateUrl = extractCandidateUrl(node, baseUrl);
			const normalized = normalizeAttachmentUrl(candidateUrl, baseUrl);
			if (normalized === undefined) {
				return;
			}
			const label =
				cleanInlineText(node.text()) ||
				decodeURIComponent(new URL(normalized).pathname.split("/").pop() ?? "첨부파일");
			links.push({ url: normalized, label });
		});
	}

	const seen = new Set<string>();
	return links.filter((link) => {
		if (seen.has(link.url)) {
			return false;
		}
		seen.add(link.url);
		return true;
	});
}

function normalizeAttachmentUrl(
	href: string | undefined,
	baseUrl: string,
): string | undefined {
	if (
		href === undefined ||
		href.trim().length === 0 ||
		href.startsWith("#") ||
		/^javascript:/iu.test(href)
	) {
		return undefined;
	}
	try {
		const url = new URL(href, baseUrl);
		if (url.origin !== ewilOrigin || hasCredentialLikeSearchParam(url)) {
			return undefined;
		}
		if (!looksLikeAttachmentUrl(url)) {
			return undefined;
		}
		url.hash = "";
		return url.toString();
	} catch (_error) {
		return undefined;
	}
}

function looksLikeAttachmentUrl(url: URL): boolean {
	return /(?:\.pdf$|\.hwp$|\.hwpx$|\.docx?$|\.xlsx?$|\.pptx?$|\.zip$|file|attach|download|down|bbsFile)/iu.test(
		`${url.pathname}?${url.searchParams.toString()}`,
	);
}

function looksLikePdfAttachment(attachment: AttachmentLink): boolean {
	return /\.pdf(?:$|[?#])|pdf|PDF/u.test(`${attachment.url} ${attachment.label}`);
}

function hasCredentialLikeSearchParam(url: URL): boolean {
	for (const key of url.searchParams.keys()) {
		if (/token|password|passwd|session|jsessionid|authorization|auth/iu.test(key)) {
			return true;
		}
	}
	return false;
}

async function fetchAuthenticatedPdfBytes(
	page: Page,
	url: string,
): Promise<Uint8Array | undefined> {
	const parsed = new URL(url);
	if (parsed.origin !== ewilOrigin || hasCredentialLikeSearchParam(parsed)) {
		return undefined;
	}
	const response = await page.context().request.get(url, {
		timeout: navigationTimeoutMs,
	});
	if (!response.ok()) {
		return undefined;
	}
	const contentType = response.headers()["content-type"] ?? "";
	if (!/application\/pdf|application\/octet-stream/iu.test(contentType)) {
		return undefined;
	}
	const body = await response.body();
	if (body.byteLength > maxPdfBytes || !startsWithPdfHeader(body)) {
		return undefined;
	}
	return new Uint8Array(body);
}

function startsWithPdfHeader(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 4 &&
		bytes[0] === 0x25 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x44 &&
		bytes[3] === 0x46
	);
}

function buildDetailCandidateKey(candidateUrl: string, normalized: string): string {
	try {
		const url = new URL(normalized);
		const jidSeq = url.searchParams.get("jid_seq");
		const jimSeq = url.searchParams.get("jim_seq");
		if (jidSeq !== null && jimSeq !== null) {
			return `internphoto-view:${jidSeq}:${jimSeq}`;
		}
	} catch (_error) {
		// Fall through to script/id-based key extraction.
	}
	const numericId =
		candidateUrl.match(/(?:idx|seq|no|id)=?(\d{1,10})/iu)?.[1] ??
		candidateUrl.match(/(?:^|[^\d])(\d{1,10})(?:[^\d]|$)/u)?.[1];
	if (numericId !== undefined) {
		return numericId;
	}
	return sha256(`${candidateUrl}\u001f${normalized}`).slice(0, 16);
}

function buildDetailCitationUrl(
	currentUrl: string,
	listUrl: string,
	candidate: DetailLinkCandidate,
): string {
	try {
		const candidateUrl = new URL(candidate.url);
		if (candidateUrl.pathname === "/internphoto/view.do") {
			return candidateUrl.toString();
		}
	} catch (_error) {
		// Fall through to stateful current URL citation.
	}

	const url = new URL(currentUrl);
	url.hash = `ewil-detail-${candidate.key}-from-${sha256(listUrl).slice(0, 8)}`;
	return url.toString();
}

export function extractListPageUrls(
	html: string,
	baseUrl: string,
	source: EwilSource,
): string[] {
	const $ = cheerio.load(html);
	const urls = new Set<string>();
	const addUrl = (href: string | undefined): void => {
		const normalized = normalizeListUrl(href, baseUrl, source);
		if (normalized !== undefined) {
			urls.add(normalized);
		}
	};

	$("a, button, input").each((_index, element) => {
		addUrl(extractListCandidateUrl($(element), baseUrl));
	});
	$("form").each((_index, element) => {
		addUrl(extractSimpleGetFormListUrl($(element), baseUrl, $));
	});
	return [...urls].sort((left, right) => left.localeCompare(right, "en"));
}

export function extractClickablePagingTargets(html: string): string[] {
	const $ = cheerio.load(html);
	const targets: string[] = [];
	$("a[href]").each((_index, element) => {
		const anchor = $(element);
		if (cleanInlineText(anchor.text()) === "1") {
			return;
		}
		const href = anchor.attr("href") ?? "";
		const match = href.match(
			/^javascript\s*:\s*Paging\s*\(\s*['"]?(\d{1,10})['"]?\s*\)/iu,
		);
		if (match?.[1] !== undefined) {
			targets.push(match[1]);
		}
	});
	return [...new Set(targets)];
}

function fingerprintListPage(html: string): string {
	const $ = cheerio.load(html);
	$("script, style, noscript, svg, iframe, input[type=password]").remove();
	return sha256(cleanInlineText($("body").text()));
}

function extractListCandidateUrl(
	element: cheerio.Cheerio<Element>,
	baseUrl: string,
): string | undefined {
	for (const attr of ["href", "formaction"] as const) {
		const value = element.attr(attr);
		if (value === undefined) {
			continue;
		}
		if (/^javascript:/iu.test(value.trim())) {
			const scriptedUrl = listUrlFromScript(value, baseUrl);
			if (scriptedUrl !== undefined) {
				return scriptedUrl;
			}
			continue;
		}
		if (value.trim().length > 0 && !value.startsWith("#")) {
			return value;
		}
	}

	return listUrlFromScript(element.attr("onclick") ?? "", baseUrl);
}

function listUrlFromScript(script: string, baseUrl: string): string | undefined {
	if (script.trim().length === 0) {
		return undefined;
	}

	const directUrl =
		script.match(/["']([^"']+\.do\?[^"']*)["']/u)?.[1] ??
		script.match(/["']([^"']+\.do)["']/u)?.[1] ??
		script.match(/["'](\?[^"']+)["']/u)?.[1];
	if (directUrl !== undefined) {
		return directUrl;
	}

	if (!looksLikePaginationScript(script)) {
		return undefined;
	}
	if (isFixedUrlPagingScript(script)) {
		return undefined;
	}

	const pageNumber = extractPaginationPageNumber(script);
	if (pageNumber === undefined) {
		return undefined;
	}

	return buildListUrlWithPageNumber(baseUrl, pageNumber);
}

function isFixedUrlPagingScript(script: string): boolean {
	return /(?:^|javascript\s*:)\s*Paging\s*\(/iu.test(script.trim());
}

const listPageQueryParamCandidates = [
	"pageIndex",
	"pageNo",
	"page",
	"currentPage",
	"cPage",
] as const;

function extractPaginationPageNumber(script: string): string | undefined {
	for (const paramName of listPageQueryParamCandidates) {
		const escapedParamName = paramName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
		const match = script.match(
			new RegExp(`${escapedParamName}\\s*[:=]\\s*["']?(\\d{1,10})`, "iu"),
		);
		if (match?.[1] !== undefined) {
			return match[1];
		}
	}

	return script.match(/\(\s*["']?(\d{1,10})["']?/u)?.[1] ??
		script.match(/["'](\d{1,10})["']/u)?.[1];
}

function buildListUrlWithPageNumber(baseUrl: string, pageNumber: string): string {
	const url = new URL(baseUrl);
	const existingPageParam = listPageQueryParamCandidates.find((paramName) =>
		url.searchParams.has(paramName),
	);
	url.searchParams.set(existingPageParam ?? "pageIndex", pageNumber);
	url.hash = "";
	return url.toString();
}

function extractSimpleGetFormListUrl(
	form: cheerio.Cheerio<Element>,
	baseUrl: string,
	$: cheerio.CheerioAPI,
): string | undefined {
	const method = (form.attr("method") ?? "get").trim().toLowerCase();
	if (method !== "" && method !== "get") {
		return undefined;
	}
	if (!looksLikeListPaginationForm(form)) {
		return undefined;
	}

	const action = form.attr("action")?.trim();
	if (action !== undefined && /^javascript:/iu.test(action)) {
		return undefined;
	}

	try {
		const url = new URL(action && action.length > 0 ? action : baseUrl, baseUrl);
		form.find("input, select, textarea").each((_index, element) => {
			const control = $(element);
			const name = control.attr("name");
			const value = formControlValue(control);
			if (name !== undefined && name.length > 0 && value !== undefined) {
				url.searchParams.set(name, value);
			}
		});
		url.hash = "";
		return url.toString();
	} catch (_error) {
		return undefined;
	}
}

function looksLikeListPaginationForm(form: cheerio.Cheerio<Element>): boolean {
	const formText = [
		form.attr("id"),
		form.attr("class"),
		form.attr("name"),
		form.attr("action"),
		form.html(),
	]
		.filter((value): value is string => value !== undefined)
		.join(" ");
	return looksLikePaginationScript(formText);
}

function formControlValue(control: cheerio.Cheerio<Element>): string | undefined {
	const tagName = control.get(0)?.tagName.toLowerCase();
	if (tagName === "select") {
		const selected = control.find("option[selected]").first();
		const option = selected.length > 0 ? selected : control.find("option").first();
		return option.attr("value") ?? cleanInlineText(option.text());
	}
	if (tagName === "textarea") {
		return control.text();
	}
	const inputType = (control.attr("type") ?? "text").toLowerCase();
	if (["button", "file", "image", "reset", "submit"].includes(inputType)) {
		return undefined;
	}
	if (
		["checkbox", "radio"].includes(inputType) &&
		control.attr("checked") === undefined
	) {
		return undefined;
	}
	return control.attr("value") ?? "";
}

function extractCandidateUrl(
	element: cheerio.Cheerio<Element>,
	baseUrl: string,
): string | undefined {
	const href = element.attr("href");
	if (href !== undefined && /^javascript:/iu.test(href.trim())) {
		const hrefUrl = urlFromScript(href, baseUrl);
		if (hrefUrl !== undefined) {
			return hrefUrl;
		}
	}
	if (
		href !== undefined &&
		href.trim().length > 0 &&
		!href.startsWith("#") &&
		!/^javascript:/iu.test(href)
	) {
		return href;
	}

	const onclick = element.attr("onclick") ?? "";
	return urlFromScript(onclick, baseUrl);
}

function urlFromScript(script: string, baseUrl: string): string | undefined {
	if (looksLikePaginationScript(script)) {
		return undefined;
	}

	const directUrl =
		script.match(/["']([^"']+\.do\?[^"']*)["']/u)?.[1] ??
		script.match(/["']([^"']+\.do)["']/u)?.[1];
	if (directUrl !== undefined) {
		return directUrl;
	}

	const currentUrl = new URL(baseUrl);
	const numericArgs = [...script.matchAll(/\d{1,10}/gu)].map((match) => match[0]);
	if (
		currentUrl.pathname === "/internphoto/read.do" &&
		numericArgs.length >= 2 &&
		looksLikeInternphotoViewScript(script)
	) {
		const next = new URL("/internphoto/view.do", ewilOrigin);
		next.searchParams.set("jid_seq", numericArgs[0] ?? "");
		next.searchParams.set("jim_seq", numericArgs[1] ?? "");
		return next.toString();
	}

	const id = script.match(/["']?(\d{1,10})["']?/u)?.[1];
	if (id === undefined) {
		return undefined;
	}

	if (currentUrl.pathname === "/data/list.do") {
		const next = new URL("/data/view.do", ewilOrigin);
		next.searchParams.set("idx", id);
		const type = currentUrl.searchParams.get("type");
		if (type !== null) next.searchParams.set("type", type);
		return next.toString();
	}

	if (
		currentUrl.pathname === "/internphoto/compList.do" ||
		currentUrl.pathname === "/internphoto/list.do" ||
		currentUrl.pathname === "/internphoto/read.do"
	) {
		if (
			currentUrl.pathname !== "/internphoto/read.do" &&
			!looksLikeInternphotoListScript(script)
		) {
			return undefined;
		}
		const next = new URL("/internphoto/read.do", ewilOrigin);
		next.searchParams.set("idx", id);
		return next.toString();
	}

	return undefined;
}

function looksLikePaginationScript(script: string): boolean {
	return /page|paging|paginate|goPage|fn_?page/iu.test(script);
}

function looksLikeInternphotoViewScript(script: string): boolean {
	return /goView|review|view/iu.test(script);
}

function looksLikeInternphotoListScript(script: string): boolean {
	return /goList|compView|read|view|internphoto/iu.test(script);
}

function normalizeListUrl(
	href: string | undefined,
	baseUrl: string,
	source: EwilSource,
): string | undefined {
	if (href === undefined || href.trim().length === 0) {
		return undefined;
	}
	try {
		const url = new URL(href, baseUrl);
		const canonical = new URL(source.canonical_url);
		if (!isApprovedEwilListCanonical(canonical)) {
			return undefined;
		}
		if (url.origin !== ewilOrigin || url.pathname !== canonical.pathname) {
			return undefined;
		}
		if (
			canonical.searchParams.get("type") !== null &&
			url.searchParams.get("type") !== canonical.searchParams.get("type")
		) {
			return undefined;
		}
		if (hasCredentialLikeQueryParams(url)) {
			return undefined;
		}
		url.hash = "";
		return url.toString();
	} catch (_error) {
		return undefined;
	}
}

function isApprovedEwilListCanonical(url: URL): boolean {
	if (url.origin !== ewilOrigin) {
		return false;
	}
	if (url.pathname === "/data/list.do") {
		const type = url.searchParams.get("type");
		return type === "NOTICE" || type === "INFO";
	}
	return url.pathname === "/internphoto/compList.do";
}

function hasCredentialLikeQueryParams(url: URL): boolean {
	for (const name of url.searchParams.keys()) {
		if (credentialLikeQueryParamPattern.test(name)) {
			return true;
		}
	}
	return false;
}

const credentialLikeQueryParamPattern =
	/(?:password|passwd|pwd|token|auth|session|cookie|credential|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|login|user(?:name|id)?|student(?:id|no)|hakbun)/iu;

function normalizeDetailUrl(
	href: string | undefined,
	baseUrl: string,
): string | undefined {
	if (
		href === undefined ||
		href.trim().length === 0 ||
		href.startsWith("#") ||
		/^javascript:/iu.test(href)
	) {
		return undefined;
	}
	try {
		const url = new URL(href, baseUrl);
		if (url.origin !== ewilOrigin) {
			return undefined;
		}
		if (url.pathname === "/internphoto/view.do") {
			if (
				url.searchParams.get("jid_seq") === null ||
				url.searchParams.get("jim_seq") === null
			) {
				return undefined;
			}
			url.hash = "";
			return url.toString();
		}
		if (url.pathname === "/index.do" || url.pathname === "/privacy.pdf") {
			return undefined;
		}
		if (
			ewilSources.some(
				(source) =>
					source.canonical_url === url.toString() ||
					new URL(source.canonical_url).pathname === url.pathname,
			)
		) {
			return undefined;
		}
		if (!/(view|detail|read|photo|internphoto)/iu.test(url.pathname)) {
			return undefined;
		}
		url.hash = "";
		return url.toString();
	} catch (_error) {
		return undefined;
	}
}

function looksLikeLoginOrError(html: string): boolean {
	const text = cleanBlockText(cheerio.load(html)("body").text());
	return /HTTP 상태 500|내부 서버 오류|sendRedirect|로그인 후, 확인하실 수 있습니다/u.test(
		text,
	);
}

function looksLikeNestedEwilList(html: string): boolean {
	const text = cleanCollectedBodyText(cheerio.load(html)("body").text());
	return (
		/번호\n실습기간\n학과\n이름/u.test(text) ||
		/번호\n기관명\n후기\n국가/u.test(text) ||
		/년도\n2027\n2026\n2025/u.test(text) ||
		/국가\n전체\n대한민국/u.test(text)
	);
}

export function classifyInternshipReviewRecordability(html: string): {
	recordable: boolean;
	reason: string;
} {
	const text = cleanCollectedBodyText(cheerio.load(html)("body").text());
	if (looksLikeLoginOrError(html)) {
		return {
			recordable: false,
			reason: "opened page looks like a login/error boundary",
		};
	}
	const matchedHeadingCount = countMatchingMarkers(text, internshipReviewSectionHeadings);
	const matchedDetailMarkerCount = countMatchingMarkers(text, internshipReviewDetailMarkers);
	const listLike = looksLikeNestedEwilList(html);
	if (listLike) {
		return { recordable: false, reason: "opened page still looks like a nested list" };
	}
	if (text.length === 0) {
		return { recordable: false, reason: "opened page had no readable text" };
	}
	if (matchedHeadingCount > 0) {
		return { recordable: true, reason: "matched known review headings" };
	}
	if (matchedDetailMarkerCount >= 2 && !listLike) {
		return { recordable: true, reason: "matched review detail field markers" };
	}
	return { recordable: true, reason: "accepted internship review detail page" };
}

function countMatchingMarkers(text: string, markers: readonly string[]): number {
	return markers.filter((marker) => text.includes(marker)).length;
}

const internshipReviewSectionHeadings = [
	"실습내용",
	"기타 실습기관 소개",
	"출퇴근방법",
	"기업문화",
	"공유하고 싶은 내용",
	"면접 관련 정보",
	"면접 관련 정보 및 노하우",
] as const;

const internshipReviewDetailMarkers = [
	"실습기관",
	"실습기간",
	"전공",
	"학과",
	"학년",
	"이름",
	"후기",
	"직무",
	"업무",
	"근무",
	"장점",
	"단점",
	"느낀점",
	"도움",
] as const;

function extractPostedAt(text: string): string | null {
	const match = text.match(/20\d{2}[./-]\d{1,2}[./-]\d{1,2}/u);
	if (match === null) {
		return null;
	}
	const [year, month, day] = match[0].split(/[./-]/u);
	if (year === undefined || month === undefined || day === undefined) {
		return null;
	}
	return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`;
}

function classifyDeadline(text: string): DeadlineStatus {
	if (/모집\s*없음|마감|종료|closed|expired/iu.test(text)) {
		return "expired";
	}
	if (
		/모집기간연장|모집중|신청\s*가능|~\s*\d{1,2}\/\d{1,2}|채용시까지/u.test(
			text,
		)
	) {
		return "active";
	}
	return "unknown";
}

function extractDeadlineRawText(text: string): string {
	const match = text.match(
		/(?:~\s*\d{1,2}\/\d{1,2}|~\s*20\d{2}[./-]\d{1,2}[./-]\d{1,2}|모집기간연장|모집없음|채용시까지|마감[^\n]*)/u,
	);
	return match?.[0]?.trim() ?? "";
}

function cleanInlineText(value: string): string {
	return value.replace(/\s+/gu, " ").trim();
}

function cleanCollectedBodyText(value: string): string {
	return cleanBlockText(value)
		.split("\n")
		.filter((line) => !isEwilChromeLine(line))
		.join("\n");
}

function isEwilChromeLine(line: string): boolean {
	return (
		/^.+님, 환영합니다\.$/u.test(line) ||
		line === "현장실습업무지원 시스템" ||
		line === "MY PAGE" ||
		line === "실습기관 조회/실습 신청" ||
		line === "보고서 작성" ||
		line === "주간보고서 작성" ||
		line === "종합소감문 작성" ||
		line === "실습후기/사진" ||
		line === "설문조사" ||
		line === "증명서 발급" ||
		line === "설명회/OT자료실" ||
		line === "사용방법/메뉴얼" ||
		line === "홍보자료실" ||
		line === "양식자료실" ||
		line === "커뮤니티" ||
		line === "공지사항" ||
		line === "Q&A" ||
		line === "목록" ||
		/^\[426-791\]/u.test(line) ||
		/^COPYRIGHT \(c\) 2015 by Hanyang University/u.test(line)
	);
}

function cleanBlockText(value: string): string {
	return value
		.replace(/\r\n?/gu, "\n")
		.split("\n")
		.map((line) => cleanInlineText(line))
		.filter((line) => line.length > 0)
		.join("\n");
}

async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseArgs(argv: readonly string[]): CliArgs {
	let outputDir = defaultOutputDir;
	let maxListPages = defaultMaxListPages;
	let maxDetailPages = defaultMaxDetailPages;
	let headless = false;
	let sourceIds: readonly string[] = ewilSources.map((source) => source.source_id);

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--output") {
			const value = argv[index + 1];
			if (!value) throw new Error("--output requires a directory path");
			outputDir = value;
			index += 1;
			continue;
		}
		if (arg === "--max-detail-pages") {
			const value = argv[index + 1];
			if (!value)
				throw new Error("--max-detail-pages requires a nonnegative integer");
			maxDetailPages = parseBoundedInteger(value, "--max-detail-pages", 0, maxAllowedDetailPages);
			index += 1;
			continue;
		}
		if (arg === "--max-list-pages") {
			const value = argv[index + 1];
			if (!value)
				throw new Error("--max-list-pages requires a positive integer");
			maxListPages = parseBoundedInteger(value, "--max-list-pages", 1, 20);
			index += 1;
			continue;
		}
		if (arg === "--headless") {
			headless = true;
			continue;
		}
		if (arg === "--source") {
			const value = argv[index + 1];
			if (!value) throw new Error("--source requires all, notice, info, or reviews");
			sourceIds = parseSourceFilter(value);
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return { outputDir, maxListPages, maxDetailPages, headless, sourceIds };
}

function parseSourceFilter(value: string): readonly string[] {
	if (value === "all") return ewilSources.map((source) => source.source_id);
	if (value === "notice") return ["ewil-notice-board"];
	if (value === "info") return ["ewil-info-board"];
	if (value === "reviews") return ["ewil-internship-reviews"];
	throw new Error("--source must be all, notice, info, or reviews");
}

function parseBoundedInteger(
	value: string,
	label: string,
	min: number,
	max: number,
): number {
	if (!/^\d+$/u.test(value)) {
		throw new Error(`${label} must be an integer`);
	}
	const parsed = Number.parseInt(value, 10);
	if (parsed < min || parsed > max) {
		throw new Error(`${label} must be between ${min} and ${max}`);
	}
	return parsed;
}

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	runCli().catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`ingest_ewil_authenticated_sources_failed: ${message}`);
		process.exitCode = 1;
	});
}
