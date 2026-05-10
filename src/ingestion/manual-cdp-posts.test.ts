import { describe, expect, it } from "vitest";
import { chunkNormalizedRecord } from "./chunking.js";
import { buildCdpManualPostRecords } from "./manual-cdp-posts.js";

describe("buildCdpManualPostRecords", () => {
	it("preserves manually provided CDP detail URLs as citation anchors", () => {
		const [record] = buildCdpManualPostRecords({
			exported_at: "2026-05-08T00:00:00.000Z",
			posts: [
				{
					board: "일반채용공고",
					title: "ERICA 테스트 채용 공고",
					detail_url:
						"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
					posted_at: "2026-05-07T00:00:00.000Z",
					deadline_status: "active",
					deadline_raw_text: "~2026-05-31",
					body_text: "로그인 후 사용자가 수동으로 확인한 채용 공고 본문입니다.",
				},
			],
		});

		expect(record.source_url).toBe(
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
		);
		expect(record.canonical_url).toBe(record.source_url);
		expect(record.citation_anchors[0]?.url).toBe(record.source_url);
		expect(record.category).toBe("CDP 채용정보 > 일반채용공고");

		const [chunk] = chunkNormalizedRecord(record);
		expect(chunk?.source_url).toBe(record.source_url);
		expect(chunk?.canonical_url).toBe(record.source_url);
		expect(chunk?.citation_anchors[0]?.url).toBe(record.source_url);
	});

	it("accepts only the two bounded CDP recruitment boards", () => {
		expect(() =>
			buildCdpManualPostRecords({
				exported_at: "2026-05-08T00:00:00.000Z",
				posts: [
					{
						board: "취업성공후기" as "일반채용공고",
						title: "범위 밖 게시글",
						detail_url:
							"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
						body_text: "범위 밖 게시글입니다.",
					},
				],
			}),
		).toThrow();
	});

	it("promotes labeled event titles when CDP exports only the generic event type", () => {
		const [record] = buildCdpManualPostRecords({
			exported_at: "2026-05-08T00:00:00.000Z",
			posts: [
				{
					board: "채용상담 및 설명회",
					title: "채용설명회",
					detail_url:
						"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4430",
					posted_at: "2026-04-29T00:00:00.000Z",
					deadline_status: "expired",
					deadline_raw_text: "~ 2026-05-08",
					body_text:
						"행사구분\n채용설명회\n제목\n[에프엔에스] 26년도 하반기 인턴 채용 온라인 기업설명회\n기간\n2026-04-29 ~ 2026-05-08\n내용\n본문입니다.",
				},
			],
		});

		expect(record.title).toBe(
			"[에프엔에스] 26년도 하반기 인턴 채용 온라인 기업설명회",
		);
		expect(record.cleaned_text).toContain(
			"제목: [에프엔에스] 26년도 하반기 인턴 채용 온라인 기업설명회",
		);
		expect(record.citation_anchors[0]?.label).toBe(
			"원문: [에프엔에스] 26년도 하반기 인턴 채용 온라인 기업설명회",
		);
	});

	it("rejects non-CDP or credential-bearing detail URLs", () => {
		for (const detailUrl of [
			"https://example.com/Career/Job/RecruitView.aspx?idx=12345",
			"http://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
			"https://user:pass@cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
		]) {
			expect(() =>
				buildCdpManualPostRecords({
					exported_at: "2026-05-08T00:00:00.000Z",
					posts: [
						{
							board: "채용상담 및 설명회",
							title: "잘못된 URL",
							detail_url: detailUrl,
							body_text: "잘못된 URL 테스트입니다.",
						},
					],
				}),
			).toThrow();
		}
	});
});
