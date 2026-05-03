import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { SourceRecord } from "../../source-governance/source-registry.schema.js";
import { evaluateIngestionAccess, type IngestionAccessDecision } from "../access-gate.js";
import { sha256 } from "../chunking.js";
import { NormalizedRecordSchema } from "../normalized-record.js";
import { buildPdfPageRecords, extractPdfPages, type ExtractedPdfPage } from "./pdf-page-parser.js";

const fixturePath = fileURLToPath(new URL("../../../fixtures/ingestion/cdp-student-guide-sample.pdf", import.meta.url));
const approvalRecordPath = fileURLToPath(
  new URL("../../../.planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md", import.meta.url),
);
const fetchedAt = "2026-05-03T00:00:00.000Z";
const officialPdfUrl = "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf";

const cdpStudentGuideSource: SourceRecord = {
  source_id: "cdp-student-guide-pdf",
  canonical_url: officialPdfUrl,
  source_name: "CDP 학생 매뉴얼 PDF",
  source_type: "pdf",
  content_type: "pdf",
  category: "CDP 학생 매뉴얼",
  approval_scope: "seed_urls_only",
  approval_basis: "user_assertion",
  approval_status: "pending_review",
  auth_required: false,
  auth_mode: "none",
  review_status: "reviewed",
  allowed_collection_method: "approved_manual_download",
  checklist_reference: "source-access-review.md#cdp-student-guide-pdf",
  robots_status: "disallow_all_raw_evidence",
  tos_status: "not_reviewed",
  rate_limit_posture: "moderate_1_2s_low_concurrency",
  refresh_cadence: "monthly_or_on_manual_change_when_approved",
  owner_label: "한양대학교 커리어개발팀",
  last_checked_at: "2026-05-03T00:00:00Z",
  scheduled_crawling_enabled: false,
  notes: "Direct PDF URL returned a PDF header with 52 pages; fixture tests use sanitized local bytes only.",
  next_action: "Manual PDF sample ingestion only with page-level citations.",
};

function allowedPdfDecision(source: SourceRecord): IngestionAccessDecision {
  return evaluateIngestionAccess(source, "manual_pdf_download");
}

describe("extractPdfPages", () => {
  it("extracts page-level raw and cleaned text from the sanitized local PDF fixture bytes", async () => {
    const buffer = await readFile(fixturePath);
    const pages = await extractPdfPages(new Uint8Array(buffer));

    expect(pages.length).toBeGreaterThanOrEqual(1);
    expect(pages[0]).toMatchObject({ page_number: 1, total_pages: 1 });
    expect(pages[0]?.raw_text).toContain("ERICA CDP Student Guide Fixture");
    expect(pages[0]?.cleaned_text).toContain("CDP student guide fixture page");
  });

  it("rejects live URL extraction to keep parser tests fixture-first", async () => {
    await expect(extractPdfPages(officialPdfUrl)).rejects.toThrow("Live PDF URL extraction is not implemented");
  });
});

