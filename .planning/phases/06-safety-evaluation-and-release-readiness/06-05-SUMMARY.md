---
phase: 06-safety-evaluation-and-release-readiness
plan: 05
subsystem: release-readiness-gate
tags: [release, checklist, qa, local-gate]
requires: [06-01, 06-03, 06-04]
provides: [manual release checklist, release:ready]
affects: [SAFE-01, SAFE-02, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06]
tech-stack:
  added: []
  patterns: [manual evidence checklist, npm command chain]
key-files:
  created: [.planning/phases/06-safety-evaluation-and-release-readiness/RELEASE-CHECKLIST.md]
  modified: [package.json]
decisions:
  - `release:ready` remains a deterministic local command chain and excludes deployment/live-provider/crawling flows.
metrics:
  tasks: 2
  completed: 2026-05-04
---

# Phase 06 Plan 05: Release Checklist and Gate Summary

Manual release checklist plus integrated automated local preflight for first user testing readiness.

## Accomplishments

- Added `RELEASE-CHECKLIST.md` with all ten D-24 manual verification paths and required evidence fields.
- Added `release:ready` chaining typecheck, tests, Phase 5/6 verifiers, Phase 3/4/6 evals, freshness status, build, and Playwright QA.
- Preserved Phase 6 exclusions for production crawling, SSO, private/auth access, v2 career tools, endorsement claims, guaranteed outcomes, and secret leakage.

## Task Commits

- `eda3cb8` — `docs(06-05): add release readiness checklist`

## Verification

| Command | Result |
|---|---|
| `test -f .../RELEASE-CHECKLIST.md` + checklist grep | Pass |
| `npm run verify:phase6-safety` | Pass |
| `npm run release:ready` | Pass: 41 Vitest files/241 tests, build, and 8 Playwright project tests |

## Deviations from Plan

None - plan executed within documentation/script-only scope.

## Known Stubs

None.

## Self-Check: PASSED

- Created files exist.
- Task commit is present in git history.
