---
phase: 05-student-facing-experience
plan: 02
subsystem: api-adapters
tags: [next-api, zod, preferences, recommendations]
key-files:
  created: [app/api/chat/route.ts, app/api/recommendations/route.ts, app/api/preferences/route.ts, lib/service-container.ts, lib/api-client.ts, lib/session-key.ts, lib/deadline-labels.ts]
  modified: []
decisions:
  - API routes are thin Node handlers over existing Phase 3/4 services with schema-validated inputs/outputs.
  - Browser helpers return UI-safe Korean errors instead of provider details.
metrics:
  tasks_completed: 2
  completed: 2026-05-04
---

# Phase 05 Plan 02: API Adapter and Client Helper Summary

One-liner: Schema-validated Next route adapters and browser helpers for chat, recommendations, preferences, session keys, and Korean labels.

## Completed Tasks

| Task | Result | Commit |
|---|---|---|
| Server-only service factories and route adapters | Added `/api/chat`, `/api/recommendations`, `/api/preferences` and deterministic route tests | f378196 |
| Browser API helpers, session keys, semantic labels | Added validated fetch helpers, sessionStorage key helper, deadline/match/refusal labels and tests | 75bb640 |

## Verification

- `npm test -- app/api/chat/route.test.ts app/api/recommendations/route.test.ts app/api/preferences/route.test.ts lib/api-client.test.ts lib/deadline-labels.test.ts` — passed
- `npm run typecheck` — passed
- Full Phase 5 final gates — passed

## Deviations from Plan

None - plan executed as written.

## Threat Flags

| Flag | File | Description |
|---|---|---|
| threat_flag: network-endpoint | app/api/chat/route.ts | Public Next route validates `ChatRequestSchema` and redacts errors. |
| threat_flag: network-endpoint | app/api/recommendations/route.ts | Public Next route validates recommendation request/response schemas. |
| threat_flag: preference-input | app/api/preferences/route.ts | Session-key preference lifecycle route validates session key and preference state. |

## Self-Check: PASSED

- Created files exist.
- Commits found: f378196, 75bb640.
