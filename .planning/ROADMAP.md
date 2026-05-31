# Roadmap: ERICA Career Chat

**Created:** 2026-05-03  
**Last updated:** 2026-05-08 for v1.2 Markdown Rendering and Prompt Context roadmap  
**Mode:** Constant-size post-milestone roadmap  
**Active milestone:** v1.2 Markdown Rendering and Prompt Context  
**Granularity:** coarse

## Milestones

| Milestone | Status | Shipped | Scope | Archives |
|---|---|---:|---|---|
| v1.0 ERICA Career Chat v1.0 | Shipped with known tech debt | 2026-05-04 | 6 phases, 30 plans, 32/32 requirements covered | [Roadmap](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md) · [Audit](milestones/v1.0-MILESTONE-AUDIT.md) |
| v1.1 UI Redesign | Shipped | 2026-05-04 | 5 phases, 21/21 requirements verified PASS | See [MILESTONES.md](MILESTONES.md) |
| v1.2 Markdown Rendering and Prompt Context | Targeted implementation complete, broad verification blocked | - | 3 phases, 17/17 v1.2 requirements mapped | Active in this file |

## v1.0 Archive Reference

<details>
<summary>v1.0 completed phases (6 phases, 30 plans)</summary>

| # | Phase | Plans | Status | Summary |
|---|---|---:|---|---|
| 1 | Source Discovery and Governance | 3 | Complete | Source registry, access review, bounded public-source discovery, and downstream source metadata contracts. |
| 2 | Ingestion and Knowledge Base | 6 | Complete | Fixture-first HTML/PDF ingestion, normalized citation-ready records, deadline/freshness metadata, and JSONL knowledge-base verification. |
| 3 | Source-Grounded Chat MVP | 7 | Complete | Korean chat contracts, BM25-style retrieval, citation/refusal guardrails, provider boundary, audit logs, and deterministic RAG evaluation. |
| 4 | Personalization and Recommendations | 4 | Complete | Explicit preference lifecycle, privacy/consent gates, ranking, Korean match reasons, and deterministic personalization evaluation. |
| 5 | Student-Facing Experience | 5 | Complete | Next.js/Tailwind Korean dashboard with chat, citations/source inspection, listing browse, preference controls, and responsive UI QA. |
| 6 | Safety, Evaluation, and Release Readiness | 5 | Complete | Safety disclaimer, reference QA/eval gates, freshness/operator status, manual release checklist, and `release:ready` gate. |

Full phase details are archived in [v1.0 roadmap archive](milestones/v1.0-ROADMAP.md). Phase directories remain in `.planning/phases/` for near-term continuation and reference and must not be cleared, moved, or deleted as part of v1.2 planning.

</details>

## v1.1 Shipped Reference

v1.1 shipped on 2026-05-04. It completed the UI Redesign milestone across Phases 7 through 11, including four-page navigation, 참고한 정보, source verification, career consultation, responsive QA, and scope guardrails. v1.2 starts from that shipped UI and must preserve the source-grounded Korean-first consultation model.

## v1.2 Framing

v1.2 focuses on clean chat answer rendering and explicit prompt-context personalization. The primary work is to render model answers with `react-markdown` so Korean 답변 can contain readable paragraphs, lists, emphasis, and sections without exposing raw markdown symbols to users. The bonus work is to include stable, user-provided core preference information such as 전공 and target role in system/developer prompt context in a minimized, privacy-safe way.

v1.2 must preserve citations, source labels, freshness metadata, deadlines, refusal/no-answer behavior, Korean-first copy, and the no-official-endorsement safety posture. It must not add retrieval-system scope, crawling scope, ranking algorithm changes, saved jobs, reminders, SSO, or job-board workflow features.

The 2026-05-31 `feature/test` data-freshness follow-up is outside the v1.2 markdown/prompt-context milestone. It is a bounded hotfix to existing deadline/freshness behavior and reviewed CDP source snapshots, intended to correct stale or yearless deadline handling without changing v1.2's shipped/release-ready status or adding new crawling/product workflow scope.

Targeted v1.2 implementation is complete. Chat answers now render with `react-markdown`, citations/freshness/refusal states are preserved, unsafe raw HTML/script/style/iframe handling is constrained, markdown images are disabled, and chat requests can use an optional `session_key` path. Server-side prompt context resolves explicit preferences and includes only minimized `major` and `target_role`, while excluding raw chat history, session-only optional text, extra preference fields, secrets, storage metadata, hidden profiling, and cleared preferences. This does not mark v1.2 as shipped or release-ready.

