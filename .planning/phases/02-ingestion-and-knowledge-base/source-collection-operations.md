# Source Collection Operations

**Updated:** 2026-05-22  
**Scope:** Phase 2 source ingestion and local JSONL knowledge-base generation

This document explains how each approved source family is collected, which command runs it, where output is written, and which safety constraints apply. Generated outputs under `data/knowledge-base/` are local artifacts and are ignored by git unless intentionally force-added.

## Common Output Shape

Every ingestion script writes the same JSONL knowledge-base layout:

- `records.jsonl`: normalized source records with source URL, title, category, dates, raw/cleaned text, citation anchors, and trust metadata.
- `chunks.jsonl`: retrieval chunks created from records.
- `manifest.json`: run metadata, source IDs, record IDs, chunk IDs, and timestamps.

Validate any generated directory with:

```bash
npm run verify:knowledge-base -- <output-dir>
```

## Unified Runtime Knowledge Base

RAG uses one unified in-memory knowledge base loaded through `src/knowledge-base/dataset-registry.ts` and `src/knowledge-base/jsonl-loader.ts`. The loader does not maintain separate retrievers per source family; it resolves dataset directories, validates every `chunks.jsonl`, backfills known legacy taxonomy fields, then builds one BM25 retriever over all loadable chunks.

Registry states:

- `active`: included in the default RAG loader.
- `legacy_fallback`: included only when split replacement outputs are absent.
- `disabled`: known optional output is absent or superseded.
- `blocked`: known output exists as a collection target but is intentionally excluded from default RAG.

Default active datasets:

- `data/knowledge-base/ibus-employment-board`
- `data/knowledge-base/fixture-cdp-pdf`
- `data/knowledge-base/playwright-sources`
- `data/knowledge-base/ewil-homepage`

Optional registry behavior:

- `data/knowledge-base/manual-cdp-posts` becomes `active` when `chunks.jsonl` is present.
- `data/knowledge-base/cdp-authenticated-sources` becomes `active` when bounded manual-session output `chunks.jsonl` is present.
- `data/knowledge-base/ewil-authenticated-sources/공지사항` becomes `active` when `chunks.jsonl` is present.
- `data/knowledge-base/ewil-authenticated-sources/현장실습후기` becomes `active` when `chunks.jsonl` is present.
- `data/knowledge-base/ewil-authenticated-sources` becomes `legacy_fallback` only when it has `chunks.jsonl` and the split E-WIL category outputs are absent.

Runtime filter taxonomy:

- `collection_category`: `job_posting`, `career_review`, `internship_notice`, `internship_review`, `career_program`, `guide`, `notice`, `source_discovery`, `unknown_legacy`.
- `source_family`: `cdp`, `ewil`, `ibus`, `book`, `hanyang_career`, `unknown_legacy`.
- `deadline_status`: `active`, `expired`, `unknown`.

Every new chunk should carry `collection_category`, `source_family`, and Korean `category_label_ko`. Known legacy chunks without those fields are backfilled by the loader; unknown mappings fail closed instead of silently entering RAG.

Verify active dataset coverage in RAG with:

```bash
npm exec -- tsx -e 'import { loadableKnowledgeBaseDirectories, resolveKnowledgeBaseDatasets } from "./src/knowledge-base/dataset-registry.ts"; const datasets = resolveKnowledgeBaseDatasets(); console.log(JSON.stringify({ datasets, loadable: loadableKnowledgeBaseDirectories(datasets) }, null, 2));'
npm test -- src/knowledge-base/knowledge-base-loader.test.ts
```

For every directory reported as `active` or `legacy_fallback`, run:

```bash
npm run verify:knowledge-base -- <active-or-legacy-fallback-dir>
```

The shared runtime retriever is `ReloadableKnowledgeBaseRetriever`. `reload()` builds and validates the next chunk snapshot and BM25 retriever before swapping it into service, so a failed reload leaves the previous version active. Use the 100k scale benchmark to verify synthetic all-taxonomy retrieval and reload behavior without writing corpus data under `data/`:

```bash
npm run benchmark:kb:100k
```

Benchmark evidence is written to `.sisyphus/evidence/task-10-100k-benchmark.json` with cold load, memory delta, p95 unfiltered retrieval, p95 filtered retrieval, reload time, threshold pass/fail fields, and an inverted-index recommendation if thresholds fail.

## Safety Rules For All Collection

