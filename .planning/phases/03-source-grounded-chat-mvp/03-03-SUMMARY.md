---
phase: 03-source-grounded-chat-mvp
plan: 03
subsystem: chat-safety-validation
tags: [rag, citations, refusal-policy, output-validation, korean]

requires:
  - phase: 03-source-grounded-chat-mvp
    provides: 03-01 chat response contracts and 03-02 retrieved chunk normalized scores/ranking fields
provides:
  - D-17 through D-20 evidence-tier policy with hard refusal, soft hedge, and normal answer thresholds
  - Runtime fail-closed output validation for schema shape, Korean-first answers, citation markers, citation mapping, and hostile output phrases
  - Verification-first coverage for weak evidence, no-answer refusals, PDF page citations, citationless output, and prompt-injection compliance rejection
affects: [03-source-grounded-chat-mvp, prompt-builder, chat-orchestration, audit-logging, evaluation]

tech-stack:
  added: []
  patterns: [strict TypeScript ESM with .js imports, TDD RED/GREEN commits, fail-closed validation result unions]

key-files:
  created:
    - src/chat/evidence-policy.ts
    - src/chat/output-validation.ts
    - src/chat/output-validation.test.ts
  modified: []

key-decisions:
  - "Evidence policy implements D-17 through D-20 exactly: hard_refuse below 0.30, soft_hedge from 0.30 through 0.50, normal_answer above 0.50, with hard refusal for zero chunks, boilerplate-only evidence, or missing citation anchors."
  - "Output validation treats provider/model responses as untrusted until ChatResponseSchema parsing, Korean-first checks, inline citation marker mapping, allowed citation IDs, and unsafe phrase rejection all pass."

patterns-established:
  - "Guardrail helpers return explicit failure strings instead of throwing, enabling later ChatService and audit layers to fail closed and log reproducible guardrail outcomes."
  - "Hard-refusal answers may omit citations only when expectedTier is hard_refuse and the response remains a short Korean no-answer message."

requirements-completed: [RAG-03, RAG-04, RAG-06]

duration: 4min
completed: 2026-05-03
---

# Phase 03 Plan 03: Evidence Tier and Output Validation Summary

**Fail-closed Korean chat guardrails with deterministic evidence tiers, citation-marker validation, freshness-aware citation schema checks, and hostile-output rejection.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-03T11:24:30Z
- **Completed:** 2026-05-03T11:28:28Z
- **Tasks:** 2 completed
- **Files modified:** 3 implementation/test files plus this summary and tracking metadata

## Accomplishments

- Added `evaluateEvidence()` with exact `0.30` / `0.50` threshold handling and hard-refusal overrides for zero chunks, boilerplate-only results, and missing citation anchors.
- Added `buildHardRefusalAnswer()` with short Korean no-answer wording that points students back to official pages or more specific questions.
- Added `validateChatResponseOutput()` over `ChatResponseSchema` to enforce Korean-first content, inline `[n]` citation markers, citation object mapping, allowed citation IDs, expected refusal tier, and unsafe phrase rejection.
- Added TDD tests for score boundaries `0.29`, `0.30`, `0.50`, `0.51`, no-answer hard refusal, PDF `page_number: 1`, citationless factual output, hostile source/model phrases, and unmapped citation markers.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Evidence policy tests** - `e552c3e` (`test(03-03): add failing evidence policy tests`)
2. **Task 1 GREEN: Evidence tier policy** - `b13daf2` (`feat(03-03): add evidence tier policy`)
3. **Task 2 RED: Output validation tests** - `93dee17` (`test(03-03): add failing output validation tests`)
4. **Task 2 GREEN: Runtime output validation** - `b9f3477` (`feat(03-03): add chat output validation`)

**Plan metadata:** committed separately in the final docs commit.

## Files Created/Modified

- `src/chat/evidence-policy.ts` - Evidence-tier configuration, threshold classifier, boilerplate/citation hard-refusal checks, and Korean hard-refusal answer builder.
- `src/chat/output-validation.ts` - Runtime schema/citation/Korean/unsafe-output validator returning explicit success or failure results.
- `src/chat/output-validation.test.ts` - Vitest coverage for D-17 through D-21 threshold, citation, refusal, PDF page, and hostile-output cases.
- `.planning/phases/03-source-grounded-chat-mvp/03-03-SUMMARY.md` - Execution summary and verification record.

## Verification

| Command | Result |
|---|---|
| `npm test -- src/chat/output-validation.test.ts` | Pass, 17 tests |
| `npm run typecheck` | Pass |
| Task 1 acceptance greps | Pass: exact thresholds, Korean hedge prefix, and boundary scores found |
| Task 2 acceptance greps | Pass: `ChatResponseSchema`, citation regex, unsafe phrases, and `page_number: 1` found |

## Decisions Made

- Kept evidence policy independent of provider/prompt/orchestration layers so later `ChatService` can consume deterministic tier results without LLM calls.
- Validated citation IDs against both the response's structured `citations[]` and the caller-provided `allowedCitationIds` to prevent model-invented citations from passing through.
- Used exact unsafe phrase matching for `출처를 생략`, `공식 인증`, `취업을 보장`, and `이전 지시를 무시` to reject source-injection compliance, endorsement claims, and guaranteed outcomes.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion; implementation stayed within the listed files and required summary/tracking artifacts.

## Issues Encountered

None.

## Known Stubs

None. Empty arrays/objects detected in the changed TypeScript files are internal accumulators, test helper defaults, or option defaults; they do not flow to UI rendering or user-facing responses as placeholders.

## User Setup Required

None - no external service configuration required.

## Threat Flags

None. The new evidence-to-answer and model-output validation trust boundaries were already covered by the plan threat model.

## Next Phase Readiness

- Ready for `03-04-PLAN.md` to build provider and prompt boundaries that consume the evidence tier and output validator without making live calls in tests.
- Ready for `03-05-PLAN.md` to log validation failures and evidence-policy decisions in append-only audit records.

## Self-Check: PASSED

- Found `src/chat/evidence-policy.ts`.
- Found `src/chat/output-validation.ts`.
- Found `src/chat/output-validation.test.ts`.
- Found `.planning/phases/03-source-grounded-chat-mvp/03-03-SUMMARY.md`.
- Found commits `e552c3e`, `b13daf2`, `93dee17`, and `b9f3477` in git history.

---
*Phase: 03-source-grounded-chat-mvp*
*Completed: 2026-05-03*
