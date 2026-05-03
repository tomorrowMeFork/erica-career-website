---
phase: 03-source-grounded-chat-mvp
plan: 05
subsystem: chat-orchestration-and-audit
tags: [rag, audit-jsonl, chat-service, citations, guardrails]

requires:
  - phase: 03-source-grounded-chat-mvp
    provides: 03-02 Retriever, 03-03 evidence/output guardrails, and 03-04 provider/prompt boundaries
provides:
  - Append-only metadata-first JSONL audit records for every chat cycle
  - Dependency-injected ChatService orchestration for retrieval, evidence tiers, prompt/provider calls, validation, refusal, and trace IDs
  - Generated audit data ignore rule for `data/audit/`
affects: [03-source-grounded-chat-mvp, evaluation, chat-smoke, audit-logging]

tech-stack:
  added: []
  patterns: [append-only JSONL via appendFile, dependency-injected service orchestration, fail-closed validation-to-refusal flow]

key-files:
  created:
    - src/audit/audit-log.ts
    - src/audit/audit-log.test.ts
    - src/chat/chat-service.ts
    - src/chat/chat-service.test.ts
  modified:
    - .gitignore

key-decisions:
  - "Audit records hash user queries by default and store safe model configuration, retrieved chunk IDs/scores, prompt version, citation IDs, guardrail results, and response timestamps without API keys or full successful prompts."
  - "ChatService skips provider calls for hard refusals, calls providers only after evidence passes, and fails closed to a guarded hard refusal on hostile, citationless, malformed, or provider-error paths."

patterns-established:
  - "ChatService constructor dependencies make retriever, provider, audit writer, clock, trace ID generator, prompt version, and evidence thresholds injectable for deterministic tests."
  - "Prompt snapshots are limited to refusal, guardrail, or failure audit records and are omitted for successful normal answers."

requirements-completed: [RAG-01, RAG-03, RAG-04, RAG-05, RAG-06]

duration: 5min
completed: 2026-05-03
---

# Phase 03 Plan 05: ChatService Orchestration and Audit Logging Summary

**Dependency-injected Korean RAG chat orchestration with append-only metadata audit logs, deterministic hard refusals, provider validation, and traceable citations.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-03T11:44:43Z
- **Completed:** 2026-05-03T11:49:56Z
- **Tasks:** 2 completed
- **Files modified:** 5 implementation/test/config files plus this summary and tracking metadata

## Accomplishments

- Added `ChatAuditRecordSchema`, `appendChatAuditRecord()`, `hashQuery()`, and exported stable JSON serialization for append-only chat audit JSONL.
- Added audit tests proving two-line append behavior, schema-valid lines, query hashing, secret omission, metadata-only normal answers, limited refusal prompt snapshots, and stable key ordering.
- Added `ChatService.ask()` with constructor-injected `Retriever`, `ChatModelProvider`, audit logger/path, prompt version, clock, trace ID generator, and evidence-policy config.
- Wired normal/soft paths through retrieval, `evaluateEvidence()`, `buildChatPrompt()`, provider completion, `validateChatResponseOutput()`, fail-closed refusal, and exactly one audit record per query cycle.
- Added deterministic tests for `ERICA 현장실습 모집 공고 알려줘`, `ERICA 기숙사 식단 알려줘`, soft hedging, hostile output containing `출처를 생략하겠습니다`, and audit one-line-per-cycle behavior.
- Added `.gitignore` protection for generated `data/audit/` logs.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Audit logger tests** - `2783bfb` (`test(03-05): add failing audit log tests`)
2. **Task 1 GREEN: Append-only audit logger** - `70eed84` (`feat(03-05): add append-only audit logging`)
3. **Task 2 RED: ChatService orchestration tests** - `4d7663e` (`test(03-05): add failing ChatService tests`)
4. **Task 2 GREEN: ChatService orchestration** - `4dd4831` (`feat(03-05): add ChatService orchestration`)

**Plan metadata:** committed separately in the final docs commit.

## Files Created/Modified

