import { mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { chunkNormalizedRecord } from "./chunking.js";
import { buildCdpManualPostRecords } from "./manual-cdp-posts.js";
import {
	mergeKnowledgeBaseJsonl,
	readKnowledgeBaseJsonl,
	writeKnowledgeBaseJsonl,
} from "./write-jsonl-kb.js";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

function createTempDir(): string {
	const dir = mkdtempSync(join(tmpdir(), "manual-cdp-posts-"));
	tempDirs.push(dir);
	return dir;
}

async function mergeAndWriteManualCdpRun(
	outputDir: string,
	exportedAt: string,
	records: ReturnType<typeof buildCdpManualPostRecords>,
) {
	const chunks = records.flatMap((record) => chunkNormalizedRecord(record));
	const existingKnowledgeBase = await readKnowledgeBaseJsonl(outputDir);
	const mergedKnowledgeBase = mergeKnowledgeBaseJsonl(existingKnowledgeBase, {
		records,
		chunks,
	});

	return writeKnowledgeBaseJsonl({
		records: mergedKnowledgeBase.records,
		chunks: mergedKnowledgeBase.chunks,
		outputDir,
		manifest: {
			run_id: `manual-cdp-posts-${exportedAt}`,
			generated_at: exportedAt,
			source_ids: [
				...new Set(mergedKnowledgeBase.records.map((record) => record.source_id)),
			],
		},
	});
}

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
		expect(record.source_id).toBe("cdp-recruit-general-board");
		expect(record.source_name).toBe("CDP 일반채용공고");
		expect(record.canonical_url).toBe(record.source_url);
		expect(record.citation_anchors[0]?.url).toBe(record.source_url);
		expect(record.category).toBe("CDP 채용정보 > 일반채용공고");
		expect(record.collection_category).toBe("job_posting");
		expect(record.source_family).toBe("cdp");
		expect(record.category_label_ko).toBe("채용공고");

		const [chunk] = chunkNormalizedRecord(record);
		expect(chunk?.source_url).toBe(record.source_url);
		expect(chunk?.canonical_url).toBe(record.source_url);
		expect(chunk?.citation_anchors[0]?.url).toBe(record.source_url);
	});

	it("accepts current CDP recruit popup detail URLs", () => {
		const popupUrl =
			"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=AD86DBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB";
		const [record] = buildCdpManualPostRecords({
			exported_at: "2026-05-08T00:00:00.000Z",
			posts: [
				{
					board: "일반채용공고",
					title: "ERICA 팝업 채용 공고",
					detail_url: popupUrl,
					posted_at: "2026-05-07T00:00:00.000Z",
					deadline_status: "active",
					deadline_raw_text: "~2026-05-31",
					body_text: "팝업으로 열린 채용 공고 본문입니다.",
				},
			],
		});

		expect(record.source_url).toBe(popupUrl);
		expect(record.source_id).toBe("cdp-recruit-general-board");
		expect(record.collection_category).toBe("job_posting");
	});

	it("drops impossible future posted dates from manual CDP exports", () => {
		const [record] = buildCdpManualPostRecords({
			exported_at: "2026-05-23T07:23:40.978Z",
			posts: [
				{
					board: "일반채용공고",
					title: "[엘에스머트리얼즈] 정보보안 신입/경력직 채용",
					detail_url:
						"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=AD86DBF4C11CD57F4FE7096348DB674842683ADF3BBF47840AA7B092090AA3A9913B9C1B0769E8EB",
					posted_at: "2026-05-25T00:00:00.000Z",
					deadline_status: "active",
					deadline_raw_text: "마감일 : 2026-05-25",
					body_text: "본문입니다. 지원 자격과 전형 절차를 안내합니다.",
				},
			],
		});

		expect(record.posted_at).toBeNull();
		expect(record.raw_text).not.toContain("등록일:");
		expect(record.deadline_raw_text).toBe("마감일 : 2026-05-25");
	});

	it("accepts only the bounded CDP recruitment and notice boards", () => {
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

	it("maps CDP NoticeList details as notice evidence", () => {
		const [record] = buildCdpManualPostRecords({
			exported_at: "2026-05-08T00:00:00.000Z",
			posts: [
				{
					board: "공지사항",
					title: "CDP 공지사항",
					detail_url: "https://cdp.hanyang.ac.kr/Community/Notice/NoticeView.aspx?idx=5555",
					posted_at: "2026-05-07T00:00:00.000Z",
					deadline_status: "unknown",
					deadline_raw_text: "",
					body_text: "커리어개발센터 공지사항 본문입니다.",
				},
			],
		});

		expect(record.source_id).toBe("cdp-recruit-event-board");
		expect(record.source_name).toBe("CDP 공지사항");
		expect(record.category).toBe("CDP 채용정보 > 공지사항");
		expect(record.collection_category).toBe("notice");
		expect(record.category_label_ko).toBe("공지사항");
	});

	it("rejects event detail URLs mislabeled as general recruitment posts", () => {
		expect(() =>
			buildCdpManualPostRecords({
				exported_at: "2026-05-08T00:00:00.000Z",
				posts: [
					{
						board: "일반채용공고",
						title: "채용설명회",
						detail_url:
							"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4430",
						body_text: "행사구분\n채용설명회\n제목\n잘못 분류된 설명회",
					},
				],
			}),
		).toThrow("detail_url path requires board 채용상담 및 설명회");
	});

	it("rejects Career/Job detail URLs mislabeled as event posts", () => {
		expect(() =>
			buildCdpManualPostRecords({
				exported_at: "2026-05-08T00:00:00.000Z",
				posts: [
					{
						board: "채용상담 및 설명회",
						title: "ERICA 테스트 채용 공고",
						detail_url:
							"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345",
						body_text: "채용 공고 본문입니다.",
					},
				],
			}),
		).toThrow("detail_url path requires board 일반채용공고");
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
		expect(record.source_id).toBe("cdp-recruit-event-board");
		expect(record.source_name).toBe("CDP 채용상담 및 설명회");
		expect(record.collection_category).toBe("career_program");
		expect(record.source_family).toBe("cdp");
		expect(record.category_label_ko).toBe("취업 프로그램");
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
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx?rp=2",
			"https://cdp.hanyang.ac.kr/Career/Job/MyMapView.aspx?jojik=Y",
			"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=",
			"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=NOT_A_HEX_TOKEN",
			"https://cdp.hanyang.ac.kr/Recruit/RecruitView.aspx?modalChk=Y&rcdx=BEEF",
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=",
			"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=",
			"https://cdp.hanyang.ac.kr/Community/Notice/NoticeView.aspx?idx=",
			"https://cdp.hanyang.ac.kr/Career/Job/RecruitView.aspx?idx=12345&token=secret",
			"https://cdp.hanyang.ac.kr/Office/SiteMgr/Notice/FuncScheView.aspx?funcidx=4430&session=abc",
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

	it("preserves both manual CDP boards across repeated output writes", async () => {
		const outputDir = createTempDir();
		const eventExportedAt = "2026-05-08T00:00:00.000Z";
		const generalExportedAt = "2026-05-09T00:00:00.000Z";
		const eventRecords = buildCdpManualPostRecords({
			exported_at: eventExportedAt,
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
						"행사구분\n채용설명회\n제목\n[에프엔에스] 온라인 기업설명회\n기간\n2026-04-29 ~ 2026-05-08\n내용\n본문입니다.",
				},
			],
		});
		const generalRecords = buildCdpManualPostRecords({
			exported_at: generalExportedAt,
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

		await mergeAndWriteManualCdpRun(outputDir, eventExportedAt, eventRecords);
		const secondManifest = await mergeAndWriteManualCdpRun(
			outputDir,
			generalExportedAt,
			generalRecords,
		);
		const thirdManifest = await mergeAndWriteManualCdpRun(
			outputDir,
			generalExportedAt,
			generalRecords,
		);
		const persistedRecords = readFileSync(join(outputDir, "records.jsonl"), "utf8")
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line) as { category: string });

		expect(secondManifest).toMatchObject({
			source_ids: ["cdp-recruit-event-board", "cdp-recruit-general-board"],
			record_count: 2,
			chunk_count: 2,
		});
		expect(thirdManifest).toMatchObject({ record_count: 2, chunk_count: 2 });
		expect(persistedRecords.map((record) => record.category).sort()).toEqual([
			"CDP 채용정보 > 일반채용공고",
			"CDP 채용정보 > 채용상담 및 설명회",
		]);
	});
});