- No scheduled crawling. `scheduled_crawling_enabled` remains `false` for all sources.
- Keep collection bounded to approved source IDs and exact seed/observed URLs.
- Preserve Korean source labels, official URLs, fetched timestamps, posted dates when available, citation anchors, and `source_text_trust: "untrusted_source_text"`.
- Do not claim official Hanyang endorsement or production crawling permission.
- Do not store credentials, cookies, localStorage, storage state, traces, screenshots, HAR files, or `.env` values.
- Use low concurrency and delays. Current scripts use one-at-a-time collection and roughly 1.2s delays where they fetch multiple pages.

## CDP Public Pages And Book Viewer

Source IDs:

- `cdp-root`
- `cdp-career-category-discovery`
- `cdp-recruit-category-discovery`
- `book-success-story-viewer`

Command:

```bash
npm run ingest:playwright:sources
```

Output:

```text
data/knowledge-base/playwright-sources
```

Collection method:

- Uses headless Playwright.
- Opens one fresh non-persistent browser context per source.
- Restricts requests to the exact source origin.
- Visits four fixed URLs from the source registry/script:
  - CDP main page
  - CDP career notice category page
  - CDP recruitment list page
  - Hanyang book viewer success-story URL
- Removes scripts/styles/SVG/noscript from HTML and stores body text with citation anchors.

What it does not do:

- Does not log in.
- Does not infer additional CDP URLs.
- Does not crawl category pagination or detail pages beyond the fixed approved URLs.

Verification:

```bash
npm run verify:knowledge-base -- data/knowledge-base/playwright-sources
```

## CDP Seed Discovery

Source family:

- CDP root/category discovery only.

Command:

```bash
npm run discover:cdp
```

Dry run:

```bash
npm run discover:cdp -- --dry-run
```

Collection method:

- This is a discovery/inspection helper, not a KB writer.
- Uses Playwright against `cdp.hanyang.ac.kr` only.
- Reports candidate same-host links matching category hints such as 취업정보, 채용정보, recruit, and job.
- Refuses off-host navigation.

Output:

- Prints JSON to stdout.
- Does not write `records.jsonl` or `chunks.jsonl`.

Use this when:

- You need to inspect CDP structure before updating approved source registry entries.

Do not use this as:

- A crawler.
- A scheduled source refresh.
- A way to bypass login-required CDP areas.

## CDP Student Guide PDF

Source ID:

- `cdp-student-guide-pdf`

Command:

```bash
npm run ingest:cdp-pdf:sample
```

Fixture mode:

```bash
npm run ingest:cdp-pdf:sample -- --fixture
```

Optional output override:

```bash
npm run ingest:cdp-pdf:sample -- --output data/knowledge-base/fixture-cdp-pdf
```

Output:

```text
data/knowledge-base/fixture-cdp-pdf
```

Collection method:

- Fixture mode reads `fixtures/ingestion/cdp-student-guide-sample.pdf`.
- Live mode fetches the approved direct PDF URL from the source registry.
- Parses PDF pages with page-level text extraction.
- Creates one or more page-level records with page citation anchors.

Safety constraints:

- Approved only for the original direct student-guide PDF seed URL.
- No CDP category crawling is implied by this approval.
- Page-level citations must be preserved because answers about guidebook content need exact page evidence.

Verification:

```bash
npm run verify:knowledge-base -- data/knowledge-base/fixture-cdp-pdf
```

## CDP Manual Post Exports

Source IDs used in output:

- `cdp-recruit-general-board`
- `cdp-recruit-event-board`

Manual browser-console export helper:

```text
scripts/export-cdp-manual-posts-console.js
```

There is no npm wrapper for this helper. It is meant to be copied into the browser console while the operator is manually viewing an approved CDP board page on `cdp.hanyang.ac.kr`.

What the browser-console helper does:

- Runs only on `cdp.hanyang.ac.kr` from the approved CDP board list URLs.
- Allows only the manually selected CDP boards currently encoded in the helper: `채용상담 및 설명회`, `일반채용공고`.
- Sanitizes URLs to HTTPS same-host CDP detail URLs and rejects credential-like query keys such as `token`, `session`, `jsessionid`, `authorization`, `auth`, or `password`.
- Detects CDP list/detail URL patterns, including several JavaScript/postback-style detail routes.
- Fetches current/list/detail pages with a default 1200ms delay.
- Downloads a local JSON export such as `cdp-manual-posts-<timestamp>.json`.

