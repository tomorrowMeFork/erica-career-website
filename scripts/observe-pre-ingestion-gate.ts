import { writeFileSync } from "node:fs";
import {
  evaluateIngestionAccess,
  loadSourceRegistryForIngestion,
  type IngestionAccessDecision,
  type IngestionCollectionMethod,
} from "../src/ingestion/access-gate.js";
import type { SourceRecord } from "../src/source-governance/source-registry.schema.js";

const defaultRegistryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";
const evidencePath = ".planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-access-evidence.md";

const expectedSeedSourceIds = [
  "cdp-root",
  "cdp-career-category-discovery",
  "cdp-recruit-category-discovery",
  "cdp-recruit-general-board",
  "cdp-recruit-event-board",
  "book-success-story-viewer",
  "cdp-student-guide-pdf",
  "ibus-employment-board",
  "ewil-internship-system",
  "ewil-notice-board",
  "ewil-info-board",
  "ewil-internship-reviews",
] as const;

const parserRequestBySourceId: Record<(typeof expectedSeedSourceIds)[number], IngestionCollectionMethod> = {
  "cdp-root": "public_html",
  "cdp-career-category-discovery": "public_html",
  "cdp-recruit-category-discovery": "public_html",
  "cdp-recruit-general-board": "manual_login_session",
  "cdp-recruit-event-board": "manual_login_session",
  "book-success-story-viewer": "public_html",
  "cdp-student-guide-pdf": "manual_pdf_download",
  "ibus-employment-board": "public_html",
  "ewil-internship-system": "public_html",
  "ewil-notice-board": "manual_login_session",
  "ewil-info-board": "manual_login_session",
  "ewil-internship-reviews": "manual_login_session",
};

type EvidenceRow = {
  source_id: string;
  observed_url: string;
  requested_method: IngestionCollectionMethod;
  decision_status: IngestionAccessDecision["status"];
  parser_eligible: boolean;
  collection_method: IngestionAccessDecision["collection_method"];
  auth_boundary: IngestionAccessDecision["auth_boundary"];
  response_type: IngestionAccessDecision["response_type"];
  robots_status: SourceRecord["robots_status"];
  tos_status: SourceRecord["tos_status"];
  scheduled_crawling_enabled: false;
  reasons: string[];
};

type GateOutput = {
  mode: "dry-run" | "local-observation";
  registry_path: string;
  evidence_path: string;
  scheduled_crawling_enabled: false;
  evaluated_source_count: number;
  decisions: EvidenceRow[];
};

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function registryPathFromArgs(): string {
  const registryFlagIndex = process.argv.indexOf("--registry");
  if (registryFlagIndex >= 0) {
    const value = process.argv[registryFlagIndex + 1];
    if (!value) {
      throw new Error("--registry requires a path value");
    }
    return value;
  }

  return defaultRegistryPath;
}

function sourceNotes(source: SourceRecord): string {
  return source.notes.replace(/\s+/g, " ").trim();
}

function buildRows(sources: SourceRecord[]): EvidenceRow[] {
  return expectedSeedSourceIds.map((sourceId) => {
    const source = sources.find((candidate) => candidate.source_id === sourceId);
    if (!source) {
      throw new Error(`Expected seed source missing from registry: ${sourceId}`);
    }

    const requestedMethod = parserRequestBySourceId[sourceId];
    const decision = evaluateIngestionAccess(source, requestedMethod);

    return {
      source_id: source.source_id,
      observed_url: decision.observed_url,
      requested_method: requestedMethod,
      decision_status: decision.status,
      parser_eligible: decision.status === "allowed",
      collection_method: decision.collection_method,
      auth_boundary: decision.auth_boundary,
      response_type: decision.response_type,
      robots_status: source.robots_status,
      tos_status: source.tos_status,
      scheduled_crawling_enabled: source.scheduled_crawling_enabled,
      reasons: decision.reasons,
    };
  });
}

function markdownTable(rows: EvidenceRow[]): string {
  const tableRows = rows.map((row) =>
    [
      row.source_id,
      row.requested_method,
      row.decision_status,
      row.parser_eligible ? "yes" : "no",
      row.collection_method,
      row.auth_boundary,
      row.response_type,
      row.robots_status,
      row.tos_status,
      String(row.scheduled_crawling_enabled),
      row.reasons.join("; ").replace(/\|/g, "/"),
    ].join(" | "),
  );

  return [
    "| source_id | requested parser method | gate status | parser eligible | effective method | auth boundary | response type | robots status | ToS status | scheduled crawling | reasons |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...tableRows.map((row) => `| ${row} |`),
  ].join("\n");
}

