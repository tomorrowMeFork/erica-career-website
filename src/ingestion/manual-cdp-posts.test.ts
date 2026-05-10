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
			source_ids: ["cdp-recruit-category-discovery"],
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
			source_ids: ["cdp-recruit-category-discovery"],
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
