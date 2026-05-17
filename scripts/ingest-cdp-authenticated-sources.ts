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
import { chunkNormalizedRecord } from "../src/ingestion/chunking.js";
import {
	buildCdpManualPostRecords,
	type CdpManualPostExport,
} from "../src/ingestion/manual-cdp-posts.js";
import type { DeadlineStatus } from "../src/ingestion/normalized-record.js";
import { writeKnowledgeBaseJsonl } from "../src/ingestion/write-jsonl-kb.js";

type CdpBoard = CdpManualPostExport["posts"][number]["board"];

type CdpSource = {
	sourceKey: "recruit" | "events";
	sourceId: "cdp-recruit-general-board" | "cdp-recruit-event-board";
	board: CdpBoard;
	canonicalUrl: string;
	description: string;
};

type CliArgs = {
	outputDir: string;
	maxListPages: number;
	maxDetailPages: number;
	headless: boolean;
	sourceKeys: readonly CdpSource["sourceKey"][];
};

type CdpPost = CdpManualPostExport["posts"][number];

const cdpOrigin = "https://cdp.hanyang.ac.kr";
const defaultOutputDir = "data/knowledge-base/cdp-authenticated-sources";
const defaultMaxListPages = 5;
const defaultMaxDetailPages = 30;
const navigationTimeoutMs = 20_000;
const renderedContentTimeoutMs = 5_000;
const requestDelayMs = 1_200;

const cdpSources: readonly CdpSource[] = [
	{
		sourceKey: "recruit",
		sourceId: "cdp-recruit-general-board",
		board: "일반채용공고",
		canonicalUrl: `${cdpOrigin}/Career/Job/RecruitList.aspx`,
		description: "CDP 일반채용공고 목록 및 연결 상세글",
	},
	{
		sourceKey: "events",
		sourceId: "cdp-recruit-event-board",
		board: "채용상담 및 설명회",
		canonicalUrl: `${cdpOrigin}/Community/Notice/RecruitEvent.aspx`,
		description: "CDP 채용상담 및 설명회 목록 및 연결 상세글",
	},
] as const;

const detailPathPattern =
	/(?:\/Career\/Job\/[A-Za-z0-9]*View\d*\.aspx|\/Office\/SiteMgr\/Notice\/FuncScheView\.aspx)$/u;
const listPathPattern =
	/(?:\/Career\/Job\/(?:RecruitList\d*|AlbaList|RecruitEvent)\.aspx|\/Office\/SiteMgr\/Notice\/FuncScheList\.aspx|\/Community\/Notice\/RecruitEvent\.aspx)$/u;
const sourceRegistryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";

async function runCli(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const exportedAt = new Date().toISOString();
	const selectedSources = cdpSources.filter((source) =>
		args.sourceKeys.includes(source.sourceKey),
	);
	const registry = loadSourceRegistryForIngestion(sourceRegistryPath);
	for (const source of selectedSources) {
		assertCanIngestSource(registry, source.sourceId, "manual_login_session");
	}
	const posts: CdpPost[] = [];
	const browser = await chromium.launch({ headless: args.headless });

	try {
		const context = await browser.newContext({
			storageState: { cookies: [], origins: [] },
		});
		try {
			await restrictContextToCdp(context);
			const page = await context.newPage();
			await promptForManualLogin(page, args.headless, selectedSources[0]?.canonicalUrl);

			for (const source of selectedSources) {
				const sourcePosts = await collectSourcePosts(
					page,
					source,
					args.maxListPages,
					args.maxDetailPages,
					exportedAt,
				);
				posts.push(...sourcePosts);
				await delay(requestDelayMs);
			}
		} finally {
			await context.clearCookies();
			await context.close();
		}
	} finally {
		await browser.close();
	}

	const records = buildCdpManualPostRecords({ exported_at: exportedAt, posts });
	const chunks = records.flatMap((record) => chunkNormalizedRecord(record));
	const manifest = await writeKnowledgeBaseJsonl({
		records,
		chunks,
		outputDir: args.outputDir,
		manifest: {
			run_id: `cdp-authenticated-sources-${exportedAt}`,
			generated_at: exportedAt,
			source_ids: [...new Set(records.map((record) => record.source_id))],
		},
	});

	console.log(
		`cdp authenticated source ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${args.outputDir}`,
	);
}