describe("buildPdfPageRecords", () => {
  it("builds normalized CDP student guide page records with official #page citation anchors", async () => {
    const pages = await extractPdfPages(new Uint8Array(await readFile(fixturePath)));
    const approvalRecordText = await readFile(approvalRecordPath, "utf8");

    const records = buildPdfPageRecords({
      source: cdpStudentGuideSource,
      pages,
      fetchedAt,
      accessDecision: allowedPdfDecision(cdpStudentGuideSource),
      approvalRecordText,
    });

    expect(records).toHaveLength(1);
    const [record] = records;
    expect(record).toBeDefined();
    expect(NormalizedRecordSchema.safeParse(record).success).toBe(true);
    expect(record?.source_id).toBe("cdp-student-guide-pdf");
    expect(record?.source_url).toBe(officialPdfUrl);
    expect(record?.canonical_url).toBe(officialPdfUrl);
    expect(record?.category).toBe("CDP 학생 매뉴얼");
    expect(record?.fetched_at).toBe(fetchedAt);
    expect(record?.raw_text).toContain("ERICA CDP Student Guide Fixture");
    expect(record?.cleaned_text).toContain("source labels");
    expect(record?.content_hash).toBe(sha256(record?.cleaned_text ?? ""));
    expect(record?.source_text_trust).toBe("untrusted_source_text");
    expect(record?.citation_anchors).toEqual([
      {
        url: `${officialPdfUrl}#page=1`,
        label: "CDP 학생 매뉴얼 PDF 1쪽",
        page_number: 1,
      },
    ]);
  });

  it("skips empty extracted pages instead of fabricating content", async () => {
    const approvalRecordText = await readFile(approvalRecordPath, "utf8");
    const emptyPage: ExtractedPdfPage = {
      page_number: 1,
      raw_text: "   ",
      cleaned_text: "",
      total_pages: 1,
    };

    expect(
      buildPdfPageRecords({
        source: cdpStudentGuideSource,
        pages: [emptyPage],
        fetchedAt,
        accessDecision: allowedPdfDecision(cdpStudentGuideSource),
        approvalRecordText,
      }),
    ).toEqual([]);
  });

  it("rejects record building when approval-record evidence is absent", () => {
    expect(() =>
      buildPdfPageRecords({
        source: cdpStudentGuideSource,
        pages: [{ page_number: 1, raw_text: "fixture", cleaned_text: "fixture", total_pages: 1 }],
        fetchedAt,
        accessDecision: allowedPdfDecision(cdpStudentGuideSource),
        approvalRecordText: "approve-ibus-html only",
      }),
    ).toThrow("Approval record evidence");
  });

  it("rejects blocked or mismatched access decisions", async () => {
    const approvalRecordText = await readFile(approvalRecordPath, "utf8");
    const blockedDecision: IngestionAccessDecision = {
      ...allowedPdfDecision(cdpStudentGuideSource),
      status: "blocked",
      reasons: ["test block"],
    };

    expect(() =>
      buildPdfPageRecords({
        source: cdpStudentGuideSource,
        pages: [{ page_number: 1, raw_text: "fixture", cleaned_text: "fixture", total_pages: 1 }],
        fetchedAt,
        accessDecision: blockedDecision,
        approvalRecordText,
      }),
    ).toThrow("allowed manual_pdf_download");
  });

  it("rejects CDP category or book-viewer source records outside the approved PDF scope", async () => {
    const approvalRecordText = await readFile(approvalRecordPath, "utf8");
    const categorySource: SourceRecord = {
      ...cdpStudentGuideSource,
      source_id: "cdp-career-category-discovery",
      source_type: "category_discovery",
      content_type: "html",
      category: "CDP 취업정보 하위항목 전체",
      review_status: "pending",
      allowed_collection_method: "none_until_review",
    };

    expect(() =>
      buildPdfPageRecords({
        source: categorySource,
        pages: [{ page_number: 1, raw_text: "fixture", cleaned_text: "fixture", total_pages: 1 }],
        fetchedAt,
        accessDecision: allowedPdfDecision(cdpStudentGuideSource),
        approvalRecordText,
      }),
    ).toThrow("only approved for cdp-student-guide-pdf");
  });

  it("rejects a correct source ID when the PDF canonical URL is not the approved seed URL", async () => {
    const approvalRecordText = await readFile(approvalRecordPath, "utf8");
    const wrongUrlSource: SourceRecord = {
      ...cdpStudentGuideSource,
      canonical_url: "https://cdp.hanyang.ac.kr/office/other.pdf",
    };

    expect(() =>
      buildPdfPageRecords({
        source: wrongUrlSource,
        pages: [{ page_number: 1, raw_text: "fixture", cleaned_text: "fixture", total_pages: 1 }],
        fetchedAt,
        accessDecision: allowedPdfDecision(cdpStudentGuideSource),
        approvalRecordText,
      }),
    ).toThrow("approved seed URL");
  });
});
