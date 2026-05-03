---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 05
status: phase_4_complete
last_updated: "2026-05-03T19:39:03.232Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 20
  completed_plans: 20
  percent: 100
---

# State: ERICA Career Chat

**Initialized:** 2026-05-03  
**Initialization mode:** Manual GSD initialization because `gsd-sdk` was unavailable in the shell.  
**Current phase:** 05

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-03)

**Core value:** Students can ask career and recruitment questions in Korean and receive current, source-cited, personally relevant answers from Hanyang ERICA employment information.  
**Current focus:** Phase 05 — student-facing-experience

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
| `.planning/phases/03-source-grounded-chat-mvp/03-04-SUMMARY.md` | Created |
| `.planning/phases/03-source-grounded-chat-mvp/03-05-SUMMARY.md` | Created |
| `.planning/phases/03-source-grounded-chat-mvp/03-06-SUMMARY.md` | Created |
| `.planning/phases/03-source-grounded-chat-mvp/03-USER-SETUP.md` | Created |
| `.planning/phases/04-personalization-and-recommendations/04-01-SUMMARY.md` | Created |
| `.planning/phases/04-personalization-and-recommendations/04-02-SUMMARY.md` | Created |
| `.planning/phases/04-personalization-and-recommendations/04-03-SUMMARY.md` | Created |
| `.planning/phases/04-personalization-and-recommendations/04-04-SUMMARY.md` | Created |

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
- 03-04 OpenAI-compatible provider configuration is read from OPENAI_COMPAT_* env values only at construction time and safe config/errors never include the API key
- 03-04 prompt builder keeps system/developer instructions outside retrieved source text and places hostile chunks only inside untrusted retrieved-context tags
- 03-04 citation maps are built from RetrievedChunk citation anchors and freshness metadata before model generation, not from model-supplied source labels
- 03-05 audit records hash user queries by default and store safe model config, retrieved chunk IDs/scores, prompt version, citation IDs, guardrail results, and response timestamps without API keys or full successful prompts
- 03-05 ChatService skips provider calls for hard refusals and fails closed to guarded hard refusals on hostile, citationless, malformed, or provider-error paths
- 03-06 default evaluation uses deterministic local retrieval/mock checks with optional OPENAI_COMPAT_* D-27 judging only when all judge env names are present
- 03-06 chat smoke prints only answer, citations, refusal_tier, confidence, and trace_id while redacting provider errors
- 04-01 preference lifecycle starts from explicit `major` and `target_role`, keeps optional free text session-only, and returns only minimized structured preference state
- 04-01 persistent preference writes fail closed unless consent timestamp, bounded retention, and deletion support are valid
- 04-01 clearing preferences removes stored structured profile state for the selected session and disables preference-based ranking
- 04-02 recommendation contracts preserve `ChatCitationSchema` freshness/source metadata while excluding raw source text and session-only optional free text from normal item outputs
- 04-02 source-quality scoring explicitly rewards active/recent/detail-cited candidates and penalizes stale/generic/boilerplate-heavy candidates
- 04-02 ranking uses score-based reranking with exact weights: base retrieval 0.30, major 0.20, target_role 0.20, optional preferences 0.10, source quality 0.15, and freshness 0.05
- 04-02 no-preference ranking returns `general_recommendation` items and favors active/latest/source-grounded candidates without requiring a profile
- 04-03 match reasons use fixed Korean templates, inline numeric citations, explicit preference labels only when score evidence exists, and weak-match `일반 안내`/`참고 정보` labels
- 04-03 RecommendationService composes retrieval, optional preference state, ranking, reason validation, response schema validation, trace IDs, and privacy metadata without exposing raw chunk text or session-only optional free text
- 04-04 personalization evaluation is deterministic and local-only, covering lifecycle, reranking, no-preference fallback, weak matches, expired downranking, hostile-source safety, and persistence consent without `.env`, live data, crawling, or model providers

## Active Assumptions

- The project is greenfield.
- Hanyang/ERICA source URLs are planning inputs, not proof of production crawling permission.
- Korean-first chat and citation reliability are more important than advanced resume/interview tooling in v1.
- Personalization should start with explicit user preferences and data minimization.
- `DESIGN.md` is a design inspiration seed, not the final project brand.

## Next Action

Phase 4 personalization and recommendations are complete. Start Phase 5 through the required UI planning route before implementing student-facing experience work.

Resume file: .planning/phases/05-student-facing-experience/05-UI-SPEC.md
