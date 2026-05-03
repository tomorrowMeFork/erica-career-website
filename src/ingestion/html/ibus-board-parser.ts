import * as cheerio from "cheerio";
import { classifyDeadlineStatus } from "../deadline-status.js";
import { buildRecordId, sha256 } from "../chunking.js";
import { NormalizedRecordSchema, type NormalizedRecord } from "../normalized-record.js";
import type { IngestionAccessDecision } from "../access-gate.js";

export type IbusListingEntry = {
  title: string;
  canonical_url: string;
  posted_at: string | null;
  posted_raw_text: string;
  hit_count: number | null;
};

export type IbusDetailPage = {
  title: string;
  canonical_url: string;
  posted_at: string | null;
  posted_raw_text: string;
  raw_text: string;
  cleaned_text: string;
  deadline_status: "active" | "expired" | "unknown";
  deadline_raw_text: string;
  deadline_date?: string;
};

export type BuildIbusNormalizedRecordsInput = {
  listing_html: string;
  detail_html_by_url: Readonly<Record<string, string>>;
  page_url?: string;
  fetched_at?: Date;
  access_decision: IngestionAccessDecision;
  approval_evidence_text: string;
};

const IBUS_SOURCE_ID = "ibus-employment-board";
const IBUS_SOURCE_NAME = "경상대학 취업정보 게시판";
const IBUS_CATEGORY = "ERICA 경상대학 취업정보";
const IBUS_BOARD_URL = "https://ibus.hanyang.ac.kr/front/recruit/r-1";
const IBUS_HOST = "ibus.hanyang.ac.kr";

export function parseIbusListingPage(html: string, pageUrl = IBUS_BOARD_URL): IbusListingEntry[] {
  const $ = cheerio.load(html);
  const seenUrls = new Set<string>();

  return $("a[href*='/front/recruit/r-1/view']")
    .toArray()
    .map((anchor) => {
      const link = $(anchor);
      const href = link.attr("href") ?? "";
      const canonicalUrl = normalizeIbusUrl(href, pageUrl);
      const row = link.closest("tr, li, article, div");
      const postedRawText = extractPostedRawText(
        row
          .find("time[datetime]")
          .toArray()
          .map((element) => $(element).attr("datetime") ?? $(element).text()),
        row.text(),
      );
      const hitCount = extractHitCount(row.find(".hit").first().text());

      return {
        title: cleanInlineText(link.text()),
        canonical_url: canonicalUrl,
        posted_at: parseKoreanDateToIso(postedRawText),
        posted_raw_text: postedRawText,
        hit_count: hitCount,
      };
    })
    .filter((entry) => {
      if (entry.title.length === 0 || seenUrls.has(entry.canonical_url)) {
        return false;
      }
      seenUrls.add(entry.canonical_url);
      return true;
    });
}

export function parseIbusDetailPage(html: string, pageUrl: string): IbusDetailPage {
  const canonicalUrl = normalizeIbusUrl(pageUrl, IBUS_BOARD_URL);
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer").remove();

  const title = firstNonEmptyText([
    $(".board-view .title").first().text(),
    $("article h2").first().text(),
    $("h2").first().text(),
    $("title").first().text().replace(/\s*-\s*취업정보\s*$/u, ""),
  ]);
  const bodyText = firstNonEmptyText([
    normalizeBlockText($, ".board-content"),
    normalizeBlockText($, "article"),
    normalizeBlockText($, "main"),
    normalizeBlockText($, "body"),
  ]);
  const dateScope = $(".board-view, article, main, body").first();
  const postedRawText = extractPostedRawText(
    dateScope
      .find("time[datetime]")
      .toArray()
      .map((element) => $(element).attr("datetime") ?? $(element).text()),
    dateScope.text(),
  );
  const rawText = [title, postedRawText ? `작성일 ${postedRawText}` : "", bodyText, `공식 상세 URL: ${canonicalUrl}`]
    .filter((part) => part.length > 0)
    .join("\n");
  const cleanedText = cleanBlockText(rawText);
  const classifiedDeadline = classifyDeadlineStatus(`${title}\n${bodyText}`);

  return {
    title,
    canonical_url: canonicalUrl,
    posted_at: parseKoreanDateToIso(postedRawText),
    posted_raw_text: postedRawText,
    raw_text: rawText,
    cleaned_text: cleanedText,
    deadline_status: classifiedDeadline.status,
    deadline_raw_text: classifiedDeadline.deadline_raw_text ?? "",
    ...(classifiedDeadline.deadline_date ? { deadline_date: classifiedDeadline.deadline_date } : {}),
  };
}

