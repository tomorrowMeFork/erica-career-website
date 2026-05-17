import { describe, expect, it } from "vitest";
import type { NormalizedRecord } from "../src/ingestion/normalized-record.js";

import {
	classifyInternshipReviewRecordability,
	extractClickablePagingTargets,
	extractListPageUrls,
	formatInternshipReviewCollectionSummary,
	groupEwilRecordsByOutputCategory,
	internphotoReviewUrlFromScript,
	parseArgs,
} from "./ingest-ewil-authenticated-sources.js";

const noticeSource = {
	source_id: "ewil-notice-board",
	source_name: "E-WIL 공지사항",
	canonical_url: "https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE",
	category: "ERICA 현장실습 지원 시스템 > 공지사항/인턴공고",
	title: "E-WIL 공지사항/인턴공고",
	purpose: "공지사항과 인턴/현장실습 공고 목록",
};

const infoSource = {
	source_id: "ewil-info-board",
	source_name: "E-WIL 설명회",
	canonical_url: "https://e-wil.hanyang.ac.kr/data/list.do?type=INFO",
	category: "ERICA 현장실습 지원 시스템 > 설명회",
	title: "E-WIL 설명회",
	purpose: "현장실습 관련 설명회 및 안내 자료",
};

const reviewSource = {
	source_id: "ewil-internship-reviews",
	source_name: "E-WIL 실습 후기",
	canonical_url: "https://e-wil.hanyang.ac.kr/internphoto/compList.do",
	category: "ERICA 현장실습 지원 시스템 > 실습 후기",
	title: "E-WIL 실습 후기",
	purpose: "현장실습 참여 기업/실습 후기 목록",
};

