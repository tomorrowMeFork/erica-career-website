---
phase: 06-safety-evaluation-and-release-readiness
plan: 03
subsystem: release-readiness-evaluation
tags: [evaluation, retrieval, citations, refusal, hostile-source, local-gate]
requires: [06-02, 03-06, 04-04]
provides: [evaluate:release-readiness]
affects: [EVAL-01, EVAL-02, EVAL-03, EVAL-06, SAFE-02]
tech-stack:
  added: []
  patterns: [local deterministic eval, composed prior gates, optional env-name-gated judge]
key-files:
  created: [scripts/evaluate-release-readiness.ts, scripts/evaluate-release-readiness.test.ts]
  modified: [package.json]
decisions:
  - Release evaluation composes existing Phase 3 and Phase 4 gates rather than replacing them.
metrics:
  tasks: 3
  completed: 2026-05-04
---

# Phase 06 Plan 03: Release Readiness Evaluation Summary

Deterministic local release evaluation over Phase 6 QA cases with prior gate composition.

## Accomplishments

- Added `runReleaseReadinessEvaluation` and `evaluate:release-readiness`.
- Evaluates expected top sources/chunks, metadata preservation, citation matching, Korean output, refusal behavior, unsafe claims, and hostile-source containment.
- Composes `runRagMvpEvaluation()` and `runPersonalizationEvaluation()`.
- Optional judge path activates only when all `OPENAI_COMPAT_*` env names are present and test-proves fake secret values are not leaked.

## Task Commits

- `5a8f576` — `feat(06-03): add release readiness evaluation`

## Verification

| Command | Result |
|---|---|
| `npm test -- scripts/evaluate-release-readiness.test.ts` | Pass, 4 tests |
| `npm run evaluate:release-readiness` | Pass |
| `npm run evaluate:rag:mvp` | Pass |
| `npm run evaluate:personalization` | Pass |
| `npm run typecheck` | Pass |

## Deviations from Plan

None - plan executed within the intended deterministic local evaluation boundary.

## Known Stubs

None.

## Self-Check: PASSED

- Created files exist.
- Task commit is present in git history.