async function promptForManualLogin(
	page: Page,
	headless: boolean,
	startUrl: string | undefined,
): Promise<void> {
	if (headless) {
		throw new Error(
			"Manual CDP login requires a headed browser. Remove --headless and run again.",
		);
	}

	if (startUrl === undefined) {
		throw new Error("At least one approved CDP source must be selected.");
	}
	await page.goto(startUrl, {
		waitUntil: "domcontentloaded",
		timeout: navigationTimeoutMs,
	});
	console.log("Opened CDP in a non-persistent browser context.");
	console.log(
		"Log in manually in the opened browser window if CDP asks. No cookies, storage state, screenshots, traces, IDs, or passwords will be written by this script.",
	);
	const readline = createInterface({ input, output });
	try {
		await readline.question(
			"After login completes, press Enter here to collect only the approved CDP board URLs...",
		);
	} finally {
		readline.close();
	}
}

async function restrictContextToCdp(context: BrowserContext): Promise<void> {
	await context.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.origin === cdpOrigin) {
			await route.continue();
			return;
		}
		await route.abort();
	});
}

async function collectSourcePosts(
	page: Page,
	source: CdpSource,
	maxListPages: number,
	maxDetailPages: number,
	exportedAtIso: string,
): Promise<CdpPost[]> {
	console.log(`CDP ${source.sourceKey}: collecting ${source.description}`);
	const listPages = await collectListPages(page, source.canonicalUrl, maxListPages);
	const detailUrls: string[] = [];
	const seenDetailUrls = new Set<string>();

	for (const listPage of listPages) {
		for (const url of collectDetailUrlsFromHtml(listPage.html, listPage.url)) {
			if (!seenDetailUrls.has(url)) {
				seenDetailUrls.add(url);
				detailUrls.push(url);
			}
		}
	}

	console.log(
		`CDP ${source.sourceKey}: discovered ${detailUrls.length} detail candidates from ${listPages.length} list pages`,
	);

	const posts: CdpPost[] = [];
	for (const detailUrl of detailUrls.slice(0, maxDetailPages)) {
		await delay(requestDelayMs);
		const html = await collectHtml(page, detailUrl, "detail");
		const post = extractPostFromHtml(html, detailUrl, source.board, exportedAtIso);
		if (post === null) {
			console.warn(`CDP ${source.sourceKey}: skipped non-recordable detail ${detailUrl}`);
			continue;
		}
		posts.push(post);
		console.log(
			`CDP ${source.sourceKey}: collected ${new URL(detailUrl).pathname} (title=${post.title.slice(0, 80)}; posted=${post.posted_at ?? "unknown"}; chars=${post.body_text.length})`,
		);
	}

	return posts;
}

async function collectListPages(
	page: Page,
	startUrl: string,
	maxListPages: number,
): Promise<{ url: string; html: string }[]> {
	const start = toCdpListUrl(startUrl, startUrl);
	if (start === undefined) {
		throw new Error(`CDP start URL is not an approved list URL: ${startUrl}`);
	}

	const allowedPathname = new URL(start).pathname;
	const queue = [start];
	const seen = new Set<string>();
	const pages: { url: string; html: string }[] = [];

	for (let index = 0; index < queue.length && pages.length < maxListPages; index += 1) {
		const url = queue[index];
		if (seen.has(url)) continue;
		seen.add(url);

		await delay(requestDelayMs);
		const html = await collectHtml(page, url, "list");
		pages.push({ url, html });

		for (const nextUrl of collectListUrlsFromHtml(html, url, allowedPathname)) {
			if (!seen.has(nextUrl) && !queue.includes(nextUrl) && queue.length < maxListPages) {
				queue.push(nextUrl);
			}
		}
	}

	return pages;
}

type CdpPageKind = "list" | "detail";

async function collectHtml(page: Page, url: string, kind: CdpPageKind): Promise<string> {
	const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeoutMs });
	if (response === null || !response.ok()) {
		throw new Error(`CDP ${kind} navigation failed for ${url}: ${response?.status() ?? "no response"}`);
	}
	try {
		await page.waitForLoadState("networkidle", { timeout: renderedContentTimeoutMs });
	} catch (_error) {
		// CDP pages can keep analytics or long-polling requests open; DOM content is enough.
	}
	const finalUrl = page.url();
	const normalizedFinalUrl = kind === "list" ? toCdpListUrl(finalUrl, finalUrl) : toCdpDetailUrl(finalUrl, finalUrl);
	if (normalizedFinalUrl === undefined) {
		throw new Error(`CDP ${kind} navigation left approved scope: ${finalUrl}`);
	}
	const html = await page.content();
	if (looksLikeLoginOrErrorPage(html)) {
		throw new Error(`CDP ${kind} page appears to be a login or error boundary: ${finalUrl}`);
	}
	return html;
}

