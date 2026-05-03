# Phase 03: Source-Grounded Chat MVP - Pattern Map

**Mapped:** 2026-05-03  
**Files analyzed:** 23 new/modified files inferred from `03-CONTEXT.md` and `RESEARCH.md`  
**Analogs found:** 23 / 23

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/knowledge-base/jsonl-loader.ts` | service/utility | file-I/O, transform | `scripts/verify-knowledge-base.ts` | exact |
| `src/knowledge-base/knowledge-base-loader.test.ts` | test | file-I/O, validation | `src/ingestion/write-jsonl-kb.test.ts` | exact |
| `src/retrieval/retriever.ts` | service contract | request-response | `src/ingestion/normalized-record.ts` | role-match |
| `src/retrieval/normalize-korean.ts` | utility | transform | `src/ingestion/deadline-status.ts` | role-match |
| `src/retrieval/domain-synonyms.ts` | config/utility | transform | `src/ingestion/deadline-status.ts` | role-match |
| `src/retrieval/boilerplate-filter.ts` | utility | transform | `src/ingestion/deadline-status.ts` | role-match |
| `src/retrieval/bm25-retriever.ts` | service | request-response, transform | `src/ingestion/chunking.ts` | role-match |
| `src/retrieval/retrieval-fixtures.test.ts` | test | request-response, validation | `src/ingestion/chunking.test.ts` | role-match |
| `src/retrieval/boilerplate-filter.test.ts` | test | transform, validation | `src/ingestion/chunking.test.ts` | role-match |
| `src/chat/chat-contract.ts` | model | request-response | `src/ingestion/normalized-record.ts` | exact |
| `src/chat/evidence-policy.ts` | utility | request-response, transform | `src/ingestion/deadline-status.ts` | role-match |
| `src/chat/prompt.ts` | utility | transform | `scripts/ingest-playwright-sources.ts` | partial |
| `src/chat/provider.ts` | service contract | request-response | `src/ingestion/fetch-client.ts` | partial |
| `src/chat/openai-compatible-provider.ts` | service | request-response | `src/ingestion/fetch-client.ts` | role-match |
| `src/chat/output-validation.ts` | utility | validation, request-response | `scripts/verify-knowledge-base.ts` | role-match |
| `src/chat/chat-service.ts` | service | request-response | `src/ingestion/fetch-client.ts` | partial |
| `src/chat/chat-service.test.ts` | test | request-response, validation | `src/ingestion/write-jsonl-kb.test.ts` | role-match |
| `src/chat/prompt.test.ts` | test | transform, validation | `src/ingestion/chunking.test.ts` | role-match |
| `src/chat/output-validation.test.ts` | test | validation | `src/ingestion/write-jsonl-kb.test.ts` | role-match |
| `src/audit/audit-log.ts` | service/utility | file-I/O, append-only | `src/ingestion/write-jsonl-kb.ts` | role-match |
| `src/audit/audit-log.test.ts` | test | file-I/O, validation | `src/ingestion/write-jsonl-kb.test.ts` | exact |
| `scripts/evaluate-rag-mvp.ts` | script | batch, request-response | `scripts/verify-knowledge-base.ts` | role-match |
| `scripts/chat-smoke.ts` | script | request-response | `scripts/ingest-playwright-sources.ts` | partial |

## Pattern Assignments

### `src/knowledge-base/jsonl-loader.ts` (service/utility, file-I/O + transform)

**Analog:** `scripts/verify-knowledge-base.ts`

**Imports pattern** (lines 1-5):
```typescript
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { IngestionRunManifestSchema, KnowledgeChunkSchema, NormalizedRecordSchema, type KnowledgeChunk, type NormalizedRecord } from "../src/ingestion/normalized-record.js";
import { KnowledgeBaseManifestFileSchema } from "../src/ingestion/write-jsonl-kb.js";
```

**JSONL parse + schema validation pattern** (lines 43-72):
```typescript
function readJsonl<T>(outputDir: string, fileName: string, schema: z.ZodType<T>): T[] | undefined {
  const path = join(outputDir, fileName);
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return undefined;
  }

  const text = readFileSync(path, "utf8");
  if (text.length > 0 && !text.endsWith("\n")) {
    failures.push(`${path} must end with a final newline`);
  }

  const values: T[] = [];
  const lines = text.split("\n").filter((line) => line.length > 0);
  for (const [index, line] of lines.entries()) {
    try {
      const parsed = JSON.parse(line);
      const result = schema.safeParse(parsed);
      if (!result.success) {
        failures.push(`${path}:${index + 1} schema invalid: ${summarizeZodError(result.error)}`);
        continue;
      }
      values.push(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${path}:${index + 1} invalid JSON: ${message}`);
    }
  }
  return values;
}
```

**Apply:** convert script-global `failures` into returned load result or thrown `Error`; parse chunks with `KnowledgeChunkSchema`; fail closed on invalid artifacts before retrieval.

---

### `src/knowledge-base/knowledge-base-loader.test.ts` (test, file-I/O + validation)

**Analog:** `src/ingestion/write-jsonl-kb.test.ts`

**Temp-dir and cleanup pattern** (lines 1-10, 55-63):
```typescript
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "kb-writer-"));
  tempDirs.push(dir);
  return dir;
}
```

**Invalid-input rejection pattern** (lines 92-108):
```typescript
it("rejects invalid records before writing partial output", async () => {
  const outputDir = createTempDir();
  const invalidRecord: NormalizedRecord = { ...recordA, source_url: "http://ibus.hanyang.ac.kr/front/recruit/r-1" };

  await expect(
    writeKnowledgeBaseJsonl({
      records: [invalidRecord],
      chunks: [],
      outputDir,
      manifest: { run_id: "bad-run", generated_at: "2026-05-03T00:00:00.000Z", source_ids: [recordA.source_id] },
    }),
  ).rejects.toThrow();
});
```

---

### `src/retrieval/retriever.ts` (service contract, request-response)

**Analog:** `src/ingestion/normalized-record.ts`

**Type/schema export pattern** (lines 127-131):
```typescript
export type DeadlineStatus = z.infer<typeof DeadlineStatusSchema>;
export type CitationAnchor = z.infer<typeof CitationAnchorSchema>;
export type NormalizedRecord = z.infer<typeof NormalizedRecordSchema>;
export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>;
export type IngestionRunManifest = z.infer<typeof IngestionRunManifestSchema>;
```

**Apply:** define `RetrieveInput`, `RetrievedChunk`, ranking feature types, and `Retriever` as exported types/interfaces in one contract file. Import `type KnowledgeChunk` from `../ingestion/normalized-record.js` and use TypeScript ESM `.js` import suffixes.

---

### `src/retrieval/normalize-korean.ts` (utility, transform)

**Analog:** `src/ingestion/deadline-status.ts`

**Pure parser/normalizer function pattern** (lines 24-29, 78-95):
```typescript
export function classifyDeadlineStatus(text: string, referenceDate = new Date()): ClassifiedDeadlineStatus {
  const normalizedText = text.replace(/\s+/gu, " ").trim();
  if (normalizedText.length === 0) {
    return { status: "unknown" };
  }

  return { status: "unknown" };
}

function normalizeFullDate(rawDate: string): string | undefined {
  const match = rawDate.match(/(20\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/u);
  if (!match?.[1] || !match[2] || !match[3]) {
    return undefined;
  }

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

**Apply:** keep deterministic, dependency-light transforms; expose small functions for NFKC, whitespace collapse, Hangul 2/3-grams, and Latin/numeric tokens.

---

### `src/retrieval/domain-synonyms.ts` (config/utility, transform)

**Analog:** `src/ingestion/deadline-status.ts`

**Constant table + regex pattern** (lines 11-23):
```typescript
const activeUntilFilledPattern = /채용\s*시\s*까지|채용시까지|상시(?:채용|모집)?/u;
const dDayPattern = /D\s*([+-])\s*(\d+)/iu;
const closedPattern = /(?<!일)(?:접수\s*)?마감(?:됨|완료)?(?!\s*(?:일|기한|기간))/u;
const dayPattern = "(?:3[01]|[12]\\d|0?[1-9])";
```

**Apply:** prefer explicit checked constants over learned/inferred profiling. Include only D-06/domain service expansions from Phase 3 context.

---

### `src/retrieval/boilerplate-filter.ts` (utility, transform)

**Analog:** `src/ingestion/deadline-status.ts`

**Zod-classified result pattern** (lines 1-9, 24-35):
```typescript
import { z } from "zod";

export const ClassifiedDeadlineStatusSchema = z.object({
  status: z.enum(["active", "expired", "unknown"]),
  deadline_raw_text: z.string().optional(),
  deadline_date: z.string().optional(),
});

export type ClassifiedDeadlineStatus = z.infer<typeof ClassifiedDeadlineStatusSchema>;

export function classifyDeadlineStatus(text: string, referenceDate = new Date()): ClassifiedDeadlineStatus {
  const normalizedText = text.replace(/\s+/gu, " ").trim();
  if (normalizedText.length === 0) {
    return { status: "unknown" };
  }

  const activeUntilFilledMatch = normalizedText.match(activeUntilFilledPattern);
  if (activeUntilFilledMatch?.[0]) {
    return ClassifiedDeadlineStatusSchema.parse({
      status: "active",
      deadline_raw_text: activeUntilFilledMatch[0],
    });
  }
}
```

**Apply:** classify chunks as `answerable`, `mixed`, or `boilerplate_only` with a Zod schema and deterministic signals for login prompts, viewer controls, site chrome, and repeated footer text.

---

### `src/retrieval/bm25-retriever.ts` (service, request-response + transform)

**Analog:** `src/ingestion/chunking.ts`

**Validated input + deterministic output pattern** (lines 31-72):
```typescript
export function chunkNormalizedRecord(
  recordInput: NormalizedRecord,
  options: ChunkNormalizedRecordOptions = {},
): KnowledgeChunk[] {
  const record = NormalizedRecordSchema.parse(recordInput);
  const cleanedText = record.cleaned_text.trim();

  if (cleanedText.length === 0) {
    return [];
  }

  const maxCharacters = options.max_characters ?? DEFAULT_MAX_CHARACTERS;
  if (!Number.isInteger(maxCharacters) || maxCharacters <= 0) {
    throw new Error("max_characters must be a positive integer");
  }

  return chunkTexts.map((text, ordinal) => {
    const chunkId = sha256([record.source_id, record.content_hash, primaryAnchorUrl, String(ordinal)].join("\u001f"));
    return KnowledgeChunkSchema.parse({
      chunk_id: chunkId,
      record_id: record.record_id,
      source_id: record.source_id,
      source_name: record.source_name,
      source_url: record.source_url,
      canonical_url: record.canonical_url,
      title: record.title,
      category: record.category,
      fetched_at: record.fetched_at,
      posted_at: record.posted_at,
      deadline_status: record.deadline_status,
      deadline_raw_text: record.deadline_raw_text,
      content_hash: record.content_hash,
      citation_anchors: record.citation_anchors,
      source_text_trust: record.source_text_trust,
      chunk_ordinal: ordinal,
      text,
    });
  });
}
```

**Apply:** parse every input chunk with `KnowledgeChunkSchema`, preserve citation/freshness/deadline/trust fields, default `topK` to 5, and return stable sorted results with explicit ranking features.

---

### `src/retrieval/retrieval-fixtures.test.ts` and `src/retrieval/boilerplate-filter.test.ts` (tests)

**Analog:** `src/ingestion/chunking.test.ts`

**Korean fixture + metadata preservation assertions** (lines 5-34, 61-78):
```typescript
const cleanedText = [
  "ERICA 채용 공고",
  "마감일: 2026-05-31 / 게시일: 2026-05-01",
  "공식 상세 URL: https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
  "지원자는 공식 페이지의 최신 정보를 확인해야 합니다.",
].join("\n\n");

it("preserves citation anchors and freshness/deadline fields exactly", () => {
  const chunks = chunkNormalizedRecord(baseRecord, { max_characters: 80 });

  expect(chunks.length).toBeGreaterThan(0);
  for (const chunk of chunks) {
    expect(chunk.fetched_at).toBe(baseRecord.fetched_at);
    expect(chunk.posted_at).toBe(baseRecord.posted_at);
    expect(chunk.deadline_status).toBe(baseRecord.deadline_status);
    expect(chunk.citation_anchors).toEqual(baseRecord.citation_anchors);
    expect(chunk.source_text_trust).toBe("untrusted_source_text");
  }
});
```

**Apply:** tests must use Korean queries and assert top-k retrieval, source IDs, citation metadata, `source_text_trust`, active-vs-expired boosting, service 안내 coverage, and boilerplate exclusion.

---

### `src/chat/chat-contract.ts` (model, request-response)

**Analog:** `src/ingestion/normalized-record.ts`

**Zod model contract pattern** (lines 17-24, 56-74):
```typescript
export const DeadlineStatusSchema = z.enum(["active", "expired", "unknown"]);

export const CitationAnchorSchema = z
  .object({
    url: OfficialUrlSchema,
    label: z.string().min(1),
    page_number: z.number().int().positive().optional(),
  })
  .superRefine((anchor, context) => {
    if (anchor.url.includes("#page=") && anchor.page_number === undefined) {
      context.addIssue({
        code: "custom",
        message: "PDF citation anchors with #page= require a positive page_number",
        path: ["page_number"],
      });
    }
  });

export const KnowledgeChunkSchema = z.object({
  chunk_id: z.string().min(1),
  record_id: z.string().min(1),
  source_id: z.string().min(1),
  title: z.string().min(1),
  fetched_at: z.iso.datetime(),
  posted_at: z.iso.datetime().nullable(),
  deadline_status: DeadlineStatusSchema,
  citation_anchors: CitationAnchorsSchema,
  source_text_trust: SourceTextTrustSchema,
  text: z.string().min(1),
});
```

**Apply:** create `ChatRequestSchema`, `ChatCitationSchema`, and `ChatResponseSchema`; validate URLs as HTTPS official/source URLs and infer exported TypeScript types from schemas.

---

### `src/chat/evidence-policy.ts` (utility, request-response + transform)

**Analog:** `src/ingestion/deadline-status.ts`

**Threshold classifier pattern** (lines 38-46, 63-79):
```typescript
const dDayMatch = normalizedText.match(dDayPattern);
if (dDayMatch?.[0] && dDayMatch[1] && dDayMatch[2]) {
  const direction = dDayMatch[1];
  const dayCount = Number.parseInt(dDayMatch[2], 10);
  return ClassifiedDeadlineStatusSchema.parse({
    status: direction === "-" && dayCount > 0 ? "active" : "expired",
    deadline_raw_text: dDayMatch[0].replace(/\s+/gu, ""),
  });
}

return ClassifiedDeadlineStatusSchema.parse({
  status: deadlineDate >= toDateOnly(referenceDate) ? "active" : "expired",
  deadline_raw_text: fullDateMatch[0],
  deadline_date: deadlineDate,
});
```

**Apply:** implement explicit `hard_refuse`, `soft_hedge`, `normal_answer` tiers with defaults `0.30` and `0.50`; special-case zero chunks, boilerplate-only, and missing citation anchors as hard refusal.

---

### `src/chat/prompt.ts` (utility, transform)

**Analog:** `scripts/ingest-playwright-sources.ts`

**Safe text normalization before artifact construction** (lines 86-118, 121-132):
```typescript
function buildHtmlRecord(source: SourceRecord, decision: IngestionAccessDecision, html: string): NormalizedRecord {
  const fetchedAt = new Date().toISOString();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const title = cleanInlineText($("title").first().text()) || source.source_name;
  const bodyText = cleanBlockText($("body").text());
  const rawText = cleanBlockText([title, bodyText, `공식 URL: ${source.canonical_url}`].filter((part) => part.length > 0).join("\n"));

  return NormalizedRecordSchema.parse({
    title,
    raw_text: rawText,
    cleaned_text: rawText,
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
```

**Apply:** sanitize query/chunk text, never place raw retrieved text in system messages, and wrap evidence in explicit `<retrieved_context source_text_trust="untrusted_source_text">` blocks with citation numbers and metadata.

---

### `src/chat/provider.ts` and `src/chat/openai-compatible-provider.ts` (service contract/service, request-response)

**Analog:** `src/ingestion/fetch-client.ts`

**Dependency-injected fetch + safe response errors pattern** (lines 4-9, 38-72):
```typescript
export type ApprovedFetchOptions = {
  approval_evidence_text: string;
  signal?: AbortSignal;
  timeout_ms?: number;
  fetch_impl?: typeof fetch;
};

async function fetchApproved<T>(
  decision: IngestionAccessDecision,
  url: string,
  options: ApprovedFetchOptions,
  expectedKind: ResponseKind,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const targetUrl = assertFetchAllowed(decision, url, options.approval_evidence_text, expectedKind);
  const limiter = limiterForHost(targetUrl.host);

  return limiter(async () => {
    const fetchImpl = options.fetch_impl ?? fetch;
    const response = await fetchImpl(targetUrl.href, {
      method: "GET",
      credentials: "omit",
      redirect: "error",
      headers: headersFor(expectedKind),
      signal: composeSignal(options.signal, options.timeout_ms),
    });

    if (throttlingStatuses.has(response.status)) {
      throw new Error(`Approved fetch stopped on throttling-like status ${response.status} for ${targetUrl.href}`);
    }

    if (!response.ok) {
      throw new Error(`Approved fetch stopped on non-2xx status ${response.status} for ${targetUrl.href}`);
    }

    return consume(response);
  });
}
```

**Timeout/abort pattern** (lines 155-185):
```typescript
function composeSignal(signal: AbortSignal | undefined, timeoutMs: number | undefined): AbortSignal | undefined {
  const signals: AbortSignal[] = [];
  if (signal) {
    signals.push(signal);
  }
  if (timeoutMs !== undefined) {
    signals.push(createTimeoutSignal(timeoutMs));
  }
  if (signals.length === 0) {
    return undefined;
  }
  if (signals.length === 1) {
    return signals[0];
  }
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }
  return fallbackAnySignal(signals);
}
```

**Apply:** inject `fetch_impl` for tests; read OpenAI-compatible base URL/API key/model from env outside tests; redact secrets from thrown/logged metadata; use native `fetch` against `/chat/completions`.

---

### `src/chat/output-validation.ts` (utility, validation)

**Analog:** `scripts/verify-knowledge-base.ts`

**Invariant validation pattern** (lines 111-123, 180-182):
```typescript
function verifyChunkInvariants(chunks: readonly KnowledgeChunk[]): void {
  for (const chunk of chunks) {
    const missing = requiredChunkFields.filter((field) => isMissing(chunk[field]));
    if (missing.length > 0) {
      failures.push(`chunk ${chunk.chunk_id} missing required metadata: ${missing.join(", ")}`);
    }
    if (chunk.citation_anchors.length === 0) {
      failures.push(`chunk ${chunk.chunk_id} lacks citation_anchors`);
    }
    if (chunk.source_text_trust !== "untrusted_source_text") {
      failures.push(`chunk ${chunk.chunk_id} has unexpected source_text_trust ${chunk.source_text_trust}`);
    }
  }
}

function summarizeZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
```

**Apply:** collect validation failures for schema shape, Korean-first non-empty answer, citation marker mapping, missing `fetched_at`/URL/title, citationless factual answers, and prompt-injection compliance failures.

---

### `src/chat/chat-service.ts` (service, request-response)

**Analog:** `src/ingestion/fetch-client.ts`

**Layered orchestration pattern** (lines 22-36, 45-72):
```typescript
export async function fetchApprovedText(
  decision: IngestionAccessDecision,
  url: string,
  options: ApprovedFetchOptions,
): Promise<string> {
  return fetchApproved(decision, url, options, "html", (response) => response.text());
}

async function fetchApproved<T>(
  decision: IngestionAccessDecision,
  url: string,
  options: ApprovedFetchOptions,
  expectedKind: ResponseKind,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const targetUrl = assertFetchAllowed(decision, url, options.approval_evidence_text, expectedKind);
  const limiter = limiterForHost(targetUrl.host);

  return limiter(async () => {
    const fetchImpl = options.fetch_impl ?? fetch;
    const response = await fetchImpl(targetUrl.href, {
      method: "GET",
      credentials: "omit",
      redirect: "error",
      headers: headersFor(expectedKind),
      signal: composeSignal(options.signal, options.timeout_ms),
    });

    if (!response.ok) {
      throw new Error(`Approved fetch stopped on non-2xx status ${response.status} for ${targetUrl.href}`);
    }

    return consume(response);
  });
}
```

**Apply:** compose `Retriever`, evidence policy, prompt builder, provider, output validator, audit logger, clock, and trace ID generator through constructor dependencies; tests use mock provider and temp audit paths.

---

### `src/chat/*.test.ts` (chat service, prompt, output validation tests)

**Analog:** `src/ingestion/write-jsonl-kb.test.ts`

**Async rejection and stable artifact assertions** (lines 65-90, 115-125):
```typescript
describe("writeKnowledgeBaseJsonl", () => {
  it("creates deterministic records, chunks, and manifest files in stable order", async () => {
    const outputDir = createTempDir();
    const chunks = [...chunkNormalizedRecord(recordB), ...chunkNormalizedRecord(recordA)];

    const manifest = await writeKnowledgeBaseJsonl({
      records: [recordB, recordA],
      chunks,
      outputDir,
      manifest: {
        run_id: "fixture-run",
        generated_at: "2026-05-03T00:00:00.000Z",
        source_ids: [recordB.source_id, recordA.source_id],
      },
    });

    expect(manifest).toMatchObject({ run_id: "fixture-run", record_count: 2, chunk_count: chunks.length });
  });

  it("rejects invalid chunks before writing partial output", async () => {
    await expect(writeKnowledgeBaseJsonl({ records: [recordA], chunks: [invalidChunk], outputDir, manifest })).rejects.toThrow();
  });
});
```

**Apply:** assert provider is not called for hard refusals; prompt uses untrusted context tags; output validation downgrades malformed/citationless answers; Korean answer/refusal wording remains source-grounded.

---

### `src/audit/audit-log.ts` (service/utility, append-only file-I/O)

**Analog:** `src/ingestion/write-jsonl-kb.ts`

**Stable JSON + directory creation pattern** (lines 1-10, 61-66, 102-125):
```typescript
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";

await mkdir(input.outputDir, { recursive: true });
await writeFile(`${input.outputDir}/records.jsonl`, toJsonl(records), "utf8");
await writeFile(`${input.outputDir}/chunks.jsonl`, toJsonl(chunks), "utf8");
await writeFile(`${input.outputDir}/manifest.json`, `${stableJsonStringify(manifestFile)}\n`, "utf8");

function toJsonl(values: readonly unknown[]): string {
  if (values.length === 0) {
    return "";
  }
  return `${values.map((value) => stableJsonStringify(value)).join("\n")}\n`;
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    );
  }
  return value;
}
```

**Apply:** use append-only JSONL (planner should choose `appendFile` instead of `writeFile` for chat cycles) and reuse/export stable JSON sorting; never include API keys, cookies, tokens, `.env` values, or full successful prompts by default.

---

### `src/audit/audit-log.test.ts` (test, file-I/O + validation)

**Analog:** `src/ingestion/write-jsonl-kb.test.ts`

**File assertion pattern** (lines 81-89, 141-146):
```typescript
const recordsJsonl = readFileSync(join(outputDir, "records.jsonl"), "utf8");
const chunksJsonl = readFileSync(join(outputDir, "chunks.jsonl"), "utf8");
const manifestJson = readFileSync(join(outputDir, "manifest.json"), "utf8");

expect(recordsJsonl.endsWith("\n")).toBe(true);
expect(chunksJsonl.endsWith("\n")).toBe(true);
expect(KnowledgeBaseManifestFileSchema.safeParse(JSON.parse(manifestJson)).success).toBe(true);

it("requires generated knowledge-base outputs to be ignored without ignoring fixtures", () => {
  const gitignore = readFileSync(".gitignore", "utf8");

  expect(gitignore).toContain("data/knowledge-base/");
  expect(gitignore).not.toContain("fixtures/ingestion/");
});
```

**Apply:** verify each appended audit line is valid JSON, ends in newline, preserves stable shape, redacts model config secrets, and respects `.gitignore` for generated audit data if a persistent `data/audit/` path is used.

---

### `scripts/evaluate-rag-mvp.ts` (script, batch + request-response)

**Analog:** `scripts/verify-knowledge-base.ts`

**CLI failure accumulation pattern** (lines 7-15, 184-195):
```typescript
const failures: string[] = [];

function runCli(): void {
  const outputDir = process.argv[2];
  if (!outputDir) {
    failures.push("usage: npm run verify:knowledge-base -- <output-dir>");
    report();
    return;
  }

  report();
}

function report(): void {
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exitCode = 1;
    return;
  }
  console.log("knowledge base verification passed");
}

runCli();
```

**Apply:** make deterministic/mock checks default; only run optional LLM judge when env config exists; report retrieval/citation/refusal/Korean-quality failures without requiring live secrets for CI.

---

### `scripts/chat-smoke.ts` (script, request-response)

**Analog:** `scripts/ingest-playwright-sources.ts`

**Async CLI entrypoint pattern** (lines 20-62, 138-142):
```typescript
async function runCli(): Promise<void> {
  const registry = loadSourceRegistryForIngestion(registryPath);
  const browser = await chromium.launch({ headless: true });
  const records: NormalizedRecord[] = [];

  try {
    // work
  } finally {
    await browser.close();
  }

  console.log(`playwright source ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${outputDir}`);
}

runCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ingest_playwright_sources_failed: ${message}`);
  process.exitCode = 1;
});
```

**Apply:** smoke script should instantiate loader/retriever/chat service, ask a Korean sample question, print structured answer/citations/trace ID only, and avoid logging API keys or full prompt snapshots.

## Shared Patterns

### TypeScript ESM imports and validation-first contracts

**Source:** `package.json` and `src/ingestion/normalized-record.ts`  
**Apply to:** all new TypeScript modules

```json
// package.json lines 1-5
{
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

```typescript
// src/ingestion/normalized-record.ts lines 1, 127-131
import { z } from "zod";

export type DeadlineStatus = z.infer<typeof DeadlineStatusSchema>;
export type CitationAnchor = z.infer<typeof CitationAnchorSchema>;
export type NormalizedRecord = z.infer<typeof NormalizedRecordSchema>;
export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>;
export type IngestionRunManifest = z.infer<typeof IngestionRunManifestSchema>;
```

### Citation, freshness, and untrusted source metadata preservation

**Source:** `src/ingestion/chunking.ts`  
**Apply to:** loader, retriever, citation builder, chat contract, output validation, tests

```typescript
// src/ingestion/chunking.ts lines 52-70
return KnowledgeChunkSchema.parse({
  chunk_id: chunkId,
  record_id: record.record_id,
  source_id: record.source_id,
  source_name: record.source_name,
  source_url: record.source_url,
  canonical_url: record.canonical_url,
  title: record.title,
  category: record.category,
  fetched_at: record.fetched_at,
  posted_at: record.posted_at,
  deadline_status: record.deadline_status,
  deadline_raw_text: record.deadline_raw_text,
  content_hash: record.content_hash,
  citation_anchors: record.citation_anchors,
  source_text_trust: record.source_text_trust,
  chunk_ordinal: ordinal,
  text,
});
```

### Fail-closed invariant checking

**Source:** `scripts/verify-knowledge-base.ts`  
**Apply to:** KB loader, output validation, eval gate

```typescript
// scripts/verify-knowledge-base.ts lines 111-123
function verifyChunkInvariants(chunks: readonly KnowledgeChunk[]): void {
  for (const chunk of chunks) {
    const missing = requiredChunkFields.filter((field) => isMissing(chunk[field]));
    if (missing.length > 0) {
      failures.push(`chunk ${chunk.chunk_id} missing required metadata: ${missing.join(", ")}`);
    }
    if (chunk.citation_anchors.length === 0) {
      failures.push(`chunk ${chunk.chunk_id} lacks citation_anchors`);
    }
    if (chunk.source_text_trust !== "untrusted_source_text") {
      failures.push(`chunk ${chunk.chunk_id} has unexpected source_text_trust ${chunk.source_text_trust}`);
    }
  }
}
```

### Stable JSONL artifact style

**Source:** `src/ingestion/write-jsonl-kb.ts`  
**Apply to:** audit logger and any eval artifacts

```typescript
// src/ingestion/write-jsonl-kb.ts lines 102-110
function toJsonl(values: readonly unknown[]): string {
  if (values.length === 0) {
    return "";
  }
  return `${values.map((value) => stableJsonStringify(value)).join("\n")}\n`;
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}
```

### Deterministic tests with Korean fixtures

**Source:** `src/ingestion/chunking.test.ts`  
**Apply to:** retrieval, chat, citation, refusal, prompt-injection, audit tests

```typescript
// src/ingestion/chunking.test.ts lines 80-89
it("does not drop Korean text, URLs, dates, deadline fields, or citation anchors", () => {
  const chunks = chunkNormalizedRecord(baseRecord, { max_characters: 80 });
  const combinedText = chunks.map((chunk) => chunk.text).join("\n\n");

  expect(combinedText).toContain("ERICA 채용 공고");
  expect(combinedText).toContain("마감일: 2026-05-31");
  expect(combinedText).toContain("게시일: 2026-05-01");
  expect(combinedText).toContain("https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123");
  expect(chunks[0]?.citation_anchors).toEqual(baseRecord.citation_anchors);
});
```

### Network/provider dependency injection and secret safety

**Source:** `src/ingestion/fetch-client.ts`  
**Apply to:** OpenAI-compatible provider and chat smoke script

```typescript
// src/ingestion/fetch-client.ts lines 49-56, 62-69
const fetchImpl = options.fetch_impl ?? fetch;
const response = await fetchImpl(targetUrl.href, {
  method: "GET",
  credentials: "omit",
  redirect: "error",
  headers: headersFor(expectedKind),
  signal: composeSignal(options.signal, options.timeout_ms),
});

if (!response.ok) {
  throw new Error(`Approved fetch stopped on non-2xx status ${response.status} for ${targetUrl.href}`);
}

const contentType = response.headers.get("content-type") ?? "";
if (!contentTypeMatches(contentType, expectedKind)) {
  throw new Error(`Approved fetch content-type mismatch for ${targetUrl.href}: ${contentType || "missing"}`);
}
```

## No Analog Found

All suggested Phase 3 files have at least a partial existing analog. There is no existing chat server, LLM provider, vector store, API route, or RAG orchestrator, so `src/chat/*` should copy lower-level dependency-injection, validation, and file-artifact patterns rather than framework-specific controller patterns.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None | — | — | Existing ingestion/source-governance code provides reusable TypeScript, validation, JSONL, CLI, and test conventions. |

## Metadata

**Analog search scope:** `src/ingestion/`, `src/source-governance/`, `scripts/`, `package.json`, prior planning context  
**Files scanned:** 78 project/planning/code files via glob; 11 analog files read directly  
**Pattern extraction date:** 2026-05-03
