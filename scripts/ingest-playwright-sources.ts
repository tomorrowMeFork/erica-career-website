import * as cheerio from "cheerio";
import { chromium, type BrowserContext, type Page } from "playwright";
import { assertCanIngestSource, loadSourceRegistryForIngestion, type IngestionAccessDecision } from "../src/ingestion/access-gate.js";
import { buildRecordId, chunkNormalizedRecord, sha256 } from "../src/ingestion/chunking.js";
import { NormalizedRecordSchema, type NormalizedRecord } from "../src/ingestion/normalized-record.js";
import { writeKnowledgeBaseJsonl } from "../src/ingestion/write-jsonl-kb.js";
import type { SourceRecord } from "../src/source-governance/source-registry.schema.js";

const registryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";
const outputDir = "data/knowledge-base/playwright-sources";
const sourceIds = [
  "cdp-root",
  "cdp-career-category-discovery",
  "cdp-recruit-category-discovery",
  "book-success-story-viewer",
] as const;
const navigationTimeoutMs = 15_000;
const requestDelayMs = 1_200;

async function runCli(): Promise<void> {
  const registry = loadSourceRegistryForIngestion(registryPath);
  const browser = await chromium.launch({ headless: true });
  const records: NormalizedRecord[] = [];

  try {
    for (const sourceId of sourceIds) {
      const source = registry.sources.find((candidate) => candidate.source_id === sourceId);
      if (!source) {
        throw new Error(`Missing registry source ${sourceId}`);
      }
      const decision = assertCanIngestSource(registry, sourceId, "public_html");
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      try {
        await restrictContextToOrigin(context, new URL(source.canonical_url).origin);
        const page = await context.newPage();
        const html = await collectHtml(page, source.canonical_url);
        records.push(buildHtmlRecord(source, decision, html));
      } finally {
        await context.clearCookies();
        await context.close();
      }
      await delay(requestDelayMs);
    }
  } finally {
    await browser.close();
  }

  const fetchedAt = new Date().toISOString();
  const chunks = records.flatMap((record) => chunkNormalizedRecord(record));
  const manifest = await writeKnowledgeBaseJsonl({
    records,
    chunks,
    outputDir,
    manifest: {
      run_id: `playwright-sources-${fetchedAt}`,
      generated_at: fetchedAt,
      source_ids: [...sourceIds],
    },
  });

  console.log(`playwright source ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${outputDir}`);
}

async function restrictContextToOrigin(context: BrowserContext, allowedOrigin: string): Promise<void> {
  await context.route("**/*", async (route) => {
    const requestOrigin = new URL(route.request().url()).origin;
    if (requestOrigin !== allowedOrigin) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

async function collectHtml(page: Page, url: string): Promise<string> {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeoutMs });
  if (!response) {
    throw new Error(`Playwright navigation returned no response for ${url}`);
  }
  if (response.status() >= 400) {
    throw new Error(`Playwright navigation stopped on HTTP ${response.status()} for ${url}`);
  }
  return page.content();
}

function buildHtmlRecord(source: SourceRecord, decision: IngestionAccessDecision, html: string): NormalizedRecord {
  const fetchedAt = new Date().toISOString();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const title = cleanInlineText($("title").first().text()) || source.source_name;
  const bodyText = cleanBlockText($("body").text());
  const rawText = cleanBlockText([title, bodyText, `공식 URL: ${source.canonical_url}`].filter((part) => part.length > 0).join("\n"));
  const contentHash = sha256([rawText, source.canonical_url].join("\u001f"));

  return NormalizedRecordSchema.parse({
    record_id: buildRecordId({
      source_id: source.source_id,
      canonical_url: source.canonical_url,
      title,
      posted_at: null,
      content_hash: contentHash,
    }),
    source_id: source.source_id,
    source_name: source.source_name,
    source_url: source.canonical_url,
    canonical_url: decision.observed_url,
    title,
    category: source.category,
    fetched_at: fetchedAt,
    posted_at: null,
    deadline_status: "unknown",
    deadline_raw_text: "",
    raw_text: rawText,
    cleaned_text: rawText,
    content_hash: contentHash,
    citation_anchors: [{ url: decision.observed_url, label: `공식 출처: ${source.source_name}` }],
    source_text_trust: "untrusted_source_text",
  });
}

function cleanInlineText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function cleanBlockText(value: string): string {
  return value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => cleanInlineText(line))
    .filter((line) => line.length > 0)
    .join("\n");
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

runCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ingest_playwright_sources_failed: ${message}`);
  process.exitCode = 1;
});
