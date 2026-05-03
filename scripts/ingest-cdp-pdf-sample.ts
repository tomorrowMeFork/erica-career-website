import { readFile } from "node:fs/promises";
import { assertCanIngestSource, loadSourceRegistryForIngestion, type IngestionAccessDecision } from "../src/ingestion/access-gate.js";
import type { SourceRecord } from "../src/source-governance/source-registry.schema.js";
import { chunkNormalizedRecord } from "../src/ingestion/chunking.js";
import { fetchApprovedBytes } from "../src/ingestion/fetch-client.js";
import { buildPdfPageRecords, extractPdfPages } from "../src/ingestion/pdf/pdf-page-parser.js";
import { writeKnowledgeBaseJsonl } from "../src/ingestion/write-jsonl-kb.js";

const registryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";
const approvalRecordPath = ".planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md";
const pdfFixturePath = "fixtures/ingestion/cdp-student-guide-sample.pdf";
const sourceId = "cdp-student-guide-pdf";
const officialPdfUrl = "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf";
const fixtureFetchedAt = "2026-05-03T00:00:00.000Z";

type CliArgs = {
  fixture: boolean;
  output: string;
};

async function runCli(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const registry = loadSourceRegistryForIngestion(registryPath);
  const source = args.fixture ? fixtureOnlySource() : registry.sources.find((candidate) => candidate.source_id === sourceId);
  if (!source) {
    throw new Error(`Missing registry source ${sourceId}`);
  }

  const decision = args.fixture ? fixtureOnlyDecision() : assertCanIngestSource(registry, sourceId, "manual_pdf_download");
  const approvalRecordText = args.fixture ? fixtureOnlyApprovalEvidence() : await readFile(approvalRecordPath, "utf8");
  const pdfBytes = args.fixture
    ? new Uint8Array(await readFile(pdfFixturePath))
    : await fetchApprovedBytes(decision, source.canonical_url, { approval_evidence_text: approvalRecordText, timeout_ms: 10_000 });
  const fetchedAt = args.fixture ? fixtureFetchedAt : new Date().toISOString();
  const pages = await extractPdfPages(pdfBytes);
  const records = buildPdfPageRecords({
    source,
    pages,
    fetchedAt,
    accessDecision: decision,
    approvalRecordText,
  });
  const chunks = records.flatMap((record) => chunkNormalizedRecord(record));

  const manifest = await writeKnowledgeBaseJsonl({
    records,
    chunks,
    outputDir: args.output,
    manifest: {
      run_id: args.fixture ? "fixture-cdp-pdf-sample" : `live-cdp-pdf-sample-${fetchedAt}`,
      generated_at: fetchedAt,
      source_ids: [sourceId],
    },
  });

  console.log(`cdp pdf sample ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${args.output}`);
}

function parseArgs(argv: readonly string[]): CliArgs {
  let fixture = false;
  let output = "data/knowledge-base/fixture-cdp-pdf";

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

function fixtureOnlySource(): SourceRecord {
  return {
    source_id: sourceId,
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
    notes: "Fixture-only sanitized local PDF source record for parser verification.",
    next_action: "Use live registry source only outside --fixture mode.",
  };
}

function fixtureOnlyDecision(): IngestionAccessDecision {
  return {
    source_id: sourceId,
    status: "allowed",
    collection_method: "manual_pdf_download",
    reasons: [],
    observed_url: officialPdfUrl,
    auth_boundary: "public",
    response_type: "pdf",
  };
}

function fixtureOnlyApprovalEvidence(): string {
  return [sourceId, "approved_manual_download", officialPdfUrl, "fixture-only sanitized local sample"].join("\n");
}

runCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ingest_cdp_pdf_sample_failed: ${message}`);
  process.exitCode = 1;
});