Latest broad verification distinguishes passing infrastructure gates from failing broad Vitest/evaluation gates. `npm run typecheck -- --pretty false`, `npm run build:web`, and re-run `npm run qa:web` passed. The first `npm run qa:web` failed only because the Playwright Chromium/headless shell executable was missing locally; `npx playwright install chromium` installed the required browser artifacts before the successful 28/28 Playwright re-run. Full `npm test` still failed, so `release:ready` remains blocked/pending.

## Verification-First Expectations

- Each v1.2 phase should plan verification before implementation, including markdown rendering cases, Korean readability checks, citation/freshness preservation, refusal/no-answer display, sanitization, and prompt-context privacy checks.
- UI work should prove users no longer see raw markdown artifacts such as `#`, `*`, or list syntax in normal rendered 답변 text while citations and freshness metadata remain visible.
- Prompt-context work should prove only explicit minimized preference fields are added, cleared preferences are omitted, and hidden profiling from chat history is not introduced.
- Final QA should prove v1.2 does not introduce semantic retrieval, ingestion expansion, crawling, matching/ranking algorithm changes, saved-job workflows, SSO, or official endorsement claims.
- Targeted verification passed: `npm test -- src/chat/prompt.test.ts src/chat/chat-service.test.ts app/api/chat/route.test.ts lib/api-client.test.ts components/chat/chat-components.test.tsx`, with 5 files and 30 tests passing.
- Typecheck passed: `npm run typecheck -- --pretty false`.
- Build passed: `npm run build:web`.
- Playwright QA passed after environment setup: initial `npm run qa:web` failed only because the Playwright Chromium/headless shell executable was missing locally; `npx playwright install chromium` installed the required browser artifacts; re-run `npm run qa:web` passed with 28/28 tests.
- Broad Vitest/evaluation gates still fail: full `npm test` failed with 42 test files total, 40 passed, 2 failed; 292 tests total, 287 passed, 5 failed.
- Failed test files: `scripts/evaluate-rag-mvp.test.ts` and `scripts/evaluate-release-readiness.test.ts`.
- Direct `npm run evaluate:rag:mvp` reported: `CDP 학생 가이드북: expected source cdp-student-guide-pdf in top 5`.
- Direct `npm run evaluate:release-readiness` reported failures for `phase6-listing-deadline: expected chunk 3986f65fde23212320ca478290394113c27ffaa776f8de59f7e292989ee8f270 in top results`, `phase6-personalization-recommendation: expected chunk 3986f65fde23212320ca478290394113c27ffaa776f8de59f7e292989ee8f270 in top results`, and `rag_mvp: CDP 학생 가이드북: expected source cdp-student-guide-pdf in top 5`.
- `release:ready` remains blocked/pending because broad Vitest/evaluation gates are failing.

## Phases

- [x] **Phase 12: Markdown Answer Rendering** - Chat answers render cleanly with `react-markdown` while preserving Korean readability, citations, freshness metadata, and refusal/no-answer states.
- [x] **Phase 13: Explicit Preference Prompt Context** - Stable user-provided preferences such as 전공 and target role can be added to system/developer prompt context with data minimization and no hidden profiling.
- [x] **Phase 14: v1.2 Regression QA and Scope Guardrails** - Targeted markdown rendering, prompt-context privacy, citations, freshness, refusal behavior, and scope exclusions are verified together. Typecheck, build, and Playwright QA pass; broad Vitest/evaluation gates still fail.
- [x] **Post-v1.2 Data Freshness Hotfix** - Existing ingestion/retrieval deadline handling and reviewed CDP source snapshots are corrected outside v1.2 scope; this does not mark v1.2 shipped or release-ready.

## Phase Details

### Phase 12: Markdown Answer Rendering
**Goal**: Users read Korean chat answers without visible markdown symbols or raw bullet/heading artifacts while still seeing the evidence that supports the answer.  
**Depends on**: v1.1 shipped consultation UI  
**Requirements**: V12-MD-01, V12-MD-02, V12-MD-03, V12-MD-04, V12-SAFE-01, V12-SAFE-02, V12-SAFE-03  
**Success Criteria** (what must be TRUE):
  1. User sees rendered paragraphs, lists, emphasis, and section-like answer structure without raw `#`, `*`, or stray markdown list artifacts in normal 답변 text.
  2. User can still inspect citations, source labels, freshness metadata, deadline status, confidence, and refusal/no-answer guidance after rendering changes.
  3. User receives readable Korean answer spacing that fits the existing chat UI rather than a separate document layout.
  4. Unsafe markdown or HTML cannot inject scripts, unsafe attributes, hostile links, or UI-breaking markup.
