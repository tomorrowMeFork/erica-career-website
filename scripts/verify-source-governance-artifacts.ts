import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { SourceRegistrySchema, type SourceRegistry } from "../src/source-governance/source-registry.schema.js";

const registryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";
const accessReviewPath = ".planning/phases/01-source-discovery-and-governance/source-access-review.md";
const discoveryNotesPath = ".planning/phases/01-source-discovery-and-governance/discovery-notes.md";
const discoveryHelperPath = "scripts/discover-cdp-seed-scope.ts";

const failures: string[] = [];
const requiredSeedSourceIds = [
  "cdp-root",
  "cdp-career-category-discovery",
  "cdp-recruit-category-discovery",
  "book-success-story-viewer",
  "cdp-student-guide-pdf",
  "ibus-employment-board",
] as const;

function readExistingFile(path: string): string | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  return readFileSync(path, "utf8");
}

function readRequiredFile(path: string): string | undefined {
  const fileText = readExistingFile(path);
  if (fileText === undefined) {
    failures.push(`${path} is required but missing`);
    return undefined;
  }

  return fileText;
}

function verifyRegistry(): void {
  const registryText = readRequiredFile(registryPath);
  if (registryText === undefined) {
    return;
  }

  const parsedYaml = parse(registryText);
  const validationResult = SourceRegistrySchema.safeParse(parsedYaml);
  if (!validationResult.success) {
    failures.push("source-registry.yaml does not satisfy SourceRegistrySchema");
    return;
  }

  const registry: SourceRegistry = validationResult.data;
  if (registry.sources.length < requiredSeedSourceIds.length) {
    failures.push(`source-registry.yaml must contain at least ${requiredSeedSourceIds.length} records; found ${registry.sources.length}`);
  }

  const sourceIds = new Set(registry.sources.map((source) => source.source_id));
  for (const sourceId of requiredSeedSourceIds) {
    if (!sourceIds.has(sourceId)) {
      failures.push(`source-registry.yaml is missing required seed source: ${sourceId}`);
    }
  }

  registry.sources.forEach((source) => {
    if (source.scheduled_crawling_enabled !== false) {
      failures.push(`${source.source_id} has scheduled_crawling_enabled other than false`);
    }
    if (source.approval_basis !== "user_assertion") {
      failures.push(`${source.source_id} lacks approval_basis: user_assertion`);
    }
    if (!source.review_status) {
      failures.push(`${source.source_id} lacks review_status`);
    }
    if (!source.allowed_collection_method) {
      failures.push(`${source.source_id} lacks allowed_collection_method`);
    }
    if (!source.checklist_reference) {
      failures.push(`${source.source_id} lacks checklist_reference`);
    }
  });
}

function verifyTextArtifact(path: string, requiredMarkers: string[]): void {
  const fileText = readRequiredFile(path);
  if (fileText === undefined) {
    return;
  }

  for (const marker of requiredMarkers) {
    if (!fileText.includes(marker)) {
      failures.push(`${path} is missing required marker: ${marker}`);
    }
  }
}

function verifyDiscoveryHelper(): void {
  const helperText = readRequiredFile(discoveryHelperPath);
  if (helperText === undefined) {
    return;
  }

  const forbiddenSchedulingPatterns = ["setInterval(", "cron.schedule", "node-cron"];
  for (const pattern of forbiddenSchedulingPatterns) {
    if (helperText.includes(pattern)) {
      failures.push(`discovery helper contains forbidden scheduling primitive: ${pattern}`);
    }
  }

  const literalCredentialAssignments = [
    /CDP_USERNAME\s*=\s*["'][^"']+["']/, 
    /CDP_PASSWORD\s*=\s*["'][^"']+["']/,
  ];
  for (const pattern of literalCredentialAssignments) {
    if (pattern.test(helperText)) {
      failures.push("discovery helper contains literal CDP credential assignment instead of process.env");
    }
  }
}

verifyRegistry();
verifyTextArtifact(accessReviewPath, [
  "## Scope",
  "## Required Checks",
  "## Seed Source Review Table",
  "## Scheduled Crawling Gate",
  "not official Hanyang authorization",
  "scheduled_crawling_enabled: false",
]);
verifyTextArtifact(discoveryNotesPath, [
  "## CDP Category Discovery",
  "## Non-Ingestion Boundary",
  "scheduled_crawling_enabled: false for all Phase 1 discovery outputs",
  "do not fabricate URLs not observed",
]);
verifyDiscoveryHelper();

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exitCode = 1;
} else {
  console.log("source governance invariants passed");
}
