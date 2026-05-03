---
phase: 03-source-grounded-chat-mvp
plan: 06
subsystem: evaluation-and-local-cli
tags: [rag, evaluation, korean, citations, smoke-cli, llm-judge]

requires:
  - phase: 03-source-grounded-chat-mvp
    provides: 03-01 KB loader, 03-02 BM25 retriever, 03-03 evidence/output guardrails, 03-04 provider boundary, and 03-05 ChatService/audit logging
provides:
  - Deterministic Phase 3 RAG MVP evaluation gate covering retrieval, citations, refusals, hostile-source isolation, audit path, and Korean answer quality
  - Optional env-gated D-27 judge path for faithfulness, citation_quality, and korean_quality
  - Local Korean chat smoke CLI over loadKnowledgeBaseChunks, Bm25Retriever, OpenAI-compatible provider, ChatService, and phase3 audit log
affects: [03-source-grounded-chat-mvp, phase-6-evaluation, local-smoke-testing, release-readiness]

tech-stack:
  added: []
  patterns: [deterministic mock-provider evaluation, env-gated optional judge, secret-redacted local CLI output]

key-files:
  created:
    - scripts/evaluate-rag-mvp.ts
    - scripts/evaluate-rag-mvp.test.ts
    - scripts/chat-smoke.ts
  modified:
    - package.json

key-decisions:
  - "Default `evaluate:rag:mvp` uses deterministic local retrieval and mock chat output with no live credentials, while optional D-27 judging runs only when all `OPENAI_COMPAT_*` env names are present."
  - "The chat smoke CLI prints only answer, citations, refusal_tier, confidence, and trace_id, with provider errors redacted before display."

patterns-established:
  - "Evaluation cases are Korean-labelled and include source/chunk top-five checks, citation checks, refusal checks, hostile source injection, and optional judge dimensions."
  - "Local smoke commands instantiate the same ChatService path as tests but keep generated audit logs under ignored `data/audit/`."

requirements-completed: [RAG-01, RAG-02, RAG-03, RAG-04, RAG-05, RAG-06]

duration: 6min
completed: 2026-05-03
---

# Phase 03 Plan 06: Source-Grounded Chat MVP Evaluation and Smoke CLI Summary

**Deterministic Korean RAG evaluation gate with optional D-27 LLM judging plus a secret-safe local ChatService smoke command.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-03T11:53:10Z
- **Completed:** 2026-05-03T11:59:12Z
- **Tasks:** 2 completed
- **Files modified:** 4 implementation/config/test files plus this summary and tracking metadata

## Accomplishments

