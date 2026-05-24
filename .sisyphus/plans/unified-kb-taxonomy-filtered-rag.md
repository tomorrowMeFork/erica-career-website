# Unified KB Taxonomy and Filtered RAG

## TL;DR
> **Summary**: Convert ERICA Career Chat from hardcoded JSONL directories and global-only BM25 retrieval into a metadata-governed unified KB where all active collected data is loaded, categorized, filterable, and citation-safe. Keep one unified index for ~100,000 mixed items, but make `collection_category`/`source_family` filters hard constraints before scoring.
> **Deliverables**:
> - Canonical taxonomy contract and legacy backfill mapping
> - Collector/manifest standardization with category/source counts
> - Dataset registry/discovery loader with E-WIL legacy root fallback
> - Filter-aware BM25 retrieval, chat/recommendation API filters, and UI filters
> - Atomic reload strategy and 100k synthetic benchmark gate
> **Effort**: Large
> **Parallel**: YES - 5 waves
> **Critical Path**: Taxonomy contract → Collector/backfill compatibility → Loader registry coverage → Filtered retriever/API → UI + benchmark verification

## Context
### Original Request
The user wants collectors to create and manage data so that categories such as 취업후기 and 채용공고 are easy to collect/search/manage, and all collected data is smoothly reflected in RAG search. The user clarified that physical separation is not required for ~100,000 mixed items if unified storage remains filterable and manageable.

### Interview Summary
- Current implementation is a file-backed RAG MVP: JSONL KB directories, hardcoded loader, in-memory BM25, chat/recommendation using the same global retriever pattern.
- Current data has useful metadata (`source_id`, `category`, citations, dates, deadline status) but `category` is free-form and not enough for stable filtering.
- Runtime loader currently misses E-WIL authenticated root output and does not include future `cdp-authenticated-sources` by default.
- Desired architecture: unified KB/index is acceptable, but metadata taxonomy, filters, loader coverage, and reload behavior must be explicit and tested.

### Metis Review (gaps addressed)
- Added canonical taxonomy ownership in code, not only docs.
- Added legacy backfill policy: explicit mapping table; unknown new taxonomy hard-fails.
- Added authenticated output guardrail: load existing authorized local outputs only through registry; do not add crawling scope.
- Added 100k performance benchmark before vector DB/database decisions.
- Added reload strategy because current service container caches retrievers.

### Oracle Review (architecture guardrails incorporated)
- Sequence taxonomy/dataset contract first, retrieval/service second, API/UI last.
- Use one shared reloadable KB/retriever service instead of two independent cached retrievers.
- Apply hard filters before BM25 scoring and before `topK`.
- Use global IDF initially; do not rebuild per request.
- Add manifest schema version and registry active/disabled/legacy states.

## Work Objectives
### Core Objective
Implement a metadata-governed unified KB where all active collected data is loaded into RAG, every record/chunk has controlled taxonomy metadata, and chat/recommendation/search can hard-filter by category/source while preserving citations, freshness, deadlines, Korean-first behavior, and safety refusals.

### Deliverables
- `collection_category`, `source_family`, `category_label_ko` taxonomy contract with Zod validation and labels.
- Legacy mapper from existing `source_id`/free-form `category` into canonical taxonomy.
- Extended JSONL record/chunk/manifest schema with counts by category/source/deadline.
- Dataset registry/discovery loader with explicit states and E-WIL legacy root fallback.
- Shared reloadable KB/retriever service with atomic swap.
- Filter-aware retriever plus chat/recommendation request filters.
- UI filter controls using Korean labels and backend filters.
- Automated tests, Playwright QA, and 100k synthetic benchmark.

### Definition of Done (verifiable conditions with commands)
- `npm test -- src/ingestion src/knowledge-base src/retrieval src/chat src/recommendations lib app/api components/listings components/citations` passes.
- `npm run typecheck -- --pretty false` passes.
- `npm run verify:knowledge-base -- data/knowledge-base/ibus-employment-board` passes for existing fixture/live-like outputs.
- New loader coverage command/test proves active dataset loaded chunk count equals active manifest chunk count and includes legacy E-WIL root when split dirs are absent.
- New benchmark command/test proves 100k synthetic chunks load and retrieve within thresholds defined in Task 10.
- `npm run qa:web` passes for category/source filter UI.

