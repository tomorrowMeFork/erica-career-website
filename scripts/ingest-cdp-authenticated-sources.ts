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
import type { DeadlineStatus, NormalizedRecord } from "../src/ingestion/normalized-record.js";
import { writeKnowledgeBaseJsonl } from "../src/ingestion/write-jsonl-kb.js";

type CdpBoard = CdpManualPostExport["posts"][number]["board"];

type CdpSource = {
	sourceKey: "recruit" | "events";
	sourceId: "cdp-recruit-general-board" | "cdp-recruit-event-board";
	board: CdpBoard;
	canonicalUrl: string;
	listUrls: readonly string[];
	description: string;
};

type CdpOutputGroup = {
	key: string;
	directoryName: string;
	sourceIds: readonly CdpSource["sourceId"][];
};

type CliArgs = {
	outputDir: string;
	maxListPages: number;
	maxDetailPages: number;
	headless: boolean;
	sourceKeys: readonly CdpSource["sourceKey"][];
};

type CdpPost = CdpManualPostExport["posts"][number];

type ClickedDetailPage = {
	url: string;
	html: string;
};

type DetailUrlCandidate = {
	url: string;
	listUrl: string;
};

const cdpOrigin = "https://cdp.hanyang.ac.kr";
const cdpHost = "cdp.hanyang.ac.kr";
const hanyangOauthHost = "api.hanyang.ac.kr";
const defaultOutputDir = "data/knowledge-base/cdp-authenticated-sources";
const defaultMaxListPages = 5;
const defaultMaxDetailPages = 30;
const maxAllowedDetailPages = 500;
const navigationTimeoutMs = 20_000;
const renderedContentTimeoutMs = 5_000;
const requestDelayMs = 1_200;
const manualLoginMaxAttempts = 3;

const cdpSources: readonly CdpSource[] = [
	{
		sourceKey: "recruit",
		sourceId: "cdp-recruit-general-board",
		board: "일반채용공고",
		canonicalUrl: `${cdpOrigin}/Career/Job/RecruitList.aspx`,
		listUrls: [
			`${cdpOrigin}/Career/Job/RecruitList.aspx`,
			`${cdpOrigin}/Career/Job/RecruitList2.aspx`,
			`${cdpOrigin}/Career/Job/RecruitList3.aspx`,
		],
		description: "CDP 일반채용공고 목록 및 연결 상세글",
	},
	{
		sourceKey: "events",
		sourceId: "cdp-recruit-event-board",
		board: "채용상담 및 설명회",
		canonicalUrl: `${cdpOrigin}/Community/Notice/RecruitEvent.aspx`,
		listUrls: [`${cdpOrigin}/Community/Notice/RecruitEvent.aspx`],
		description: "CDP 채용상담 및 설명회 목록 및 연결 상세글",
	},
] as const;

const cdpOutputGroups: readonly CdpOutputGroup[] = [
	{
		key: "recruit-general",
		directoryName: "일반채용공고",
		sourceIds: ["cdp-recruit-general-board"],
	},
	{
		key: "recruit-events",
		directoryName: "채용상담및설명회",
		sourceIds: ["cdp-recruit-event-board"],
	},
] as const;

const detailPathPattern =
	/(?:\/Career\/Job\/RecruitView\d*\.aspx|\/Recruit\/RecruitView\.aspx|\/Office\/SiteMgr\/Notice\/FuncScheView\.aspx|\/Community\/Notice\/NoticeView\d*\.aspx)$/u;
const listPathPattern =
	/(?:\/Career\/Job\/(?:RecruitList\d*|AlbaList|RecruitEvent)\.aspx|\/Office\/SiteMgr\/Notice\/FuncScheList\.aspx|\/Community\/Notice\/(?:NoticeList|RecruitEvent)\.aspx)$/u;
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
			await allowManualLoginContext(context);
			const page = await context.newPage();
			await promptForManualLogin(page, args.headless, selectedSources[0]?.listUrls[0]);
			await context.unroute("**/*");
			await restrictContextToCdp(context);

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
	const groupedRecords = groupCdpRecordsByOutputCategory(records);
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
				run_id: `cdp-authenticated-sources-${group.key}-${exportedAt}`,
				generated_at: exportedAt,
				source_ids: [...new Set(group.records.map((record) => record.source_id))],
			},
		});
		totalRecordCount += manifest.record_count;
		totalChunkCount += manifest.chunk_count;
		console.log(
			`cdp authenticated source ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${outputDir}`,
		);
	}

	console.log(
		`cdp authenticated source ingestion wrote ${totalRecordCount} records and ${totalChunkCount} chunks across ${groupedRecords.length} source directories under ${args.outputDir}`,
	);
}

