import { describe, expect, it } from "vitest";

import {
	collectDetailUrlsFromHtml,
	collectListUrlsFromHtml,
	detailUrlFromScriptText,
	extractPostFromHtml,
	parseArgs,
} from "./ingest-cdp-authenticated-sources.js";

describe("CDP authenticated source helper behavior", () => {
	it("parses source filters for bounded CDP collection", () => {
		expect(parseArgs(["--source", "recruit"]).sourceKeys).toEqual(["recruit"]);
		expect(parseArgs(["--source", "events"]).sourceKeys).toEqual(["events"]);
		expect(parseArgs(["--source", "all"]).sourceKeys).toEqual([
			"recruit",
			"events",
		]);
	});

	it("extracts CDP list pagination from hcSubmit links", () => {
		const html = `<a href="javascript:hcSubmit('/Career/Job/RecruitList.aspx?rp=2', 'Widget1_List','form1')">2</a>`;

		expect(
			collectListUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
				"/Career/Job/RecruitList.aspx",
			),
		).toEqual(["https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=2"]);
	});

	it("extracts RecruitList pagination from direct links, forms, postbacks, and page functions", () => {
		const html = [
			`<form action="/Career/Job/RecruitList.aspx?rp=2"></form>`,
			`<a href="javascript:goPage(3)">3</a>`,
			`<button onclick="__doPostBack('ctl00$Content$Pager','Page$4')">4</button>`,
			`<input type="button" onclick="fn_Page('5')" value="5" />`,
			`<script>movePage(6);</script>`,
		].join("\n");

		expect(
			collectListUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
				"/Career/Job/RecruitList.aspx",
			),
		).toEqual([
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=2",
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=3",
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=4",
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=5",
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=6",
		]);
	});

	it("extracts RecruitEvent pagination only on the approved event board path", () => {
		const html = [
			`<a href="/Community/Notice/RecruitEvent.aspx?rp=2">2</a>`,
			`<button onclick="__doPostBack('ctl00$Content$Pager','Page$3')">3</button>`,
			`<a href="/Career/Job/RecruitList.aspx?rp=4">wrong board</a>`,
			`<a href="javascript:hcSubmit('/Career/Job/RecruitList.aspx?rp=5', 'Widget1_List','form1')">wrong script board</a>`,
		].join("\n");

		expect(
			collectListUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx",
				"/Community/Notice/RecruitEvent.aspx",
			),
		).toEqual([
			"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx?rp=2",
			"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx?rp=3",
		]);
	});

	it("rejects unsafe RecruitList pagination candidates", () => {
		const html = [
			`<a href="https://example.com/Career/Job/RecruitList.aspx?rp=2">외부</a>`,
			`<a href="javascript:hcSubmit('https://example.com/Career/Job/RecruitList.aspx?rp=3', 'Widget1_List','form1')">외부 스크립트</a>`,
			`<a href="/Career/Job/RecruitList.aspx?rp=4&token=secret">토큰</a>`,
			`<a href="/Career/Job/RecruitList2.aspx?rp=5">미승인 형제 게시판</a>`,
			`<a href="/Career/Job/AlbaList.aspx?rp=6">알바 게시판</a>`,
			`<a href="/Community/Notice/RecruitEvent.aspx?rp=7">다른 경로</a>`,
		].join("\n");

		expect(
			collectListUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
				"/Career/Job/RecruitList.aspx",
			),
		).toEqual([]);
	});

	it("extracts career detail URLs from direct links", () => {
		const html = `<a href="/Career/Job/RecruitView.aspx?idx=12345">공고 보기</a>`;

		expect(
			collectDetailUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
			),
		).toEqual(["https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345"]);
	});

	it("extracts event detail URLs from funcidx scripts", () => {
		expect(
			detailUrlFromScriptText(
				"javascript:viewDetail(4430)",
				"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx",
			),
		).toBe(
			"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4430",
		);
	});

	it("rejects non-CDP and unrecognized detail URLs", () => {
		const html = [
			`<a href="https://example.com/Career/Job/RecruitView.aspx?idx=12345">외부</a>`,
			`<a href="/Career/Job/RecruitList.aspx?rp=2">목록</a>`,
		].join("\n");

		expect(
			collectDetailUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
			),
		).toEqual([]);
	});

	it("rejects external absolute URLs hidden in script-like attributes", () => {
		const html = [
			`<button onclick="open('https://example.com/Career/Job/RecruitView.aspx?idx=12345')">외부</button>`,
			`<button data-url="https://example.com/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4430">외부</button>`,
			`<button data-href="https://example.com/Career/Job/RecruitView.aspx?idx=98765">외부</button>`,
		].join("\n");

		expect(
			collectDetailUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
			),
		).toEqual([]);
	});

	it("rejects external absolute URLs hidden in list pagination scripts", () => {
		const html = `<a href="javascript:hcSubmit('https://example.com/Career/Job/RecruitList.aspx?rp=2', 'Widget1_List','form1')">2</a>`;

		expect(
			collectListUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
				"/Career/Job/RecruitList.aspx",
			),
		).toEqual([]);
	});

	it("rejects credential-like query parameters while keeping approved ids", () => {
		const html = [
			`<a href="/Career/Job/RecruitView.aspx?idx=12345">정상</a>`,
			`<a href="/Career/Job/RecruitView.aspx?idx=12345&token=secret">토큰</a>`,
			`<a href="/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4430&session=abc">세션</a>`,
		].join("\n");

		expect(
			collectDetailUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
			),
		).toEqual(["https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345"]);
	});

	it("extracts normalized CDP posts with deadline metadata", () => {
		const post = extractPostFromHtml(
			`
				<html>
					<body>
						<h1>ERICA 추천 채용 공고</h1>
						<main>
							등록일 2026.05.01
							접수기간 2026.05.01 ~ 2026.05.30
							본문입니다. 지원 자격과 전형 절차를 안내합니다.
						</main>
					</body>
				</html>
			`,
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
			"일반채용공고",
			"2026-05-17T00:00:00.000Z",
		);

		expect(post).toMatchObject({
			board: "일반채용공고",
			title: "ERICA 추천 채용 공고",
			detail_url: "https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
			posted_at: "2026-05-01T00:00:00.000Z",
			deadline_status: "active",
		});
		expect(post?.deadline_raw_text).toContain("2026.05.30");
	});

	it("rejects list-like pages as posts", () => {
		const post = extractPostFromHtml(
			`
				<body>
					<h1>채용행사 목록</h1>
					<div>달력보기 목록보기 상세검색 검색 전체 관심 채용행사 자세히 보기 대상학년 행사구분</div>
					<ul><li>자세히 보기 기간 : 2026.05.01 ~ 2026.05.02</li><li>자세히 보기 기간 : 2026.05.03 ~ 2026.05.04</li><li>자세히 보기 기간 : 2026.05.05 ~ 2026.05.06</li></ul>
				</body>
			`,
			"https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx",
			"채용상담 및 설명회",
			"2026-05-17T00:00:00.000Z",
		);

		expect(post).toBeNull();
	});

	it("rejects login and error boundary pages as posts", () => {
		for (const html of [
			`<body><h1>로그인</h1><main>로그인 후 확인하실 수 있습니다. 세션이 만료되었습니다.</main></body>`,
			`<body><h1></h1><main>오류입니다 불편을 드려 죄송합니다 오류번호 500</main></body>`,
		]) {
			expect(
				extractPostFromHtml(
					html,
					"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
					"일반채용공고",
					"2026-05-17T00:00:00.000Z",
				),
			).toBeNull();
		}
	});
});