### Must Have
- Unified index remains allowed; physical split indexes are not required.
- Every new record/chunk must include controlled taxonomy fields.
- Legacy data must be either mapped or explicitly fail with a missing-mapping error; never silently skipped.
- Filters must be hard constraints before BM25 scoring.
- Existing clients without filters must remain backward compatible and search all active data.
- Citations, freshness, deadline status, no-answer behavior, and Korean-first output must be preserved.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No new unauthorized crawling, private-page bypass, login automation, credential persistence, SSO, or official endorsement claims.
- No vector DB, SQL database, admin CMS, account system, hidden profiling, or full UI redesign.
- No arbitrary raw filter strings from clients; filters must be allow-listed enums.
- No silent widening of invalid or empty-result filters.
- No post-`topK` filtering that creates false answerability.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with focused TDD-style fixtures per task, using Vitest + existing Next/API/component tests + Playwright for UI.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Tasks 1-3 foundation contracts and legacy mapping.
Wave 2: Tasks 4-6 loader/retriever/service changes.
Wave 3: Tasks 7-8 API and UI filters.
Wave 4: Tasks 9-10 QA, benchmark, docs.
Wave 5: Final verification wave F1-F4.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 Taxonomy contract | none | 2,3,4,5,7,8,9,10 |
| 2 Legacy backfill | 1 | 3,4,9 |
| 3 Collector standardization | 1,2 | 4,9 |
| 4 Manifest + dataset registry loader | 1,2,3 | 5,6,9,10 |
| 5 Filter-aware retrieval | 1,4 | 6,7,8,9,10 |
| 6 Shared reloadable KB service | 4,5 | 7,9,10 |
| 7 API contract filters | 5,6 | 8,9 |
| 8 UI category/source filters | 7 | 9 |
| 9 End-to-end regression/evaluation | 1-8 | F1-F4 |
| 10 100k benchmark + docs | 4,5,6 | F1-F4 |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Count | Categories |
|---|---:|---|
| 1 | 3 | deep, quick, quick |
| 2 | 3 | deep, deep, deep |
| 3 | 2 | deep, visual-engineering |
| 4 | 2 | unspecified-high, unspecified-high |
| Final | 4 | oracle, unspecified-high, unspecified-high, deep |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add Canonical KB Taxonomy Contract

  **What to do**: Add a controlled taxonomy module for KB metadata. Define Zod enums and TypeScript types for `collection_category`, `source_family`, and Korean label mapping. Initial canonical values are: `job_posting`, `career_review`, `internship_notice`, `internship_review`, `career_program`, `guide`, `notice`, `source_discovery`, and `unknown_legacy`; source families are `cdp`, `ewil`, `ibus`, `book`, `hanyang_career`, `unknown_legacy`. Export helper functions for label lookup and validation. Do not remove existing free-form `category`; keep it as display breadcrumb/backward-compatible field.
  **Must NOT do**: Do not infer sensitive personal categories. Do not add arbitrary client-provided taxonomy. Do not rename existing `category` yet.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Schema changes affect ingestion, retrieval, API, and UI contracts.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - Not UI work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2,3,4,5,7,8,9,10 | Blocked By: none

  **References**:
  - Pattern: `src/ingestion/normalized-record.ts:37-74` - Current record/chunk schema to extend.
  - Pattern: `src/recommendations/recommendation-contract.ts:26-42` - Existing response schema that already returns `category`.
  - Pattern: `.planning/PROJECT.md:73-81` - Korean-first, source trust, freshness, privacy, authorization constraints.
  - Pattern: `.planning/phases/01-source-discovery-and-governance/source-registry.yaml` - Source IDs and source governance remain authoritative.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm test -- src/ingestion/normalized-record.test.ts` passes with new tests proving canonical taxonomy accepts listed enum values and rejects `"취업"` as a raw enum value.
  - [ ] `npm run typecheck -- --pretty false` passes.
  - [ ] Test fixture proves `category` remains accepted as a Korean display/breadcrumb string while `collection_category` is controlled.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Valid taxonomy fields parse
    Tool: Bash
    Steps: npm test -- src/ingestion/normalized-record.test.ts
    Expected: Test with collection_category=job_posting, source_family=ibus, category_label_ko=채용공고 passes.
    Evidence: .sisyphus/evidence/task-1-taxonomy-valid.txt

  Scenario: Unknown taxonomy is rejected
    Tool: Bash
    Steps: npm test -- src/ingestion/normalized-record.test.ts
    Expected: Fixture with collection_category=취업 fails with deterministic schema error.
    Evidence: .sisyphus/evidence/task-1-taxonomy-invalid.txt
  ```

  **Commit**: YES | Message: `feat(kb): add canonical taxonomy contract` | Files: [`src/ingestion/normalized-record.ts`, `src/ingestion/normalized-record.test.ts`, `src/knowledge-base/*taxonomy*` if created]