function buildEvidenceMarkdown(rows: EvidenceRow[], sources: SourceRecord[]): string {
  const notesById = new Map(sources.map((source) => [source.source_id, sourceNotes(source)]));
  const eligibleCount = rows.filter((row) => row.parser_eligible).length;

  return `# Pre-Ingestion Access Evidence

**Generated:** 2026-05-03  
**Scope:** Phase 2 plan 02-01 Tasks 1-2 only.  
**Registry:** \`${defaultRegistryPath}\`

## Gate Result

- Evaluated all ${rows.length} current seed source records.
- Parser-eligible records: ${eligibleCount}/${rows.length}.
- Registry-backed access gate decisions reflect the latest approval record.
- \`scheduled_crawling_enabled\` remains false for every source; scheduled crawling is not implemented.
- This evidence reflects current registry gate decisions. Approval authority remains the explicit approval record, not this generated evidence file.

${markdownTable(rows)}

## CDP category/login gap

- Phase 1 UAT recorded a major CDP structure/login feasibility gap: CDP collection planning must be based on observed website structure and access status, not schema tests alone.
- \`cdp-career-category-discovery\` and \`cdp-recruit-category-discovery\` use currently observed same-host public URLs only.
- CDP category parser work remains limited to the latest explicit human-approved bounded Playwright scope.
- Login automation is not implemented in this phase. If a login boundary is observed later, separate explicit authorization and a non-persistent, redacted observation plan are required before any collection work.

## Parser eligibility by source

### cdp-root

- Observed URL: \`${rows.find((row) => row.source_id === "cdp-root")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "cdp-root")?.parser_eligible ? "allowed for bounded Playwright HTML collection from the observed same-host public URL" : "blocked pending review"}.
- Auth boundary: ${rows.find((row) => row.source_id === "cdp-root")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "cdp-root")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "cdp-root")?.robots_status} / ${rows.find((row) => row.source_id === "cdp-root")?.tos_status}.
- Registry note: ${notesById.get("cdp-root")}

### cdp-career-category-discovery

- Observed URL: \`${rows.find((row) => row.source_id === "cdp-career-category-discovery")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "cdp-career-category-discovery")?.parser_eligible ? "allowed for bounded Playwright HTML collection from the observed same-host public URL" : "blocked pending review"}.
- Auth boundary: ${rows.find((row) => row.source_id === "cdp-career-category-discovery")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "cdp-career-category-discovery")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "cdp-career-category-discovery")?.robots_status} / ${rows.find((row) => row.source_id === "cdp-career-category-discovery")?.tos_status}.
- Registry note: ${notesById.get("cdp-career-category-discovery")}

### cdp-recruit-category-discovery

- Observed URL: \`${rows.find((row) => row.source_id === "cdp-recruit-category-discovery")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "cdp-recruit-category-discovery")?.parser_eligible ? "allowed for bounded Playwright HTML collection from the observed same-host public URL" : "blocked pending review"}.
- Auth boundary: ${rows.find((row) => row.source_id === "cdp-recruit-category-discovery")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "cdp-recruit-category-discovery")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "cdp-recruit-category-discovery")?.robots_status} / ${rows.find((row) => row.source_id === "cdp-recruit-category-discovery")?.tos_status}.
- Registry note: ${notesById.get("cdp-recruit-category-discovery")}

### cdp-recruit-general-board

- Observed URL: \`${rows.find((row) => row.source_id === "cdp-recruit-general-board")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "cdp-recruit-general-board")?.parser_eligible ? "allowed for approved user-manual-login non-persistent collection from the exact 일반채용공고 board URL only" : "blocked pending explicit manual-session approval"}.
- Auth boundary: ${rows.find((row) => row.source_id === "cdp-recruit-general-board")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "cdp-recruit-general-board")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "cdp-recruit-general-board")?.robots_status} / ${rows.find((row) => row.source_id === "cdp-recruit-general-board")?.tos_status}.
- Registry note: ${notesById.get("cdp-recruit-general-board")}

### cdp-recruit-event-board

- Observed URL: \`${rows.find((row) => row.source_id === "cdp-recruit-event-board")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "cdp-recruit-event-board")?.parser_eligible ? "allowed for approved user-manual-login non-persistent collection from the exact 채용상담 및 설명회 board URL only" : "blocked pending explicit manual-session approval"}.
- Auth boundary: ${rows.find((row) => row.source_id === "cdp-recruit-event-board")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "cdp-recruit-event-board")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "cdp-recruit-event-board")?.robots_status} / ${rows.find((row) => row.source_id === "cdp-recruit-event-board")?.tos_status}.
- Registry note: ${notesById.get("cdp-recruit-event-board")}

### book-success-story-viewer

- Observed URL: \`${rows.find((row) => row.source_id === "book-success-story-viewer")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "book-success-story-viewer")?.parser_eligible ? "allowed for bounded Playwright HTML collection from the original public viewer URL" : "blocked pending review"}.
- Auth boundary: ${rows.find((row) => row.source_id === "book-success-story-viewer")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "book-success-story-viewer")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "book-success-story-viewer")?.robots_status} / ${rows.find((row) => row.source_id === "book-success-story-viewer")?.tos_status}.
- Registry note: ${notesById.get("book-success-story-viewer")}

### cdp-student-guide-pdf

- Observed URL: \`${rows.find((row) => row.source_id === "cdp-student-guide-pdf")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "cdp-student-guide-pdf")?.parser_eligible ? "allowed for approved manual PDF sample ingestion from the original seed URL only" : "blocked pending human access review and explicit `approved_manual_download` registry method"}.
- Auth boundary: ${rows.find((row) => row.source_id === "cdp-student-guide-pdf")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "cdp-student-guide-pdf")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "cdp-student-guide-pdf")?.robots_status} / ${rows.find((row) => row.source_id === "cdp-student-guide-pdf")?.tos_status}.
- Registry note: ${notesById.get("cdp-student-guide-pdf")}

### ibus-employment-board

- Observed URL: \`${rows.find((row) => row.source_id === "ibus-employment-board")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "ibus-employment-board")?.parser_eligible ? "allowed for approved bounded public HTML board ingestion from the original seed URL only" : "blocked pending human access review and explicit `approved_bounded_browser_discovery` registry method"}.
- Auth boundary: ${rows.find((row) => row.source_id === "ibus-employment-board")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "ibus-employment-board")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "ibus-employment-board")?.robots_status} / ${rows.find((row) => row.source_id === "ibus-employment-board")?.tos_status}.
- Registry note: ${notesById.get("ibus-employment-board")}

### ewil-internship-system

- Observed URL: \`${rows.find((row) => row.source_id === "ewil-internship-system")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "ewil-internship-system")?.parser_eligible ? "allowed for approved bounded public HTML collection from the public index.do landing page only" : "blocked pending human access review and explicit `approved_bounded_browser_discovery` registry method"}.
- Auth boundary: ${rows.find((row) => row.source_id === "ewil-internship-system")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "ewil-internship-system")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "ewil-internship-system")?.robots_status} / ${rows.find((row) => row.source_id === "ewil-internship-system")?.tos_status}.
- Registry note: ${notesById.get("ewil-internship-system")}

### ewil-notice-board

- Observed URL: \`${rows.find((row) => row.source_id === "ewil-notice-board")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "ewil-notice-board")?.parser_eligible ? "allowed for approved user-manual-login non-persistent collection from the exact E-WIL NOTICE URL only" : "blocked pending explicit manual-session approval"}.
- Auth boundary: ${rows.find((row) => row.source_id === "ewil-notice-board")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "ewil-notice-board")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "ewil-notice-board")?.robots_status} / ${rows.find((row) => row.source_id === "ewil-notice-board")?.tos_status}.
- Registry note: ${notesById.get("ewil-notice-board")}

### ewil-info-board

- Observed URL: \`${rows.find((row) => row.source_id === "ewil-info-board")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "ewil-info-board")?.parser_eligible ? "allowed for approved user-manual-login non-persistent collection from the exact E-WIL INFO URL only" : "blocked pending explicit manual-session approval"}.
- Auth boundary: ${rows.find((row) => row.source_id === "ewil-info-board")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "ewil-info-board")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "ewil-info-board")?.robots_status} / ${rows.find((row) => row.source_id === "ewil-info-board")?.tos_status}.
- Registry note: ${notesById.get("ewil-info-board")}

### ewil-internship-reviews

- Observed URL: \`${rows.find((row) => row.source_id === "ewil-internship-reviews")?.observed_url}\`
- Parser eligibility: ${rows.find((row) => row.source_id === "ewil-internship-reviews")?.parser_eligible ? "allowed for approved user-manual-login non-persistent collection from the exact E-WIL review URL only" : "blocked pending explicit manual-session approval"}.
- Auth boundary: ${rows.find((row) => row.source_id === "ewil-internship-reviews")?.auth_boundary}; response type: ${rows.find((row) => row.source_id === "ewil-internship-reviews")?.response_type}.
- Robots/ToS: ${rows.find((row) => row.source_id === "ewil-internship-reviews")?.robots_status} / ${rows.find((row) => row.source_id === "ewil-internship-reviews")?.tos_status}.
- Registry note: ${notesById.get("ewil-internship-reviews")}

## Task 3 checkpoint

Task 3 approval is recorded in \`.planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md\`. Downstream parser commands must remain limited to currently allowed registry decisions and exact approved public URLs.
`;
}

function runCli(): void {
  const registryPath = registryPathFromArgs();
  const registry = loadSourceRegistryForIngestion(registryPath);
  const rows = buildRows(registry.sources);
  const output: GateOutput = {
    mode: isDryRun() ? "dry-run" : "local-observation",
    registry_path: registryPath,
    evidence_path: evidencePath,
    scheduled_crawling_enabled: false,
    evaluated_source_count: rows.length,
    decisions: rows,
  };

  writeFileSync(evidencePath, buildEvidenceMarkdown(rows, registry.sources));
  console.log(JSON.stringify(output, null, 2));
}

try {
  runCli();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown pre-ingestion gate error";
  console.error(message);
  process.exitCode = 1;
}
