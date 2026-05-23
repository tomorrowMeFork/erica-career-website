## 2026-05-19 Task: progress-through-task-5
- Tasks 1-5 are implemented and verified by delegated agents plus spot reads.
- Taxonomy module added at `src/knowledge-base/taxonomy.ts`; normalized records/chunks now require `collection_category`, `source_family`, `category_label_ko` while preserving free-form `category`.
- Legacy JSONL loading now backfills taxonomy through `src/knowledge-base/legacy-taxonomy.ts` and fails closed for unknown source/category mappings.
- Collectors/builders now emit taxonomy metadata; guardrail tests passed and collection scope was not broadened.
- Manifest writer now emits optional count metadata; dataset registry exists at `src/knowledge-base/dataset-registry.ts`.
- Loader uses registry resolution and E-WIL legacy root fallback when split dirs are absent; CDP authenticated remains blocked by default.
- Retrieval now supports hard metadata filters before BM25 scoring/topK via `RetrieveFilters`; recommendations retrieve a larger candidate pool before reranking.

## 2026-05-19 Task: t6-partial
- `src/knowledge-base/reloadable-retriever-service.ts` exists but T6 is incomplete.
- It has a reloadable retriever class with snapshot/version/stats and reload semantics.
- Still needed: wire `lib/service-container.ts` to shared provider, add tests proving shared snapshot and atomic reload failure behavior.

## 2026-05-22 Task: t6-shared-reloadable-kb
- `lib/service-container.ts` now lazily constructs one `ReloadableKnowledgeBaseRetriever` and passes that same retriever-compatible service into both chat and recommendation services.
- `ReloadableKnowledgeBaseRetriever.reload()` builds chunks, stats, and the new retriever before assigning the active snapshot, so loader/retriever construction failures leave the previous version active.
- Focused coverage lives in `src/knowledge-base/reloadable-retriever-service.test.ts` for metadata/reload failure behavior and `lib/service-container.test.ts` for shared container wiring.

## 2026-05-22 Task: t7-api-taxonomy-filters
- Chat and recommendation request contracts now share canonical retrieval filter fields from `src/chat/chat-contract.ts`, backed by taxonomy/deadline Zod schemas rather than duplicated enum lists.
- Services keep no-filter calls backward compatible by omitting `filters` from retriever input unless at least one filter field is provided; provided arrays are forwarded under `RetrieveFilters` names.
- API validation rejects invalid enum filters such as Korean labels in `collection_categories`, while filtered empty retrieval still follows the existing Korean hard-refusal/no-evidence path.

## 2026-05-22 Task: t8-korean-taxonomy-filter-ui
- Consultation now has Korean category/source-family pill filters sourced from taxonomy exports; empty selections omit filter fields, while `채용공고` sends `collection_categories: ["job_posting"]` to both chat and recommendation requests.
- Citation/listing/reference surfaces prefer `category_label_ko` and source-family Korean labels when metadata exists, with legacy category/source fallback behavior preserved.
- Focused jsdom tests cover payload wiring and active chip clearing; Playwright QA covers desktop/mobile filtered consultation responses.

## 2026-05-22 Task: t9-e2e-regression-evaluation
- RAG MVP evaluation now uses deterministic core fixtures plus taxonomy-filter fixtures so the gate is stable while covering `job_posting`, `career_review`, `internship_notice`, `internship_review`, `guide`, and `source_discovery`.
- Filtered evaluation checks verify that non-refusal citations map back to filtered evidence and preserve HTTPS source URLs, `fetched_at`, `posted_at`, and `deadline_status` metadata.
- Release readiness adds locked job-posting-only, career-review-only, and guide-filter no-evidence cases; filtered no-evidence must hard-refuse with no citations instead of hallucinating an answer.

## 2026-05-22 Task: t10-100k-scale-benchmark
- `npm run benchmark:kb:100k` generates 100,000 in-memory synthetic chunks across every canonical collection category and source family, exercises unfiltered/filtered BM25 retrieval plus `ReloadableKnowledgeBaseRetriever.reload()`, and writes threshold evidence to `.sisyphus/evidence/task-10-100k-benchmark.json` without persisting corpus fixtures under `data/`.
- Operations docs now describe the unified registry-backed loader states, taxonomy filter values, active dataset coverage checks, and atomic reload behavior.

## 2026-05-22 Task: final-verification-wave-blockers
- `scripts/verify-knowledge-base.ts` now applies the shared explicit `backfillLegacyTaxonomy` compatibility path before schema validation, so known legacy IBUS JSONL verifies without editing live KB data while unknown source/category pairs still fail closed.
- Runtime chunk loading now validates present `manifest.json` files against loaded chunk counts, chunk IDs, and source IDs, including registry-loaded active datasets.
- Chat citation maps, retrieved evidence blocks, recommendation items, and nested recommendation citations now carry `collection_category`, `source_family`, and `category_label_ko` so filtered UI cards can display Korean taxonomy labels instead of falling back to `기타`.

## 2026-05-22 Task: f1-plan-compliance-audit
- Re-audited `.sisyphus/plans/unified-kb-taxonomy-filtered-rag.md` against Tasks 1-10, Must Have, Must NOT Have, Success Criteria, and the previous F1 blocker list.
- Confirmed legacy taxonomy verification and JSONL loading share `backfillLegacyTaxonomy`, known legacy IBUS data verifies, and unknown legacy mappings still fail closed through loader tests.
- Confirmed manifest validation in the runtime loader fails on chunk count/chunk ID/source ID mismatches, filtered BM25 applies hard filters before scoring/topK, and chat/recommendation/UI card paths preserve taxonomy metadata.
- Targeted verification passed: `npm run verify:knowledge-base -- data/knowledge-base/ibus-employment-board` and targeted taxonomy regression tests reported 10 files / 91 tests passing.