- [x] 2. Add Legacy Metadata Backfill Mapping

  **What to do**: Add explicit legacy mapping from current `source_id` + free-form `category` to canonical taxonomy. Cover existing datasets: `ibus-employment-board`, `cdp-student-guide-pdf`, `book-success-story-viewer`, `cdp-root`, `cdp-career-category-discovery`, `cdp-recruit-category-discovery`, `ewil-internship-system`, `ewil-notice-board`, `ewil-info-board`, `ewil-internship-reviews`, and current manual CDP outputs. Apply mapper in JSONL loader compatibility path so old chunks can be read without rewriting files immediately.
  **Must NOT do**: Do not map unknown data to a useful category silently. Use `unknown_legacy` only for explicit tests or disabled/diagnostic paths, not active RAG results.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Focused mapping table and tests.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - Not UI work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3,4,9 | Blocked By: 1

  **References**:
  - Pattern: `src/knowledge-base/jsonl-loader.ts:30-37` - Current chunk parsing path.
  - Data examples: `data/knowledge-base/*/records.jsonl` - Existing source/category values.
  - Finding: E-WIL current source IDs include `ewil-info-board`, `ewil-internship-reviews`, `ewil-notice-board`.

  **Acceptance Criteria**:
  - [ ] `npm test -- src/knowledge-base/knowledge-base-loader.test.ts` passes with fixtures proving each known legacy source maps to a canonical category/source family.
  - [ ] Unknown active legacy source produces a deterministic `missing taxonomy mapping` error.

  **QA Scenarios**:
  ```
  Scenario: Existing source IDs are backfilled
    Tool: Bash
    Steps: npm test -- src/knowledge-base/knowledge-base-loader.test.ts
    Expected: Fixtures for ibus-employment-board and book-success-story-viewer load with job_posting and career_review.
    Evidence: .sisyphus/evidence/task-2-legacy-backfill.txt

  Scenario: Unknown legacy category fails closed
    Tool: Bash
    Steps: npm test -- src/knowledge-base/knowledge-base-loader.test.ts
    Expected: Fixture source_id=unknown-source fails with missing taxonomy mapping, not silent skip.
    Evidence: .sisyphus/evidence/task-2-legacy-failclosed.txt
  ```

  **Commit**: YES | Message: `feat(kb): backfill legacy taxonomy metadata` | Files: [`src/knowledge-base/jsonl-loader.ts`, `src/knowledge-base/knowledge-base-loader.test.ts`, taxonomy mapping module]

