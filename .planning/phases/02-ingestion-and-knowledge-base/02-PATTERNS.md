# Phase 2: Ingestion and Knowledge Base - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 18 planned new/modified files
**Analogs found:** 16 / 18 with implementation-code analogs

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/ingestion/access-gate.ts` | service / middleware | request-response / transform | `src/source-governance/validate-source-registry.ts` + `src/source-governance/source-registry.schema.ts` | role+flow exact for registry validation; gate logic new |
| `src/ingestion/fetch-client.ts` | service / utility | request-response / file-I/O | `scripts/discover-cdp-seed-scope.ts` | same access-boundary flow, different transport |
| `src/ingestion/normalized-record.ts` | model / config | transform | `src/source-governance/source-registry.schema.ts` | exact Zod schema pattern |
| `src/ingestion/deadline-status.ts` | utility | transform | `src/source-governance/source-registry.schema.ts` | role-match for enum/value validation |
| `src/ingestion/chunking.ts` | utility | transform | `src/source-governance/source-registry.schema.ts` | role-match; hashing is new |
| `src/ingestion/html/ibus-board-parser.ts` | service / parser | transform | `src/source-governance/source-registry.schema.ts` | partial schema/typed-output analog; Cheerio parsing new |
| `src/ingestion/pdf/pdf-page-parser.ts` | service / parser | file-I/O / transform | `src/source-governance/source-registry.schema.ts` | partial schema/typed-output analog; PDF parsing new |
| `src/ingestion/write-jsonl-kb.ts` | service / utility | file-I/O / batch | `scripts/verify-source-governance-artifacts.ts` | role-match for filesystem batch checks |
| `scripts/ingest-ibus-sample.ts` | route / CLI script | batch / request-response | `src/source-governance/validate-source-registry.ts` | exact CLI pattern |
| `scripts/ingest-cdp-pdf-sample.ts` | route / CLI script | batch / file-I/O | `src/source-governance/validate-source-registry.ts` | exact CLI pattern |
| `src/ingestion/*.test.ts` | test | transform | `src/source-governance/source-registry.schema.test.ts` | exact Vitest pattern |
| `fixtures/ingestion/ibus-listing.html` | test fixture | file-I/O / transform | `.planning/phases/01-source-discovery-and-governance/discovery-notes.md` | documentation evidence match |
| `fixtures/ingestion/ibus-detail.html` | test fixture | file-I/O / transform | `.planning/phases/01-source-discovery-and-governance/discovery-notes.md` | documentation evidence match |
| `fixtures/ingestion/cdp-student-guide-sample.pdf` | test fixture | file-I/O / transform | `.planning/phases/01-source-discovery-and-governance/discovery-notes.md` | documentation evidence match |
| `data/knowledge-base/` artifact policy | config / storage | file-I/O / batch | `.gitignore` | role-match for ignored generated files |
| `package.json` | config | batch | existing `package.json` | exact modify-in-place |
| `tsconfig.json` | config | batch | existing `tsconfig.json` | exact modify-in-place |
| `.gitignore` | config | file-I/O | existing `.gitignore` | exact modify-in-place |

## Pattern Assignments

### `src/ingestion/access-gate.ts` (service / middleware, request-response / transform)

**Analog:** `src/source-governance/validate-source-registry.ts` and `src/source-governance/source-registry.schema.ts`

**Imports pattern** (`validate-source-registry.ts` lines 1-3):
```typescript
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { SourceRegistrySchema, type SourceRegistry } from "./source-registry.schema.js";
```

Copy the NodeNext ESM `.js` import suffix convention. For `src/ingestion/access-gate.ts`, import from source governance with `../source-governance/source-registry.schema.js` and re-use `SourceRecord` rather than redefining registry metadata.

**Registry validation pattern** (`validate-source-registry.ts` lines 7-23):
```typescript
export function validateSourceRegistryFile(filePath: string): SourceRegistry {
  const fileText = readFileSync(filePath, "utf8");
  const parsedYaml = parse(fileText);
  const validationResult = SourceRegistrySchema.safeParse(parsedYaml);

  if (!validationResult.success) {
    const issueSummary = validationResult.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    console.error(`Source registry validation failed for ${filePath}`);
    console.error(JSON.stringify(issueSummary, null, 2));
    process.exitCode = 1;
    throw new Error("Source registry validation failed");
  }

  return validationResult.data;
}
```

**Gate fields to enforce** (`source-registry.schema.ts` lines 15-22 and 41-43):
```typescript
review_status: z.enum(["pending", "reviewed", "blocked"]),
allowed_collection_method: z.enum([
  "none_until_review",
  "manual_discovery_only",
  "approved_bounded_browser_discovery",
  "approved_manual_download",
]),
checklist_reference: z.string().min(1),
// ...
last_checked_at: z.string().datetime(),
scheduled_crawling_enabled: z.literal(false),
notes: z.string(),
```

**Access-gate behavior to copy from governance docs** (`source-access-review.md` lines 119-127):
```markdown
`scheduled_crawling_enabled: false` is mandatory for every seed source record. This field must remain `false` until:

1. The source's review row above is completed (`review_status` changed from `pending` to `reviewed`).
2. `allowed_collection_method` is updated to a method other than `none_until_review`.
3. `robots_status` and `tos_status` have been confirmed or updated with current evidence.

Phase 2 ingestion code must refuse to create scheduled crawl jobs for any source where `scheduled_crawling_enabled` is `false`.
```

---

### `src/ingestion/fetch-client.ts` (service / utility, request-response / file-I/O)

**Analog:** `scripts/discover-cdp-seed-scope.ts`

**Host allowlist and URL validation pattern** (`discover-cdp-seed-scope.ts` lines 3-5 and 28-41):
```typescript
export const SEED_SCOPE_HOSTS = ["cdp.hanyang.ac.kr"] as const;

const SEED_SCOPE_URL = "https://cdp.hanyang.ac.kr/";

function assertSeedScope(url: string): void {
  const parsed = new URL(url);
  if (!SEED_SCOPE_HOSTS.includes(parsed.host as (typeof SEED_SCOPE_HOSTS)[number])) {
    const output: DiscoveryOutput = {
      mode: "one-shot",
      seed_scope_url: SEED_SCOPE_URL,
      seed_scope_hosts: SEED_SCOPE_HOSTS,
      scheduled_crawling_enabled: false,
      forbidden_scheduling_status: "not_configured",
      status: "navigation_rejected_off_host",
    };
    console.log(JSON.stringify(output, null, 2));
    throw new Error(`Rejected off-host navigation target: ${parsed.host}`);
  }
}
```

**Off-host blocking pattern** (`discover-cdp-seed-scope.ts` lines 139-145):
```typescript
await page.route("**/*", (route) => {
  if (isSeedScopeUrl(route.request().url())) {
    return route.continue();
  }

  return route.abort();
});
```

For `fetch-client.ts`, mirror this as URL canonicalization plus host/source-id checks before any `fetch`, and keep concurrency/rate limiting explicit rather than broad `Promise.all`.

**No-secrets logging pattern** (`discover-cdp-seed-scope.ts` lines 131-134):
```typescript
const username = process.env.CDP_USERNAME;
const password = process.env.CDP_PASSWORD;
const envCredentialsAvailable = Boolean(username && password);
void envCredentialsAvailable;
```

Do not print credentials, cookies, request bodies, or storage state.

---

### `src/ingestion/normalized-record.ts` (model / config, transform)

**Analog:** `src/source-governance/source-registry.schema.ts`

**Imports and schema export pattern** (`source-registry.schema.ts` lines 1-8):
```typescript
import { z } from "zod";

