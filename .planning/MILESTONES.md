# Milestones

## v1.0 ERICA Career Chat v1.0 (Shipped: 2026-05-04)

**Status:** Shipped with known tech debt  
**Phases completed:** 6 phases, 30 plans, 13 tasks  
**Audit:** `tech_debt`, 32/32 requirements covered, 5/5 milestone flows covered

**Archives:**

- [Roadmap archive](milestones/v1.0-ROADMAP.md)
- [Requirements archive](milestones/v1.0-REQUIREMENTS.md)
- [Milestone audit archive](milestones/v1.0-MILESTONE-AUDIT.md)

**Key accomplishments:**

- Source governance and bounded source registry/access gates for Hanyang/ERICA sources.
- Fixture-first HTML/PDF ingestion and JSONL knowledge base with source URLs, freshness, deadline metadata, and citation anchors.
- Korean source-grounded chat with BM25-style retrieval, citations, refusal behavior, provider boundary, and audit logs.
- Explicit-preference personalization and recommendation ranking with Korean match reasons and privacy/consent gates.
- Korean-first responsive dashboard with chat, source inspection, listing browse, preference controls, safety disclaimer, and calm academic UI polish.
- Deterministic evaluation/release gates plus manual provider-backed browser E2E evidence.

**Known tech debt:**

- Automated browser QA mocks `/api/chat`; manual Playwright MCP E2E covered the real provider-backed `/api/chat` path.
- Only Phase 3 has formal `VERIFICATION.md`; other phases rely on summaries, tests, and release-gate evidence.
- Semantic/hybrid retrieval remains a future upgrade beyond the v1.0 BM25-style lexical baseline.
- Favicon 404 remains cosmetic follow-up work.

---

## v1.1 UI Redesign (Shipped: 2026-05-04)

**Status:** Shipped  
**Phases completed:** 5 phases (7-11)  
**Requirements:** 21/21 verified PASS  
**Tag:** `v1.1`

**Key accomplishments:**

- Design contract (Phase 7): four-page IA, Korean-first flow language, design-standard interpretation, human-intervention register, verification checks.
- Four-page App Router routing with shared Korean-first navigation shell (Phase 8): home, explore, source verification, consultation.
- Career information exploration surface (Phase 9): browse/filter by deadline/source/status, source/date metadata, empty-state guidance, no recommendation framing.
- Evidence-based consultation (Phase 10): example questions, service limits, attached evidence (not recommendations), answer meta reframe.
- UI QA and scope guardrails (Phase 11): Playwright desktop/mobile verification, 44px touch targets, Korean typography, guardrail audit confirming no matching/ranking/ingestion/retrieval/crawling changes.

**Scope guardrails verified:**

- No matching algorithms, ranking weights, or matching logic changes.
- No semantic retrieval, ingestion expansion, production crawling, or authenticated crawling.
- No saved jobs, reminders, application tracking, SSO, endorsement claims, or job-board tooling.

---

## v1.2 Markdown Rendering and Prompt Context (Active: 2026-05-08)

**Status:** Targeted implementation complete, broad verification blocked  
**Phases planned:** 3 phases (12-14)  
**Requirements:** 17/17 mapped; targeted implementation and focused verification complete  
**Tag:** TBD

**Implemented targeted scope:**

- Clean chat answer rendering with `react-markdown` so Korean 답변 no longer exposes raw markdown symbols, heading markers, or bullet syntax artifacts.
- Preservation of citations, source labels, freshness/deadline metadata, confidence, and refusal/no-answer behavior after rendering changes.
- Constrained markdown rendering so unsafe raw HTML, script, style, and iframe handling is limited, and markdown images are disabled.
- Optional `session_key` chat request path for resolving server-side explicit preferences.
- Privacy-safe prompt context that includes only minimized `major` and `target_role`, with no hidden profiling, raw chat history, session-only optional text, extra preference fields, secrets, storage metadata, or cleared preferences.

**Verification evidence:**

- `npm test -- src/chat/prompt.test.ts src/chat/chat-service.test.ts app/api/chat/route.test.ts lib/api-client.test.ts components/chat/chat-components.test.tsx` passed with 5 files and 30 tests.
- `npm run typecheck -- --pretty false` passed.
- `npm run build:web` passed.
- Initial `npm run qa:web` failed only because the Playwright Chromium/headless shell executable was missing locally.
- `npx playwright install chromium` installed the required browser artifacts.
- Re-run `npm run qa:web` passed with 28/28 tests.
- Full `npm test` failed: 42 test files total, 40 passed, 2 failed; 292 tests total, 287 passed, 5 failed.
- Failed test files: `scripts/evaluate-rag-mvp.test.ts` and `scripts/evaluate-release-readiness.test.ts`.
- Direct `npm run evaluate:rag:mvp` reported: `CDP 학생 가이드북: expected source cdp-student-guide-pdf in top 5`.
- Direct `npm run evaluate:release-readiness` reported failures for `phase6-listing-deadline: expected chunk 3986f65fde23212320ca478290394113c27ffaa776f8de59f7e292989ee8f270 in top results`, `phase6-personalization-recommendation: expected chunk 3986f65fde23212320ca478290394113c27ffaa776f8de59f7e292989ee8f270 in top results`, and `rag_mvp: CDP 학생 가이드북: expected source cdp-student-guide-pdf in top 5`.
- `release:ready` remains blocked/pending because broad Vitest/evaluation gates are failing. v1.2 is not shipped, tagged, or release-ready.

**Scope guardrails preserved:**

- No semantic retrieval, ingestion expansion, production crawling, or authenticated crawling.
- No matching/ranking algorithm changes.
- No saved jobs, reminders, application tracking, SSO, endorsement claims, or job-board tooling.