- [x] 3. Standardize Collector Outputs With Taxonomy Metadata

  **What to do**: Update all ingestion builders/scripts so newly generated `NormalizedRecord` and `KnowledgeChunk` include controlled taxonomy fields before writing JSONL. Ensure CDP manual/authenticated posts distinguish `job_posting` from `career_program` or `notice` using existing board/source key where available. Keep E-WIL output groups but do not require physical split for taxonomy correctness.
  **Must NOT do**: Do not broaden collection scope or add new URLs. Do not automate login.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Multiple focused script/builder updates with clear schema target.
  - Skills: [] - No extra skill required.
  - Omitted: [`playwright`] - Do not run browser collection in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,9 | Blocked By: 1,2

  **References**:
  - Pattern: `scripts/ingest-ibus-sample.ts:99-119` - Writes IBUS records/chunks.
  - Pattern: `scripts/ingest-playwright-sources.ts:86-118` - Builds public HTML records including success story/source discovery.
  - Pattern: `scripts/ingest-cdp-authenticated-sources.ts:113-124` - Writes CDP authenticated output.
  - Pattern: `scripts/ingest-ewil-authenticated-sources.ts:117-185` - E-WIL grouping and output writer.
  - Pattern: `src/ingestion/manual-cdp-posts.ts` - Manual CDP record builder.

  **Acceptance Criteria**:
  - [ ] Focused ingestion tests pass for IBUS, CDP manual, CDP authenticated helpers, E-WIL grouping, PDF, and Playwright record builders.
  - [ ] New generated fixture records include `collection_category`, `source_family`, `category_label_ko`.
  - [ ] Tests prove no credentials/cookies/storage fields are added to records.

  **QA Scenarios**:
  ```
  Scenario: Collector fixture output includes taxonomy
    Tool: Bash
    Steps: npm test -- src/ingestion scripts/ingest-ewil-authenticated-sources.test.ts scripts/ingest-cdp-authenticated-sources.test.ts
    Expected: All record-builder fixtures contain canonical taxonomy and existing citation/freshness/deadline fields.
    Evidence: .sisyphus/evidence/task-3-collector-taxonomy.txt

  Scenario: Collection scope remains unchanged
    Tool: Bash
    Steps: npm test -- scripts/ingest-ewil-authenticated-sources.test.ts scripts/ingest-cdp-authenticated-sources.test.ts
    Expected: Tests still prove headed manual-login guardrails and same-origin/exact-source restrictions.
    Evidence: .sisyphus/evidence/task-3-collector-scope.txt
  ```

  **Commit**: YES | Message: `feat(ingestion): emit taxonomy metadata from collectors` | Files: [`scripts/ingest-*.ts`, `src/ingestion/**/*.ts`, related tests]

- [x] 4. Add Manifest Counts and Dataset Registry Loader

  **What to do**: Extend manifest schema/version to include `collector`, `collection_category_counts`, `source_family_counts`, and `deadline_status_counts`. Replace hardcoded loader resolution with a dataset registry/discovery module with states `active`, `disabled`, `legacy_fallback`, `blocked`. Active datasets must load or fail; disabled/blocked datasets must be reported as skipped with reason. Add temporary E-WIL legacy root fallback: if split dirs are absent and `data/knowledge-base/ewil-authenticated-sources/chunks.jsonl` exists, load root as `legacy_fallback`; if split dirs exist, prefer split dirs and do not double-load root.
  **Must NOT do**: Do not silently include authenticated datasets without explicit registry state. Do not silently ignore active manifest count mismatches.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Loader/manifest contract affects all runtime data coverage.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - Backend/data loading work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5,6,9,10 | Blocked By: 1,2,3

  **References**:
  - Pattern: `src/ingestion/write-jsonl-kb.ts:12-22` - Current manifest schema.
  - Pattern: `src/knowledge-base/jsonl-loader.ts:7-28` - Current hardcoded directories.
  - Test: `src/knowledge-base/knowledge-base-loader.test.ts:21-48` - Current loader expectations.
  - Operations doc: `.planning/phases/02-ingestion-and-knowledge-base/source-collection-operations.md:22-32` - Current loader docs and CDP authenticated note.

  **Acceptance Criteria**:
  - [ ] Loader test proves active loaded chunk count equals manifest chunk count for fixture registry.
  - [ ] Loader test proves E-WIL legacy root loads when split dirs are absent.
  - [ ] Loader test proves split dirs take precedence over root to prevent duplicate loading.
  - [ ] Manifest schema test proves category/source/deadline counts match parsed chunks.

  **QA Scenarios**:
  ```
  Scenario: Active datasets are fully loaded
    Tool: Bash
    Steps: npm test -- src/knowledge-base/knowledge-base-loader.test.ts src/ingestion/write-jsonl-kb.test.ts
    Expected: Active fixture registry reports loaded_chunks === manifest_chunks and category counts match.
    Evidence: .sisyphus/evidence/task-4-loader-coverage.txt

  Scenario: E-WIL legacy fallback without duplicates
    Tool: Bash
    Steps: npm test -- src/knowledge-base/knowledge-base-loader.test.ts
    Expected: Root fallback loads only when split dirs are absent; root skipped when split dirs exist.
    Evidence: .sisyphus/evidence/task-4-ewil-fallback.txt
  ```

  **Commit**: YES | Message: `feat(kb): add dataset registry loader coverage` | Files: [`src/knowledge-base/**`, `src/ingestion/write-jsonl-kb.ts`, related tests]

