# Milestones

## v1.0 ERICA Career Chat v1.0 (Shipped: 2026-05-04)

**Status:** Shipped with known tech debt  
**Phases completed:** 6 phases, 30 plans, 13 tasks  
**Audit:** `tech_debt` — 32/32 requirements covered, 5/5 milestone flows covered

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