export const SourceRecordSchema = z.object({
  source_id: z.string().min(1),
  canonical_url: z.string().url(),
  source_name: z.string().min(1),
  source_type: z.enum(["root", "category_discovery", "board", "pdf", "document_viewer"]),
  content_type: z.enum(["html", "pdf", "viewer", "unknown"]),
```

**Cross-record uniqueness pattern** (`source-registry.schema.ts` lines 47-72):
```typescript
export const SourceRegistrySchema = z
  .object({
    sources: z.array(SourceRecordSchema),
  })
  .superRefine((registry, context) => {
    const seenSourceIds = new Map<string, number>();

    registry.sources.forEach((source, index) => {
      const firstIndex = seenSourceIds.get(source.source_id);
      if (firstIndex !== undefined) {
        context.addIssue({
          code: "custom",
          message: `Duplicate source_id: ${source.source_id}`,
          path: ["sources", index, "source_id"],
        });
```

Use this for duplicate `record_id` / `chunk_id` validation in artifact manifests.

**Type export pattern** (`source-registry.schema.ts` lines 74-75):
```typescript
export type SourceRecord = z.infer<typeof SourceRecordSchema>;
export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;
```

---

### `src/ingestion/deadline-status.ts` (utility, transform)

**Analog:** `src/source-governance/source-registry.schema.ts` and `src/source-governance/source-registry.schema.test.ts`

**Enum/literal pattern** (`source-registry.schema.ts` lines 16-21):
```typescript
allowed_collection_method: z.enum([
  "none_until_review",
  "manual_discovery_only",
  "approved_bounded_browser_discovery",
  "approved_manual_download",
]),
```

Define `DeadlineStatusSchema = z.enum(["active", "expired", "unknown"])` and return `unknown` when evidence is absent.

**Negative-path test pattern** (`source-registry.schema.test.ts` lines 30-37):
```typescript
describe("SourceRecordSchema", () => {
  it("rejects records missing D-07/D-08 governance fields robots_status, tos_status, or approval_basis", () => {
    for (const fieldName of ["robots_status", "tos_status", "approval_basis"] as const) {
      const candidate = { ...validCdpRootRecord };
      delete candidate[fieldName];

      expect(SourceRecordSchema.safeParse(candidate).success).toBe(false);
```

Use table-style cases for Korean deadline strings: missing deadline, `마감`, `채용시까지`, `상시`, `D-3`, and explicit date ranges.

---

### `src/ingestion/chunking.ts` (utility, transform)

**Analog:** `src/ingestion/normalized-record.ts` should copy Zod/type patterns from `source-registry.schema.ts`; hashing has no existing implementation-code analog.

**Use schema/type export convention** (`source-registry.schema.ts` lines 47-75):
```typescript
export const SourceRegistrySchema = z
  .object({
    sources: z.array(SourceRecordSchema),
  })
  .superRefine((registry, context) => {
    const seenSourceIds = new Map<string, number>();
    // duplicate detection omitted
  });

export type SourceRecord = z.infer<typeof SourceRecordSchema>;
export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;
```

**Required chunk metadata source** (`02-RESEARCH.md` lines 238-249):
```typescript
// Source: Node crypto API availability in local Node runtime [VERIFIED: local environment]
import { createHash } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
```

Preserve `source_id`, source name, canonical/detail URL, page/detail anchor, fetched timestamp, posted date/deadline status, and content hash in every chunk.

---

### `src/ingestion/html/ibus-board-parser.ts` (service / parser, transform)

**Analog:** no HTML parser exists; copy project ESM/schema conventions from `source-registry.schema.ts` and source evidence from Phase 1.

**Source-specific evidence to encode as fixtures/selectors** (`discovery-notes.md` lines 37-42):
```markdown
## ibus Employment Board

- Seed URL: `https://ibus.hanyang.ac.kr/front/recruit/r-1`.
- Research fact: ibus exposes `취업정보`, 12 listings per page, dates, hit counts, detail links like `/front/recruit/r-1/view?id=6468`, and pagination to page 163.
- Phase 1 boundary: record the board pattern only; do not ingest all posts, detail pages, or paginated listings.
- Scope caveat: ibus is a College of Business and Economics board; do not treat it as campus-wide unless later source evidence supports that claim.
```

**Cheerio parser pattern from research** (`02-RESEARCH.md` lines 195-205):
```typescript
import * as cheerio from "cheerio";

export function parseIbusListingPage(html: string, pageUrl: string) {
  const $ = cheerio.load(html);
  return $("a[href*='/front/recruit/r-1/view']")
    .toArray()
    .map((anchor) => {
      const link = $(anchor);
      const canonicalUrl = new URL(link.attr("href") ?? "", pageUrl).href;
      return { title: link.text().replace(/\s+/g, " ").trim(), canonicalUrl };
    });
}
```

Normalize outputs through `NormalizedRecordSchema`; do not invent missing posted/deadline evidence.

---

### `src/ingestion/pdf/pdf-page-parser.ts` (service / parser, file-I/O / transform)

**Analog:** no PDF parser exists; copy project ESM/schema conventions from `source-registry.schema.ts` and page-citation evidence from Phase 1.

**PDF source evidence** (`discovery-notes.md` lines 25-29):
```markdown
## CDP Student Guide PDF

- Seed URL: `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf`.
- Research fact: CDP PDF is a 52-page PDF requiring later page-level citation.
- Phase 1 boundary: do not ingest or parse all PDF pages here; later ingestion must preserve URL, title/source label, retrieval timestamp, and page-level citations.
```

**PDF page extraction pattern from research** (`02-RESEARCH.md` lines 216-234):
```typescript
import { PDFParse } from "pdf-parse";

export async function extractPdfPages(url: string) {
  const parser = new PDFParse({ url });
  try {
    const [textResult, infoResult] = await Promise.all([
      parser.getText({ parsePageInfo: true }),
      parser.getInfo({ parsePageInfo: true }),
    ]);
    return textResult.pages.map((page) => ({
      pageNumber: page.pageNumber,
      rawText: page.text,
      sourceUrl: url,
      citationAnchor: `${url}#page=${page.pageNumber}`,
      totalPages: infoResult.total,
    }));
  } finally {
    await parser.destroy();
  }
}
```

---

### `src/ingestion/write-jsonl-kb.ts` (service / utility, file-I/O / batch)

**Analog:** `scripts/verify-source-governance-artifacts.ts`

**Filesystem import/read pattern** (`verify-source-governance-artifacts.ts` lines 1-18):
```typescript
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { SourceRegistrySchema, type SourceRegistry } from "../src/source-governance/source-registry.schema.js";

function readExistingFile(path: string): string | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  return readFileSync(path, "utf8");
}
```

For JSONL writing, use the same explicit `node:fs` imports; validate every record/chunk before writing and write deterministic order.

**Batch failure accumulation pattern** (`verify-source-governance-artifacts.ts` lines 10 and 121-128):
```typescript
const failures: string[] = [];

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exitCode = 1;
} else {
  console.log("source governance invariants passed");
}
```

Use this for verification scripts that check KB artifacts, not for library functions.

---

### `scripts/ingest-ibus-sample.ts` and `scripts/ingest-cdp-pdf-sample.ts` (CLI scripts, batch)

**Analog:** `src/source-governance/validate-source-registry.ts`

**CLI default argument pattern** (`validate-source-registry.ts` lines 5 and 26-31):
```typescript
const defaultRegistryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";

function runCli(): void {
  const registryPath = process.argv[2] ?? defaultRegistryPath;

  try {
    validateSourceRegistryFile(registryPath);
    console.log(`Source registry valid: ${registryPath}`);
```

**CLI error/exit pattern** (`validate-source-registry.ts` lines 32-43):
```typescript
  } catch (error) {
    if (process.exitCode !== 1) {
      const message = error instanceof Error ? error.message : "Unknown validation error";
      console.error(message);
      process.exitCode = 1;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
```

Use async variant from `discover-cdp-seed-scope.ts` lines 181-186 when the ingest command awaits fetch/PDF parsing:
```typescript
runOneShotDiscovery().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`cdp_seed_scope_discovery_failed: ${message}`);
  process.exitCode = 1;
});
```

---

### `src/ingestion/*.test.ts` (test, transform)

**Analog:** `src/source-governance/source-registry.schema.test.ts`

**Imports and typed fixture pattern** (`source-registry.schema.test.ts` lines 1-4):
```typescript
import { describe, expect, it } from "vitest";
import { SourceRecordSchema, SourceRegistrySchema, type SourceRecord } from "./source-registry.schema.js";

const validCdpRootRecord: SourceRecord = {
```

**Positive/negative schema assertions** (`source-registry.schema.test.ts` lines 49-53 and 65-74):
```typescript
it("accepts a valid CDP root record with D-07/D-08 evidence and SAFE-05 crawling disabled", () => {
  const result = SourceRecordSchema.safeParse(validCdpRootRecord);

  expect(result.success).toBe(true);
});

describe("SourceRegistrySchema", () => {
  it("rejects duplicate source identifiers with Duplicate source_id", () => {
    const result = SourceRegistrySchema.safeParse({
      sources: [validCdpRootRecord, { ...validCdpRootRecord }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("Duplicate source_id"))).toBe(true);
    }
  });
});
```

Tests should be fixture-first for parsers and gate-first for ingestion commands.

---

### `package.json`, `tsconfig.json`, `.gitignore` (config, batch/file-I/O)

**Analog:** existing files modified in place.

**Script pattern** (`package.json` lines 3-8):
```json
"scripts": {
  "test": "vitest run",
  "typecheck": "tsc --noEmit",
  "validate:sources": "tsx src/source-governance/validate-source-registry.ts .planning/phases/01-source-discovery-and-governance/source-registry.yaml",
  "discover:cdp": "tsx scripts/discover-cdp-seed-scope.ts",
  "verify:source-governance": "tsx scripts/verify-source-governance-artifacts.ts"
}
```

Add Phase 2 commands with the same `tsx scripts/...` convention, for example `ingest:ibus:sample`, `ingest:cdp-pdf:sample`, or `verify:knowledge-base`.

**Dependency section pattern** (`package.json` lines 10-20):
```json
"dependencies": {
  "yaml": "^2.8.4",
  "zod": "^4.4.2"
},
"devDependencies": {
  "@types/node": "^24.10.0",
  "playwright": "^1.59.1",
  "tsx": "^4.20.6",
  "typescript": "^5.9.3",
  "vitest": "^4.0.8"
}
```

Add `cheerio`, `pdf-parse`, and `p-limit` under `dependencies` if used by runtime ingestion modules.

**TypeScript include pattern** (`tsconfig.json` lines 2-11):
```json
"compilerOptions": {
  "target": "ES2022",
  "module": "NodeNext",
  "moduleResolution": "NodeNext",
  "strict": true,
  "esModuleInterop": true,
  "skipLibCheck": true,
  "types": ["node", "vitest"]
},
"include": ["src/**/*.ts", "scripts/**/*.ts"]
```

Place new implementation under `src/**/*.ts` and CLIs under `scripts/**/*.ts` so no tsconfig expansion is needed.

**Ignore generated/private artifacts pattern** (`.gitignore` lines 1-12):
```gitignore
.env
.env.*
!.env.example
node_modules/
.next/
dist/
build/
coverage/
*.log
.DS_Store
__pycache__/
.pytest_cache/
```

Add live `data/knowledge-base/` outputs here unless the planner explicitly limits committed files to sanitized fixtures.

## Shared Patterns

### Zod Runtime Validation + Inferred Types
**Source:** `src/source-governance/source-registry.schema.ts` lines 1-8 and 74-75  
**Apply to:** `normalized-record.ts`, `deadline-status.ts`, `chunking.ts`, parser outputs, manifest schemas
```typescript
import { z } from "zod";

export const SourceRecordSchema = z.object({
  source_id: z.string().min(1),
  canonical_url: z.string().url(),
  source_name: z.string().min(1),
  source_type: z.enum(["root", "category_discovery", "board", "pdf", "document_viewer"]),
  content_type: z.enum(["html", "pdf", "viewer", "unknown"]),
});

export type SourceRecord = z.infer<typeof SourceRecordSchema>;
```

### Registry Gate Before Fetch or Parse
**Source:** `validate-source-registry.ts` lines 7-23 and `source-access-review.md` lines 119-127  
**Apply to:** all ingestion CLIs, fetch/download clients, parser entrypoints
```typescript
const validationResult = SourceRegistrySchema.safeParse(parsedYaml);

if (!validationResult.success) {
  const issueSummary = validationResult.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  console.error(`Source registry validation failed for ${filePath}`);
  console.error(JSON.stringify(issueSummary, null, 2));
  process.exitCode = 1;
  throw new Error("Source registry validation failed");
}
```

### NodeNext ESM Import Suffixes
**Source:** `validate-source-registry.ts` line 3 and `verify-source-governance-artifacts.ts` line 3  
**Apply to:** all new TypeScript files importing local modules
```typescript
import { SourceRegistrySchema, type SourceRegistry } from "./source-registry.schema.js";
import { SourceRegistrySchema, type SourceRegistry } from "../src/source-governance/source-registry.schema.js";
```

### CLI Entrypoint and Exit Handling
**Source:** `validate-source-registry.ts` lines 26-43  
**Apply to:** `scripts/ingest-ibus-sample.ts`, `scripts/ingest-cdp-pdf-sample.ts`, verification scripts
```typescript
function runCli(): void {
  const registryPath = process.argv[2] ?? defaultRegistryPath;

  try {
    validateSourceRegistryFile(registryPath);
    console.log(`Source registry valid: ${registryPath}`);
  } catch (error) {
    if (process.exitCode !== 1) {
      const message = error instanceof Error ? error.message : "Unknown validation error";
      console.error(message);
      process.exitCode = 1;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
```

### Bounded Source Scope / Off-Host Rejection
**Source:** `scripts/discover-cdp-seed-scope.ts` lines 28-41 and 139-145  
**Apply to:** `access-gate.ts`, `fetch-client.ts`, Playwright/browser observation code
```typescript
function assertSeedScope(url: string): void {
  const parsed = new URL(url);
  if (!SEED_SCOPE_HOSTS.includes(parsed.host as (typeof SEED_SCOPE_HOSTS)[number])) {
    throw new Error(`Rejected off-host navigation target: ${parsed.host}`);
  }
}

await page.route("**/*", (route) => {
  if (isSeedScopeUrl(route.request().url())) {
    return route.continue();
  }

  return route.abort();
});
```

### Vitest Fixture Tests
**Source:** `source-registry.schema.test.ts` lines 1-4 and 49-53  
**Apply to:** all Phase 2 schemas, parsers, deadline and chunking utilities
```typescript
import { describe, expect, it } from "vitest";
import { SourceRecordSchema, SourceRegistrySchema, type SourceRecord } from "./source-registry.schema.js";

it("accepts a valid CDP root record with D-07/D-08 evidence and SAFE-05 crawling disabled", () => {
  const result = SourceRecordSchema.safeParse(validCdpRootRecord);

  expect(result.success).toBe(true);
});
```

### Governance Invariant Verification
**Source:** `scripts/verify-source-governance-artifacts.ts` lines 86-100 and 121-128  
**Apply to:** ingestion verification scripts and artifact checks
```typescript
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
```

## No Analog Found

Files with no close implementation-code match in the codebase. Planner should use `02-RESEARCH.md` library examples plus the project-local conventions above.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/ingestion/html/ibus-board-parser.ts` | service / parser | transform | No existing Cheerio/HTML parser exists; use research example and ibus evidence fixtures. |
| `src/ingestion/pdf/pdf-page-parser.ts` | service / parser | file-I/O / transform | No existing PDF parser exists; use `pdf-parse` research example and page-level citation contract. |
| `src/ingestion/chunking.ts` hash implementation | utility | transform | No existing hashing/content-ID helper exists; use Node `crypto` example from research. |

## Metadata

**Analog search scope:** `/Users/wantap/workspace/Capstone/New`; TypeScript implementation files, Phase 1 planning artifacts, source registry YAML, `.gitignore`, `package.json`, and `tsconfig.json`.
**Files scanned/read for patterns:** 17 (`AGENTS.md`, Phase 2 context/research, 5 TypeScript files, 4 Phase 1 planning/source artifacts, `.gitignore`, `package.json`, `tsconfig.json`, plus glob/grep search results).
**Pattern extraction date:** 2026-05-03