- [x] 5. Implement Hard-Filtered BM25 Retrieval

  **What to do**: Extend `RetrieveInput` with `filters?: { collection_categories?: CollectionCategory[]; source_families?: SourceFamily[]; source_ids?: string[]; deadline_statuses?: DeadlineStatus[] }`. Apply filters before scoring and before `topK`. Empty filters mean search all. Invalid filters must be rejected by upstream schemas, not ignored. Keep global IDF initially; do not rebuild indexes per request. For recommendations, support an internal candidate pool larger than final limit.
  **Must NOT do**: Do not filter after topK. Do not widen filters when no results are found. Do not accept arbitrary category strings.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Search correctness and answerability depend on filter semantics.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - Backend retrieval work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6,7,8,9,10 | Blocked By: 1,4

  **References**:
  - Pattern: `src/retrieval/retriever.ts:3-20` - Current input/output types.
  - Pattern: `src/retrieval/bm25-retriever.ts:58-91` - Current retrieve scoring flow.
  - Pattern: `src/recommendations/recommendation-service.ts:47-58` - Current recommendation retrieval uses `limit` as topK.
  - Test: `src/retrieval/retrieval-fixtures.test.ts` - Existing retrieval behavior tests.

  **Acceptance Criteria**:
  - [ ] Retrieval test proves query `채용` with `collection_categories=[career_review]` returns no `job_posting` chunks.
  - [ ] Retrieval test proves empty filters return mixed active data.
  - [ ] Recommendation test proves internal candidate pool is larger than final `limit` after filters.
  - [ ] No existing retrieval fixture regresses except expected additions for metadata fields.

  **QA Scenarios**:
  ```
  Scenario: Category hard filter excludes unrelated chunks
    Tool: Bash
    Steps: npm test -- src/retrieval/retrieval-fixtures.test.ts
    Expected: Filtered career_review query returns only collection_category=career_review, never job_posting.
    Evidence: .sisyphus/evidence/task-5-filtered-retrieval.txt

  Scenario: Empty filters preserve all-search behavior
    Tool: Bash
    Steps: npm test -- src/retrieval/retrieval-fixtures.test.ts src/chat/chat-service.test.ts
    Expected: Existing unfiltered chat/retrieval cases still retrieve and cite relevant chunks.
    Evidence: .sisyphus/evidence/task-5-backcompat.txt
  ```

  **Commit**: YES | Message: `feat(retrieval): add hard metadata filters` | Files: [`src/retrieval/**`, `src/recommendations/recommendation-service.ts`, tests]

