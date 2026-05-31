import { describe, expect, it } from "vitest";
import type { NormalizedRecord } from "../src/ingestion/normalized-record.js";

import {
	collectDetailUrlsFromHtml,
	collectListUrlsFromHtml,
	detailUrlFromScriptText,
	extractDetailViewTargetsFromHtml,
	extractPostFromHtml,
	groupCdpRecordsByOutputCategory,
	isAllowedCdpRequestUrl,
	isAllowedManualLoginRequestUrl,
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

	it("allows up to 500 detail pages per authenticated CDP run", () => {
		expect(parseArgs(["--max-detail-pages", "500"]).maxDetailPages).toBe(500);
		expect(() => parseArgs(["--max-detail-pages", "501"])).toThrow("--max-detail-pages must be between 0 and 500");
	});

	it("allows same-host CDP HTTPS and HTTP redirects while rejecting off-host requests", () => {
		expect(isAllowedCdpRequestUrl("https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx")).toBe(true);
		expect(isAllowedCdpRequestUrl("http://cdp.hanyang.ac.kr/Main/SSO/?apiType=7")).toBe(true);
		expect(isAllowedCdpRequestUrl("https://example.com/Main/SSO/?apiType=7")).toBe(false);
	});

	it("allows only Hanyang OAuth authorize redirects back to CDP", () => {
		expect(
			isAllowedCdpRequestUrl(
				"https://api.hanyang.ac.kr/oauth/authorize?client_id=573dae876232bccae832e7591b126aff&response_type=code&scope=10&redirect_uri=https%3A%2F%2Fcdp.hanyang.ac.kr%2FMain%2FSSO%2FDefault.aspx",
			),
		).toBe(true);
		expect(isAllowedCdpRequestUrl("https://api.hanyang.ac.kr/oauth/token")).toBe(false);
		expect(
			isAllowedCdpRequestUrl(
				"https://api.hanyang.ac.kr/oauth/authorize?redirect_uri=https%3A%2F%2Fexample.com%2Fcallback",
			),
		).toBe(false);
	});

	it("allows Hanyang login assets only during manual login", () => {
		expect(isAllowedManualLoginRequestUrl("https://api.hanyang.ac.kr/oauth/authorize?redirect_uri=https%3A%2F%2Fcdp.hanyang.ac.kr%2FMain%2FSSO%2FDefault.aspx")).toBe(true);
		expect(isAllowedManualLoginRequestUrl("https://api.hanyang.ac.kr/static/login.js")).toBe(true);
		expect(isAllowedManualLoginRequestUrl("https://portal.hanyang.ac.kr/css/login.css")).toBe(true);
		expect(isAllowedManualLoginRequestUrl("https://example.com/css/login.css")).toBe(false);
		expect(isAllowedCdpRequestUrl("https://portal.hanyang.ac.kr/css/login.css")).toBe(false);
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

	it("extracts NoticeList pagination and detail URLs for the current CDP notice board", () => {
		const html = [
			`<a href="/Community/Notice/NoticeList.aspx?rp=2">2</a>`,
			`<a href="/Community/Notice/NoticeView.aspx?idx=5555">공지 보기</a>`,
		].join("\n");

		expect(
			collectListUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Community/Notice/NoticeList.aspx",
				"/Community/Notice/NoticeList.aspx",
			),
		).toEqual(["https://cdp.hanyang.ac.kr/Community/Notice/NoticeList.aspx?rp=2"]);
		expect(collectDetailUrlsFromHtml(html, "https://cdp.hanyang.ac.kr/Community/Notice/NoticeList.aspx")).toEqual([
			"https://cdp.hanyang.ac.kr/Community/Notice/NoticeView.aspx?idx=5555",
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
		const html = [
			`<a href="/Career/Job/RecruitView.aspx?idx=12345">공고 보기</a>`,
			`<a href="/Recruit/RecruitView.aspx?modalChk=Y&rcdx=AD86DBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB">팝업 보기</a>`,
		].join("\n");

		expect(
			collectDetailUrlsFromHtml(
				html,
				"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx",
			),
		).toEqual([
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
			"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=AD86DBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB",
		]);
	});

	it("does not synthesize obsolete recruit detail URLs from numeric ids", () => {
		const html = [
			`<button class="btn-view" data-idx="12345">상세보기</button>`,
			`<script>function goView(idx){} goView(67890);</script>`,
			`<button onclick="__doPostBack('ctl00$Content$Grid','Select$24680')">보기</button>`,
		].join("\n");

		expect(collectDetailUrlsFromHtml(html, "https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx")).toEqual([]);
	});

	it("extracts current recruit popup detail URLs from rcdx tokens", () => {
		const html = [
			`<button onclick="open('/Recruit/RecruitView.aspx?modalChk=Y&rcdx=AD86DBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB')">팝업</button>`,
			`<script>const rcdx='BEEFDBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB';</script>`,
		].join("\n");

		expect(collectDetailUrlsFromHtml(html, "https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx")).toEqual([
			"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=AD86DBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB",
			"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=BEEFDBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB",
		]);
	});

	it("rejects malformed detail identifiers before fetching detail pages", () => {
		const html = [
			`<a href="/Recruit/RecruitView.aspx?modalChk=Y&rcdx=">빈 rcdx</a>`,
			`<button onclick="open('/Recruit/RecruitView.aspx?modalChk=Y&rcdx=')">빈 rcdx 스크립트</button>`,
			`<a href="/Recruit/RecruitView.aspx?modalChk=Y&rcdx=NOT_A_HEX_TOKEN">비정상 rcdx</a>`,
			`<a href="/Recruit/RecruitView.aspx?modalChk=Y&rcdx=BEEF">짧은 rcdx</a>`,
			`<a href="/Career/Job/RecruitView.aspx?idx=">빈 idx</a>`,
			`<a href="/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=">빈 funcidx</a>`,
			`<a href="/Community/Notice/NoticeView.aspx?idx=">빈 notice idx</a>`,
		].join("\n");

		expect(collectDetailUrlsFromHtml(html, "https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx")).toEqual([]);
	});

	it("extracts clickable CDP detailView targets and rcdx popup fallback URLs", () => {
		const rcdx = "AD86DBF4C11CD57F4FE7096348DB674842683ADF3BBF4784B21AC80C53F0ABD8193661978C6A6268";
		const popupUrl = `https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=${rcdx}`;
		const html = [
			`<a style="cursor:pointer;color:#fff" onclick="detailView('4424')">자세히 보기</a>`,
			`<a style="cursor:pointer;color:#fff" onclick="detailView('${rcdx}','64916')">자세히 보기</a>`,
			`<script>detailView('4425')</script>`,
			`<a href="javascript:detailView(4426)">보기</a>`,
		].join("\n");

		expect(extractDetailViewTargetsFromHtml(html)).toEqual(["4424", rcdx, "4425", "4426"]);
		expect(collectDetailUrlsFromHtml(html, "https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx")).toEqual([popupUrl]);
	});

	it("extracts notice detail URLs from numeric view functions and data ids", () => {
		const html = [`<button data-id="5555">공지 보기</button>`, `<script>fn_View('7777');</script>`].join("\n");

		expect(collectDetailUrlsFromHtml(html, "https://cdp.hanyang.ac.kr/Community/Notice/NoticeList.aspx")).toEqual([
			"https://cdp.hanyang.ac.kr/Community/Notice/NoticeView.aspx?idx=5555",
			"https://cdp.hanyang.ac.kr/Community/Notice/NoticeView.aspx?idx=7777",
		]);
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

	it("normalizes FuncScheView details as 채용상담 및 설명회 posts", () => {
		const post = extractPostFromHtml(
			`<body><h1>채용설명회</h1><main>행사구분\n채용설명회\n제목\nCDP 설명회\n기간\n2026.05.01 ~ 2026.05.30\n본문입니다.</main></body>`,
			"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4439",
			"채용상담 및 설명회",
			"2026-05-17T00:00:00.000Z",
		);

		expect(post).toMatchObject({
			board: "채용상담 및 설명회",
			detail_url: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4439",
		});
	});

	it("rejects non-CDP and unrecognized detail URLs", () => {
		const html = [
			`<a href="https://example.com/Career/Job/RecruitView.aspx?idx=12345">외부</a>`,
			`<a href="/Career/Job/RecruitList.aspx?rp=2">목록</a>`,
			`<a href="/Career/Job/MyMapView.aspx?jojik=Y">조직도</a>`,
			`<script>window.open('/Career/Job/MyMapView.aspx?jojik=Y')</script>`,
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

	it("does not use deadline dates as posted dates when no posted-date label exists", () => {
		const post = extractPostFromHtml(
			`
				<html>
					<body>
						<h1>[엘에스머트리얼즈] 정보보안 신입/경력직 채용</h1>
						<main>
							마감일 : 2026-05-25
							본문입니다. 지원 자격과 전형 절차를 안내합니다.
						</main>
					</body>
				</html>
			`,
			"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=AD86DBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB",
			"일반채용공고",
			"2026-05-23T07:23:40.978Z",
		);

		expect(post).toMatchObject({
			posted_at: null,
			deadline_status: "active",
			deadline_raw_text: "마감일 : 2026-05-25",
		});
	});

	it("uses event period end dates before open-ended hiring text for CDP events", () => {
		const post = extractPostFromHtml(
			`<body><h1>채용설명회</h1><main>행사구분
채용설명회
제목
[주식회사 파네시아] AI 인프라 링크 솔루션 스타트업 신입 채용 · 온라인 채용설명회 (상시채용)
기간
2025-09-05 ~ 2025-09-26 12시 00분 ~ 12시 45분
내용
모집기한: 상시채용</main></body>`,
			"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4266",
			"채용상담 및 설명회",
			"2026-05-23T07:23:40.978Z",
		);

		expect(post).toMatchObject({
			board: "채용상담 및 설명회",
			deadline_status: "expired",
			deadline_raw_text: "~ 2025-09-26",
		});
	});

	it("groups authenticated CDP records by source output directory", () => {
		const groups = groupCdpRecordsByOutputCategory([
			cdpRecord("general", "cdp-recruit-general-board"),
			cdpRecord("event", "cdp-recruit-event-board"),
		]);

		expect(groups).toEqual([
			expect.objectContaining({
				key: "recruit-general",
				directoryName: "일반채용공고",
				records: [expect.objectContaining({ source_id: "cdp-recruit-general-board" })],
			}),
			expect.objectContaining({
				key: "recruit-events",
				directoryName: "채용상담및설명회",
				records: [expect.objectContaining({ source_id: "cdp-recruit-event-board" })],
			}),
		]);
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

	it("keeps normal detail pages that mention login as instructional text", () => {
		const post = extractPostFromHtml(
			`<body><h1>채용설명회</h1><main>행사구분
채용설명회
제목
온라인 설명회 안내
기간
2026.02.01 ~ 2026.02.05
내용
참가자는 행사 당일 링크에 로그인 후 접속하면 됩니다.</main></body>`,
			"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4359",
			"채용상담 및 설명회",
			"2026-05-17T00:00:00.000Z",
		);

		expect(post).toMatchObject({
			detail_url: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4359",
			body_text: expect.stringContaining("로그인 후 접속"),
		});
	});
});

function cdpRecord(recordId: string, sourceId: "cdp-recruit-general-board" | "cdp-recruit-event-board"): NormalizedRecord {
	const isGeneral = sourceId === "cdp-recruit-general-board";
	return {
		record_id: recordId,
		source_id: sourceId,
		source_name: isGeneral ? "CDP 일반채용공고" : "CDP 채용상담 및 설명회",
		source_url: isGeneral
			? "https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?rcdx=AD86DBF4C11CD57FB2B7F210888D659A"
			: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=1234",
		canonical_url: isGeneral
			? "https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?rcdx=AD86DBF4C11CD57FB2B7F210888D659A"
			: "https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=1234",
		title: recordId,
		category: isGeneral ? "CDP 채용정보 > 일반채용공고" : "CDP 채용정보 > 채용상담 및 설명회",
		collection_category: isGeneral ? "job_posting" : "career_program",
		source_family: "cdp",
		category_label_ko: isGeneral ? "채용공고" : "취업 프로그램",
		fetched_at: "2026-05-17T00:00:00.000Z",
		posted_at: null,
		deadline_status: "unknown",
		deadline_raw_text: "",
		raw_text: recordId,
		cleaned_text: recordId,
		content_hash: recordId,
		citation_anchors: [{ url: "https://cdp.hanyang.ac.kr/", label: `원문: ${recordId}` }],
		source_text_trust: "untrusted_source_text",
	};
}
