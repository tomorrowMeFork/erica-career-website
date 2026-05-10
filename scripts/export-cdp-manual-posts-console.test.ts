import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as {
	JSDOM: new (
		html?: string,
		options?: { url?: string; runScripts?: "outside-only" },
	) => { window: Window & typeof globalThis };
};

type ExportedPost = {
	board: string;
	detail_url: string;
	title: string;
};

describe("CDP manual browser exporter pagination", () => {
	it("keeps a 1200ms default pacing delay before CDP fetches", async () => {
		const source = await readFile(
			new URL("./export-cdp-manual-posts-console.js", import.meta.url),
			"utf8",
		);

		expect(source).toContain("const defaultFetchDelayMs = 1200;");
		expect(source).toContain("await delayBeforeFetch();");
	});

	it("follows hcSubmit pagination for 채용상담 및 설명회 pages", async () => {
		const result = await runExporterFixture({
			board: "채용상담 및 설명회",
			startUrl: "https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx",
			initialHtml: listPageHtml({
				detailHref: "/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=1111",
				nextOnclick:
					"hcSubmit('/Community/Notice/RecruitEvent.aspx?rp=2', 'Widget1_List','form1')",
			}),
			fetchedHtmlByUrl: new Map([
				[
					"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx?rp=2",
					listPageHtml({
						detailHref:
							"/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=2222",
					}),
				],
				[
					"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=1111",
					detailPageHtml("채용설명회", "첫 번째 설명회 본문입니다."),
				],
				[
					"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=2222",
					detailPageHtml("채용상담회", "두 번째 상담회 본문입니다."),
				],
			]),
		});

		expect(result.fetchedUrls).toContain(
			"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx?rp=2",
		);
		expect(result.output.posts.map((post) => post.detail_url).sort()).toEqual([
			"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=1111",
			"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=2222",
		]);
	});

	it("follows hcSubmit pagination for 일반채용공고 pages", async () => {
		const result = await runExporterFixture({
			board: "일반채용공고",
			startUrl: "https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
			initialHtml: listPageHtml({
				detailHref: "/Career/Job/RecruitView.aspx?idx=1111",
				nextOnclick:
					"hcSubmit('/Career/Job/RecruitList.aspx?rp=2', 'Widget1_List','form1')",
			}),
			fetchedHtmlByUrl: new Map([
				[
					"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=2",
					listPageHtml({ detailHref: "/Career/Job/RecruitView.aspx?idx=2222" }),
				],
				[
					"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=1111",
					detailPageHtml("일반채용공고 A", "첫 번째 채용공고 본문입니다."),
				],
				[
					"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=2222",
					detailPageHtml("일반채용공고 B", "두 번째 채용공고 본문입니다."),
				],
			]),
		});

		expect(result.fetchedUrls).toContain(
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=2",
		);
		expect(result.output.posts.map((post) => post.detail_url).sort()).toEqual([
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=1111",
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=2222",
		]);
	});

	it("follows javascript href hcSubmit pagination", async () => {
		const result = await runExporterFixture({
			board: "채용상담 및 설명회",
			startUrl: "https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx",
			initialHtml: listPageHtml({
				detailHref: "/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=1111",
				nextHref:
					"javascript:hcSubmit('/Community/Notice/RecruitEvent.aspx?rp=2', 'Widget1_List','form1')",
			}),
			fetchedHtmlByUrl: new Map([
				[
					"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx?rp=2",
					listPageHtml({
						detailHref:
							"/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=2222",
					}),
				],
				[
					"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=1111",
					detailPageHtml("채용설명회", "첫 번째 설명회 본문입니다."),
				],
				[
					"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=2222",
					detailPageHtml("채용상담회", "두 번째 상담회 본문입니다."),
				],
			]),
		});

		expect(result.fetchedUrls).toContain(
			"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx?rp=2",
		);
	});
});

async function runExporterFixture(input: {
	board: string;
	startUrl: string;
	initialHtml: string;
	fetchedHtmlByUrl: Map<string, string>;
}): Promise<{ fetchedUrls: string[]; output: { posts: ExportedPost[] } }> {
	const source = await readFile(
		new URL("./export-cdp-manual-posts-console.js", import.meta.url),
		"utf8",
	);
	const dom = new JSDOM(input.initialHtml, {
		url: input.startUrl,
		runScripts: "outside-only",
	});
	const { window } = dom;
	const fetchedUrls: string[] = [];

	Object.defineProperty(window.HTMLElement.prototype, "innerText", {
		configurable: true,
		get() {
			return this.textContent ?? "";
		},
	});
	Object.defineProperty(window.URL, "createObjectURL", {
		configurable: true,
		value: () => "blob:cdp-export",
	});
	Object.defineProperty(window.URL, "revokeObjectURL", {
		configurable: true,
		value: () => undefined,
	});
	window.HTMLAnchorElement.prototype.click = vi.fn();
	window.prompt = vi.fn(() => input.board);
	window.confirm = vi.fn(() => true);
	(
		window as unknown as Window & { __CDP_EXPORT_FETCH_DELAY_MS__: number }
	).__CDP_EXPORT_FETCH_DELAY_MS__ = 0;

	const done = new Promise<{ posts: ExportedPost[] }>((resolve, reject) => {
		window.alert = vi.fn((message) => reject(new Error(String(message))));
		window.console.log = vi.fn((...args: unknown[]) => {
			if (args[0] === "[CDP export] Done. JSON downloaded:") {
				resolve(args[1] as { posts: ExportedPost[] });
			}
		});
	});

	window.fetch = vi.fn(async (resource: string | URL | Request) => {
		const url = String(resource);
		fetchedUrls.push(url);
		const html = input.fetchedHtmlByUrl.get(url);
		if (!html) {
			return new Response("missing fixture", { status: 404 });
		}
		return new Response(html, { status: 200 });
	}) as typeof window.fetch;

	window.eval(source);
	const output = await Promise.race([
		done,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("exporter fixture timed out")), 2_000),
		),
	]);
	dom.window.close();

	return { fetchedUrls, output };
}

function listPageHtml(input: {
	detailHref: string;
	nextHref?: string;
	nextOnclick?: string;
}): string {
	const nextLink = input.nextOnclick
		? `<a onclick="${input.nextOnclick}" class="page-link">2</a>`
		: input.nextHref
			? `<a href="${input.nextHref}" class="page-link">2</a>`
			: "";
	return `
		<html>
			<body>
				<a href="${input.detailHref}">자세히 보기</a>
				<ul class="pagination justify-content-center">${nextLink}</ul>
			</body>
		</html>
	`;
}

function detailPageHtml(title: string, content: string): string {
	return `
		<html>
			<body>
				<h1>${title}</h1>
				<main>
					게시글 제목 ${title}
					등록일 2026-05-10
					${content}
					공식 상세 내용과 첨부파일 안내를 포함한 테스트 본문입니다.
				</main>
			</body>
		</html>
	`;
}