export function groupCdpRecordsByOutputCategory(records: readonly NormalizedRecord[]): { key: CdpOutputGroup["key"]; directoryName: string; records: NormalizedRecord[] }[] {
	return cdpOutputGroups
		.map((group) => ({
			key: group.key,
			directoryName: group.directoryName,
			records: records.filter((record) => group.sourceIds.includes(record.source_id as CdpSource["sourceId"])),
		}))
		.filter((group) => group.records.length > 0);
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
	await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: navigationTimeoutMs });
	console.log("Opened CDP in a non-persistent browser context.");
	console.log(
		"Log in manually in the opened browser window if CDP asks. No cookies, storage state, screenshots, traces, IDs, or passwords will be written by this script.",
	);
	const readline = createInterface({ input, output });
	try {
		for (let attempt = 1; attempt <= manualLoginMaxAttempts; attempt += 1) {
			await readline.question(
				attempt === 1
					? "After login completes, press Enter here to verify the approved CDP board is accessible..."
					: "CDP still looks logged out or errored. Complete login in the browser, then press Enter to retry verification...",
			);
			const verifiedUrl = await canOpenApprovedListPage(page, [page.url(), startUrl]);
			if (verifiedUrl !== undefined) {
				console.log(`CDP login verified on ${verifiedUrl}`);
				return;
			}
			console.warn(`CDP login verification failed at ${page.url()}: ${summarizePageForDiagnostics(await page.content())}`);
		}
		throw new Error(`CDP login was not confirmed after ${manualLoginMaxAttempts} attempts; approved list page still appears to be a login or error boundary`);
	} finally {
		readline.close();
	}
}

async function canOpenApprovedListPage(page: Page, listUrls: readonly string[]): Promise<string | undefined> {
	for (const listUrl of listUrls) {
		const normalizedCandidate = toCdpListUrl(listUrl, listUrl);
		if (normalizedCandidate === undefined) continue;
		try {
			const response = page.url() === normalizedCandidate ? null : await page.goto(normalizedCandidate, { waitUntil: "domcontentloaded", timeout: navigationTimeoutMs });
			if (response !== null && !response.ok()) continue;
			try {
				await page.waitForLoadState("networkidle", { timeout: renderedContentTimeoutMs });
			} catch (_error) {
				// CDP login/list pages can keep supporting requests open; DOM content is enough.
			}
			const finalUrl = page.url();
			const normalizedFinalUrl = toCdpListUrl(finalUrl, finalUrl);
			if (normalizedFinalUrl === undefined) continue;
			const html = await page.content();
			if (!looksLikeLoginOrErrorPage(html) || hasListEvidence(html)) return normalizedFinalUrl;
		} catch (_error) {}
	}
	return undefined;
}

async function restrictContextToCdp(context: BrowserContext): Promise<void> {
	await context.route("**/*", async (route) => {
		if (isAllowedCdpRequestUrl(route.request().url())) {
			await route.continue();
			return;
		}
		await route.abort();
	});
}

async function allowManualLoginContext(context: BrowserContext): Promise<void> {
	await context.route("**/*", async (route) => {
		if (isAllowedManualLoginRequestUrl(route.request().url())) {
			await route.continue();
			return;
		}
		await route.abort();
	});
}

export function isAllowedCdpRequestUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return isAllowedCdpHostUrl(url) || isAllowedHanyangOauthUrl(url);
	} catch (_error) {
		return false;
	}
}

export function isAllowedManualLoginRequestUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return isAllowedCdpHostUrl(url) || isAllowedHanyangHostUrl(url);
	} catch (_error) {
		return false;
	}
}

function isAllowedCdpHostUrl(url: URL): boolean {
	return url.hostname === cdpHost && (url.protocol === "https:" || url.protocol === "http:");
}

function isAllowedHanyangHostUrl(url: URL): boolean {
	return url.protocol === "https:" && (url.hostname === "hanyang.ac.kr" || url.hostname.endsWith(".hanyang.ac.kr"));
}

function isAllowedHanyangOauthUrl(url: URL): boolean {
	if (url.hostname !== hanyangOauthHost || url.protocol !== "https:" || url.pathname !== "/oauth/authorize") {
		return false;
	}
	const redirectUri = url.searchParams.get("redirect_uri");
	if (redirectUri === null) return false;
	try {
		const parsedRedirectUri = new URL(redirectUri);
		return parsedRedirectUri.hostname === cdpHost && parsedRedirectUri.protocol === "https:";
	} catch (_error) {
		return false;
	}
}

async function collectSourcePosts(
	page: Page,
	source: CdpSource,
	maxListPages: number,
	maxDetailPages: number,
	exportedAtIso: string,
): Promise<CdpPost[]> {
	console.log(`CDP ${source.sourceKey}: collecting ${source.description}`);
	const accessibleListUrl = await canOpenApprovedListPage(page, source.listUrls);
	if (accessibleListUrl === undefined) {
		throw new Error(`CDP ${source.sourceKey} list pages still appear logged out, errored, or moved: ${source.listUrls.join(", ")}`);
	}
	if (accessibleListUrl !== source.canonicalUrl) {
		console.warn(`CDP ${source.sourceKey}: using accessible list URL ${accessibleListUrl} instead of ${source.canonicalUrl}`);
	}
	const listPages = await collectListPages(page, accessibleListUrl, maxListPages);
	const detailUrls: DetailUrlCandidate[] = [];
	const seenDetailUrls = new Set<string>();
	const clickedDetailPages: ClickedDetailPage[] = [];

	for (const listPage of listPages) {
		for (const url of collectDetailUrlsFromHtml(listPage.html, listPage.url)) {
			if (!seenDetailUrls.has(url)) {
				seenDetailUrls.add(url);
				detailUrls.push({ url, listUrl: listPage.url });
			}
		}
		for (const target of extractDetailViewTargetsFromHtml(listPage.html)) {
			if (detailUrls.length + clickedDetailPages.length >= maxDetailPages) break;
			await delay(requestDelayMs);
			const clickedDetailPage = await collectClickedDetailViewPage(page, listPage.url, target);
			if (clickedDetailPage === undefined || seenDetailUrls.has(clickedDetailPage.url)) continue;
			seenDetailUrls.add(clickedDetailPage.url);
			clickedDetailPages.push(clickedDetailPage);
		}
	}

	console.log(
		`CDP ${source.sourceKey}: discovered ${detailUrls.length + clickedDetailPages.length} detail candidates from ${listPages.length} list pages`,
	);
	if (detailUrls.length === 0 && clickedDetailPages.length === 0) {
		throw new Error(`CDP ${source.sourceKey}: discovered 0 detail candidates from ${listPages.length} list pages. ${summarizeListPagesForDiagnostics(listPages)}`);
	}

	const posts: CdpPost[] = [];
	for (const detail of detailUrls.slice(0, maxDetailPages)) {
		await delay(requestDelayMs);
		const detailPage = await collectDetailPageHtml(page, detail);
		if (detailPage === undefined) {
			console.warn(`CDP ${source.sourceKey}: skipped inaccessible detail ${detail.url}`);
			continue;
		}
		const { html, url: detailUrl } = detailPage;
		const post = extractPostFromHtml(html, detailUrl, boardForDetailUrl(detailUrl) ?? source.board, exportedAtIso);
		if (post === null) {
			console.warn(`CDP ${source.sourceKey}: skipped non-recordable detail ${detailUrl}`);
			continue;
		}
		posts.push(post);
		console.log(
			`CDP ${source.sourceKey}: collected ${new URL(detailUrl).pathname} (title=${post.title.slice(0, 80)}; posted=${post.posted_at ?? "unknown"}; chars=${post.body_text.length})`,
		);
	}
	for (const detailPage of clickedDetailPages) {
		const post = extractPostFromHtml(detailPage.html, detailPage.url, boardForDetailUrl(detailPage.url) ?? source.board, exportedAtIso);
		if (post === null) {
			console.warn(`CDP ${source.sourceKey}: skipped non-recordable clicked detail ${detailPage.url}`);
			continue;
		}
		posts.push(post);
		console.log(
			`CDP ${source.sourceKey}: collected ${new URL(detailPage.url).pathname} (title=${post.title.slice(0, 80)}; posted=${post.posted_at ?? "unknown"}; chars=${post.body_text.length})`,
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

export function extractDetailViewTargetsFromHtml(html: string): string[] {
	const $ = cheerio.load(html);
	const targets: string[] = [];
	$('[onclick*="detailView"], a[href*="detailView"], script').each((_index, element) => {
		const node = $(element as Element);
		const text = [node.attr("onclick"), node.attr("href"), node.is("script") ? node.text() : undefined]
			.filter((value): value is string => value !== undefined)
			.join(" ");
		for (const match of text.matchAll(/detailView\s*\(\s*['"]?([A-Za-z0-9_-]{1,160})['"]?(?:\s*,[^)]*)?\)/giu)) {
			if (match[1] !== undefined) targets.push(match[1]);
		}
	});
	return unique(targets);
}

async function collectClickedDetailViewPage(page: Page, listUrl: string, target: string): Promise<ClickedDetailPage | undefined> {
	await collectHtml(page, listUrl, "list");
	const popupPromise = page.waitForEvent("popup", { timeout: 5_000 }).catch(() => undefined);
	const escapedTarget = escapeRegExpForBrowser(target);
	const clicked = await page.evaluate((detailTarget) => {
		const candidates = Array.from(document.querySelectorAll<HTMLElement>('[onclick*="detailView"], a[href*="detailView"]'));
		const targetElement = candidates.find((element) => {
			const text = `${element.getAttribute("onclick") ?? ""} ${element.getAttribute("href") ?? ""}`;
			return new RegExp(`detailView\\s*\\(\\s*['"]?${detailTarget}['"]?(?:\\s*,[^)]*)?\\)`, "iu").test(text);
		});
		if (targetElement === undefined) return false;
		targetElement.click();
		return true;
	}, escapedTarget);
	if (!clicked) return undefined;
	const popup = await popupPromise;
	if (popup !== undefined) {
		await popup.waitForLoadState("domcontentloaded", { timeout: navigationTimeoutMs }).catch(() => undefined);
		const url = popup.url();
		const html = await popup.content();
		await popup.close().catch(() => undefined);
		return toCdpDetailUrl(url, url) === undefined ? undefined : { url, html };
	}
	await page.waitForLoadState("domcontentloaded", { timeout: navigationTimeoutMs }).catch(() => undefined);
	const url = page.url();
	return toCdpDetailUrl(url, url) === undefined ? undefined : { url, html: await page.content() };
}

async function collectDetailPageHtml(page: Page, detail: DetailUrlCandidate): Promise<ClickedDetailPage | undefined> {
	try {
		return { url: detail.url, html: await collectHtml(page, detail.url, "detail") };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`CDP detail direct navigation failed for ${detail.url}: ${message}`);
		return collectClickedDetailByUrl(page, detail);
	}
}

async function collectClickedDetailByUrl(page: Page, detail: DetailUrlCandidate): Promise<ClickedDetailPage | undefined> {
	await collectHtml(page, detail.listUrl, "list");
	const popupPromise = page.waitForEvent("popup", { timeout: 5_000 }).catch(() => undefined);
	const clicked = await page.evaluate((targetUrl) => {
		const target = new URL(targetUrl);
		const candidates = Array.from(document.querySelectorAll<HTMLElement>("a[href], [onclick], [data-url], [data-href], button, input[type='button'], input[type='submit']"));
		const targetElement = candidates.find((element) => {
			const text = [
				element.getAttribute("href"),
				element.getAttribute("onclick"),
				element.getAttribute("data-url"),
				element.getAttribute("data-href"),
				element.getAttribute("data-funcidx"),
				element.getAttribute("data-func-idx"),
			]
				.filter((value): value is string => value !== null)
				.join(" ");
			return text.includes(target.href) ||
				text.includes(`${target.pathname}${target.search}`) ||
				(target.pathname.endsWith("/FuncScheView.aspx") && text.includes(target.searchParams.get("funcidx") ?? ""));
		});
		if (targetElement === undefined) return false;
		targetElement.click();
		return true;
	}, detail.url);
	if (!clicked) return undefined;
	const popup = await popupPromise;
	if (popup !== undefined) {
		await popup.waitForLoadState("domcontentloaded", { timeout: navigationTimeoutMs }).catch(() => undefined);
		const url = popup.url();
		const html = await popup.content();
		await popup.close().catch(() => undefined);
		return toCdpDetailUrl(url, url) === undefined || looksLikeLoginOrErrorPage(html) ? undefined : { url, html };
	}
	await page.waitForLoadState("domcontentloaded", { timeout: navigationTimeoutMs }).catch(() => undefined);
	const url = page.url();
	const html = await page.content();
	return toCdpDetailUrl(url, url) === undefined || looksLikeLoginOrErrorPage(html) ? undefined : { url, html };
}

function escapeRegExpForBrowser(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
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
		"script",
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
		element.is("script") ? element.text() : undefined,
		element.attr("value"),
		element.attr("aria-label"),
		element.attr("onclick"),
		element.attr("data-url"),
		element.attr("data-href"),
		element.attr("data-idx") ? `idx=${element.attr("data-idx")}` : undefined,
		element.attr("data-id") ? `idx=${element.attr("data-id")}` : undefined,
		element.attr("data-seq") ? `idx=${element.attr("data-seq")}` : undefined,
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
		/(?:https?:\/\/cdp\.hanyang\.ac\.kr)?(\/(?:Career\/Job\/RecruitView\d*|Recruit\/RecruitView|Office\/SiteMgr\/Notice\/FuncScheView|Community\/Notice\/NoticeView\d*)\.aspx\?[^'"\s)]+)/u,
	);
	if (directPath) return toCdpDetailUrl(directPath[0], baseUrl);

	const relativePath = text.match(/([A-Za-z0-9]*View\d*\.aspx\?[^'"\s)]+)/u);
	if (relativePath) return toCdpDetailUrl(relativePath[0], baseUrl);

	const detailViewRcdx = text.match(/detailView\s*\(\s*['"]([A-Fa-f0-9]{24,})['"]\s*,/u);
	if (detailViewRcdx && isRecruitListPageUrl(baseUrl)) return recruitPopupDetailUrlFromRcdx(detailViewRcdx[1], baseUrl);

	const explicitFuncidx = text.match(/funcidx\s*[=:,]\s*['"]?(\d+)['"]?/iu);
	if (explicitFuncidx) return funcScheDetailUrlFromId(explicitFuncidx[1], baseUrl);

	const explicitIdx = text.match(/(?:idx|seq|id)\s*[=:,]\s*['"]?(\d{2,10})['"]?/iu);
	if (explicitIdx) return indexedDetailUrlFromId(explicitIdx[1], baseUrl);

	const explicitRcdx = text.match(/rcdx\s*[=:,]\s*['"]?([A-Fa-f0-9]{24,})['"]?/u);
	if (explicitRcdx && isRecruitListPageUrl(baseUrl)) return recruitPopupDetailUrlFromRcdx(explicitRcdx[1], baseUrl);

	const queryFuncidx = text.match(/[?&]funcidx=(\d{1,10})/iu);
	if (queryFuncidx) return funcScheDetailUrlFromId(queryFuncidx[1], baseUrl);

	const queryIdx = text.match(/[?&](?:idx|seq|id)=(\d{1,10})/iu);
	if (queryIdx) return indexedDetailUrlFromId(queryIdx[1], baseUrl);

	const queryRcdx = text.match(/[?&]rcdx=([A-Fa-f0-9]{24,})/u);
	if (queryRcdx && isRecruitListPageUrl(baseUrl)) return recruitPopupDetailUrlFromRcdx(queryRcdx[1], baseUrl);

	const quotedFuncSchePath = text.match(
		/FuncScheView\.aspx\?[^'"\s)]*funcidx=(\d{1,10})/iu,
	);
	if (quotedFuncSchePath) return funcScheDetailUrlFromId(quotedFuncSchePath[1], baseUrl);

	const postBackFuncidx = text.match(
		/__doPostBack\s*\([^)]*(?:funcidx|FuncSche|Sche|View|Detail|Select)[^)]*?(\d{2,10})/iu,
	);
	if (postBackFuncidx) return funcScheDetailUrlFromId(postBackFuncidx[1], baseUrl);

	const funcScheFunction = text.match(
		/(?:funcsche|sche|schedule|event|view|detail|goView|goDetail|fnView|fn_View|showDetail|openDetail|viewDetail)\w*\s*\(\s*['"]?(\d{2,10})['"]?/iu,
	);
	if (funcScheFunction && isNoticeListPageUrl(baseUrl)) {
		return indexedDetailUrlFromId(funcScheFunction[1], baseUrl);
	}
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
		/(?:https?:\/\/cdp\.hanyang\.ac\.kr)?(\/(?:Career\/Job\/(?:RecruitList\d*|AlbaList|RecruitEvent)|Office\/SiteMgr\/Notice\/FuncScheList|Community\/Notice\/(?:NoticeList|RecruitEvent))\.aspx\?[^'"\s)]+)/gu,
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
	const parsedUrl = new URL(url);
	return detailPathPattern.test(parsedUrl.pathname) && hasValidDetailIdentifier(parsedUrl) ? url : undefined;
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

function hasValidDetailIdentifier(url: URL): boolean {
	const pathname = url.pathname.toLowerCase();
	if (pathname === "/recruit/recruitview.aspx") {
		return /^[A-Fa-f0-9]{24,}$/u.test(url.searchParams.get("rcdx") ?? "");
	}
	if (/^\/career\/job\/recruitview\d*\.aspx$/u.test(pathname)) {
		return hasNumericSearchParam(url, ["idx", "seq", "id"]);
	}
	if (pathname === "/office/sitemgr/notice/funcscheview.aspx") {
		return hasNumericSearchParam(url, ["funcidx"]);
	}
	if (/^\/community\/notice\/noticeview\d*\.aspx$/u.test(pathname)) {
		return hasNumericSearchParam(url, ["idx", "seq", "id"]);
	}
	return false;
}

function hasNumericSearchParam(url: URL, keys: readonly string[]): boolean {
	return keys.some((key) => /^\d+$/u.test(url.searchParams.get(key) ?? ""));
}

function looksLikeLoginOrErrorPage(html: string): boolean {
	const $ = cheerio.load(html);
	return looksLikeLoginOrErrorText(`${cleanInlineText($("title").text())}\n${cleanBlockText($("body").text())}`);
}

function looksLikeLoginOrErrorText(text: string): boolean {
	return /log\s*in\s*(required|again|failed)|세션이\s*만료|권한이\s*없|접근\s*권한/iu.test(text) ||
		/오류입니다.*불편을\s*드려\s*죄송합니다|오류번호/iu.test(text) ||
		/포털시스템\s*로그인|HY-in\s*시스템의\s*계정\s*및\s*비밀번호|아이디\/비밀번호를\s*잃어버리셨나요|기업회원가입/iu.test(text);
}

function hasListEvidence(html: string): boolean {
	const $ = cheerio.load(html);
	const text = cleanBlockText($("body").text());
	return collectDetailUrlsFromHtml(html, "https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx").length > 0 ||
		/번호\s*제목\s*(작성자|등록일|작성일)|채용정보|공지사항|일반채용공고|조회수/u.test(text);
}

function summarizePageForDiagnostics(html: string): string {
	const $ = cheerio.load(html);
	const title = cleanInlineText($("title").text()).slice(0, 120) || "untitled";
	const body = cleanBlockText($("body").text()).replace(/\s+/gu, " ").slice(0, 240);
	return `title=${JSON.stringify(title)} body=${JSON.stringify(body)}`;
}

function summarizeListPagesForDiagnostics(listPages: readonly { url: string; html: string }[]): string {
	return listPages
		.slice(0, 3)
		.map((listPage, index) => {
			const $ = cheerio.load(listPage.html);
			const links = $("a[href]")
				.slice(0, 12)
				.map((_linkIndex, element) => {
					const node = $(element);
					return `${cleanInlineText(node.text()).slice(0, 40)}=>${node.attr("href") ?? ""}`;
				})
				.get();
			const onclicks = $("[onclick]")
				.slice(0, 12)
				.map((_elementIndex, element) => cleanInlineText($(element).attr("onclick") ?? "").slice(0, 120))
				.get();
			return `page${index + 1}=${listPage.url} title=${JSON.stringify(cleanInlineText($("title").text()).slice(0, 80))} links=${JSON.stringify(links)} onclicks=${JSON.stringify(onclicks)}`;
		})
		.join(" | ");
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

function recruitPopupDetailUrlFromRcdx(rcdx: string, baseUrl: string): string | undefined {
	if (!/^[A-Fa-f0-9]{24,}$/u.test(rcdx) || !isRecruitListPageUrl(baseUrl)) return undefined;
	const url = new URL(baseUrl);
	url.pathname = "/Recruit/RecruitView.aspx";
	url.search = "";
	url.searchParams.set("modalChk", "Y");
	url.searchParams.set("rcdx", rcdx);
	url.hash = "";
	return toCdpDetailUrl(url.toString(), baseUrl);
}

function noticeDetailUrlFromId(idx: string, baseUrl: string): string | undefined {
	if (!/^\d+$/u.test(idx) || !isNoticeListPageUrl(baseUrl)) return undefined;
	const url = new URL(baseUrl);
	url.pathname = "/Community/Notice/NoticeView.aspx";
	url.search = "";
	url.searchParams.set("idx", idx);
	url.hash = "";
	return toCdpDetailUrl(url.toString(), baseUrl);
}

function indexedDetailUrlFromId(idx: string, baseUrl: string): string | undefined {
	return noticeDetailUrlFromId(idx, baseUrl);
}

function boardForDetailUrl(value: string): CdpBoard | undefined {
	let pathname: string;
	try {
		pathname = new URL(value).pathname.toLowerCase();
	} catch (_error) {
		return undefined;
	}
	if (pathname === "/office/sitemgr/notice/funcscheview.aspx") return "채용상담 및 설명회";
	if (pathname === "/recruit/recruitview.aspx" || /^\/career\/job\/recruitview\d*\.aspx$/u.test(pathname)) return "일반채용공고";
	if (pathname.startsWith("/community/notice/") && pathname.endsWith(".aspx")) return "공지사항";
	return undefined;
}

function isRecruitListPageUrl(href: string): boolean {
	const url = sanitizeCdpUrl(href, href);
	if (url === undefined) return false;
	return /\/Career\/Job\/RecruitList\d*\.aspx$/u.test(new URL(url).pathname);
}

function isNoticeListPageUrl(href: string): boolean {
	const url = sanitizeCdpUrl(href, href);
	if (url === undefined) return false;
	return /\/Community\/Notice\/NoticeList\.aspx$/u.test(new URL(url).pathname);
}

function isEventSchedulePageUrl(href: string): boolean {
	const url = sanitizeCdpUrl(href, href);
	if (url === undefined) return false;
	return /\/Office\/SiteMgr\/Notice\/FuncSche(?:List|View)\.aspx$/u.test(new URL(url).pathname) ||
		/\/Community\/Notice\/(?:NoticeList|RecruitEvent)\.aspx$/u.test(new URL(url).pathname);
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
			maxDetailPages = parseBoundedInteger(value, "--max-detail-pages", 0, maxAllowedDetailPages);
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
