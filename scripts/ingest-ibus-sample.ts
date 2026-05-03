import { readFile } from "node:fs/promises";
import { assertCanIngestSource, loadSourceRegistryForIngestion, type IngestionAccessDecision } from "../src/ingestion/access-gate.js";
import { chunkNormalizedRecord } from "../src/ingestion/chunking.js";
import { fetchApprovedText } from "../src/ingestion/fetch-client.js";
import { buildIbusNormalizedRecords, parseIbusListingPage, type IbusListingEntry } from "../src/ingestion/html/ibus-board-parser.js";
import { writeKnowledgeBaseJsonl } from "../src/ingestion/write-jsonl-kb.js";

const registryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";
const approvalRecordPath = ".planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md";
const listingFixturePath = "fixtures/ingestion/ibus-listing.html";
const detailFixturePath = "fixtures/ingestion/ibus-detail.html";
const sourceId = "ibus-employment-board";
const boardUrl = "https://ibus.hanyang.ac.kr/front/recruit/r-1";
const fixtureFetchedAt = "2026-05-03T00:00:00.000Z";

type CliArgs = {
  fixture: boolean;
  output: string;
};

async function runCli(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const registry = loadSourceRegistryForIngestion(registryPath);
  const decision = args.fixture ? fixtureOnlyDecision() : assertCanIngestSource(registry, sourceId, "public_html");
  const approvalEvidenceText = args.fixture ? fixtureOnlyApprovalEvidence() : await readFile(approvalRecordPath, "utf8");

  const listingHtml = args.fixture
    ? await readFile(listingFixturePath, "utf8")
    : await fetchApprovedText(decision, boardUrl, { approval_evidence_text: approvalEvidenceText, timeout_ms: 10_000 });
  const [selectedEntry] = parseIbusListingPage(listingHtml, boardUrl);
  if (!selectedEntry) {
    throw new Error("No ibus listing entries found for sample ingestion");
  }

  const detailHtml = args.fixture
    ? await readFile(detailFixturePath, "utf8")
    : await fetchApprovedText(decision, selectedEntry.canonical_url, {
        approval_evidence_text: approvalEvidenceText,
        timeout_ms: 10_000,
      });
  const fetchedAt = args.fixture ? fixtureFetchedAt : new Date().toISOString();
  const records = buildIbusNormalizedRecords({
    listing_html: renderSingleEntryListing(selectedEntry),
    detail_html_by_url: { [selectedEntry.canonical_url]: detailHtml },
    page_url: boardUrl,
    fetched_at: new Date(fetchedAt),
    access_decision: decision,
    approval_evidence_text: approvalEvidenceText,
  });
  const chunks = records.flatMap((record) => chunkNormalizedRecord(record));

  const manifest = await writeKnowledgeBaseJsonl({
    records,
    chunks,
    outputDir: args.output,
    manifest: {
      run_id: args.fixture ? "fixture-ibus-sample" : `live-ibus-sample-${fetchedAt}`,
      generated_at: fetchedAt,
      source_ids: [sourceId],
    },
  });

  console.log(`ibus sample ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${args.output}`);
}

function parseArgs(argv: readonly string[]): CliArgs {
  let fixture = false;
  let output = "data/knowledge-base/fixture-ibus";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixture") {
      fixture = true;
      continue;
    }
    if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a path");
      }
      output = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { fixture, output };
}

function fixtureOnlyDecision(): IngestionAccessDecision {
  return {
    source_id: sourceId,
    status: "allowed",
    collection_method: "public_html",
    reasons: [],
    observed_url: boardUrl,
    auth_boundary: "public",
    response_type: "html",
  };
}

function fixtureOnlyApprovalEvidence(): string {
  return [sourceId, "approved_bounded_browser_discovery", boardUrl, "fixture-only sanitized local sample"].join("\n");
}

function renderSingleEntryListing(entry: IbusListingEntry): string {
  return `<html><body><table><tr><td><a href="${escapeHtml(entry.canonical_url)}">${escapeHtml(entry.title)}</a></td><td>${escapeHtml(entry.posted_raw_text)}</td><td class="hit">${entry.hit_count ?? ""}</td></tr></table></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

runCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ingest_ibus_sample_failed: ${message}`);
  process.exitCode = 1;
});
