# Phase 4: Personalization and Recommendations - Context

**Gathered:** 2026-05-03T15:16:32Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 adds explicit preference-based personalization and recommendation ranking on top of the Phase 3 source-grounded chat/retrieval foundation. It must let students provide, update, and clear preferences; rank recommendations using those explicit preferences; explain why each recommendation matches; and preserve privacy through minimum-data design and consent/deletion rules before any persistence.

Phase 4 does **not** build the polished student-facing UI, official SSO, resume/cover-letter tooling, application tracking, scheduled crawling, or production crawling. UI surfaces may be represented as contracts or simple flows only as needed to support preference lifecycle and recommendation behavior; full visual implementation belongs to Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Preference Schema
- **D-01:** Start with a minimal required preference set plus optional preferences. The required MVP fields are `major` and `target_role` / 관심직무.
- **D-02:** Optional preferences may include industry, region, employment type, and deadline sensitivity, but they must not be required for recommendations to work.
- **D-03:** Optional preference inputs may allow free text for flexibility, but raw free-text optional preferences must remain session-only by default and must not be persisted as part of the minimum-data MVP storage model.
- **D-04:** Persistent preference storage, if implemented, should store only structured/minimized values needed for recommendations. Do not persist unnecessary identifiers, sensitive free text, or inferred profile attributes.

### Recommendation Ranking
- **D-05:** Use score-based ranking rather than strong filtering. Candidates should remain visible unless evidence/safety rules exclude them; preferences adjust ordering and match reasons.
- **D-06:** When a user has no preferences, the system should still work by ranking latest/active source-grounded listings first, satisfying PERS-04.
- **D-07:** In preference-aware ranking, `major` and `target_role` / 관심직무 are the two core signals and should receive equal primary weight.
- **D-08:** Source freshness and detail quality must be strongly reflected in recommendation ranking. Active listings, recent `posted_at`/`fetched_at`, detailed official URLs, structured citations, and concrete deadline metadata should outrank generic CDP root/menu chunks when recommendation candidates compete.

### Match Reasons
- **D-09:** Recommendation explanations should be short Korean bullet lists, usually 2-3 bullets per recommendation.
- **D-10:** Each match reason should connect three things when available: the user's explicit preference, the source evidence, and freshness/deadline context.
- **D-11:** Each match-reason bullet should carry an inline numeric citation like `[1]` when it makes a source-grounded claim.
- **D-12:** If a candidate is relevant but the personalization match is weak or ambiguous, show it as general 안내 / 참고 정보 rather than presenting it as a strong personal recommendation.

### Privacy And Consent
- **D-13:** Consent, retention, and deletion behavior are mandatory before preference or chat-history persistence. Planning must not assume persistence is allowed just because a schema exists.
- **D-14:** Preference clearing must remove stored structured preferences and disable future preference-based ranking until new preferences are provided. Session-only free text expires with the session.
- **D-15:** Chat history persistence is not required for Phase 4 recommendation behavior. If planner considers it, it must be gated behind explicit consent and deletion behavior per SAFE-04/SAFE-06.

### the agent's Discretion
- The user did not delegate any selected area fully to the agent. Planner may choose exact file layout, Zod schema names, ranking formula constants, and test fixture details as long as decisions D-01 through D-15 and Phase 4 requirements are satisfied.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product And Scope
- `.planning/PROJECT.md` — Project intent, Korean-first source-cited assistant value, explicit preference-based personalization decision, privacy constraints, and out-of-scope official SSO/private crawling/application automation.
- `.planning/REQUIREMENTS.md` — Phase 4 requirements `PERS-01` through `PERS-04` and `SAFE-03`, `SAFE-04`, `SAFE-06`.
- `.planning/ROADMAP.md` — Phase 4 goal, deliverables, success criteria, and parallelization note for preference schema, ranking, and match reasons.
- `.planning/STATE.md` — Current project state and active assumption that personalization starts with explicit preferences and data minimization.
- `AGENTS.md` — Project rules for Korean-first behavior, citations/freshness in every recommendation, explicit preference-based personalization, minimum stored personal data, and clearing controls.