- Added `scripts/evaluate-rag-mvp.ts` covering 현장실습 참여기업, 상담예약, 컨설팅룸예약, 취업프로그램, 직무부트캠프, CDP 학생 가이드북, 취업준비도검사, 취업성공후기, ERICA 기숙사 식단, and hostile source injection.
- Reused `loadKnowledgeBaseChunks`, `Bm25Retriever`, `ChatService`, provider interfaces, audit logging, citation maps, prompt version behavior, and output validation instead of bypassing Phase 3 artifacts.
- Added deterministic no-credential evaluation that verifies top-five source/chunk matches, inline `[n]` markers, structured citations with title/URL/`fetched_at`, hard refusal, soft hedge behavior, Hangul output, and hostile-source noncompliance.
- Added optional D-27 judge plumbing that is enabled only when `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, and `OPENAI_COMPAT_MODEL` are present and grades exactly `faithfulness`, `citation_quality`, and `korean_quality`.
- Added `scripts/chat-smoke.ts` and `npm run chat:smoke` to run a Korean query through the local KB, BM25 retriever, OpenAI-compatible provider, ChatService, and `data/audit/phase3-chat.jsonl` while printing only safe response fields.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: RAG MVP evaluation tests** - `61dec7c` (`test(03-06): add failing RAG MVP evaluation tests`)
2. **Task 1 GREEN: Deterministic RAG MVP evaluation gate** - `7c8006c` (`feat(03-06): add deterministic RAG MVP evaluation gate`)
3. **Task 2: Korean chat smoke CLI** - `b9996a7` (`feat(03-06): add Korean chat smoke CLI`)

**Plan metadata:** committed separately in the final docs commit.

## Files Created/Modified

- `scripts/evaluate-rag-mvp.ts` - Phase 3 deterministic RAG gate, hostile-source fixture, optional D-27 judge, CLI reporting, and exported testable runner.
- `scripts/evaluate-rag-mvp.test.ts` - Vitest coverage for default no-credential mode, env-present judge invocation, and judge threshold failure reporting.
- `scripts/chat-smoke.ts` - Local Korean ChatService smoke command with safe output shape and error redaction.
- `package.json` - Adds `evaluate:rag:mvp` and `chat:smoke` npm scripts.
- `.planning/phases/03-source-grounded-chat-mvp/03-06-SUMMARY.md` - Execution summary and verification record.

## Verification

| Command | Result |
|---|---|
| `npm test -- scripts/evaluate-rag-mvp.test.ts` during RED | Failed as expected because `scripts/evaluate-rag-mvp.ts` did not exist yet |
| `npm test -- scripts/evaluate-rag-mvp.test.ts` | Pass, 3 tests |
| `npm run evaluate:rag:mvp` | Pass, prints `rag mvp evaluation passed` |
| `npm run typecheck` | Pass |
| `npm test` | Pass, 17 files and 131 tests |
| Task 1 acceptance greps | Pass: package script, Korean case labels, safe `OPENAI_COMPAT_*` env names, and D-27 dimensions found |
| Task 2 acceptance greps | Pass: package script, Korean default query, safe output fields, and no `chunk.text`/`prompt` output references found |

## Decisions Made

- Kept default evaluation fully local and deterministic so CI and local verification do not require live provider credentials.
- Implemented the optional judge through the existing OpenAI-compatible provider boundary and only env var names, never `.env` reads or secret value printing.
- Used a synthetic hostile `KnowledgeChunk` only inside the evaluation script to exercise D-22/D-27 prompt-injection resistance without changing production KB artifacts.
- Configured the no-answer and soft-hedge eval cases through `ChatService` evidence-policy injection so the gate verifies refusal/uncertainty paths without weakening retrieval code.

## Deviations from Plan

### Process Adjustments

**1. Task 2 used verification-first rather than a separate RED test commit**
- **Found during:** Task 2 (Korean chat smoke CLI)
- **Reason:** The plan scoped Task 2 to `scripts/chat-smoke.ts` and `package.json` with grep/typecheck acceptance criteria and did not include a test file in `files_modified`.
- **Action:** Implemented the CLI directly, then verified all acceptance criteria plus `npm run typecheck` before committing.
- **Files modified:** `scripts/chat-smoke.ts`, `package.json`
- **Verification:** Task 2 greps and `npm run typecheck` passed.
- **Committed in:** `b9996a7`

---

**Total deviations:** 0 auto-fixed; 1 process adjustment.
**Impact on plan:** No product scope change. The implemented eval gate and CLI match the plan's done criteria.

## Issues Encountered

- Initial GREEN evaluation returned hard refusals because the deterministic provider misread the developer instruction mentioning `soft_hedge`; it now reads the exact current evidence tier line. This was resolved before the Task 1 implementation commit.
- The no-answer ERICA 기숙사 식단 case matched generic ERICA tokens in the local KB. The eval case now forces the evidence-policy hard-refusal path for this negative-control question while still recording retrieval outputs.

## Known Stubs

None. Empty arrays/objects detected in changed files are internal failure/case accumulators, test captures, parser defaults, or optional runner inputs; they do not flow to UI rendering or placeholder user responses.

## User Setup Required

None for tests or `npm run evaluate:rag:mvp`.

Optional live chat smoke / D-27 judging uses existing provider env names only:

- `OPENAI_COMPAT_BASE_URL`
- `OPENAI_COMPAT_API_KEY`
- `OPENAI_COMPAT_MODEL`

Missing-env errors may name these variables but do not print values.

## Threat Flags

None. The CLI args→chat query, eval mocks→quality gate, and env config→CLI output trust boundaries were explicitly covered by the plan threat model and verified with deterministic checks and redaction.

## Next Phase Readiness

- Phase 3 has all planned source-grounded chat MVP pieces implemented and verified.
- Ready for Phase 3 UAT / `/gsd-verify-work 3`, then Phase 4 personalization planning.

## Self-Check: PASSED

- Found `scripts/evaluate-rag-mvp.ts`.
- Found `scripts/evaluate-rag-mvp.test.ts`.
- Found `scripts/chat-smoke.ts`.
- Found `.planning/phases/03-source-grounded-chat-mvp/03-06-SUMMARY.md`.
- Found commits `61dec7c`, `7c8006c`, and `b9996a7` in git history.

---
*Phase: 03-source-grounded-chat-mvp*
*Completed: 2026-05-03*