export function collectListUrlsFromHtml(
	html: string,
	baseUrl: string,
	allowedPathname: string,
): string[] {
	const $ = cheerio.load(html);
	const urls: string[] = [];
	$(
		"a[href], form[action], [onclick], [data-url], [data-href], button, input[type='button'], input[type='submit'], script",
	).each(
		(_index, element) => {
			const node = $(element);
			const directAttributes = [
				node.attr("href"),
				node.attr("action"),
				node.attr("formaction"),
				node.attr("data-url"),
				node.attr("data-href"),
			];
			const scriptText = [
				node.attr("href"),
				node.attr("onclick"),
				node.attr("value"),
				node.is("script") ? node.text() : undefined,
			]
				.filter((value): value is string => value !== undefined)
				.join(" ");

			for (const candidate of [
				...directAttributes.map((value) =>
					value ? toCdpListUrl(value, baseUrl) : undefined,
				),
				...listUrlsFromScriptText(scriptText, baseUrl),
			]) {
				if (candidate !== undefined && new URL(candidate).pathname === allowedPathname) {
					urls.push(candidate);
				}
			}
		},
	);
	return unique(urls);
}

export function collectDetailUrlsFromHtml(html: string, baseUrl: string): string[] {
	const $ = cheerio.load(html);
	const urls: string[] = [];
	const selector = [
		"a[href]",
		"button",
		"input[type='button']",
		"input[type='submit']",
		"[role='button']",
		"[onclick]",
		"[data-url]",
		"[data-href]",
		"[data-funcidx]",
		"[data-func-idx]",
		"[data-idx]",
		"[data-id]",
		"[data-seq]",
		"[class*='btn']",
		"[class*='more']",
		"[class*='detail']",
		"[class*='view']",
	].join(", ");

	$(selector).each((_index, element) => {
		const url = detailUrlFromElement($(element as Element), baseUrl);
		if (url !== undefined) urls.push(url);
	});

	const currentUrl = toCdpDetailUrl(baseUrl, baseUrl);
	if (currentUrl !== undefined) urls.unshift(currentUrl);
	return unique(urls);
}

function detailUrlFromElement(
	element: cheerio.Cheerio<Element>,
	baseUrl: string,
): string | undefined {
	const href = element.attr("href");
	const hrefUrl = href ? toCdpDetailUrl(href, baseUrl) : undefined;
	if (hrefUrl !== undefined) return hrefUrl;

	const attributes = [
		href && !/^https?:\/\//iu.test(href) ? href : undefined,
		element.attr("value"),
		element.attr("aria-label"),
		element.attr("onclick"),
		element.attr("data-url"),
		element.attr("data-href"),
		element.attr("data-funcidx") ? `funcidx=${element.attr("data-funcidx")}` : undefined,
		element.attr("data-func-idx") ? `funcidx=${element.attr("data-func-idx")}` : undefined,
	]
		.filter((value): value is string => value !== undefined)
		.join(" ");

	const scriptUrl = detailUrlFromScriptText(attributes, baseUrl);
	if (scriptUrl !== undefined) return scriptUrl;
	return funcScheIdFromElement(element, baseUrl);
}