- [x] 6. Add Shared Reloadable KB/Retriever Service

  **What to do**: Replace two independent cached retrievers in `lib/service-container.ts` with a shared KB/retriever provider that builds from the dataset registry, validates coverage, and supports atomic reload. Atomic reload must build and validate a new loader result and retriever before swapping; on failure keep old retriever and return/report deterministic error. Existing app startup behavior must continue to work without requiring reload calls.
  **Must NOT do**: Do not reload per request in production. Do not leave chat and recommendations with divergent indexes.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Runtime cache/reload affects data reflection guarantees.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - Backend service wiring.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7,9,10 | Blocked By: 4,5

  **References**:
  - Pattern: `lib/service-container.ts:26-44` - Current separate cached retriever construction.
  - Pattern: `src/chat/chat-service.ts:36-46` - ChatService receives retriever dependency.
  - Pattern: `src/recommendations/recommendation-service.ts:19-24` - RecommendationService receives retriever dependency.

  **Acceptance Criteria**:
  - [ ] Unit test proves chat and recommendation services share the same retriever snapshot/version.
  - [ ] Unit test proves reload failure keeps previous retriever active.
  - [ ] Unit test proves successful reload changes loaded dataset version/count.

  **QA Scenarios**:
  ```
  Scenario: Successful atomic reload swaps retriever
    Tool: Bash
    Steps: npm test -- lib/service-container.test.ts src/knowledge-base/knowledge-base-loader.test.ts
    Expected: Fixture update followed by reload changes retriever stats/version for both chat and recommendation.
    Evidence: .sisyphus/evidence/task-6-reload-success.txt

  Scenario: Failed reload keeps old retriever
    Tool: Bash
    Steps: npm test -- lib/service-container.test.ts
    Expected: Malformed chunks.jsonl reload returns failure and previous search remains available.
    Evidence: .sisyphus/evidence/task-6-reload-failure.txt
  ```

  **Commit**: YES | Message: `feat(kb): share reloadable retriever service` | Files: [`lib/service-container.ts`, new KB service module/tests]

- [x] 7. Extend Chat and Recommendation API Filters

  **What to do**: Add shared request filter schema to chat and recommendation contracts. Filters: `collection_categories`, `source_families`, `source_ids`, `deadline_statuses`. Pass filters through `ChatService.ask()` and `RecommendationService.recommend()` into retriever. Existing clients without filters must still parse and search all active data. Invalid enum values must return 400 from API routes.
  **Must NOT do**: Do not expose raw internal source IDs as the only UI-facing option; keep canonical labels available. Do not let filters bypass evidence/refusal policy.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Contract changes must preserve backward compatibility and safety.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - UI comes in Task 8.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 8,9 | Blocked By: 5,6

  **References**:
  - Pattern: `src/chat/chat-contract.ts:7-11` - Current chat request schema.
  - Pattern: `src/recommendations/recommendation-contract.ts:9-14` - Current recommendation request schema.
  - Pattern: `src/chat/chat-service.ts:103-138` - Current retrieval and prompt path.
  - Pattern: `app/api/chat/route.ts:12-22` and `app/api/recommendations/route.ts:16-31` - API validation behavior.

  **Acceptance Criteria**:
  - [ ] API tests prove invalid `collection_categories=["취업"]` returns 400.
  - [ ] Chat service test proves filtered no-result path returns hard refusal with Korean no-evidence answer.
  - [ ] Recommendation service test proves filtered request returns only matching taxonomy.
  - [ ] Existing API tests without filters still pass.

  **QA Scenarios**:
  ```
  Scenario: Chat API accepts valid filters
    Tool: Bash
    Steps: npm test -- app/api/chat/route.test.ts src/chat/chat-service.test.ts
    Expected: Request with collection_categories=[job_posting] passes schema and retriever receives hard filter.
    Evidence: .sisyphus/evidence/task-7-chat-filter.txt

  Scenario: API rejects invalid filters
    Tool: Bash
    Steps: npm test -- app/api/chat/route.test.ts app/api/recommendations/route.test.ts
    Expected: Invalid category string returns 400 safe Korean validation response.
    Evidence: .sisyphus/evidence/task-7-invalid-filter.txt
  ```

  **Commit**: YES | Message: `feat(api): expose taxonomy retrieval filters` | Files: [`src/chat/**`, `src/recommendations/**`, `app/api/**`, `lib/api-client.ts`, tests]

