# Retrospective

## v1.0 — ERICA Career Chat v1.0

**Shipped:** 2026-05-04  
**Phases:** 6  
**Plans:** 30  
**Audit status:** `tech_debt`

### What Was Built

- Source governance and bounded source registry/access gates for Hanyang/ERICA sources.
- Fixture-first HTML/PDF ingestion and JSONL knowledge base with source URLs, freshness, deadline metadata, and citation anchors.
- Korean source-grounded chat with BM25-style retrieval, citations, refusal behavior, provider boundary, and audit logs.
- Explicit-preference personalization and recommendation ranking with Korean match reasons and privacy/consent gates.
- Korean-first responsive dashboard with chat, source inspection, listing browse, preference controls, safety disclaimer, and calm academic UI polish.
- Deterministic evaluation/release gates plus manual provider-backed browser E2E evidence.

### What Worked

- TDD and deterministic eval gates kept ingestion, retrieval, citation validation, refusal behavior, personalization, and release checks reproducible without provider secrets.
- GSD phase summaries created a usable trail of decisions, verification evidence, and implementation scope across 30 plans.
- Manual provider-backed Playwright MCP E2E after audit closed the real `/api/chat` evidence gap while keeping automated browser QA deterministic.
- Visual redo plus the final release gate produced a calmer, Korean-first academic dashboard instead of a generic chatbot surface.

### What Was Inefficient

- Late milestone audit found documentation drift and the missing real-web-E2E evidence gap after most implementation work was already complete.
- UI needed a substantial redo because early functional surfaces did not yet meet the desired trustworthy academic-career-service feel.
- SDK accomplishment extraction added noisy `Plan:`, repeated `Status:`, and rule-line artifacts that required manual cleanup before a safety commit.
- Formal verification documentation was uneven: Phase 3 has `VERIFICATION.md`, while other phases rely on summaries, tests, release-gate output, and audit evidence.

### Patterns Established

- Deterministic local evaluation by default, with provider/live checks optional and explicitly gated.
- Explicit source boundaries before ingestion: registry records, access gates, approval evidence, and no private/authenticated crawling.
- Korean-first citation and source-card surfaces, including freshness/deadline metadata and transparent refusal states.
- Explicit preference privacy gates: session-first data, consent before persistence, clear/update controls, and minimized recommendation outputs.

### Key Lessons

- Run milestone audits earlier and again near close so documentation drift and E2E evidence gaps are found before final release pressure.
- Define browser QA intent explicitly: keep CI mocked/deterministic, but schedule manual provider-backed Playwright MCP evidence for release readiness.
- Treat visual quality as a release requirement, not a final polish task; academic trustworthiness needs deliberate layout, copy, source inspection, and responsive behavior.
- Keep archive inputs human-readable before committing; auto-extracted summaries are useful raw material but still need editorial review.
- Preserve source-boundary language in every milestone to avoid accidental claims of official endorsement, SSO, private crawling, or production crawling permission.

## Cross-Milestone Trends

| Milestone | Shipped | Phases | Plans | What improved | Carry-forward |
|---|---:|---:|---:|---|---|
| v1.0 | 2026-05-04 | 6 | 30 | Established bounded ingestion, cited Korean chat, recommendations, responsive dashboard, safety/eval gates, and release evidence. | Automate more audit evidence earlier, add formal verification docs beyond Phase 3, consider semantic/hybrid retrieval, fix favicon 404. |