export function detailUrlFromScriptText(
	scriptText: string,
	baseUrl: string,
): string | undefined {
	const text = stripExternalAbsoluteUrls(scriptText, baseUrl);
	const directPath = text.match(
		/(?:https?:\/\/cdp\.hanyang\.ac\.kr)?(\/(?:Career\/Job\/[A-Za-z0-9]*View\d*|Office\/SiteMgr\/Notice\/FuncScheView)\.aspx\?[^'"\s)]+)/u,
	);
	if (directPath) return toCdpDetailUrl(directPath[0], baseUrl);

	const relativePath = text.match(/([A-Za-z0-9]*View\d*\.aspx\?[^'"\s)]+)/u);
	if (relativePath) return toCdpDetailUrl(relativePath[0], baseUrl);

	const explicitFuncidx = text.match(/funcidx\s*[=:,]\s*['"]?(\d+)['"]?/iu);
	if (explicitFuncidx) return funcScheDetailUrlFromId(explicitFuncidx[1], baseUrl);

	const queryFuncidx = text.match(/[?&]funcidx=(\d{1,10})/iu);
	if (queryFuncidx) return funcScheDetailUrlFromId(queryFuncidx[1], baseUrl);

	const quotedFuncSchePath = text.match(
		/FuncScheView\.aspx\?[^'"\s)]*funcidx=(\d{1,10})/iu,
	);
	if (quotedFuncSchePath) return funcScheDetailUrlFromId(quotedFuncSchePath[1], baseUrl);

	const postBackFuncidx = text.match(
		/__doPostBack\s*\([^)]*(?:funcidx|FuncSche|Sche|View|Detail)[^)]*?(\d{2,10})/iu,
	);
	if (postBackFuncidx) return funcScheDetailUrlFromId(postBackFuncidx[1], baseUrl);

	const funcScheFunction = text.match(
		/(?:funcsche|sche|schedule|event|view|detail|goView|goDetail|fnView|fn_View|showDetail|openDetail|viewDetail)\w*\s*\(\s*['"]?(\d{2,10})['"]?/iu,
	);
	if (
		funcScheFunction &&
		(isEventSchedulePageUrl(baseUrl) ||
			/funcsche|FuncSche|행사|상담|설명회|박람회/u.test(text))
	) {
		return funcScheDetailUrlFromId(funcScheFunction[1], baseUrl);
	}

	return undefined;
}

export function listUrlFromScriptText(scriptText: string, baseUrl: string): string | undefined {
	return listUrlsFromScriptText(scriptText, baseUrl)[0];
}

function listUrlsFromScriptText(scriptText: string, baseUrl: string): string[] {
	const text = stripExternalAbsoluteUrls(scriptText, baseUrl);
	const urls: string[] = [];
	for (const match of text.matchAll(
		/hcSubmit\s*\(\s*['"]([^'"]+\.aspx\?[^'"]*)['"]/giu,
	)) {
		const candidate = toCdpListUrl(match[1], baseUrl);
		if (candidate !== undefined) urls.push(candidate);
	}
	for (const match of text.matchAll(
		/hcSubmit\s*\(\s*['"]([^'"]+\.aspx)['"]\s*,\s*['"]([^'"]*\brp=\d{1,4}[^'"]*)['"]/giu,
	)) {
		const candidate = toCdpListUrl(`${match[1]}?${match[2]}`, baseUrl);
		if (candidate !== undefined) urls.push(candidate);
	}

	for (const match of text.matchAll(
		/(?:https?:\/\/cdp\.hanyang\.ac\.kr)?(\/(?:Career\/Job\/(?:RecruitList\d*|AlbaList|RecruitEvent)|Office\/SiteMgr\/Notice\/FuncScheList|Community\/Notice\/RecruitEvent)\.aspx\?[^'"\s)]+)/gu,
	)) {
		const candidate = toCdpListUrl(match[0], baseUrl);
		if (candidate !== undefined) urls.push(candidate);
	}

	for (const pageNumber of pageNumbersFromPostbackText(text)) {
		const candidate = listUrlWithPageNumber(baseUrl, pageNumber);
		if (candidate !== undefined) urls.push(candidate);
	}

	for (const pageNumber of pageNumbersFromPaginationFunctions(text)) {
		const candidate = listUrlWithPageNumber(baseUrl, pageNumber);
		if (candidate !== undefined) urls.push(candidate);
	}

	return unique(urls);
}

function pageNumbersFromPostbackText(text: string): string[] {
	const pageNumbers: string[] = [];
	for (const match of text.matchAll(
		/__doPostBack\s*\(\s*['"][^'"]*(?:Page|Paging|Pager|List|Grid)[^'"]*['"]\s*,\s*['"](?:Page\$)?(\d{1,4})['"]\s*\)/giu,
	)) {
		pageNumbers.push(match[1]);
	}
	return pageNumbers;
}

function pageNumbersFromPaginationFunctions(text: string): string[] {
	const pageNumbers: string[] = [];
	for (const match of text.matchAll(
		/\b(?:go|fn|move|set|load|change|select|do)?_?(?:Page|Paging|Pager|PageMove|MovePage|ListPage)\w*\s*\(([^)]*)\)/giu,
	)) {
		const pageNumber = pageNumberFromFunctionArguments(match[1]);
		if (pageNumber !== undefined) pageNumbers.push(pageNumber);
	}
	return pageNumbers;
}

function pageNumberFromFunctionArguments(args: string): string | undefined {
	const namedPageNumber = args.match(
		/(?:^|[,&?\s])(?:rp|page|pageIndex|pageNo|pageno|pageNum|pageNumber)\s*[=:]\s*['"]?(\d{1,4})['"]?/iu,
	);
	if (namedPageNumber) return namedPageNumber[1];
	const positionalPageNumber = args.match(/(?:^|[,\s])['"]?(\d{1,4})['"]?(?:[,\s]|$)/u);
	return positionalPageNumber?.[1];
}

function listUrlWithPageNumber(baseUrl: string, pageNumber: string): string | undefined {
	if (!/^\d{1,4}$/u.test(pageNumber)) return undefined;
	const currentListUrl = toCdpListUrl(baseUrl, baseUrl);
	if (currentListUrl === undefined) return undefined;
	const url = new URL(currentListUrl);
	url.searchParams.set("rp", pageNumber);
	url.hash = "";
	return toCdpListUrl(url.toString(), baseUrl);
}

function stripExternalAbsoluteUrls(scriptText: string, baseUrl: string): string {
	return scriptText.replace(/https?:\/\/[^'"\s)]+/giu, (candidate) => {
		const sanitized = sanitizeCdpUrl(candidate, baseUrl);
		if (sanitized === undefined) return "";
		const url = new URL(sanitized);
		return `${url.pathname}${url.search}`;
	});
}

function funcScheIdFromElement(
	element: cheerio.Cheerio<Element>,
	baseUrl: string,
): string | undefined {
	if (!isEventSchedulePageUrl(baseUrl)) return undefined;
	const eventContainer = element.closest(
		"article, li, tr, .card, .item, .list, [class*='card'], [class*='item'], [class*='list']",
	);
	const contextText = cleanInlineText(
		(eventContainer.length > 0 ? eventContainer : element).text(),
	);
	const looksLikeEvent =
		/자세히 보기|기간\s*:|장소\s*:|행사구분\s*:|채용상담회|채용설명회|채용박람회/u.test(
			contextText,
		);
	const looksLikeFilter =
		/달력보기|목록보기|상세검색|대상학년|search|검색$/u.test(contextText) &&
		contextText.length < 200;
	if (!looksLikeEvent || looksLikeFilter) return undefined;

	const candidate = [
		element.attr("data-idx"),
		element.attr("data-id"),
		element.attr("data-seq"),
		element.attr("value"),
	].find((value) => /^\d{2,10}$/u.test(value ?? ""));

	return candidate ? funcScheDetailUrlFromId(candidate, baseUrl) : undefined;
}

export function extractPostFromHtml(
	html: string,
	url: string,
	board: CdpBoard,
	exportedAtIso: string,
): CdpPost | null {
	const $ = cheerio.load(html);
	removeNoise($);
	const title = extractTitle($);
	const bodyText = extractBody($);
	if (isCdpErrorPage(title, bodyText) || title.length === 0 || bodyText.length < 20) {
		return null;
	}
	if (looksLikeLoginOrErrorText(`${title}\n${bodyText}`)) {
		return null;
	}
	if (isLikelyListPage($, bodyText, url)) {
		return null;
	}
	const combinedText = `${title}\n${bodyText}`;
	const rawDeadline = extractDeadlineRawText(combinedText);
	const exportedAt = new Date(exportedAtIso);
	return {
		board,
		title,
		detail_url: sanitizeCdpUrl(url, url) ?? url,
		posted_at: extractPostedAt(combinedText),
		deadline_status: classifyDeadline(rawDeadline, exportedAt),
		deadline_raw_text: rawDeadline,
		body_text: bodyText,
	};
}

function extractTitle($: cheerio.CheerioAPI): string {
	const title = firstText($, [
		".subject",
		".board-view .title",
		".view-title",
		".view_title",
		"[id*='lblTitle']",
		"[id*='lbTitle']",
		"[id*='Title']",
		"td.title",
		"th.title",
		"h1",
		"h2",
		"h3",
	]);
	if (title.length > 0) return title.replace(/\s+Hit\s+\d+(?:\s+New)?$/iu, "").trim();
	const likely = cleanBlockText($("body").text())
		.split("\n")
		.find((line) => /채용|인턴|설명회|상담|모집|공고/u.test(line));
	return cleanInlineText(likely ?? $("title").text())
		.replace(/\s+Hit\s+\d+(?:\s+New)?$/iu, "")
		.trim();
}

function extractBody($: cheerio.CheerioAPI): string {
	for (const selector of [
		".board-view .content",
		".view-content",
		".view_content",
		".content",
		".contents",
		"#contents",
		"#content",
		"main",
		"form",
		"body",
	]) {
		const text = cleanBlockText($(selector).first().text());
		if (text.length >= 20) return text;
	}
	return cleanBlockText($("body").text());
}

function firstText($: cheerio.CheerioAPI, selectors: readonly string[]): string {
	for (const selector of selectors) {
		const text = cleanInlineText($(selector).first().text());
		if (text.length > 0) return text;
	}
	return "";
}

function removeNoise($: cheerio.CheerioAPI): void {
	$("script, style, noscript, iframe, input[type='hidden'], header, nav, footer").remove();
}

function isCdpErrorPage(title: string, bodyText: string): boolean {
	const text = cleanInlineText(`${title}\n${bodyText}`);
	return title.length === 0 && /오류입니다.*불편을 드려 죄송합니다.*오류번호/u.test(text);
}

function isLikelyListPage($: cheerio.CheerioAPI, bodyText: string, pageUrl: string): boolean {
	const pageText = cleanInlineText(bodyText);
	const url = sanitizeCdpUrl(pageUrl, pageUrl);
	const path = url ? new URL(url).pathname : "";
	const listPath = listPathPattern.test(path);
	const listWords = [
		"달력보기",
		"목록보기",
		"상세검색",
		"검색",
		"전체",
		"관심 채용행사",
		"자세히 보기",
		"대상학년",
		"행사구분",
	];
	const listWordHits = listWords.filter((word) => pageText.includes(word)).length;
	const repeatedDetailButtons = pageText.match(/자세히 보기/gu)?.length ?? 0;
	const repeatedPeriods = pageText.match(/기간\s*:/gu)?.length ?? 0;
	const rowCount = $("tr, li, article, .card, .list, [class*='list']").length;
	return (
		(listPath && listWordHits >= 3) ||
		listWordHits >= 5 ||
		repeatedDetailButtons >= 3 ||
		repeatedPeriods >= 5 ||
		(rowCount >= 20 && listWordHits >= 3)
	);
}

function extractPostedAt(text: string): string | null {
	const match = text.match(
		/(?:등록일|작성일|게시일|Date)?\s*(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/u,
	);
	if (!match) return null;
	const [, year, month, day] = match;
	return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`;
}

function extractDeadlineRawText(text: string): string {
	const patterns = [
		/채용시까지/u,
		/상시채용/u,
		/(20\d{2}[.\-/년\s]+\d{1,2}[.\-/월\s]+\d{1,2})\s*[~～]\s*(20\d{2}[.\-/년\s]+\d{1,2}[.\-/월\s]+\d{1,2})/u,
		/(?:마감|접수(?:기간)?|지원(?:기간)?|신청(?:기간)?)[^\n]{0,40}(20\d{2}[.\-/년\s]+\d{1,2}[.\-/월\s]+\d{1,2})/u,
		/[~～]\s*(20\d{2}[.\-/년\s]+\d{1,2}[.\-/월\s]+\d{1,2})/u,
		/[~～]\s*(\d{1,2}[.\-/]\d{1,2})/u,
	];
	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match) return cleanInlineText(match[0]);
	}
	return "";
}

function classifyDeadline(rawText: string, exportedAt: Date): DeadlineStatus {
	if (!rawText) return "unknown";
	if (/채용시까지|상시채용/u.test(rawText)) return "active";
	const date = parseDeadlineDate(rawText, exportedAt);
	if (!date) return "unknown";
	const deadline = new Date(`${date}T23:59:59+09:00`);
	return deadline < exportedAt ? "expired" : "active";
}

function parseDeadlineDate(rawText: string, exportedAt: Date): string | null {
	const fullMatches = [
		...rawText.matchAll(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/gu),
	];
	const full = fullMatches.at(-1);
	if (full) return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
	const short = rawText.match(/(\d{1,2})[.\-/](\d{1,2})/u);
	if (short) return `${exportedAt.getFullYear()}-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`;
	return null;
}

function toCdpListUrl(href: string, baseUrl: string): string | undefined {
	const url = sanitizeCdpUrl(href, baseUrl);
	if (url === undefined) return undefined;
	return listPathPattern.test(new URL(url).pathname) ? url : undefined;
}

function toCdpDetailUrl(href: string, baseUrl: string): string | undefined {
	const url = sanitizeCdpUrl(href, baseUrl);
	if (url === undefined) return undefined;
	return detailPathPattern.test(new URL(url).pathname) ? url : undefined;
}

function sanitizeCdpUrl(href: string, baseUrl: string): string | undefined {
	try {
		const url = new URL(href, baseUrl);
		url.hash = "";
		url.username = "";
		url.password = "";
		if (url.protocol !== "https:" || url.origin !== cdpOrigin) return undefined;
		if (hasCredentialLikeSearchParam(url)) return undefined;
		return url.toString();
	} catch (_error) {
		return undefined;
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

function looksLikeLoginOrErrorPage(html: string): boolean {
	return looksLikeLoginOrErrorText(cleanBlockText(cheerio.load(html)("body").text()));
}

function looksLikeLoginOrErrorText(text: string): boolean {
	return /로그인\s*(후|하시|필요)|login|세션이\s*만료|권한이\s*없|접근\s*권한|오류입니다|불편을\s*드려\s*죄송합니다|오류번호/iu.test(text);
}

function funcScheDetailUrlFromId(funcidx: string, baseUrl: string): string | undefined {
	if (!/^\d+$/u.test(funcidx) || !isEventSchedulePageUrl(baseUrl)) return undefined;
	const url = new URL(baseUrl);
	url.pathname = "/Office/SiteMgr/Notice/FuncScheView.aspx";
	url.search = "";
	url.searchParams.set("funcidx", funcidx);
	url.hash = "";
	return toCdpDetailUrl(url.toString(), baseUrl);
}

function isEventSchedulePageUrl(href: string): boolean {
	const url = sanitizeCdpUrl(href, href);
	if (url === undefined) return false;
	return /\/Office\/SiteMgr\/Notice\/FuncSche(?:List|View)\.aspx$/u.test(new URL(url).pathname) ||
		/\/Community\/Notice\/RecruitEvent\.aspx$/u.test(new URL(url).pathname);
}

function cleanBlockText(value: string): string {
	return value
		.replace(/\u00a0/gu, " ")
		.replace(/\r\n?/gu, "\n")
		.split("\n")
		.map((line) => cleanInlineText(line))
		.filter((line) => line.length > 0)
		.join("\n")
		.trim();
}

function cleanInlineText(value: string): string {
	return value.replace(/[ \t]+/gu, " ").trim();
}

function unique(values: readonly string[]): string[] {
	return [...new Set(values)];
}

async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseArgs(argv: readonly string[]): CliArgs {
	let outputDir = defaultOutputDir;
	let maxListPages = defaultMaxListPages;
	let maxDetailPages = defaultMaxDetailPages;
	let headless = false;
	let sourceKeys: readonly CdpSource["sourceKey"][] = cdpSources.map(
		(source) => source.sourceKey,
	);

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
			if (!value) throw new Error("--max-detail-pages requires a nonnegative integer");
			maxDetailPages = parseBoundedInteger(value, "--max-detail-pages", 0, 200);
			index += 1;
			continue;
		}
		if (arg === "--max-list-pages") {
			const value = argv[index + 1];
			if (!value) throw new Error("--max-list-pages requires a positive integer");
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
			if (!value) throw new Error("--source requires all, recruit, or events");
			sourceKeys = parseSourceFilter(value);
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return { outputDir, maxListPages, maxDetailPages, headless, sourceKeys };
}

function parseSourceFilter(value: string): readonly CdpSource["sourceKey"][] {
	if (value === "all") return cdpSources.map((source) => source.sourceKey);
	if (value === "recruit") return ["recruit"];
	if (value === "events") return ["events"];
	throw new Error("--source must be all, recruit, or events");
}

function parseBoundedInteger(value: string, label: string, min: number, max: number): number {
	if (!/^\d+$/u.test(value)) throw new Error(`${label} must be an integer`);
	const parsed = Number.parseInt(value, 10);
	if (parsed < min || parsed > max) throw new Error(`${label} must be between ${min} and ${max}`);
	return parsed;
}

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	runCli().catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`ingest_cdp_authenticated_sources_failed: ${message}`);
		process.exitCode = 1;
	});
}