- [x] 8. Add Korean Category/Source Filter UI

  **What to do**: Add UI controls for category/source filters using Korean labels from taxonomy mapping. Connect filters to backend chat and recommendation requests, not only client-side sorting. Add visible active filter chips and clear action. Update listing/source/citation cards so `collection_category`, `category_label_ko`, and source family display correctly. Keep layout minimal and aligned with existing rounded card/pill design.
  **Must NOT do**: Do not create a full admin dashboard. Do not redesign the whole app. Do not make filters client-only.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI controls and responsive QA.
  - Skills: [`frontend-ui-ux`] - Needed for polished Korean-first filters.
  - Omitted: [] - UI task benefits from frontend skill.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 9 | Blocked By: 7

  **References**:
  - Pattern: `components/listings/listing-panel.tsx:46-52` - Current client-side filters.
  - Pattern: `app/consultation/page.tsx:108-123` - Current chat/recommendation requests.
  - Pattern: `app/references/page.tsx:43-57` - References display.
  - Pattern: `components/citations/source-card.tsx` - Source display labels.
  - UI rules: `AGENTS.md` - Korean-first, rounded cards, pill filters, calm white surfaces.

  **Acceptance Criteria**:
  - [ ] Component tests prove selecting `채용공고` sends `collection_categories=[job_posting]` to API client.
  - [ ] Component tests prove active filter chip is visible and clearable.
  - [ ] Playwright test proves desktop and mobile consultation flow can apply a category filter and receive filtered cited response or Korean no-evidence refusal.

  **QA Scenarios**:
  ```
  Scenario: User applies 채용공고 filter
    Tool: Playwright
    Steps: Open /consultation, select 채용공고 filter pill, submit "마감 임박 정보 알려줘".
    Expected: Request payload includes collection_categories=[job_posting]; response source cards show 채용공고 label or no-evidence refusal.
    Evidence: .sisyphus/evidence/task-8-ui-job-filter.png

  Scenario: User clears filters
    Tool: Playwright
    Steps: Select 채용공고, then clear filter, submit "취업후기 알려줘".
    Expected: Request payload has no taxonomy filters; UI active chip removed.
    Evidence: .sisyphus/evidence/task-8-ui-clear-filter.png
  ```

  **Commit**: YES | Message: `feat(ui): add taxonomy search filters` | Files: [`app/consultation/page.tsx`, `components/**`, `lib/api-client.ts`, UI tests, Playwright tests]

- [x] 9. Add End-to-End Regression and Evaluation Coverage

  **What to do**: Add deterministic fixtures/evaluation cases covering all major categories: `job_posting`, `career_review`, `internship_notice`, `internship_review`, `guide`, `source_discovery`. Verify citations, freshness, deadline status, Korean answer quality, hard refusal when filters exclude evidence, and no unauthorized source claims. Update existing RAG/release readiness evaluations to account for taxonomy filters and loader registry coverage.
  **Must NOT do**: Do not weaken existing safety/refusal/citation checks to make tests pass.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Cross-cutting QA/evaluation work.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - Not primarily UI.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: F1-F4 | Blocked By: 1-8

  **References**:
  - Pattern: `scripts/evaluate-rag-mvp.ts` - Existing deterministic RAG evaluation.
  - Pattern: `scripts/evaluate-release-readiness.ts` - Release readiness reference QA.
  - Planning: `.planning/PROJECT.md:66-71` - Current broad eval failures and release gate state.
  - Pattern: `src/chat/output-validation.ts:27-97` - Citation/output safety validation.

  **Acceptance Criteria**:
  - [ ] `npm run evaluate:rag:mvp` passes or records only pre-existing unrelated failures explicitly preserved in test output.
  - [ ] New filtered evaluation cases pass for career review only, job posting only, and no-evidence filtered query.
  - [ ] Citation/freshness/deadline metadata is present in every non-refusal filtered response.

  **QA Scenarios**:
  ```
  Scenario: Filtered career_review answer cites only review evidence
    Tool: Bash
    Steps: npm run evaluate:rag:mvp
    Expected: career_review case returns only collection_category=career_review citations and Korean answer.
    Evidence: .sisyphus/evidence/task-9-career-review-eval.txt

  Scenario: Filter excluding evidence triggers refusal
    Tool: Bash
    Steps: npm run evaluate:release-readiness
    Expected: Query with guide-only filter for 채용공고 returns hard_refuse/no-evidence, not hallucinated job posting.
    Evidence: .sisyphus/evidence/task-9-filter-refusal.txt
  ```

  **Commit**: YES | Message: `test(rag): cover taxonomy filtered retrieval` | Files: [`scripts/evaluate-*.ts`, `src/**/*.test.ts`, fixtures]

