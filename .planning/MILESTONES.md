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
