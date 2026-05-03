---
phase: 03-source-grounded-chat-mvp
plan: 02
subsystem: retrieval
tags: [rag, bm25, korean, retrieval, zod]

requires:
  - phase: 03-source-grounded-chat-mvp
    provides: Phase 3 chat contracts and fail-closed Phase 2 JSONL chunk loader from 03-01
provides:
  - Retriever interface with scored retrieved chunks and ranking features
  - Korean normalization, Hangul 2/3-grams, and explicit domain synonym expansion
  - Deterministic boilerplate classification for answerable, mixed, and boilerplate-only source text
  - BM25-style in-memory retriever over validated Phase 2 KnowledgeChunk objects with top-five default ranking
affects: [03-source-grounded-chat-mvp, evidence-policy, prompt-builder, chat-orchestration, evaluation]

tech-stack:
  added: []
  patterns: [strict TypeScript ESM with .js imports, deterministic lexical retrieval, fixture-first Vitest tests]

key-files:
  created:
    - src/retrieval/retriever.ts
    - src/retrieval/normalize-korean.ts
    - src/retrieval/domain-synonyms.ts
    - src/retrieval/boilerplate-filter.ts
    - src/retrieval/bm25-retriever.ts
    - src/retrieval/retrieval-fixtures.test.ts
    - src/retrieval/boilerplate-filter.test.ts
  modified: []

key-decisions:
  - "03-02 preserves the locked BM25-style lexical baseline behind a Retriever interface and defers embeddings, vector stores, LLM calls, and semantic retrieval."
  - "Boilerplate-only chunks are excluded from normal retrieval results when answerable or mixed evidence exists, while mixed service pages remain retrievable with a penalty."
  - "Deadline status boosts active listings and penalizes expired listing-like evidence without penalizing unknown-deadline campus-service or guidebook chunks."

patterns-established:
  - "Retrieval query processing combines normalized Korean/Latin tokens, Hangul 2/3-grams, and only explicit D-06 domain synonym groups."
  - "Retriever outputs include normalized scores, matched terms, and ranking feature breakdowns for later evidence-policy and audit layers."

requirements-completed: [RAG-02, RAG-04, RAG-06]

duration: 5min
completed: 2026-05-03
---

# Phase 03 Plan 02: BM25 Korean Retrieval Baseline Summary

**BM25-style Korean retrieval with explicit career-service synonyms, boilerplate downranking, and freshness/deadline-aware top-five results over Phase 2 chunks.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-03T11:16:55Z
- **Completed:** 2026-05-03T11:21:30Z
- **Tasks:** 3 completed
- **Files modified:** 7 implementation/test files plus this summary

## Accomplishments

- Added `Retriever`, `RetrieveInput`, and `RetrievedChunk` contracts with lexical/title/category/freshness/deadline/boilerplate ranking feature metadata.
- Added deterministic Korean query processing with Unicode `NFKC`, Latin lowercasing, whitespace/punctuation cleanup, Hangul 2-grams and 3-grams, and explicit D-06/domain synonym groups.
- Added Zod-validated boilerplate classification for login prompts, viewer controls, site chrome, mixed CDP service/menu text, and answerable listing/service text.
- Added `Bm25Retriever` over validated `KnowledgeChunk[]`, using Phase 2 KB loader fixtures, top-five default retrieval, stable sorting, active/recent boosts, expired listing penalties, and boilerplate exclusion/downranking.
- Covered listing and broader campus-service 안내 queries including 상담/컨설팅, 취업프로그램/직무부트캠프, 자기소개서/자소서, 가이드북/매뉴얼, 취업준비도검사, 진로설계, 경력개발, 포트폴리오, and 취업성공후기/선배 사례.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Korean normalization and synonym tests** - `00197ba` (`test(03-02): add failing retrieval query processing tests`)
2. **Task 1 GREEN: Retrieval contracts, normalization, and synonyms** - `aa79a11` (`feat(03-02): add retrieval query processing contracts`)
3. **Task 2 RED: Boilerplate classifier tests** - `b23e6cb` (`test(03-02): add failing boilerplate classifier tests`)
4. **Task 2 GREEN: Deterministic boilerplate classifier** - `140ca09` (`feat(03-02): add deterministic boilerplate classifier`)
5. **Task 3 RED: BM25 fixture retrieval tests** - `ea03a5b` (`test(03-02): add failing BM25 retrieval fixture tests`)
6. **Task 3 GREEN: BM25 Korean retriever** - `903361a` (`feat(03-02): add BM25 Korean retriever`)