Then ingest the downloaded local JSON with:

Command:

```bash
npm run ingest:cdp:manual-posts -- --input <manual-export.json>
```

Example:

```bash
npm run ingest:cdp:manual-posts -- --input fixtures/ingestion/cdp-manual-posts.example.json --output /tmp/manual-cdp-posts
```

Default output:

```text
data/knowledge-base/manual-cdp-posts
```

Collection method:

- This script does not browse CDP.
- It converts a user/manual JSON export into normalized records.
- It merges new records/chunks with any existing JSONL in the output directory.
- Each provided post detail URL is preserved as the primary citation anchor.

Use this when:

- CDP authenticated/detail content was manually exported by the user and should be converted into KB records without automated login or crawling.

Input requirement:

- JSON must match `CdpManualPostExportSchema` in `src/ingestion/manual-cdp-posts.ts`.

Safety constraints:

- Do not put secrets, cookies, session identifiers, or private student data into the manual export.
- Do not paste the browser-console helper outside the approved CDP board list URLs.
- Do not use this to launder broad CDP crawling into the KB; the export should stay within approved/manual scope.

Verification:

```bash
npm run verify:knowledge-base -- data/knowledge-base/manual-cdp-posts
```

## CDP Authenticated Manual Session

Source IDs approved for manual-session collection:

- `cdp-recruit-general-board`
- `cdp-recruit-event-board`

Output source IDs used by normalized records:

- `cdp-recruit-general-board`
- `cdp-recruit-event-board`

Command:

```bash
npm run ingest:cdp:authenticated
```

Default output:

```text
data/knowledge-base/cdp-authenticated-sources
```

Registry behavior:

- This output is included in the default runtime RAG loader when `chunks.jsonl` is present.
- Keep the collection bounded to the approved CDP board/list URLs below; do not use this as broad CDP crawling approval.

Common options:

```bash
npm run ingest:cdp:authenticated -- --source all --max-list-pages 5 --max-detail-pages 30
npm run ingest:cdp:authenticated -- --source recruit --max-list-pages 1 --max-detail-pages 10
npm run ingest:cdp:authenticated -- --source events --max-list-pages 1 --max-detail-pages 10
npm run ingest:cdp:authenticated -- --output data/knowledge-base/cdp-authenticated-sources
```

Allowed `--source` values:

- `all`
- `recruit` for 일반채용공고
- `events` for 채용상담 및 설명회

Bounds:

- `--max-list-pages`: `1..20`
- `--max-detail-pages`: `0..200`
- `--headless` intentionally fails because manual login requires a headed browser.

Collection method:

1. Opens a fresh non-persistent headed Chromium context.
2. Navigates to the first selected approved CDP board/list URL.
3. User logs in manually if CDP asks.
4. User presses Enter in the terminal.
5. Script visits only the approved exact CDP board/list URLs: `https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx` and `https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx`.
6. Script extracts same-host detail URLs discovered from those lists, including `RecruitView.aspx?...` and `FuncScheView.aspx?funcidx=...` patterns.
7. Script clears cookies and closes the context when done.
8. Records/chunks are written once at the end of the run, replacing the JSONL files in the selected output directory.

Shared CDP safeguards:

- No login automation.
- No password entry by the script.
- No cookies/storage state/localStorage/HAR/traces/screenshots saved.
- Same-origin routing is limited to `https://cdp.hanyang.ac.kr`.
- List traversal is bounded by `--max-list-pages`; detail traversal is bounded by `--max-detail-pages`.
- Collection is one-at-a-time with roughly 1.2s delays.
- Citation URLs, posted dates, deadline text/status, fetched timestamps, and `source_text_trust: "untrusted_source_text"` are preserved through the existing CDP normalized-record builder.

Verification:

```bash
npm run verify:knowledge-base -- data/knowledge-base/cdp-authenticated-sources
```

## IBUS Employment Board

Source ID:

- `ibus-employment-board`

Command:

```bash
npm run ingest:ibus
```

Fixture mode:

```bash
npm run ingest:ibus -- --fixture
```

Bounded live options:

```bash
npm run ingest:ibus -- --pages 20 --delay 1200 --output data/knowledge-base/ibus-employment-board
```

Environment alternatives:

```bash
COLLECT_MAX_PAGES=20 COLLECT_DELAY_MS=1200 npm run ingest:ibus
```

