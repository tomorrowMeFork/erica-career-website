# AGENTS.md

Guidance for future agents working on ERICA Career Chat.

## Read First

- `.planning/PROJECT.md` for product intent and constraints.
- `.planning/REQUIREMENTS.md` for testable scope and requirement IDs.
- `.planning/ROADMAP.md` for phase order and requirement mapping.
- `.planning/research/seed-sources.md` before touching ingestion or source logic.
- `DESIGN.md` and `.planning/research/design-seed.md` before UI work.

## Project Rules

- Preserve Korean-first behavior for user-facing chat, source labels, and employment information.
- Every answer or recommendation based on source data must keep citations and freshness metadata.
- Do not claim official Hanyang endorsement, SSO access, or production crawling permission unless new evidence is added to planning docs.
- Do not crawl authenticated/private pages or bypass access controls.
- Prefer explicit preference-based personalization before inferred profiling.
- Minimize stored personal data and provide clearing controls when persistence exists.

## Engineering Rules

- Work phase by phase from `.planning/ROADMAP.md`.
- Use TDD or verification-first planning for ingestion, retrieval, citation formatting, and safety behavior.
- Add evaluation cases for no-answer/refusal behavior, stale listings, citation accuracy, and Korean answer quality.
- Keep implementation changes scoped to the active phase and requirement IDs.
- Commit atomically when the user or workflow explicitly requests commits.

## UI Rules

- UI work must go through the visual/UI planning route before implementation.
- Adapt the Meta-style design seed into a trustworthy academic career-service interface; do not copy Meta branding.
- Use rounded cards, pill filters, calm white surfaces, clear source cards, and Korean-first typography.
- Verify mobile and desktop layouts for chat, citations, and listings.