**Plan metadata:** committed separately in the final docs commit.

## Files Created/Modified

- `src/retrieval/retriever.ts` - Retriever contract and retrieved result ranking feature types.
- `src/retrieval/normalize-korean.ts` - NFKC normalization, safe control-character cleanup, token extraction, and Hangul n-grams.
- `src/retrieval/domain-synonyms.ts` - Explicit D-06/domain synonym groups and expansion helper.
- `src/retrieval/boilerplate-filter.ts` - Zod-classified answerable/mixed/boilerplate-only source text classifier.
- `src/retrieval/bm25-retriever.ts` - In-memory BM25-style retriever over validated `KnowledgeChunk` inputs.
- `src/retrieval/retrieval-fixtures.test.ts` - Fixture-first tests for synonym/n-gram behavior, top-five retrieval, guidebook citation anchors, boilerplate downranking, and broad service/listing queries.
- `src/retrieval/boilerplate-filter.test.ts` - Deterministic classifier tests for login prompts, viewer controls, site chrome, mixed CDP service text, listing text, and control-character sanitization.

## Verification

| Command | Result |
|---|---|
| `npm test -- src/retrieval/retrieval-fixtures.test.ts` | Pass during Task 1, 2 tests |
| `npm test -- src/retrieval/boilerplate-filter.test.ts` | Pass during Task 2, 6 tests |
| `npm test -- src/retrieval/retrieval-fixtures.test.ts src/retrieval/boilerplate-filter.test.ts` | Pass, 18 tests |
| `npm run typecheck` | Pass |

## Decisions Made

- Kept retrieval local and deterministic with no web/network, embeddings, vector stores, LLM calls, or heavyweight Korean morphology dependencies.
- Re-parsed every constructor chunk with `KnowledgeChunkSchema` so retrieval fails closed on malformed or untrusted metadata supplied at the retrieval boundary.
- Treated `deadline_status: "unknown"` as neutral for campus-service 안내 and guidebook queries so evergreen service pages are not over-penalized.
- Excluded `boilerplate_only` results when any answerable or mixed evidence has a positive retrieval score; retained fallback behavior for later evidence policy to hard-refuse if only boilerplate can match.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion; implementation stayed within the listed files and D-01 through D-07 retrieval decisions.

## Issues Encountered

None.

## Known Stubs

None. Empty arrays detected in `src/retrieval/bm25-retriever.ts` are internal accumulators/options defaults, not UI or answer stubs.

## User Setup Required

None - no external service configuration required.

## Threat Flags

None. The new query-text retrieval boundary and source-text evidence selection surface were already covered by the plan threat model.

## Next Phase Readiness

- Ready for `03-03-PLAN.md` evidence policy and citation/output validation to consume `RetrievedChunk.normalized_score`, `matched_terms`, and `ranking_features`.
- Ready for later prompt/audit plans to use boilerplate classification and unmodified `KnowledgeChunk` citation/freshness metadata.

## Self-Check: PASSED

- Found `src/retrieval/retriever.ts`.
- Found `src/retrieval/normalize-korean.ts`.
- Found `src/retrieval/domain-synonyms.ts`.
- Found `src/retrieval/boilerplate-filter.ts`.
- Found `src/retrieval/bm25-retriever.ts`.
- Found `src/retrieval/retrieval-fixtures.test.ts`.
- Found `src/retrieval/boilerplate-filter.test.ts`.
- Found `.planning/phases/03-source-grounded-chat-mvp/03-02-SUMMARY.md`.
- Found commits `00197ba`, `aa79a11`, `b23e6cb`, `140ca09`, `ea03a5b`, and `903361a` in git history.

---
*Phase: 03-source-grounded-chat-mvp*
*Completed: 2026-05-03*