export function buildIbusNormalizedRecords(input: BuildIbusNormalizedRecordsInput): NormalizedRecord[] {
  assertIbusBuildAllowed(input.access_decision, input.approval_evidence_text);

  const fetchedAt = (input.fetched_at ?? new Date()).toISOString();
  const listingEntries = parseIbusListingPage(input.listing_html, input.page_url ?? IBUS_BOARD_URL);

  return listingEntries.map((entry) => {
    const detailHtml = input.detail_html_by_url[entry.canonical_url];
    if (!detailHtml) {
      throw new Error(`Missing ibus detail fixture for ${entry.canonical_url}`);
    }

    const detail = parseIbusDetailPage(detailHtml, entry.canonical_url);
    const title = detail.title.length > 0 ? detail.title : entry.title;
    const postedAt = detail.posted_at ?? entry.posted_at;
    const contentHash = sha256([detail.cleaned_text, detail.canonical_url].join("\u001f"));
    const recordId = buildRecordId({
      source_id: IBUS_SOURCE_ID,
      canonical_url: detail.canonical_url,
      title,
      posted_at: postedAt,
      content_hash: contentHash,
    });

    return NormalizedRecordSchema.parse({
      record_id: recordId,
      source_id: IBUS_SOURCE_ID,
      source_name: IBUS_SOURCE_NAME,
      source_url: IBUS_BOARD_URL,
      canonical_url: detail.canonical_url,
      title,
      category: IBUS_CATEGORY,
      fetched_at: fetchedAt,
      posted_at: postedAt,
      deadline_status: detail.deadline_status,
      deadline_raw_text: detail.deadline_raw_text,
      raw_text: detail.raw_text,
      cleaned_text: detail.cleaned_text,
      content_hash: contentHash,
      citation_anchors: [
        {
          url: detail.canonical_url,
          label: `공식 취업정보 상세: ${title}`,
        },
      ],
      source_text_trust: "untrusted_source_text",
    });
  });
}

function assertIbusBuildAllowed(decision: IngestionAccessDecision, approvalEvidenceText: string): void {
  const failures: string[] = [];
  if (decision.source_id !== IBUS_SOURCE_ID) {
    failures.push(`unexpected source decision: ${decision.source_id}`);
  }
  if (decision.status !== "allowed") {
    failures.push(`source access decision is ${decision.status}`);
  }
  if (decision.collection_method !== "public_html") {
    failures.push(`source decision collection method is ${decision.collection_method}`);
  }
  if (!approvalEvidenceText.includes(IBUS_SOURCE_ID)) {
    failures.push("approval evidence does not name ibus-employment-board");
  }
  if (!approvalEvidenceText.includes("approved_bounded_browser_discovery")) {
    failures.push("approval evidence does not approve bounded browser discovery");
  }
  if (!approvalEvidenceText.includes(IBUS_BOARD_URL)) {
    failures.push("approval evidence does not include the original ibus seed URL");
  }

  if (failures.length > 0) {
    throw new Error(`Ibus normalized record build blocked: ${failures.join("; ")}`);
  }
}

function normalizeIbusUrl(href: string, baseUrl: string): string {
  const parsedUrl = new URL(href, baseUrl);
  if (parsedUrl.protocol !== "https:" || parsedUrl.host !== IBUS_HOST) {
    throw new Error(`Rejected non-official ibus URL: ${parsedUrl.href}`);
  }
  if (parsedUrl.pathname !== "/front/recruit/r-1" && parsedUrl.pathname !== "/front/recruit/r-1/view") {
    throw new Error(`Rejected out-of-scope ibus URL: ${parsedUrl.href}`);
  }
  return parsedUrl.href;
}

function normalizeBlockText($: cheerio.CheerioAPI, selector: string): string {
  return cleanBlockText($(selector).first().text());
}

function cleanBlockText(value: string): string {
  return value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => cleanInlineText(line))
    .filter((line) => line.length > 0)
    .join("\n");
}

function cleanInlineText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function firstNonEmptyText(values: readonly string[]): string {
  return values.map((value) => cleanBlockText(value)).find((value) => value.length > 0) ?? "";
}

function extractPostedRawText(timeTexts: readonly string[], scopeText: string): string {
  const timeText = timeTexts.find((value) => parseKoreanDateToIso(value) !== null);
  if (timeText) {
    return cleanInlineText(timeText);
  }

  const match = scopeText.match(/20\d{2}[.\-/년]\s*(?:0?[1-9]|1[0-2])[.\-/월]\s*(?:0?[1-9]|[12]\d|3[01])(?:일)?/u);
  return match?.[0] ? cleanInlineText(match[0]) : "";
}

function parseKoreanDateToIso(value: string): string | null {
  const match = value.match(/(20\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/u);
  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

function extractHitCount(value: string): number | null {
  const normalized = cleanInlineText(value);
  if (!/^\d+$/u.test(normalized)) {
    return null;
  }
  return Number.parseInt(normalized, 10);
}