Output:

```text
data/knowledge-base/ibus-employment-board
```

Collection method:

- Public HTML board at `https://ibus.hanyang.ac.kr/front/recruit/r-1`.
- Fixture mode reads sanitized local listing/detail HTML fixtures.
- Default live mode collects one listing page and the first detail entry.
- Bounded live mode can collect up to twenty listing pages.
- For each listing entry, the script fetches the detail page and builds normalized records with title, posted text, deadline/status signals, source URL, and citation anchors.

Bounds:

- `--pages` / `COLLECT_MAX_PAGES` must be `<= 20`.
- Live `--delay` / `COLLECT_DELAY_MS` must be `>= 1200` ms.
- Fixture mode does not support `--pages > 1`.

Safety constraints:

- Public board only.
- No broader Hanyang crawling.
- No inferred non-board URLs.
- Stop on no entries or fetch failures.

Verification:

```bash
npm run verify:knowledge-base -- data/knowledge-base/ibus-employment-board
```

## E-WIL Public Homepage

Source ID:

- `ewil-internship-system`

Output:

```text
data/knowledge-base/ewil-homepage
```

Collection method:

- This is a reviewed public landing-page KB artifact for `https://e-wil.hanyang.ac.kr/index.do`.
- It grounds answers about the existence/location of E-WIL and public landing-page information.

Current operational note:

- There is no dedicated npm ingestion command for this static artifact in `package.json`.
- Regeneration should be done only after updating the approved public landing-page evidence and preserving citation/freshness metadata.

Verification:

```bash
npm run verify:knowledge-base -- data/knowledge-base/ewil-homepage
```

Safety constraints:

- Public landing page only.
- Do not index login-only service pages through this public artifact.

## E-WIL Authenticated Manual Session

Source IDs:

- `ewil-notice-board`
- `ewil-info-board`
- `ewil-internship-reviews`

Command:

```bash
npm run ingest:ewil:authenticated
```

Default output:

```text
data/knowledge-base/ewil-authenticated-sources/공지사항
data/knowledge-base/ewil-authenticated-sources/현장실습후기
```

The collector groups authenticated E-WIL records by category:

- `공지사항`: `ewil-notice-board` and `ewil-info-board`
- `현장실습후기`: `ewil-internship-reviews`

Common options:

```bash
npm run ingest:ewil:authenticated -- --source all --max-list-pages 5 --max-detail-pages 30
npm run ingest:ewil:authenticated -- --source notice --max-list-pages 1 --max-detail-pages 10
npm run ingest:ewil:authenticated -- --source info --max-list-pages 1 --max-detail-pages 10
npm run ingest:ewil:authenticated -- --source reviews --max-list-pages 1 --max-detail-pages 10
npm run ingest:ewil:authenticated -- --output data/knowledge-base/ewil-authenticated-sources
```

Allowed `--source` values:

- `all`
- `notice`
- `info`
- `reviews`

Bounds:

- `--max-list-pages`: `1..20`
- `--max-detail-pages`: `0..200`
- `--headless` intentionally fails because manual login requires a headed browser.

Collection method:

1. Opens a fresh non-persistent headed Chromium context.
2. Navigates to `https://e-wil.hanyang.ac.kr/index.do`.
3. User logs in manually in the browser.
4. User presses Enter in the terminal.
5. Script visits only the approved exact E-WIL source URLs.
6. Script clears cookies and closes the context when done.
7. Records/chunks are written once at the end of the run, replacing the JSONL files in each selected category subdirectory.

Shared E-WIL safeguards:

- No login automation.
- No password entry by the script.
- No cookies/storage state/localStorage/HAR/traces/screenshots saved.
- Same-origin routing is limited to E-WIL plus the Hanyang API origin needed by the site.
- Login/user chrome lines are removed from collected text.

### E-WIL Notice / Internship Announcements

Source URL:

```text
https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE
```

Collection behavior:

- Collects the list page as one record.
- Extracts visible detail candidates from the list.
- Opens each detail page and records title, posted date, content, deadline-like text, attachment labels, and citation anchors.
- PDF attachments are fetched and parsed when they are same-origin, fetchable as PDF bytes, under the size limit, and pass PDF-header checks.

Current limitation:

- Pagination for JavaScript/form-driven E-WIL lists is still limited; first visible page collection is reliable, broader page traversal needs explicit pagination handling.