**Verification-first/TDD expectation**: Define rendering fixture cases before implementation, including Korean paragraphs, bullet lists, numbered lists, headings, citation-adjacent text, refusal answers, and hostile markdown/HTML.  
**Plans**: Targeted implementation complete  
**UI hint**: yes

### Phase 13: Explicit Preference Prompt Context
**Goal**: Chat can include stable, explicit preference context such as 전공, target role, and core interests in system/developer prompt context without hidden profiling or unnecessary personal data.  
**Depends on**: Phase 12 or existing chat provider boundary, depending on implementation order  
**Requirements**: V12-PCTX-01, V12-PCTX-02, V12-PCTX-03, V12-PCTX-04, V12-PCTX-05  
**Success Criteria** (what must be TRUE):
  1. Explicit stable preferences can be represented as minimized prompt context when present, such as 전공 and target role.
  2. Absent or cleared preferences are not added to future prompt context.
  3. Prompt context excludes raw chat history, unnecessary free text, secrets, unrelated personal data, and inferred sensitive traits.
  4. Personalized context remains subordinate to source-grounded Korean answers, citations, freshness metadata, and refusal/no-answer rules.
**Verification-first/TDD expectation**: Define prompt-builder privacy tests before implementation, covering allowed fields, absent fields, cleared preferences, excluded free text, no hidden profiling, and preservation of citation/refusal instructions.  
**Plans**: Targeted implementation complete  
**UI hint**: no

### Phase 14: v1.2 Regression QA and Scope Guardrails
**Goal**: v1.2 is verified as a presentation and explicit prompt-context milestone with no regression to source grounding, privacy, or scope limits.  
**Depends on**: Phases 12 and 13  
**Requirements**: V12-TEST-01, V12-TEST-02, V12-TEST-03, V12-TEST-04, V12-TEST-05  
**Success Criteria** (what must be TRUE):
  1. Regression tests prove markdown-formatted answers render cleanly without raw heading, bullet, or emphasis artifacts.
  2. Regression tests prove citations, freshness metadata, deadline status, and refusal/no-answer behavior remain present.
  3. Regression tests prove unsafe markdown or HTML is sanitized, escaped, or rejected by the chosen rendering policy.
  4. Regression tests prove explicit preference prompt context includes only allowed minimized fields and is omitted when absent or cleared.
  5. Scope guardrail checks show no semantic retrieval, crawling, ranking algorithm changes, saved jobs/reminders, SSO, official endorsement claims, or job-board workflow scope were added.
**Verification-first/TDD expectation**: Start Phase 14 by collecting the Phase 12 and Phase 13 test evidence, then run focused UI, prompt-builder, privacy, and guardrail checks before declaring v1.2 complete.  
**Plans**: Targeted verification plus typecheck/build/Playwright complete; broad Vitest/evaluation gates failing  
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 12. Markdown Answer Rendering | Targeted implementation complete | Complete for targeted scope | 2026-05-08 |
| 13. Explicit Preference Prompt Context | Targeted implementation complete | Complete for targeted scope | 2026-05-08 |
| 14. v1.2 Regression QA and Scope Guardrails | Targeted tests, typecheck, build, and Playwright QA passed | Broad Vitest/evaluation gates failing; release gate blocked | 2026-05-08 |

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| V12-MD-01 | Phase 12 |
| V12-MD-02 | Phase 12 |
| V12-MD-03 | Phase 12 |
| V12-MD-04 | Phase 12 |
| V12-SAFE-01 | Phase 12 |
| V12-SAFE-02 | Phase 12 |
| V12-SAFE-03 | Phase 12 |
| V12-PCTX-01 | Phase 13 |
| V12-PCTX-02 | Phase 13 |
| V12-PCTX-03 | Phase 13 |
| V12-PCTX-04 | Phase 13 |
| V12-PCTX-05 | Phase 13 |
| V12-TEST-01 | Phase 14 |
| V12-TEST-02 | Phase 14 |
| V12-TEST-03 | Phase 14 |
| V12-TEST-04 | Phase 14 |
| V12-TEST-05 | Phase 14 |

**Coverage:** 17/17 v1.2 requirements mapped exactly once.

## Next Step

Resolve the failing broad Vitest/evaluation gates in `scripts/evaluate-rag-mvp.test.ts` and `scripts/evaluate-release-readiness.test.ts` before any `release:ready`, shipped, tagged, or release-ready claim.
