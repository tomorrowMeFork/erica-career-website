import { readFile } from "node:fs/promises";
import { PDFParse, type TextResult } from "pdf-parse";
import type { KBTaxonomyMetadata } from "../../knowledge-base/taxonomy.js";
import type { SourceRecord } from "../../source-governance/source-registry.schema.js";
import type { IngestionAccessDecision } from "../access-gate.js";
import { buildRecordId, sha256 } from "../chunking.js";
import { type NormalizedRecord, NormalizedRecordSchema } from "../normalized-record.js";

export type PdfInput = string | Uint8Array | ArrayBuffer;

export type ExtractedPdfPage = {
  page_number: number;
  raw_text: string;
  cleaned_text: string;
  total_pages: number | null;
};

export type BuildPdfPageRecordsInput = {
  source: SourceRecord;
  pages: ExtractedPdfPage[];
  fetchedAt: string;
  accessDecision: IngestionAccessDecision;
  approvalRecordText: string;
};

const CDP_STUDENT_GUIDE_SOURCE_ID = "cdp-student-guide-pdf";
const CDP_STUDENT_GUIDE_CATEGORY = "CDP 학생 매뉴얼";
const CDP_STUDENT_GUIDE_TAXONOMY = {
  collection_category: "guide",
  source_family: "cdp",
  category_label_ko: "가이드",
} as const satisfies KBTaxonomyMetadata;
const CDP_STUDENT_GUIDE_PDF_URL = "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf";
const APPROVED_MANUAL_DOWNLOAD = "approved_manual_download";
const MANUAL_PDF_DOWNLOAD = "manual_pdf_download";

export async function extractPdfPages(input: PdfInput): Promise<ExtractedPdfPage[]> {
  const data = await loadLocalPdfBytes(input);
  const parser = new PDFParse({ data });

  try {
    const result: TextResult = await parser.getText({ pageJoiner: "\n" });
    return result.pages.map((page) => ({
      page_number: page.num,
      raw_text: page.text,
      cleaned_text: cleanPdfText(page.text),
      total_pages: Number.isInteger(result.total) && result.total > 0 ? result.total : null,
    }));
  } finally {
    await parser.destroy();
  }
}

export function buildPdfPageRecords(input: BuildPdfPageRecordsInput): NormalizedRecord[] {
  assertApprovedCdpStudentGuidePdf(input);

  return input.pages
    .filter((page) => page.cleaned_text.trim().length > 0)
    .map((page) => buildPdfPageRecord(input.source, page, input.fetchedAt));
}

async function loadLocalPdfBytes(input: PdfInput): Promise<Uint8Array> {
  if (typeof input === "string") {
    if (isHttpsUrl(input)) {
      throw new Error("Live PDF URL extraction is not implemented; pass approved local PDF bytes or a fixture path");
    }

    const buffer = await readFile(input);
    return new Uint8Array(buffer);
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  return new Uint8Array(input);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function cleanPdfText(value: string): string {
  return value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/gu, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function assertApprovedCdpStudentGuidePdf(input: BuildPdfPageRecordsInput): void {
  const { source, accessDecision, approvalRecordText } = input;

  if (source.source_id !== CDP_STUDENT_GUIDE_SOURCE_ID) {
    throw new Error(`PDF page records are only approved for ${CDP_STUDENT_GUIDE_SOURCE_ID}`);
  }

  if (source.source_type !== "pdf" || source.content_type !== "pdf") {
    throw new Error("CDP student guide ingestion requires a PDF source record");
  }

  if (source.category !== CDP_STUDENT_GUIDE_CATEGORY) {
    throw new Error(`CDP student guide category must be ${CDP_STUDENT_GUIDE_CATEGORY}`);
  }

  if (source.canonical_url !== CDP_STUDENT_GUIDE_PDF_URL) {
    throw new Error("CDP student guide PDF source must match the approved seed URL");
  }

  if (source.review_status !== "reviewed" || source.allowed_collection_method !== APPROVED_MANUAL_DOWNLOAD) {
    throw new Error("CDP student guide PDF source must be reviewed with approved_manual_download");
  }

  if (source.scheduled_crawling_enabled !== false) {
    throw new Error("scheduled_crawling_enabled must remain false for PDF ingestion");
  }

  if (accessDecision.source_id !== source.source_id) {
    throw new Error("Access decision source_id must match the PDF source");
  }

  if (accessDecision.observed_url !== CDP_STUDENT_GUIDE_PDF_URL) {
    throw new Error("Access decision observed_url must match the approved CDP PDF seed URL");
  }

  if (accessDecision.status !== "allowed" || accessDecision.collection_method !== MANUAL_PDF_DOWNLOAD) {
    throw new Error("PDF record building requires an allowed manual_pdf_download access decision");
  }

  if (!approvalRecordText.includes(CDP_STUDENT_GUIDE_SOURCE_ID) || !approvalRecordText.includes(APPROVED_MANUAL_DOWNLOAD)) {
    throw new Error("Approval record evidence for approved_manual_download is required");
  }

  if (!approvalRecordText.includes(CDP_STUDENT_GUIDE_PDF_URL)) {
    throw new Error("Approval record evidence must include the approved CDP PDF seed URL");
  }
}

function buildPdfPageRecord(source: SourceRecord, page: ExtractedPdfPage, fetchedAt: string): NormalizedRecord {
  if (!Number.isInteger(page.page_number) || page.page_number <= 0) {
    throw new Error("PDF page_number must be a positive integer");
  }

  const canonicalUrl = source.canonical_url;
  if (canonicalUrl.includes("#page=")) {
    throw new Error("Source canonical_url must not include a page anchor");
  }

  const citationUrl = `${canonicalUrl}#page=${page.page_number}`;
  const title = `${source.source_name} ${page.page_number}쪽`;
  const contentHash = sha256(page.cleaned_text);
  const candidate = {
    record_id: buildRecordId({
      source_id: source.source_id,
      canonical_url: canonicalUrl,
      title,
      posted_at: null,
      content_hash: contentHash,
    }),
    source_id: source.source_id,
    source_name: source.source_name,
    source_url: source.canonical_url,
    canonical_url: canonicalUrl,
    title,
    category: CDP_STUDENT_GUIDE_CATEGORY,
    ...CDP_STUDENT_GUIDE_TAXONOMY,
    fetched_at: fetchedAt,
    posted_at: null,
    deadline_status: "unknown",
    deadline_raw_text: "",
    raw_text: page.raw_text,
    cleaned_text: page.cleaned_text,
    content_hash: contentHash,
    citation_anchors: [
      {
        url: citationUrl,
        label: `${source.source_name} ${page.page_number}쪽`,
        page_number: page.page_number,
      },
    ],
    source_text_trust: "untrusted_source_text",
  };

  return NormalizedRecordSchema.parse(candidate);
}
