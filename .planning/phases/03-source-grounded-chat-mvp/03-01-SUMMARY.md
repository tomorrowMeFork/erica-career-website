---
phase: 03-source-grounded-chat-mvp
plan: 01
subsystem: chat-contracts-and-knowledge-base-loader
tags: [rag, zod, jsonl, citations, knowledge-base]

requires:
  - phase: 02-ingestion-and-knowledge-base
    provides: Phase 2 JSONL knowledge-base chunks with citations, freshness, deadline status, and untrusted source markers
provides:
  - Validated chat request, citation, refusal tier, and response contracts for Phase 3 source-grounded chat
  - Fail-closed JSONL loader for all verified Phase 2 knowledge-base chunk outputs
  - Fixture-first Vitest coverage for default KB loading and malformed input rejection
affects: [03-source-grounded-chat-mvp, retrieval, citation-formatting, chat-orchestration]

tech-stack:
  added: []
  patterns: [strict TypeScript ESM with .js imports, Zod schema contracts with z.infer types, fail-closed JSONL parsing]

key-files:
  created:
    - src/chat/chat-contract.ts
    - src/knowledge-base/jsonl-loader.ts
    - src/knowledge-base/knowledge-base-loader.test.ts
  modified: []

key-decisions:
  - "Chat responses expose only answer, structured citations, refusal tier, confidence, and trace_id; raw retrieved source text is not part of the normal response contract."
  - "Knowledge-base loading fails closed by parsing every chunks.jsonl line through KnowledgeChunkSchema and rejecting missing citations or non-untrusted source markers before returning chunks."

patterns-established:
  - "Phase 3 contracts use Zod schemas plus z.infer exported TypeScript types."
  - "Default KB loading covers fixture-ibus, fixture-cdp-pdf, and playwright-sources from D-03."

requirements-completed: [RAG-01, RAG-02, RAG-03]

duration: 2min
completed: 2026-05-03
---

# Phase 03 Plan 01: Source-Grounded Chat Contracts and KB Loader Summary

**Validated Korean chat request/response contracts and a fail-closed Phase 2 JSONL chunk loader for source-grounded RAG foundations.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-03T11:09:40Z
- **Completed:** 2026-05-03T11:12:04Z
- **Tasks:** 2 completed
- **Files modified:** 3 implementation/test files plus this summary

## Accomplishments

- Added `ChatRequestSchema`, `ChatCitationSchema`, `ChatResponseSchema`, and refusal tier typing with bounded query/top-k validation.
- Preserved D-14 through D-16 response fields, including citations, freshness, deadline status, optional PDF page context, confidence, and `trace_id` without exposing raw retrieved text.
- Added `loadKnowledgeBaseChunks` with default D-03 directories and fail-closed parsing through `KnowledgeChunkSchema`.
- Added fixture-first loader tests covering all verified KB outputs and malformed JSONL/schema/trust-marker failure cases.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define validated chat request and response contracts** - `16c2474` (`feat(03-01): add chat response contracts`)
2. **Task 2 RED: Add failing tests for fail-closed JSONL loader** - `89d4fa0` (`test(03-01): add failing tests for knowledge base loader`)
3. **Task 2 GREEN: Add fail-closed JSONL chunk loader** - `53031a7` (`feat(03-01): add fail-closed KB chunk loader`)

**Plan metadata:** committed separately in the final docs commit.

## Files Created/Modified

- `src/chat/chat-contract.ts` - Zod chat request/response/citation/refusal schemas and inferred TypeScript types.
- `src/knowledge-base/jsonl-loader.ts` - Default Phase 2 KB chunk loader with schema parsing and invariant checks.
- `src/knowledge-base/knowledge-base-loader.test.ts` - Vitest coverage for default KB directories and fail-closed invalid inputs.
- `.planning/phases/03-source-grounded-chat-mvp/03-01-SUMMARY.md` - Execution summary and verification record.

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test -- src/knowledge-base/knowledge-base-loader.test.ts` | Pass, 6 tests |
| `npm run verify:knowledge-base -- data/knowledge-base/fixture-ibus` | Pass |
| `npm run verify:knowledge-base -- data/knowledge-base/fixture-cdp-pdf` | Pass |
| `npm run verify:knowledge-base -- data/knowledge-base/playwright-sources` | Pass |

## Decisions Made

- Used the existing `DeadlineStatusSchema` from `normalized-record.ts` for chat citations so response metadata stays aligned with Phase 2 KB output.
- Kept the loader synchronous and deterministic with `existsSync`, `readFileSync`, and `join`, matching the plan and verification script pattern.
- Aggregated loader failures before throwing so callers receive path-and-line-specific diagnostics without receiving partial retrieval input.

## Deviations from Plan

### Process Adjustments

**1. Task 1 used verification-first instead of a separate RED test commit**
- **Found during:** Task 1 (Define validated chat request and response contracts)
- **Reason:** The plan scoped Task 1 files to `src/chat/chat-contract.ts` only and listed grep/typecheck acceptance criteria without a contract test file.
- **Action:** Implemented the contract directly, then verified every acceptance criterion plus `npm run typecheck` before committing.
- **Files modified:** `src/chat/chat-contract.ts`
- **Verification:** Grep acceptance criteria and `npm run typecheck` passed.
- **Committed in:** `16c2474`

---

**Total deviations:** 0 auto-fixed; 1 process adjustment.
**Impact on plan:** No product scope change. The shipped contract and loader behavior match the plan's done criteria.

## Issues Encountered

None.

## Known Stubs

None. Empty arrays in loader/test code are internal accumulators or cleanup registries, not UI or response stubs.

## User Setup Required

None - no external service configuration required.

## Threat Flags

None. The new chat input bounds and local KB file-read boundary were already covered by the plan threat model.

## Next Phase Readiness

- Ready for `03-02-PLAN.md` retrieval implementation to consume `ChatRequestSchema.top_k` and `loadKnowledgeBaseChunks()`.
- Downstream retrieval and answer plans can rely on source metadata, citation anchors, freshness, deadline status, and `source_text_trust` being validated before use.

## Self-Check: PASSED

- Found `src/chat/chat-contract.ts`.
- Found `src/knowledge-base/jsonl-loader.ts`.
- Found `src/knowledge-base/knowledge-base-loader.test.ts`.
- Found `.planning/phases/03-source-grounded-chat-mvp/03-01-SUMMARY.md`.
- Found commits `16c2474`, `89d4fa0`, and `53031a7` in git history.

---
*Phase: 03-source-grounded-chat-mvp*
*Completed: 2026-05-03*