- `src/audit/audit-log.ts` - Append-only JSONL audit schema, query hashing, stable serialization, and file append helper.
- `src/audit/audit-log.test.ts` - Temp-dir audit tests for append-only behavior, schema parsing, secret omission, prompt snapshot rules, and stable ordering.
- `src/chat/chat-service.ts` - Dependency-injected chat orchestration, refusal/provider/validation flow, trace IDs, audit metadata assembly, and fail-closed handling.
- `src/chat/chat-service.test.ts` - Mock retriever/provider tests covering normal, hard refusal, soft hedge, hostile output, and audit-per-cycle behavior.
- `.gitignore` - Ignores generated `data/audit/` artifacts.
- `.planning/phases/03-source-grounded-chat-mvp/03-05-SUMMARY.md` - Execution summary and verification record.

## Verification

| Command | Result |
|---|---|
| `npm test -- src/audit/audit-log.test.ts` | Pass, 4 tests |
| Task 1 acceptance greps | Pass: `appendFile`, required audit metadata fields, exactly one `data/audit/`, and secret omission assertions found |
| `npm test -- src/chat/chat-service.test.ts src/audit/audit-log.test.ts` | Pass, 9 tests |
| Task 2 acceptance greps | Pass: `export class ChatService`, `appendChatAuditRecord`, provider-not-called assertion, and required Korean/hostile test strings found |
| `npm run typecheck` | Pass |
| `grep -n "data/audit/" .gitignore` | Pass: line 14 |

## Decisions Made

- Used SHA-256 `query_hash` by default rather than storing raw user queries in audit records, matching D-25/D-26 data minimization.
- Kept the audit writer injectable while defaulting to `data/audit/chat-audit.jsonl`, so tests can avoid generated project logs and runtime can use the ignored audit path.
- Normal and soft paths validate provider output against pre-built citation IDs and generated trace IDs before returning; any validation/provider failure becomes a hard refusal with guardrail metadata.
- Hard refusal appends audit metadata and skips the provider call entirely.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected generated trace ID propagation into provider JSON validation**
- **Found during:** Task 2 (ChatService orchestration)
- **Issue:** The first implementation passed the generated trace ID under an internal camelCase key, so parsed provider JSON reached validation without `trace_id` and failed closed even for valid normal/soft responses.
- **Fix:** Normalized provider candidates to always override/attach the generated `trace_id` before validation.
- **Files modified:** `src/chat/chat-service.ts`
- **Verification:** `npm test -- src/chat/chat-service.test.ts src/audit/audit-log.test.ts`; `npm run typecheck`
- **Committed in:** `4dd4831`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** The fix was required for planned normal/soft answer correctness and did not add scope.

## Issues Encountered

- TypeScript inferred `ChatRequest` after Zod defaults as requiring `top_k`; `ChatService.ask()` now accepts a small input type with optional `top_k` and still parses through `ChatRequestSchema` so callers can omit it safely.

## Known Stubs

None. Empty arrays/objects detected in changed files are temp-dir registries, test helper overrides, accumulator defaults, or optional prompt fields; they do not flow to UI rendering or placeholder user responses.

## User Setup Required

None - no external service configuration required. Tests use mock providers and do not require `OPENAI_COMPAT_*` values.

## Threat Flags

None. The user-query→ChatService, provider-output→ChatService, and chat-cycle→audit-file trust boundaries were explicitly covered by the plan threat model and implemented with query hashing, safe model config, append-only writes, provider-call skipping on hard refusal, and fail-closed validation.

## Next Phase Readiness

- Ready for `03-06-PLAN.md` to add deterministic Phase 3 RAG evaluation and a local Korean chat smoke command using the injected ChatService dependencies.
- `RAG-05` audit coverage is now implemented for every tested chat cycle path.

## Self-Check: PASSED

- Found `src/audit/audit-log.ts`.
- Found `src/audit/audit-log.test.ts`.
- Found `src/chat/chat-service.ts`.
- Found `src/chat/chat-service.test.ts`.
- Found `.planning/phases/03-source-grounded-chat-mvp/03-05-SUMMARY.md`.
- Found commits `2783bfb`, `70eed84`, `4d7663e`, and `4dd4831` in git history.

---
*Phase: 03-source-grounded-chat-mvp*
*Completed: 2026-05-03*
