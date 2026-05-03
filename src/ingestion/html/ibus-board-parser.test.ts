import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NormalizedRecordSchema } from "../normalized-record.js";
import type { IngestionAccessDecision } from "../access-gate.js";
import { buildIbusNormalizedRecords, parseIbusDetailPage, parseIbusListingPage } from "./ibus-board-parser.js";

const listingHtml = readFileSync("fixtures/ingestion/ibus-listing.html", "utf8");
const detailHtml = readFileSync("fixtures/ingestion/ibus-detail.html", "utf8");
const boardUrl = "https://ibus.hanyang.ac.kr/front/recruit/r-1";
const detailUrl = "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=6468";
const approvalEvidenceText = [
  "ibus-employment-board",
  "approved_bounded_browser_discovery",
  "https://ibus.hanyang.ac.kr/front/recruit/r-1",
].join("\n");

const allowedDecision: IngestionAccessDecision = {
  source_id: "ibus-employment-board",
  status: "allowed",
  collection_method: "public_html",
  reasons: [],
  observed_url: boardUrl,
  auth_boundary: "public",
  response_type: "html",
};

describe("parseIbusListingPage", () => {
  it("extracts titles and canonical official HTTPS detail URLs from the listing fixture", () => {
    const entries = parseIbusListingPage(listingHtml, boardUrl);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "[채용시까지] ERICA 경상대학 현장실습 참여기업 모집",
      canonical_url: detailUrl,
      posted_at: "2026-05-01T00:00:00.000Z",
      hit_count: 123,
    });
    expect(entries[1]?.canonical_url).toBe("https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=6467");
    expect(entries[1]?.posted_at).toBe("2026-04-29T00:00:00.000Z");
  });

  it("rejects non-HTTPS or non-official detail URLs instead of hard-coding unsafe URLs", () => {
    const unsafeHtml = `<a href="http://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=1">unsafe</a>`;

    expect(() => parseIbusListingPage(unsafeHtml, boardUrl)).toThrow("Rejected non-official ibus URL");
  });

  it("rejects same-host paths outside the exact approved ibus board/detail scope", () => {
    const outOfScopeHtml = `<a href="/front/recruit/r-1/view-extra?id=1">wrong detail path</a>`;
    const prefixConfusionHtml = `<a href="/front/recruit/r-1/viewmore?id=1">prefix confusion</a>`;

    expect(() => parseIbusListingPage(outOfScopeHtml, boardUrl)).toThrow("Rejected out-of-scope ibus URL");
    expect(() => parseIbusListingPage(prefixConfusionHtml, boardUrl)).toThrow("Rejected out-of-scope ibus URL");
  });
});

describe("parseIbusDetailPage", () => {
  it("extracts title, raw Korean text, cleaned text, posted date, and deadline evidence", () => {
    const detail = parseIbusDetailPage(detailHtml, detailUrl);

    expect(detail.title).toBe("[채용시까지] ERICA 경상대학 현장실습 참여기업 모집");
    expect(detail.title).not.toBe("123");
    expect(detail.raw_text).toContain("ERICA 경상대학 학생을 대상으로 한 현장실습 참여기업 모집 안내입니다.");
    expect(detail.cleaned_text).toContain("공식 상세 URL: https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=6468");
    expect(detail.posted_at).toBe("2026-05-01T00:00:00.000Z");
    expect(detail.deadline_status).toBe("active");
    expect(detail.deadline_raw_text).toBe("채용시까지");
  });
});

describe("buildIbusNormalizedRecords", () => {
  it("builds schema-valid NormalizedRecord values with faculty-specific Korean metadata and citations", () => {
    const records = buildIbusNormalizedRecords({
      listing_html: listingHtml,
      detail_html_by_url: {
        [detailUrl]: detailHtml,
        "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=6467": detailHtml.replaceAll("채용시까지", "D-3"),
      },
      page_url: boardUrl,
      fetched_at: new Date("2026-05-03T00:00:00.000Z"),
      access_decision: allowedDecision,
      approval_evidence_text: approvalEvidenceText,
    });

    expect(records).toHaveLength(2);
    const firstRecord = records[0];
    expect(firstRecord).toBeDefined();
    if (!firstRecord) {
      return;
    }
    expect(NormalizedRecordSchema.safeParse(firstRecord).success).toBe(true);
    expect(firstRecord.source_id).toBe("ibus-employment-board");
    expect(firstRecord.source_name).toBe("경상대학 취업정보 게시판");
    expect(firstRecord.category).toBe("ERICA 경상대학 취업정보");
    expect(firstRecord.category).not.toContain("전체");
    expect(firstRecord.category).not.toContain("캠퍼스");
    expect(firstRecord.source_url).toBe(boardUrl);
    expect(firstRecord.canonical_url).toBe(detailUrl);
    expect(firstRecord.fetched_at).toBe("2026-05-03T00:00:00.000Z");
    expect(firstRecord.posted_at).toBe("2026-05-01T00:00:00.000Z");
    expect(firstRecord.content_hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(firstRecord.deadline_status).toBe("active");
    expect(firstRecord.deadline_raw_text).toBe("채용시까지");
    expect(firstRecord.source_text_trust).toBe("untrusted_source_text");
    expect(firstRecord.citation_anchors).toEqual([
      {
        url: detailUrl,
        label: "공식 취업정보 상세: [채용시까지] ERICA 경상대학 현장실습 참여기업 모집",
      },
    ]);
  });

  it("fails closed when the access gate decision is blocked", () => {
    expect(() =>
      buildIbusNormalizedRecords({
        listing_html: listingHtml,
        detail_html_by_url: { [detailUrl]: detailHtml },
        access_decision: { ...allowedDecision, status: "blocked", reasons: ["held"] },
        approval_evidence_text: approvalEvidenceText,
      }),
    ).toThrow("source access decision is blocked");
  });

  it("fails closed when approval-record evidence does not approve ibus public HTML", () => {
    expect(() =>
      buildIbusNormalizedRecords({
        listing_html: listingHtml,
        detail_html_by_url: { [detailUrl]: detailHtml },
        access_decision: allowedDecision,
        approval_evidence_text: "cdp-student-guide-pdf approved_manual_download",
      }),
    ).toThrow("approval evidence does not name ibus-employment-board");
  });
});