describe("E-WIL authenticated source helper behavior", () => {
	it("extracts NOTICE pagination from anchors and pagination scripts only within the NOTICE list", () => {
		const html = `
			<nav>
				<a href="/data/list.do?type=NOTICE&pageIndex=2">2</a>
				<a href="javascript:goPage(3)">3</a>
				<button onclick="fn_page('4')">4</button>
				<input type="button" onclick="movePage(5)" value="5" />
			</nav>
		`;

		expect(
			extractListPageUrls(
				html,
				"https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE",
				noticeSource,
			),
		).toEqual([
			"https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE&pageIndex=2",
			"https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE&pageIndex=3",
			"https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE&pageIndex=4",
			"https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE&pageIndex=5",
		]);
	});

	it("extracts INFO pagination from javascript URLs and simple GET forms only within the INFO list", () => {
		const html = `
			<nav>
				<a href="javascript:location.href='/data/list.do?type=INFO&pageIndex=2'">2</a>
				<button onclick="goPage(3)">3</button>
			</nav>
			<form method="get" action="/data/list.do">
				<input type="hidden" name="type" value="INFO" />
				<input type="hidden" name="pageIndex" value="4" />
				<button type="submit">4</button>
			</form>
		`;

		expect(
			extractListPageUrls(
				html,
				"https://e-wil.hanyang.ac.kr/data/list.do?type=INFO",
				infoSource,
			),
		).toEqual([
			"https://e-wil.hanyang.ac.kr/data/list.do?type=INFO&pageIndex=2",
			"https://e-wil.hanyang.ac.kr/data/list.do?type=INFO&pageIndex=3",
			"https://e-wil.hanyang.ac.kr/data/list.do?type=INFO&pageIndex=4",
		]);
	});

	it("extracts internship review company-list pagination only within compList.do", () => {
		const html = `
			<nav>
				<a href="/internphoto/compList.do?pageIndex=2">2</a>
				<button onclick="goPage(3)">3</button>
			</nav>
			<form method="get" action="/internphoto/compList.do">
				<input type="hidden" name="pageIndex" value="4" />
				<input type="submit" value="4" />
			</form>
		`;

		expect(
			extractListPageUrls(
				html,
				"https://e-wil.hanyang.ac.kr/internphoto/compList.do",
				reviewSource,
			),
		).toEqual([
			"https://e-wil.hanyang.ac.kr/internphoto/compList.do?pageIndex=2",
			"https://e-wil.hanyang.ac.kr/internphoto/compList.do?pageIndex=3",
			"https://e-wil.hanyang.ac.kr/internphoto/compList.do?pageIndex=4",
		]);
	});

	it("rejects unsafe or off-source list pagination candidates", () => {
		const html = `
			<nav>
				<a href="https://example.com/data/list.do?type=NOTICE&pageIndex=2">external</a>
				<a href="/data/list.do?type=INFO&pageIndex=3">wrong type</a>
				<a href="/internphoto/compList.do?pageIndex=4">wrong path</a>
				<a href="/data/list.do?type=NOTICE&token=abc&pageIndex=5">token</a>
				<button onclick="location.href='https://evil.test/data/list.do?type=NOTICE&pageIndex=6'">external js</button>
			</nav>
			<form method="post" action="/data/list.do?type=NOTICE&pageIndex=7">
				<button type="submit">post</button>
			</form>
		`;

		expect(
			extractListPageUrls(
				html,
				"https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE",
				noticeSource,
			),
		).toEqual([]);
	});

	it("extracts fixed-URL Paging targets without re-clicking page one or inventing pageIndex URLs", () => {
		const html = `<div class="paging"><a href="javaScript:Paging(0)">1</a><a href="javaScript:Paging(1)">2</a><a href="javascript:;" class="on">3</a><a href="javaScript:Paging(3)">4</a><a href="javaScript:Paging(4)">5</a></div>`;

		expect(extractClickablePagingTargets(html)).toEqual(["1", "3", "4"]);
		expect(
			extractListPageUrls(
				html,
				"https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE",
				noticeSource,
			),
		).toEqual([]);
	});

	it("applies fixed-URL Paging extraction to INFO and review list markup", () => {
		const html = `<div class="paging"><a href="javaScript:Paging(0)">1</a><a href="javaScript:Paging(1)">2</a><a href="javaScript:Paging(2)">3</a></div>`;

		expect(extractClickablePagingTargets(html)).toEqual(["1", "2"]);
		expect(
			extractListPageUrls(
				html,
				"https://e-wil.hanyang.ac.kr/data/list.do?type=INFO",
				infoSource,
			),
		).toEqual([]);
		expect(
			extractListPageUrls(
				html,
				"https://e-wil.hanyang.ac.kr/internphoto/compList.do",
				reviewSource,
			),
		).toEqual([]);
	});

	it("builds internphoto detail URLs from review scripts and company ids", () => {
		expect(
			internphotoReviewUrlFromScript(
				"javascript:fnView(8037)",
				"https://e-wil.hanyang.ac.kr/internphoto/read.do?idx=24457",
				"24457",
			),
		).toBe(
			"https://e-wil.hanyang.ac.kr/internphoto/view.do?jid_seq=8037&jim_seq=24457",
		);
	});

	it("rejects internphoto scripts unless they originate from a company read page", () => {
		expect(
			internphotoReviewUrlFromScript(
				"javascript:fnView(8037)",
				"https://e-wil.hanyang.ac.kr/internphoto/compList.do",
				"24457",
			),
		).toBeUndefined();
	});

	it("classifies real review detail pages as recordable", () => {
		const html = `
			<body>
				<h1>현장실습 후기</h1>
				<section>
					<h2>실습내용</h2>
					<p>초기엔 자료를 공부하고 발표하며 업무를 배웠습니다.</p>
					<h2>기타 실습기관 소개</h2>
					<p>개인 자리가 마련되어 있어 편하게 업무를 진행했습니다.</p>
					<h2>출퇴근방법</h2>
					<p>학교 내부 기업이라 쉽게 출퇴근할 수 있었습니다.</p>
					<h2>기업문화</h2>
					<p>자유로운 분위기에서 현장실습생을 배려해주었습니다.</p>
				</section>
			</body>
		`;

		expect(classifyInternshipReviewRecordability(html)).toEqual({
			recordable: true,
			reason: "matched known review headings",
		});
	});

	it("rejects nested review list pages", () => {
		const html = `
			<body>
				번호
				기관명
				후기
				국가
				전체
				대한민국
				년도
				2027
				2026
				2025
				목록 화면에 남아 있는 긴 텍스트입니다. 목록 화면에 남아 있는 긴 텍스트입니다.
				목록 화면에 남아 있는 긴 텍스트입니다. 목록 화면에 남아 있는 긴 텍스트입니다.
			</body>
		`;

		expect(classifyInternshipReviewRecordability(html)).toEqual({
			recordable: false,
			reason: "opened page still looks like a nested list",
		});
	});

	it("limits --source reviews to the internship review source id", () => {
		expect(parseArgs(["--source", "reviews"]).sourceIds).toEqual([
			"ewil-internship-reviews",
		]);
	});

	it("keeps the default detail page cap explicit", () => {
		expect(parseArgs([]).maxDetailPages).toBe(30);
	});

	it("formats review collection cap summaries with a rerun hint", () => {
		expect(
			formatInternshipReviewCollectionSummary({
				status: "stopped after reaching --max-detail-pages",
				discoveredReviewCandidateCount: 98,
				collectedReviewPageCount: 30,
				skippedReviewCandidateCount: 7,
				maxDetailPages: 30,
			}),
		).toBe(
			"E-WIL reviews: stopped after reaching --max-detail-pages; discovered=98; collected=30; skipped=7; max-detail-pages=30; pass a higher --max-detail-pages value to collect more discovered reviews",
		);
	});

	it("groups authenticated E-WIL records into notice and review output directories", () => {
		const groups = groupEwilRecordsByOutputCategory([
			buildRecord("notice-1", "ewil-notice-board"),
			buildRecord("info-1", "ewil-info-board"),
			buildRecord("review-1", "ewil-internship-reviews"),
		]);

		expect(groups.map((group) => group.directoryName)).toEqual([
			"공지사항",
			"현장실습후기",
		]);
		expect(groups[0]?.records.map((record) => record.source_id)).toEqual([
			"ewil-notice-board",
			"ewil-info-board",
		]);
		expect(groups[1]?.records.map((record) => record.source_id)).toEqual([
			"ewil-internship-reviews",
		]);
	});
});

function buildRecord(recordId: string, sourceId: string): NormalizedRecord {
	return {
		record_id: recordId,
		source_id: sourceId,
		source_name: sourceId,
		source_url: "https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE",
		canonical_url: "https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE",
		title: recordId,
		category: "test",
		fetched_at: "2026-05-17T00:00:00.000Z",
		posted_at: null,
		deadline_status: "unknown",
		deadline_raw_text: "",
		raw_text: "본문",
		cleaned_text: "본문",
		content_hash: "a".repeat(64),
		citation_anchors: [
			{
				url: "https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE",
				label: "원문",
			},
		],
		source_text_trust: "untrusted_source_text",
	};
}