### E-WIL Info / Orientation Materials

Source URL:

```text
https://e-wil.hanyang.ac.kr/data/list.do?type=INFO
```

Collection behavior:

- Same board flow as NOTICE.
- Particularly useful for orientation/session materials and PDF attachments.
- Detail and PDF citations are preserved when available.

Current limitation:

- Same pagination limitation as NOTICE.

### E-WIL Internship Reviews

Source URL:

```text
https://e-wil.hanyang.ac.kr/internphoto/compList.do
```

Collection behavior:

- Extracts company candidates from the company list.
- Opens each company page under `/internphoto/read.do`.
- Extracts review detail candidates.
- Generates/directly opens review detail URLs like:

```text
https://e-wil.hanyang.ac.kr/internphoto/view.do?jid_seq=<reviewId>&jim_seq=<companyId>
```

- Records opened detail pages when they have enough visible text and review-detail markers.
- Logs a safe summary for each collected review: candidate key, title/agency estimate, posted date if available, and text length. It does not print full review text.

Smoke test command:

```bash
npm run ingest:ewil:authenticated -- --source reviews --max-list-pages 1 --max-detail-pages 10
```

Expected progress logs:

```text
E-WIL reviews: https://e-wil.hanyang.ac.kr/internphoto/compList.do yielded N company candidates
E-WIL reviews: company <companyId> yielded N review candidates
E-WIL reviews: collected internphoto-view:<reviewId>:<companyId> (title=...; posted=...; chars=...)
```

Current limitation:

- Company-list pagination is still bounded by the same E-WIL pagination support.
- If real review detail labels differ, recordability markers may need expansion.

Verification:

```bash
npm run verify:knowledge-base -- data/knowledge-base/ewil-authenticated-sources
```

## Governance And Validation Commands

Validate source registry schema:

```bash
npm run validate:sources
```

Verify governance invariants:

```bash
npm run verify:source-governance
```

Check freshness/status metadata:

```bash
npm run status:freshness
```

This command prints a JSON operator report over local KB directories. If directories are passed as arguments, it reports those; otherwise it discovers local KB directories. It is read-only.

Regenerate pre-ingestion gate evidence when source registry decisions change:

```bash
tsx scripts/observe-pre-ingestion-gate.ts
```

Dry run:

```bash
tsx scripts/observe-pre-ingestion-gate.ts --dry-run
```

This helper evaluates registry-backed ingestion access decisions and writes `.planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-access-evidence.md` unless run in dry-run mode. Treat the approval record and registry as the authority; this evidence file is a generated observation of those decisions.

Evaluate current RAG MVP behavior:

```bash
npm run evaluate:rag:mvp
```

Run release readiness after generated KB fixtures exist:

```bash
npm run release:ready
```

## Suggested Operator Flow

For a clean local rebuild of currently scripted KB artifacts:

```bash
npm run validate:sources
npm run verify:source-governance
npm run ingest:ibus -- --fixture
npm run ingest:cdp-pdf:sample -- --fixture
npm run ingest:playwright:sources
npm run verify:knowledge-base -- data/knowledge-base/ibus-employment-board
npm run verify:knowledge-base -- data/knowledge-base/fixture-cdp-pdf
npm run verify:knowledge-base -- data/knowledge-base/playwright-sources
npm run verify:knowledge-base -- data/knowledge-base/ewil-homepage
```

For manual/private-session optional E-WIL data, run separately and verify separately:

```bash
npm run ingest:ewil:authenticated -- --source reviews --max-list-pages 1 --max-detail-pages 10
npm run verify:knowledge-base -- data/knowledge-base/ewil-authenticated-sources
```

Only generate optional authenticated E-WIL output after the team explicitly accepts the access scope, privacy review, and citation behavior. Once split E-WIL `chunks.jsonl` files are present, the registry treats those category outputs as `active` and includes them in default runtime retrieval.

For manual/private-session optional CDP data, run separately and verify separately:

```bash
npm run ingest:cdp:authenticated -- --source all --max-list-pages 1 --max-detail-pages 10
npm run verify:knowledge-base -- data/knowledge-base/cdp-authenticated-sources
```

The bounded manual-session CDP output is included in default runtime retrieval when `chunks.jsonl` is present. Keep the same safeguards: user-operated login only, no stored credentials or browser state, approved board/list URLs only, no broad crawling, and separate verification after each run.