### Prior Phase Decisions
- `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md` — Source approval boundaries, seed-source scope, `.env` secret handling, and no official authorization/production crawling claims.
- `.planning/phases/02-ingestion-and-knowledge-base/02-CONTEXT.md` — Citation-ready normalized records, local-first KB, metadata preservation, no recommendations/UI in Phase 2, and no auth-state persistence.
- `.planning/phases/03-source-grounded-chat-mvp/03-CONTEXT.md` — Phase 3 source-grounded chat decisions, including separation between informational service 안내 and personalized recommendations, citation/freshness response contract, untrusted retrieved context, and audit logging.
- `.planning/phases/03-source-grounded-chat-mvp/03-VERIFICATION.md` — Phase 3 verified chat/retrieval/eval behavior and live smoke pass status.
- `.planning/phases/03-source-grounded-chat-mvp/03-UAT.md` — Phase 3 live smoke UAT and evidence that recommendation-quality improvements are not Phase 3 blockers.

### Code Contracts
- `src/chat/chat-contract.ts` — Existing chat request/response/citation/refusal schema; Phase 4 recommendation contracts should preserve citation fields and avoid raw retrieved text by default.
- `src/chat/chat-service.ts` — Current orchestration path for retrieval, evidence policy, provider, validation, and audit; Phase 4 may compose with this but should not weaken fail-closed behavior.
- `src/retrieval/retriever.ts` — Existing `RetrievedChunk` shape and ranking features available for recommendation ranking and match reasons.
- `src/retrieval/bm25-retriever.ts` — Current lexical ranking, freshness boost, deadline penalty, boilerplate penalty, and source-quality limitations that Phase 4 should account for.
- `src/audit/audit-log.ts` — Current metadata-only audit pattern; useful for privacy-safe logging but not a consent model for storing user preferences.
- `src/ingestion/normalized-record.ts` — Source-data schema with citation/freshness/deadline metadata; recommendation candidates should remain grounded in these fields.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/retrieval/retriever.ts` exposes `RetrievedChunk` with `score`, `normalized_score`, `matched_terms`, and `ranking_features`; Phase 4 can build a preference-aware recommendation layer without replacing the retriever.
- `src/ingestion/normalized-record.ts` and `ChatCitationSchema` already carry `source_id`, title, URL, `fetched_at`, `posted_at`, `deadline_status`, and page metadata. These should feed recommendation cards and match reasons.
- `src/audit/audit-log.ts` hashes queries and stores metadata-only normal-answer audit records, demonstrating the project's minimum-data posture.

### Established Patterns
- Strict TypeScript ESM with Zod schemas, Vitest tests, and deterministic fixtures is the dominant pattern.
- Source-grounded outputs must keep inline citations plus structured citation metadata.
- The codebase has no existing preference/profile/recommendation implementation, no web UI, no API server, and no persistence layer for user data.
- Existing retrieval can surface generic CDP root chunks when corpus coverage is sparse; Phase 4 ranking should explicitly account for source specificity and freshness.

### Integration Points
- New Phase 4 code will likely introduce a `src/personalization/` or `src/recommendations/` layer with schemas, ranking functions, match-reason contracts, and tests.
- Recommendation ranking should consume `RetrievedChunk` or `KnowledgeChunk`-derived candidates and produce ranked candidates with preference score, source-quality score, and Korean match reasons.
- Preference lifecycle code should expose set/update/clear semantics even if persistent storage is deferred or implemented as a local deterministic adapter for MVP tests.

</code_context>

<specifics>
## Specific Ideas

- Required MVP preferences: 전공 and 관심직무.
- Optional preferences may be free text, but free-text optional values are session-only and not persisted by default.
- Ranking should be score-based, not strict filtering.
- Anonymous/no-preference mode should show latest/active source-grounded listings first.
- Core preference weights should treat 전공 and 관심직무 equally.
- Freshness/detail/source quality should strongly affect ranking to reduce generic CDP root dominance.
- Match reasons should be 2-3 short Korean bullets, each connecting preference, source evidence, and freshness when possible, with inline citations.
- Weak/ambiguous personalization should be presented as general 안내/reference information, not strong personalized recommendation.

</specifics>

<deferred>
## Deferred Ideas

- Polished preference UI, recommendation cards, and visual design implementation belong to Phase 5, though Phase 4 may define contracts needed by that UI.
- Chat-history persistence is not required for Phase 4; if added later, it needs explicit consent, retention, and deletion behavior.
- Source coverage and retrieval reranking quality improvements discovered after Phase 3 should be handled as a later quality/evaluation pass unless Phase 4 planning needs a minimal source-quality scoring hook.

</deferred>

---

*Phase: 4-Personalization and Recommendations*
*Context gathered: 2026-05-03T15:16:32Z*