- [x] 10. Add 100k Scale Benchmark and Operations Docs

  **What to do**: Add a synthetic benchmark script/test that generates or mocks 100,000 chunk-like records across all canonical categories and measures cold load time, memory, unfiltered retrieval latency, filtered retrieval latency, and reload behavior. Initial acceptance thresholds: cold load <= 10s on local dev machine, p95 unfiltered retrieval <= 750ms for 20 benchmark queries, p95 filtered retrieval <= 500ms, process memory increase <= 1.5GB. If thresholds fail, record recommendation for inverted index optimization before vector DB. Update operations docs to explain unified KB, registry states, collector commands, filter taxonomy, loader coverage, and reload behavior.
  **Must NOT do**: Do not introduce vector DB/database in this task. Do not write generated 100k fixture into git-tracked data directories.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Benchmark and operational documentation.
  - Skills: [] - No extra skill required.
  - Omitted: [`git-master`] - No git operations requested.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: F1-F4 | Blocked By: 4,5,6

  **References**:
  - Pattern: `package.json:21-26` - Existing verification/evaluation scripts.
  - Pattern: `.planning/phases/02-ingestion-and-knowledge-base/source-collection-operations.md:1-41` - Operations doc to update.
  - Pattern: `src/retrieval/bm25-retriever.ts:70-91` - Current O(N) scoring path to benchmark.

  **Acceptance Criteria**:
  - [ ] Benchmark script runs without committing generated data and writes results to `.sisyphus/evidence/task-10-100k-benchmark.json`.
  - [ ] Benchmark output includes cold load time, memory delta, p95 unfiltered latency, p95 filtered latency, reload time, and pass/fail thresholds.
  - [ ] Operations doc explains how to verify all active datasets are reflected in RAG.

  **QA Scenarios**:
  ```
  Scenario: 100k benchmark passes or fails with actionable output
    Tool: Bash
    Steps: npm run benchmark:kb:100k
    Expected: JSON output contains metrics and threshold pass/fail; no generated corpus remains in tracked data paths.
    Evidence: .sisyphus/evidence/task-10-100k-benchmark.json

  Scenario: Operations docs match runtime behavior
    Tool: Bash
    Steps: npm test -- src/knowledge-base/knowledge-base-loader.test.ts && npm run typecheck -- --pretty false
    Expected: Docs reference registry states and loader coverage terms used by code/tests.
    Evidence: .sisyphus/evidence/task-10-docs-verification.txt
  ```

  **Commit**: YES | Message: `chore(kb): add scale benchmark and operations docs` | Files: [`package.json`, `scripts/*benchmark*`, `.planning/phases/02-ingestion-and-knowledge-base/source-collection-operations.md`, tests]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright for UI filters)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after each task with the message specified in that task.
- Keep source/schema/retrieval/UI/benchmark commits separate.
- Do not commit generated live KB data, credentials, cookies, screenshots with secrets, or 100k benchmark corpus.
- If generated evidence is stored under `.sisyphus/evidence/`, include only safe textual/JSON/PNG evidence without secrets.

## Success Criteria
- All active registered KB datasets are loaded or explicitly skipped with a documented non-active state.
- Existing E-WIL authenticated root data is no longer silently missed: it is either loaded through legacy fallback or reported by coverage verification.
- Query without filters searches all active data.
- Query with `collection_category=job_posting` never returns `career_review` chunks.
- Chat/recommendation APIs accept valid filters and reject invalid filters deterministically.
- UI sends backend filters and shows Korean filter labels.
- Citations, source URLs, fetched/posted timestamps, deadline status, and Korean no-answer behavior remain intact.
- 100k benchmark produces actionable metrics before any vector DB/database decision.
