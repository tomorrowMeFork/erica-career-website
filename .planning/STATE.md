---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 03
status: phase_3_in_progress
last_updated: "2026-05-03T11:29:31.755Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 15
  completed_plans: 12
  percent: 80
---

# State: ERICA Career Chat

**Initialized:** 2026-05-03  
**Initialization mode:** Manual GSD initialization because `gsd-sdk` was unavailable in the shell.  
**Current phase:** 03

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-03)

**Core value:** Students can ask career and recruitment questions in Korean and receive current, source-cited, personally relevant answers from Hanyang ERICA employment information.  
**Current focus:** Phase 03 — source-grounded-chat-mvp

## Artifacts

| Artifact | Status |
|---|---|
| `.planning/config.json` | Created |
| `.planning/research/seed-sources.md` | Created |
| `.planning/research/design-seed.md` | Created |
| `.planning/research/STACK.md` | Created |
| `.planning/research/FEATURES.md` | Created |
| `.planning/research/ARCHITECTURE.md` | Created |
| `.planning/research/PITFALLS.md` | Created |
| `.planning/research/SUMMARY.md` | Created |
| `.planning/PROJECT.md` | Created |
| `.planning/REQUIREMENTS.md` | Created |
| `.planning/ROADMAP.md` | Created |
| `.planning/STATE.md` | Created |
| `AGENTS.md` | Created |
| `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md` | Created |
| `.planning/phases/03-source-grounded-chat-mvp/03-CONTEXT.md` | Created |
| `.planning/phases/03-source-grounded-chat-mvp/03-01-SUMMARY.md` | Created |
| `.planning/phases/03-source-grounded-chat-mvp/03-02-SUMMARY.md` | Created |
| `.planning/phases/03-source-grounded-chat-mvp/03-03-SUMMARY.md` | Created |

## Decisions

- CDP/book-viewer sources now use bounded Playwright collection after explicit user approval for robots.txt sources
- Ibus bounded collection supports multi-page with COLLECT_MAX_PAGES and COLLECT_DELAY_MS
- Ibus live collection enforces max 5 pages and minimum 1200ms inter-request delay
- CDP PDF live download timeout set to 60s for 52-page PDF
- Registry-backed gate coverage tests verify all 6 sources are approved only through expected methods
- 03-01 keeps raw retrieved source text out of normal chat response contracts while preserving structured citations and freshness metadata
- 03-01 loads verified Phase 2 JSONL chunks through KnowledgeChunkSchema and fails closed on invalid citations or source trust markers
- 03-02 preserves the BM25-style lexical baseline behind a Retriever interface and defers embeddings, vector stores, LLM calls, and semantic retrieval
- 03-02 excludes boilerplate-only chunks from normal retrieval results when answerable or mixed evidence exists, while keeping mixed service pages retrievable with a penalty
- 03-02 boosts active listings and penalizes expired listing-like evidence without penalizing unknown-deadline campus-service or guidebook chunks
- 03-03 evidence policy implements D-17 through D-20 exact thresholds and hard-refusal overrides for zero chunks, boilerplate-only evidence, and missing citations
- 03-03 output validation fails closed on schema errors, Korean-first violations, citationless factual answers, invented citation markers, unsafe endorsement/outcome claims, and prompt-injection compliance phrases

## Active Assumptions

- The project is greenfield.
- Hanyang/ERICA source URLs are planning inputs, not proof of production crawling permission.
- Korean-first chat and citation reliability are more important than advanced resume/interview tooling in v1.
- Personalization should start with explicit user preferences and data minimization.
- `DESIGN.md` is a design inspiration seed, not the final project brand.

## Next Action

Continue Phase 3 with 03-04 provider boundary and untrusted retrieved-context prompt builder using 03-03 evidence policy and output validation guardrails.

Resume file: None