## 2026-05-22 Task: f3-real-manual-qa
- Desktop Playwright QA on `/consultation` confirmed selecting `채용공고` shows an active chip and sends `collection_categories: ["job_posting"]` to both `/api/chat` and `/api/recommendations` for `마감 임박 채용공고 알려줘`.
- The filtered response rendered cited Korean evidence cards with `채용공고` 분류 labels and Korean source-family labels; page text did not include `기타`, confirming the metadata display blocker is fixed in this flow.
- Clearing filters removed the active chip and disabled the clear button; the next chat/recommendation requests omitted taxonomy filter fields and returned a Korean no-evidence refusal without fabricated citations.
- Browser console showed only an unrelated `/favicon.ico` 404 during manual QA, and `npm run qa:web` passed 39 tests with 5 expected skips.

## 2026-05-22 Task: f2-code-quality-review
- Final quality review found the previous blockers addressed: legacy IBUS verification backfills known taxonomy while failing closed for unknown mappings, runtime loader validates present manifests before returning chunks, and chat/recommendation metadata propagation preserves taxonomy fields through evidence, citations, recommendation items, and UI display fallbacks.
- Targeted checks passed: `npm test -- src/knowledge-base/knowledge-base-loader.test.ts src/ingestion/write-jsonl-kb.test.ts src/retrieval/retrieval-fixtures.test.ts src/chat/prompt.test.ts src/recommendations/ranking.test.ts src/recommendations/recommendation-service.test.ts` and `npm run verify:knowledge-base -- data/knowledge-base/ibus-employment-board`.
- LSP diagnostics were clean on inspected taxonomy/loader/verifier/prompt/ranking/retrieval/API/UI filter files; no TODO/FIXME/HACK, `@ts-ignore`, or `as any` issues were found in the reviewed taxonomy paths.

## 2026-05-22 Task: f4-final-scope-fidelity-recheck
- Scope review found the implementation remains aligned on unified in-memory BM25, hard pre-score taxonomy filters, registry-backed loader coverage, Korean filter UI, and 100k synthetic benchmarking without adding vector DB/database/CMS/account/full redesign scope.
- Scope review also found public chat/recommendation request schemas accept client-supplied `source_ids: string[]`; this crosses the plan guardrail requiring client filters to be allow-listed enums instead of arbitrary raw filter strings.

## 2026-05-22 Task: f4-source-ids-remediation-recheck
- Public chat and recommendation request schemas now expose only enum-backed `collection_categories`, `source_families`, and `deadline_statuses`; `ChatRequestSchema` and `RecommendationRequestSchema` are strict and API tests assert raw `source_ids` requests return 400 Korean validation errors.
- Remaining `source_ids` usage is internal to retriever/evaluation/manifest logic, and evaluation scripts project filters through `publicChatFilters()` before calling `ChatService.ask()`, so the prior public raw-filter scope blocker is resolved.

## 2026-05-22 Task: f4-source-ids-public-filter-remediation
- Public chat/recommendation request filters now expose only allow-listed taxonomy/deadline enums; raw `source_ids` remains available only in internal retrieval/evaluation schemas where source-pinned QA fixtures need it.

## 2026-05-22 Task: f4-evaluation-source-ids-follow-up
- Evaluation scripts now project internal retrieval filters to public chat filters before calling `ChatService.ask()`: direct retriever checks may remain source-pinned with `source_ids`, while generated chat answers use only `collection_categories`, `source_families`, and `deadline_statuses`.

## 2026-05-22 Task: user-intent-role-aware-retrieval
- User clarified the taxonomy goal is not manual UI filtering; UI changes from `31742e1 Add: Add ewill authenticated data` should remain intact, while data/search logic should use taxonomy to decide how evidence is used.
- Restored changed UI/front-end files to commit `31742e1dc07adfb29ea7b0896007c48d40640f0f` and removed the manual taxonomy filter component/tests.
- Added backend role-aware retrieval: chat can retrieve a balanced mix of opportunity, review/advice, and procedure evidence; prompts label `content_role` so job postings/programs/internship notices are recommendations, reviews are advice evidence, and guides are procedure evidence.
- Recommendation service now defaults to opportunity categories (`job_posting`, `career_program`, plus `internship_notice` for internship intent) so reviews/guides do not become recommendation cards.

## 2026-05-22 Task: broad-query-no-evidence-remediation
- The broad query `난 대학교2학년인데 난 취업을위해 뭔 활동을 하면좋을까? 지금 컴퓨터공학과고 컴공쪽으로 하려고해 세부분야는 못 정했어` no longer hard-refuses in role-aware retrieval; it returns balanced opportunity/review evidence with `normal_answer` confidence.
- Root cause was overly narrow mixed-career-advice detection plus missing Korean CS/activity synonyms and noisy filler handling, so broad planning wording like `2학년`, `활동`, `컴공`, `세부분야는 못 정했어`, and `좋을까` could miss useful evidence.
- Chat now returns a cited evidence fallback when retrieved evidence exists but provider output is citationless/invalid or provider completion fails; unsafe provider output still fails closed.
- Verification passed after this patch: full `npm test` (56 files / 478 tests), `npm run typecheck -- --pretty false`, `npm run verify:knowledge-base -- data/knowledge-base/ibus-employment-board`, and `npm run build:web`.
