# Phase 4: Personalization and Recommendations - Research

**Researched:** 2026-05-04  
**Domain:** Explicit preference-based recommendation ranking over source-grounded ERICA career chunks  
**Confidence:** HIGH for existing code integration and project constraints; MEDIUM for exact ranking constants pending implementation calibration

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)

- Polished preference UI, recommendation cards, and visual design implementation belong to Phase 5, though Phase 4 may define contracts needed by that UI.
- Chat-history persistence is not required for Phase 4; if added later, it needs explicit consent, retention, and deletion behavior.
- Source coverage and retrieval reranking quality improvements discovered after Phase 3 should be handled as a later quality/evaluation pass unless Phase 4 planning needs a minimal source-quality scoring hook.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERS-01 | User can set explicit preferences such as major, target job type, industry, region, employment type, and deadline sensitivity. | Use a Zod schema for structured preferences with required `major` and `target_role`, optional structured fields, and session-only raw free text. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`, Context7 `/websites/zod_dev_v4`] |
| PERS-02 | System ranks or filters recommendations using explicit preferences and explains the match reasons. | Add a deterministic score-based recommendation layer over `RetrievedChunk`/`KnowledgeChunk` that emits preference score, source-quality score, final score, and Korean citation-bearing match reasons. [VERIFIED: `src/retrieval/retriever.ts`, `src/ingestion/normalized-record.ts`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| PERS-03 | User can update or clear personalization preferences. | Expose update/clear service semantics; clear must remove stored structured preferences and disable preference-based ranking until new preferences exist. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| PERS-04 | System can answer without personalization when the user has not provided preferences. | No-preference ranking should use active/latest/source-specific citation-ready candidates instead of requiring profile input. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`, `src/retrieval/bm25-retriever.ts`] |
| SAFE-03 | System stores only the minimum personalization data needed for MVP behavior. | Prefer in-memory/session-only optional free text and persist only structured minimized values if persistence is planned. [VERIFIED: `.planning/REQUIREMENTS.md`, `AGENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| SAFE-04 | System provides a visible way to clear stored preferences and chat history if persistence exists. | Phase 4 should implement preference clear contracts now; chat-history clearing is required only if chat-history persistence is added. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| SAFE-06 | Personalization storage requires explicit consent, retention rules, and deletion behavior before user preferences or chat history are persisted. | Implement a persistence gate or adapter contract requiring consent metadata, retention policy, and deletion behavior before any non-session storage path is used. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
</phase_requirements>

## Summary

Phase 4 should be planned as a deterministic personalization/recommendation layer, not as a replacement for Phase 3 chat or retrieval. [VERIFIED: `.planning/ROADMAP.md`, `src/chat/chat-service.ts`, `src/retrieval/retriever.ts`] The existing system already provides citation-ready `KnowledgeChunk` and `RetrievedChunk` objects with score, matched terms, freshness, deadline status, source URL, citation anchors, and untrusted-source markers. [VERIFIED: `src/ingestion/normalized-record.ts`, `src/retrieval/retriever.ts`] The planner should introduce `src/personalization/` and/or `src/recommendations/` contracts that consume those shapes and emit validated recommendation results with no raw source text in normal response payloads. [VERIFIED: `src/chat/chat-contract.ts`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]

The primary planning risk is privacy creep: adding persistence, inferred profiling, or chat-history reuse would violate Phase 4 decisions unless explicit consent, retention, and deletion behavior are implemented first. [VERIFIED: `AGENTS.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] The second risk is weak recommendation quality from generic CDP root/menu chunks: Phase 3 retrieval already has boilerplate penalties, but Phase 4 needs an explicit source-quality/detail score so specific active listings and page-cited guide content outrank generic navigation or service-root evidence when recommendations compete. [VERIFIED: `src/retrieval/bm25-retriever.ts`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`, `.planning/phases/03-source-grounded-chat-mvp/03-VERIFICATION.md`]

**Primary recommendation:** Plan a small, test-first recommendation service with Zod contracts, deterministic weighted ranking, citation-preserving Korean match-reason templates, session-first preference lifecycle, and a persistence gate that fails closed unless consent/retention/deletion are explicitly present. [VERIFIED: `package.json`, Context7 `/websites/zod_dev_v4`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]

## Project Constraints (from AGENTS.md)

- Preserve Korean-first behavior for user-facing chat, source labels, and employment information. [VERIFIED: `AGENTS.md`]
- Every answer or recommendation based on source data must keep citations and freshness metadata. [VERIFIED: `AGENTS.md`]
- Do not claim official Hanyang endorsement, SSO access, or production crawling permission unless new evidence is added to planning docs. [VERIFIED: `AGENTS.md`]
- Do not crawl authenticated/private pages or bypass access controls. [VERIFIED: `AGENTS.md`]
- Prefer explicit preference-based personalization before inferred profiling. [VERIFIED: `AGENTS.md`]
- Minimize stored personal data and provide clearing controls when persistence exists. [VERIFIED: `AGENTS.md`]
- Use TDD or verification-first planning for ingestion, retrieval, citation formatting, and safety behavior. [VERIFIED: `AGENTS.md`]
- Add evaluation cases for no-answer/refusal behavior, stale listings, citation accuracy, and Korean answer quality. [VERIFIED: `AGENTS.md`]
- Keep implementation changes scoped to active Phase 4 requirement IDs. [VERIFIED: `AGENTS.md`, `.planning/ROADMAP.md`]
- UI work must go through the visual/UI planning route before implementation; Phase 4 may define contracts/simple flows but full polished UI belongs to Phase 5. [VERIFIED: `AGENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Preference schema and lifecycle | API / Backend service layer | Browser / Client for simple controls | Preferences affect ranking, privacy gates, and persistence decisions, so validation and clear/update semantics should live in TypeScript service contracts before UI polish. [VERIFIED: `.planning/ROADMAP.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Session-only optional free text | Browser / Client or request-scoped API memory | API / Backend validation | Raw optional free text must not be persisted by default, so it should be treated as request/session input rather than durable profile data. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Persistent structured preferences, if added | API / Backend persistence adapter | Database / Storage | Persistence requires consent, retention, and deletion behavior before storage is allowed. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Recommendation candidate generation | API / Backend | Retrieval layer | Existing retrieval/KB contracts expose candidates and metadata; recommendation ranking should compose with them instead of modifying source ingestion. [VERIFIED: `src/retrieval/retriever.ts`, `src/knowledge-base/jsonl-loader.ts`] |
| Preference-aware score blending | API / Backend recommendation service | Retrieval layer feature inputs | Source-grounded ranking must combine explicit preference matches with retrieval score/freshness/deadline/source-quality features. [VERIFIED: `src/retrieval/retriever.ts`, `src/retrieval/bm25-retriever.ts`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Korean match reasons with citations | API / Backend response formatter | Browser / Client rendering | Match reasons must connect preferences, source evidence, and freshness/deadline context with inline numeric citations; UI should render, not invent, them. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`, `src/chat/output-validation.ts`] |
| Clear controls | Browser / Client contract | API / Backend deletion operation | The user must have a visible clear/update flow eventually, but Phase 4 can first define backend contracts and CLI/service tests. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`] |

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| TypeScript | Project dev dependency `^5.9.3`; local `tsc` reports 5.9.3; npm latest reports 6.0.3 | Strict ESM contracts and inferred types | Existing project uses TypeScript ESM and `npm run typecheck`; avoid a compiler major upgrade inside Phase 4 unless separately planned. [VERIFIED: `package.json`, `npm view typescript version`, local `npx tsc --version`] |
| Zod | Project dependency `^4.4.2`; npm latest 4.4.2, modified 2026-05-01 | Runtime validation for preference, consent, recommendation, and reason contracts | Existing code uses Zod schemas across chat, audit, source, and ingestion contracts; Zod v4 docs support object schemas, enums, refinements, defaults, transforms, and inferred TypeScript types. [VERIFIED: `package.json`, `npm view zod version time.modified`, Context7 `/websites/zod_dev_v4`] |
| Vitest | Project dev dependency `^4.0.8`; npm latest 4.1.5, modified 2026-04-23; local reports 4.1.5 | Deterministic unit/evaluation tests | Existing test suite uses Vitest; Vitest docs support `vitest run`, targeting specific files, test fixtures, and typed test patterns. [VERIFIED: `package.json`, `npm view vitest version time.modified`, local `npx vitest --version`, Context7 `/vitest-dev/vitest`] |
| Existing `Bm25Retriever` | Internal | Candidate retrieval and baseline source/freshness/deadline features | It already exposes score, normalized score, matched terms, freshness boost, deadline penalty, and boilerplate penalty. [VERIFIED: `src/retrieval/bm25-retriever.ts`, `src/retrieval/retriever.ts`] |
| Existing `KnowledgeChunk` schema | Internal | Citation-ready source candidate metadata | It already includes source URL, canonical URL, fetched/posted timestamps, deadline status/raw text, citation anchors, content hash, and untrusted-source marker. [VERIFIED: `src/ingestion/normalized-record.ts`] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| Node.js | Local `v25.2.1` | Runtime for scripts/tests | Use existing Node ESM scripts and `tsx` execution pattern. [VERIFIED: local `node --version`, `package.json`] |
| tsx | Project dev dependency `^4.20.6`; local reports 4.21.0 | Run TypeScript scripts without a build step | Use for a Phase 4 recommendation smoke/eval CLI if planned. [VERIFIED: `package.json`, local `npx tsx --version`] |
| Existing audit utilities | Internal | Metadata-only logging pattern | Reuse hashing/stable JSONL ideas if recommendation audit is added, but do not treat audit logging as consent for preference persistence. [VERIFIED: `src/audit/audit-log.ts`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Deterministic weighted ranking | LLM-generated ranking | Avoid for Phase 4 MVP because LLM ranking may invent match reasons, weaken reproducibility, and increase privacy exposure unless tightly grounded and audited. [ASSUMED] |
| Session-first preference adapter | Database persistence immediately | Database persistence would require consent, retention, deletion behavior, and additional threat modeling; Phase 4 can satisfy PERS behavior with session/local deterministic adapters first. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| New vector-store recommender | Existing BM25 + deterministic reranker | A vector-store upgrade is out of scope unless later quality work requires it; current code already supports source-grounded candidate retrieval. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`, `src/retrieval/retriever.ts`] |

**Installation:**
```bash
# No new package is required for Phase 4 MVP.
# Use existing project stack:
npm install
```

**Version verification:** `npm view zod version time.modified`, `npm view vitest version time.modified`, and `npm view typescript version time.modified` were run on 2026-05-04. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Student preference input / no-preference request
        |
        v
PreferenceService
  - validate structured preferences with Zod
  - separate persisted-minimized fields from session-only free text
  - enforce consent/retention/deletion gate before persistence
        |
        v
RecommendationService
  - build retrieval query from explicit preferences or latest/active fallback
  - call existing Retriever / load KnowledgeChunk candidates
        |
        v
CandidateFeatureExtractor
  - preference match signals: major, target_role, optional structured fields
  - source-quality signals: active deadline, posted/fetched recency, citation anchors, detailed URL, boilerplate penalty
        |
        v
ScoreBlender
  - base retrieval score + equal major/target_role weights + source-quality/freshness score
  - no hard filtering except evidence/safety exclusions
        |
        v
MatchReasonBuilder
  - 2-3 Korean bullets
  - each source claim has [n]
  - weak matches labeled 일반 안내 / 참고 정보
        |
        v
RecommendationResponseSchema
  - recommendations[] with structured citations/freshness metadata
  - trace_id and privacy metadata
  - no raw retrieved text by default
```

### Recommended Project Structure

```text
src/
├── personalization/
│   ├── preference-contract.ts        # Zod schemas/types for explicit preferences, consent, lifecycle events
│   ├── preference-service.ts         # set/update/clear semantics and persistence gate
│   └── preference-store.ts           # session/in-memory adapter; persistent adapter only if gated
├── recommendations/
│   ├── recommendation-contract.ts    # Zod schemas/types for requests, responses, scored candidates, reasons
│   ├── recommendation-service.ts     # orchestration over Retriever and preference service
│   ├── ranking.ts                    # deterministic scoring functions/constants
│   ├── match-reasons.ts              # Korean citation-bearing reason templates
│   └── source-quality.ts             # freshness/detail/deadline/citation quality scoring
└── scripts/
    └── evaluate-personalization.ts   # deterministic Phase 4 gate if planner chooses a CLI
```

### Component Responsibilities

| Component | Responsibility | Integration Point |
|-----------|----------------|-------------------|
| `PreferenceProfileSchema` | Validate required `major` and `target_role`, optional structured fields, deadline sensitivity, and strict max lengths. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`, Context7 `/websites/zod_dev_v4`] | New `src/personalization/preference-contract.ts` |
| `PreferenceLifecycleService` | Implement set/update/clear and separate persisted structured fields from session-only free text. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] | New `src/personalization/preference-service.ts` |
| `ConsentGate` | Fail closed for persistence unless consent timestamp, retention policy, and deletion behavior exist. [VERIFIED: `SAFE-06` in `.planning/REQUIREMENTS.md`] | New preference store adapter boundary |
| `RecommendationService` | Accept preferences plus optional query/context, call `Retriever`, blend scores, build reasons, validate response. [VERIFIED: `src/retrieval/retriever.ts`] | Existing `Retriever` interface |
| `SourceQualityScorer` | Penalize boilerplate/generic menu chunks and reward active/recent/listing-specific/citation-rich candidates. [VERIFIED: `src/retrieval/bm25-retriever.ts`, `src/ingestion/normalized-record.ts`] | Existing `ranking_features` and `KnowledgeChunk` metadata |
| `MatchReasonBuilder` | Generate Korean bullets with `[n]` markers and weak-match labels. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] | Existing `ChatCitationSchema` fields can be mirrored or reused |

### Pattern 1: Zod-first contracts for profile and recommendation response

**What:** Define schemas before services, infer TypeScript types from schemas, and parse all external inputs/outputs. [VERIFIED: existing code uses this pattern in `src/chat/chat-contract.ts`, `src/ingestion/normalized-record.ts`, `src/audit/audit-log.ts`]  
**When to use:** For preference input, consent metadata, recommendation request/response, and match-reason validation. [VERIFIED: `.planning/REQUIREMENTS.md`]  
**Example:**
```typescript
import { z } from "zod";

export const DeadlineSensitivitySchema = z.enum(["urgent_first", "balanced", "include_unknown"]);

export const PreferenceProfileSchema = z.object({
  major: z.string().trim().min(1).max(80),
  target_role: z.string().trim().min(1).max(120),
  industry: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
  region: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
  employment_type: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
  deadline_sensitivity: DeadlineSensitivitySchema.default("balanced"),
});
```

### Pattern 2: Deterministic score breakdown, not opaque filtering

**What:** Emit a score breakdown for each recommendation: `base_retrieval_score`, `preference_score`, `source_quality_score`, `freshness_score`, `final_score`, and `match_strength`. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`, `src/retrieval/retriever.ts`]  
**When to use:** For ranking, debugging, tests, and explanation consistency. [ASSUMED]  
**Example:**
```typescript
const finalScore = roundScore(
  0.35 * baseRetrievalScore +
  0.25 * majorMatchScore +
  0.25 * targetRoleMatchScore +
  0.15 * sourceQualityScore,
);
```

### Pattern 3: Citation-map-first match reasons

**What:** Build a stable citation map from candidate chunks before generating reasons, mirroring Phase 3 prompt behavior. [VERIFIED: `src/chat/prompt.ts`]  
**When to use:** For every source-grounded recommendation explanation. [VERIFIED: `AGENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]  
**Example:**
```typescript
const reason = `관심직무(${profile.target_role})와 공고 제목/본문의 직무 표현이 겹칩니다 [${citationId}].`;
```

### Anti-Patterns to Avoid

- **Persisting raw optional free text:** Raw optional preferences must remain session-only by default and should not enter durable storage. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
- **Hard-filtering by major/role:** Phase 4 decisions require score-based ranking so candidates remain visible unless evidence/safety rules exclude them. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
- **LLM-invented match reasons:** Match reasons must connect explicit preferences to source evidence and freshness/deadline context; ungrounded reasons risk false personalization. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
- **Weak match framed as strong recommendation:** Ambiguous matches must be labeled as general guidance/reference information. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
- **Treating audit log as preference consent:** Existing audit logging is metadata-only and not a consent model for preference storage. [VERIFIED: `src/audit/audit-log.ts`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
- **Changing source crawlers in Phase 4:** Source coverage improvements are deferred except for a minimal source-quality scoring hook. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime schema validation | Ad hoc type checks | Zod schemas and `.parse`/`.safeParse` | Project already standardizes on Zod; docs verify Zod object/refinement/default patterns. [VERIFIED: `package.json`, Context7 `/websites/zod_dev_v4`] |
| Candidate retrieval | New retrieval engine inside recommendations | Existing `Retriever` interface and `Bm25Retriever` | The retriever already returns scored `RetrievedChunk` objects with ranking features. [VERIFIED: `src/retrieval/retriever.ts`, `src/retrieval/bm25-retriever.ts`] |
| Citation metadata | Model-generated or UI-generated source labels | Existing `ChatCitationSchema` shape or a compatible recommendation citation schema | Existing citations preserve source title, URL, fetched date, posted date, deadline status, and page number. [VERIFIED: `src/chat/chat-contract.ts`] |
| Freshness/deadline parsing | New deadline parser in Phase 4 | Existing `deadline_status`, `deadline_raw_text`, `posted_at`, `fetched_at` fields | Phase 2 ingestion already normalizes deadline/freshness metadata. [VERIFIED: `src/ingestion/normalized-record.ts`] |
| Privacy persistence | Silent local file/database writes | Explicit store adapter requiring consent/retention/deletion | SAFE-06 requires explicit consent, retention rules, and deletion before persistence. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| Korean citation validation | Manual visual checks only | Vitest deterministic tests plus response schema validation | Existing Phase 3 tests validate Korean content, inline citations, and structured citations. [VERIFIED: `src/chat/output-validation.ts`, `scripts/evaluate-rag-mvp.ts`, Context7 `/vitest-dev/vitest`] |

**Key insight:** Phase 4 complexity is not in building a recommender algorithm from scratch; it is in preserving source-grounding, explainability, Korean-first output, and privacy constraints while composing with already-verified retrieval/chat contracts. [VERIFIED: `.planning/PROJECT.md`, `.planning/phases/03-source-grounded-chat-mvp/03-VERIFICATION.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]

## Existing Code Integration Points

| File | Contract / Behavior | Phase 4 Use |
|------|---------------------|-------------|
| `src/chat/chat-contract.ts` | `ChatCitationSchema` includes `citation_id`, chunk/record/source IDs, title, URL, `fetched_at`, nullable `posted_at`, `deadline_status`, and optional page number. [VERIFIED: code inspection] | Reuse or mirror citation schema for recommendation responses so UI and tests receive familiar freshness/citation fields. |
| `src/chat/chat-service.ts` | Chat orchestration parses request, retrieves chunks, evaluates evidence, builds prompt, validates output, and writes metadata audit. [VERIFIED: code inspection] | Compose alongside, not inside, chat flow unless adding an optional recommendation call; never weaken fail-closed evidence/output behavior. |
| `src/retrieval/retriever.ts` | `RetrievedChunk` exposes `chunk`, `score`, `normalized_score`, `matched_terms`, and ranking features. [VERIFIED: code inspection] | Primary input to recommendation scoring and match reasons. |
| `src/retrieval/bm25-retriever.ts` | Uses Korean search terms, explicit synonym expansion, title/category boosts, freshness boost, deadline penalty, and boilerplate penalty. [VERIFIED: code inspection] | Treat current score as candidate relevance; add preference/source-quality reranking on top. |
| `src/ingestion/normalized-record.ts` | `KnowledgeChunkSchema` requires official HTTPS URLs, citation anchors, timestamps, deadline metadata, content hash, and `source_text_trust: "untrusted_source_text"`. [VERIFIED: code inspection] | Source of candidate metadata and citation/freshness fields. |
| `src/knowledge-base/jsonl-loader.ts` | Loads default KB dirs and fails closed on missing/invalid chunks or missing citation/source-trust invariants. [VERIFIED: code inspection] | Use for deterministic recommendation tests/eval over fixture/live JSONL outputs. |
| `src/audit/audit-log.ts` | Hashes queries and writes stable JSONL metadata; normal answers cannot store prompt snapshots by default. [VERIFIED: code inspection] | Use as privacy posture reference for recommendation audit; do not log raw profile/free text by default. |
| `src/chat/output-validation.ts` | Rejects non-Korean answers, citationless factual answers, unmapped citation markers, and unsafe phrases. [VERIFIED: code inspection] | Mirror validation concepts for `RecommendationResponseSchema`: Korean reasons, inline citations for source claims, allowed citation IDs only, unsafe endorsement/outcome phrases rejected. |
| `scripts/evaluate-rag-mvp.ts` | Deterministic evaluation covers source IDs, refusal tiers, citations, hostile source injection, and Korean quality. [VERIFIED: code inspection] | Add a Phase 4 eval script or tests for preference ranking changes, no-preference fallback, privacy gate, and hostile-source reason safety. |

## Recommendation Architecture Details

### Candidate Selection

Use existing retriever results as candidates, with two modes. [VERIFIED: `src/retrieval/retriever.ts`]

1. **Preference mode:** Build a retrieval query from structured explicit preferences: `major`, `target_role`, and optional structured fields. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] Keep raw optional free text in request/session memory only. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
2. **No-preference mode:** Use latest/active source-grounded listing discovery or a generic employment-information recommendation query, then rank by source quality and freshness. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`; ASSUMED query design]

### Recommended Score Shape

| Score Field | Inputs | Planning Guidance |
|-------------|--------|-------------------|
| `base_retrieval_score` | `RetrievedChunk.normalized_score` | Preserve as the base evidence relevance signal. [VERIFIED: `src/retrieval/retriever.ts`] |
| `major_match_score` | normalized `major` vs chunk title/category/text/matched terms | Weight equal to `target_role_match_score`. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`; ASSUMED exact matcher] |
| `target_role_match_score` | normalized target role vs title/category/text/matched terms | Weight equal to `major_match_score`. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`; ASSUMED exact matcher] |
| `optional_preference_score` | industry/region/employment/deadline sensitivity | Add smaller boosts; never make optional fields required. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| `source_quality_score` | citation anchors, official HTTPS URL, page number, detail URL vs root, boilerplate penalty, content length | Strongly reflect detail quality to reduce generic CDP root dominance. [VERIFIED: `src/ingestion/normalized-record.ts`, `src/retrieval/bm25-retriever.ts`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| `freshness_score` | `deadline_status`, `posted_at`, `fetched_at`, `deadline_raw_text` | Boost active/recent candidates and avoid presenting expired listings as current recommendations. [VERIFIED: `src/ingestion/normalized-record.ts`, `src/retrieval/bm25-retriever.ts`] |

### Match Strength Labels

| Label | Condition | Output Behavior |
|-------|-----------|-----------------|
| `personalized_match` | At least one core preference has clear evidence support and candidate has acceptable source quality. [ASSUMED threshold] | Korean bullets may say “맞춤 추천”. |
| `partial_match` | Optional/core signals are mixed or weak but evidence is still useful. [ASSUMED threshold] | Korean bullets should say “참고 정보” or “일반 안내”. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| `general_recommendation` | No preferences present. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] | Rank by active/latest/source quality and avoid implying personal fit. |

## Source Audit Notes

| Source / Corpus Area | Current Status | Phase 4 Planning Impact |
|----------------------|----------------|-------------------------|
| `cdp-root` | Bounded collector implemented for exact public root URL; scheduled crawling remains disabled. [VERIFIED: `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`] | Root/menu chunks may be generic; Phase 4 should penalize low-detail/root-like candidates for recommendation ranking. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| CDP career category discovery | Bounded collector implemented for observed public notice list URL. [VERIFIED: `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`] | Useful for career-service guidance but recommendation reasons must cite fetched timestamps and avoid claiming official endorsement. [VERIFIED: `AGENTS.md`] |
| CDP recruit category discovery | Bounded collector implemented for observed public recruit list URL. [VERIFIED: `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`] | Best candidate pool for current postings if chunk detail/freshness is sufficient. [ASSUMED based on source purpose in `.planning/research/seed-sources.md`] |
| Book success story viewer | Bounded collector implemented for exact public viewer URL. [VERIFIED: `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`] | Success stories should be framed as examples/reference, not guaranteed career paths or personalized outcomes. [VERIFIED: `.planning/REQUIREMENTS.md`, `AGENTS.md`] |
| CDP student guide PDF | Fixture/live manual PDF path implemented with page-level citation anchors. [VERIFIED: `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`, `src/ingestion/normalized-record.ts`] | Useful for service/process recommendations; reasons should include page/source context where available. [VERIFIED: `src/chat/chat-contract.ts`] |
| ibus employment board | Fixture/live bounded board path implemented; source is college-level and should not be treated as campus-wide unless validated. [VERIFIED: `.planning/research/seed-sources.md`, `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`] | Recommendations from this source should label source owner/scope clearly and avoid implying university-wide coverage. [VERIFIED: `.planning/research/seed-sources.md`] |
| Generated JSONL corpus | Outputs live under ignored `data/knowledge-base/` paths and are not committed. [VERIFIED: `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`] | Tests should use deterministic fixtures; live corpus-sensitive recommendation quality should be manual/eval-gated. [VERIFIED: `.planning/phases/03-source-grounded-chat-mvp/03-VERIFICATION.md`] |

**Source access constraints:** Playwright collection uses same-origin request routing, no persistent profile/storage state, no traces/screenshots, and delays; scheduled crawling remains disabled. [VERIFIED: `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`] Phase 4 planning should not add new crawling, authenticated access, or production collection. [VERIFIED: `AGENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]

## Common Pitfalls

### Pitfall 1: Personalization without consent boundary
**What goes wrong:** Preference data or chat-history data is stored before explicit consent, retention, and deletion behavior exist. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]  
**Why it happens:** A schema or audit logger is mistaken for a persistence permission model. [VERIFIED: `src/audit/audit-log.ts`; ASSUMED cause]  
**How to avoid:** Plan a `PreferenceStore` interface with a session adapter by default and a persistent adapter that rejects writes unless consent metadata and deletion behavior are configured. [VERIFIED: SAFE-06; ASSUMED adapter design]  
**Warning signs:** Tests can set preferences but cannot prove clear/delete behavior; audit logs include raw preferences or free text. [ASSUMED]

### Pitfall 2: Generic-source recommendations dominate
**What goes wrong:** CDP root/menu chunks outrank detailed postings, producing vague recommendations. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`, `src/retrieval/bm25-retriever.ts`]  
**Why it happens:** Retrieval score alone can reward broad term overlap; Phase 3 has boilerplate penalties but not full recommendation source-quality scoring. [VERIFIED: `src/retrieval/bm25-retriever.ts`]  
**How to avoid:** Add a source-quality score for detail URL, citation anchors, active/deadline metadata, recency, and low boilerplate penalty. [VERIFIED: `src/ingestion/normalized-record.ts`, `src/retrieval/bm25-retriever.ts`; ASSUMED exact formula]  
**Warning signs:** Top recommendation title is a root/menu page when an active listing or page-specific record exists. [ASSUMED]

### Pitfall 3: Match reasons make unsupported personal claims
**What goes wrong:** The system says a role is “best for you” or guarantees fit/outcomes. [VERIFIED: `.planning/REQUIREMENTS.md`, `AGENTS.md`]  
**Why it happens:** Explanation generation drifts from explicit preferences and source evidence. [ASSUMED]  
**How to avoid:** Template reasons around observable fields: “관심직무와 공고 제목/본문의 표현이 겹칩니다 [n]”, “마감 상태가 active입니다 [n]”, “전공 관련성은 약해 일반 안내로 표시합니다”. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`; ASSUMED template wording]  
**Warning signs:** Reasons lack `[n]`, mention inferred traits, or use “보장/공식 인증/합격 가능성” wording. [VERIFIED: `src/chat/output-validation.ts`]

### Pitfall 4: No-preference path accidentally fails
**What goes wrong:** Recommendations require `major` and `target_role`, violating PERS-04. [VERIFIED: `.planning/REQUIREMENTS.md`]  
**Why it happens:** The same schema is used for preference setup and recommendation request without a no-profile branch. [ASSUMED]  
**How to avoid:** Separate `PreferenceProfileSchema` from `RecommendationRequestSchema`, where profile is optional for recommendation requests. [ASSUMED]  
**Warning signs:** Empty preference tests throw validation errors instead of returning latest/active recommendations. [ASSUMED]

### Pitfall 5: Citation IDs mismatch after reranking
**What goes wrong:** Reranking changes candidate order but reason bullets keep stale citation numbers. [ASSUMED]  
**Why it happens:** Citation maps are built before final sorting or not rebuilt after slicing. [ASSUMED]  
**How to avoid:** Build final citation IDs after sorting/slicing and validate every `[n]` marker against structured citations. [VERIFIED: `src/chat/prompt.ts`, `src/chat/output-validation.ts`]  
**Warning signs:** Reason has `[2]` but response only has citation `[1]`. [VERIFIED: `src/chat/output-validation.ts`]

## Code Examples

### Recommendation response contract pattern
```typescript
import { z } from "zod";
import { ChatCitationSchema } from "../chat/chat-contract.js";

export const MatchStrengthSchema = z.enum(["personalized_match", "partial_match", "general_recommendation"]);

export const RecommendationItemSchema = z.object({
  recommendation_id: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  score: z.number().min(0).max(1),
  match_strength: MatchStrengthSchema,
  score_breakdown: z.object({
    base_retrieval_score: z.number().min(0).max(1),
    preference_score: z.number().min(0).max(1),
    source_quality_score: z.number().min(0).max(1),
    freshness_score: z.number().min(0).max(1),
  }),
  match_reasons: z.array(z.string().regex(/\[\d+\]/u)).min(1).max(3),
  citations: z.array(ChatCitationSchema).min(1),
});
```

### Source-quality scoring pattern
```typescript
import type { RetrievedChunk } from "../retrieval/retriever.js";

export function scoreSourceQuality(candidate: RetrievedChunk): number {
  const chunk = candidate.chunk;
  const hasPageOrDetailAnchor = chunk.citation_anchors.some((anchor) => anchor.page_number !== undefined || anchor.url !== chunk.source_url);
  const citationScore = chunk.citation_anchors.length > 0 ? 0.25 : 0;
  const detailScore = hasPageOrDetailAnchor ? 0.25 : 0;
  const deadlineScore = chunk.deadline_status === "active" ? 0.25 : chunk.deadline_status === "unknown" ? 0.1 : 0;
  const boilerplatePenalty = Math.min(0.25, candidate.ranking_features.boilerplate_penalty / 8);

  return Math.max(0, Math.min(1, citationScore + detailScore + deadlineScore - boilerplatePenalty));
}
```

### Privacy-gated store pattern
```typescript
export type PreferenceConsent = {
  consented_at: string;
  retention_days: number;
  deletion_supported: true;
};

export interface PreferenceStore {
  read(userKey: string): Promise<unknown | undefined>;
  write(userKey: string, profile: unknown, consent: PreferenceConsent | undefined): Promise<void>;
  clear(userKey: string): Promise<void>;
}

export async function requireConsentForWrite(consent: PreferenceConsent | undefined): Promise<PreferenceConsent> {
  if (consent === undefined) {
    throw new Error("preference persistence requires explicit consent, retention, and deletion behavior");
  }
  return consent;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inferred profile personalization | Explicit preference-first personalization | Locked by project initialization and Phase 4 context on 2026-05-03 | Planner must not infer major/role/identity from chat history or source data. [VERIFIED: `.planning/PROJECT.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Recommendation as hard filters | Score-based reranking | Locked by D-05 on 2026-05-03 | Candidates remain visible unless evidence/safety rules exclude them. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Generic RAG answer only | Citation-preserving recommendation items with source freshness | Phase 4 builds on Phase 3, after Phase 3 verification pass on 2026-05-03 | Recommendation contracts must preserve citation/freshness metadata. [VERIFIED: `.planning/phases/03-source-grounded-chat-mvp/03-VERIFICATION.md`, `.planning/ROADMAP.md`] |
| Silent persistence | Consent/retention/deletion-gated persistence | Required by SAFE-06 in v1 requirements | Persistent preferences or chat history cannot ship without explicit privacy controls. [VERIFIED: `.planning/REQUIREMENTS.md`] |

**Deprecated/outdated:**
- Claiming official endorsement, SSO, production crawling permission, or guaranteed job outcomes is forbidden by project constraints. [VERIFIED: `AGENTS.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`]
- UI polish and visual recommendation card implementation are deferred to Phase 5. [VERIFIED: `.planning/ROADMAP.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Deterministic weighted ranking is preferable to LLM-generated ranking for Phase 4 MVP. | Standard Stack / Alternatives | If wrong, planner might omit an LLM-based recommender that could improve quality; still must preserve citations/privacy. |
| A2 | Exact score constants and thresholds can be calibrated with fixtures during implementation. | Architecture Patterns / Recommendation Architecture | If wrong, planner needs an explicit calibration plan or user decision before implementation. |
| A3 | No-preference recommendation query design can be generic/latest-listing based. | Recommendation Architecture Details | If wrong, planner needs a source-specific listing enumeration strategy. |
| A4 | Source-quality scoring can use detail URL/page/citation/deadline/boilerplate features as proxies for specificity. | Recommendation Architecture Details / Common Pitfalls | If wrong, generic chunks may continue to dominate or valid guide content may be over-penalized. |
| A5 | Store adapter pattern is the right implementation boundary for consent-gated persistence. | Common Pitfalls / Code Examples | If wrong, planner may choose another architecture but must still satisfy SAFE-06. |

## Open Questions (RESOLVED)

1. **RESOLVED: Should Phase 4 implement actual persistent preference storage or only a session/in-memory adapter plus persistence gate?**
   - What we know: Persistence is allowed only after consent, retention, and deletion behavior exist. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
   - What's unclear: Whether the MVP needs durable preferences before Phase 5 UI. [ASSUMED]
   - Resolution: Phase 4 plans implement session/in-memory preference lifecycle plus a persistence gate. Durable writes are represented only through an adapter boundary that fails closed unless consent timestamp, retention rule, and clear/delete behavior are present. [RESOLVED: 04-01-PLAN.md]

2. **RESOLVED: What controlled vocabularies should structured preferences use?**
   - What we know: Required fields are `major` and `target_role`; optional fields may include industry, region, employment type, and deadline sensitivity. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
   - What's unclear: Whether majors/job roles should be free text, enums, or curated lists. [ASSUMED]
   - Resolution: Phase 4 plans use bounded trimmed strings for `major`, `target_role`, `industry`, `region`, and `employment_type`, with a small enum only for `deadline_sensitivity`. Curated vocabularies are not required for Phase 4 because no source artifact defines authoritative lists. [RESOLVED: 04-01-PLAN.md]

3. **RESOLVED: Should recommendations appear inside chat responses or as a separate service response?**
   - What we know: Phase 5 will polish chat/listing UI; Phase 4 may define contracts/simple flows. [VERIFIED: `.planning/ROADMAP.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`]
   - What's unclear: The exact Phase 5 UI integration shape. [ASSUMED]
   - Resolution: Phase 4 plans implement a separate `RecommendationService` and recommendation response contract. This keeps Phase 3 fail-closed chat behavior unchanged while giving Phase 5 UI a stable contract to consume. [RESOLVED: 04-03-PLAN.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | TypeScript scripts/tests | ✓ | v25.2.1 | Use project-supported Node compatible with dependencies if local version changes. [VERIFIED: local `node --version`] |
| npm | Package scripts | ✓ | 11.6.2 | — [VERIFIED: local `npm --version`] |
| tsx | Optional Phase 4 eval/smoke CLI | ✓ | 4.21.0 local | Use Vitest-only tests if no CLI is added. [VERIFIED: local `npx tsx --version`] |
| TypeScript compiler | Typecheck | ✓ | 5.9.3 local | — [VERIFIED: local `npx tsc --version`] |
| Vitest | Unit/eval tests | ✓ | 4.1.5 local | — [VERIFIED: local `npx vitest --version`] |
| Existing knowledge-base JSONL dirs | Recommendation fixture/eval candidates | Expected by loader; generated data is ignored | — | Use deterministic fixtures and fail-closed loader behavior. [VERIFIED: `src/knowledge-base/jsonl-loader.ts`, `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md`] |

**Missing dependencies with no fallback:** None identified for Phase 4 research. [VERIFIED: environment probes]  
**Missing dependencies with fallback:** No new external dependency is required if Phase 4 stays deterministic and session-first. [VERIFIED: `package.json`; ASSUMED planner scope]

## Validation and Testing Strategy

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`, so the formal GSD Validation Architecture section is skipped; however, Phase 4 still needs verification-first tests because AGENTS.md requires TDD/verification-first planning for retrieval, citation formatting, and safety behavior. [VERIFIED: `.planning/config.json`, `AGENTS.md`]

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest; project uses `npm test` = `vitest run`. [VERIFIED: `package.json`, Context7 `/vitest-dev/vitest`] |
| Config file | No Vitest config file was found during research; existing tests run through package scripts. [VERIFIED: `package.json`, glob `**/*.test.ts`] |
| Quick run command | `npm test -- src/personalization src/recommendations` after files exist. [VERIFIED: Vitest docs support specific files/directories; ASSUMED target dirs] |
| Full suite command | `npm run typecheck && npm test && npm run evaluate:rag:mvp`. [VERIFIED: `package.json`, `.planning/phases/03-source-grounded-chat-mvp/03-VERIFICATION.md`] |

### Required Test Groups

| Requirement | Test Focus | Suggested Test File |
|-------------|------------|---------------------|
| PERS-01 | Required `major`/`target_role`, optional fields, max lengths, session-only free text excluded from persisted profile. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] | `src/personalization/preference-contract.test.ts` |
| PERS-02 | Ranking changes when `major` and `target_role` preferences change; equal core weights; source-quality/freshness affects ordering. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] | `src/recommendations/ranking.test.ts` |
| PERS-02 | Korean match reasons are 2-3 bullets, source claims have `[n]`, weak matches are labeled general/reference. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] | `src/recommendations/match-reasons.test.ts` |
| PERS-03 | Set/update/clear lifecycle; clear removes structured profile and disables preference ranking. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] | `src/personalization/preference-service.test.ts` |
| PERS-04 | No-preference request returns ranked active/latest/source-grounded recommendations and does not throw. [VERIFIED: `.planning/REQUIREMENTS.md`] | `src/recommendations/recommendation-service.test.ts` |
| SAFE-03 | Stored profile contains only minimized structured fields and no raw optional free text. [VERIFIED: `AGENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] | `src/personalization/preference-store.test.ts` |
| SAFE-04 | Clear operation exists; if chat-history persistence is introduced, clear behavior covers it. [VERIFIED: `.planning/REQUIREMENTS.md`] | `src/personalization/preference-service.test.ts` |
| SAFE-06 | Persistent write fails without explicit consent/retention/deletion metadata. [VERIFIED: `.planning/REQUIREMENTS.md`] | `src/personalization/preference-store.test.ts` |

### Evaluation Cases to Add

- **No-profile fallback:** Empty profile returns general recommendations, Korean labels do not imply personal fit, and citations/freshness metadata are present. [VERIFIED: PERS-04; ASSUMED fixture]
- **Major/role reranking:** Same candidate set, different `major`/`target_role` values produce explainable ordering changes while preserving citations. [VERIFIED: PERS-02; ASSUMED fixture]
- **Weak match labeling:** Candidate with source relevance but weak preference match uses “일반 안내” / “참고 정보”. [VERIFIED: D-12]
- **Expired listing handling:** Expired candidates are downranked or clearly labeled, not promoted as urgent current opportunities. [VERIFIED: `src/ingestion/normalized-record.ts`, `src/retrieval/bm25-retriever.ts`]
- **Hostile source in match reasons:** A chunk that asks to omit citations or demand personal data must not affect reason text or privacy instructions. [VERIFIED: `scripts/evaluate-rag-mvp.ts`, `src/chat/prompt.ts`]
- **Persistence gate:** Durable write without consent fails closed; clear deletes structured profile. [VERIFIED: SAFE-06]
- **Korean quality:** Match reasons contain Hangul and avoid unsafe phrases such as official certification or guaranteed employment. [VERIFIED: `src/chat/output-validation.ts`, `AGENTS.md`]

## Security Domain

Security enforcement is not explicitly disabled in `.planning/config.json`, so security/privacy considerations are included. [VERIFIED: `.planning/config.json`] OWASP ASVS provides a basis for testing web application technical security controls and lists secure-development requirements; the current stable version is ASVS 5.0.0 according to OWASP. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| Authentication | No for Phase 4 MVP unless persistence uses user identity | Do not add official SSO or authenticated crawling; if a user key is needed for tests, use local deterministic/session IDs only. [VERIFIED: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`] |
| Session Management | Yes for session-only optional preferences | Session-only raw free text expires with session and is not written to durable stores. [VERIFIED: `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Access Control | Yes if persistence adapter is added | Preference read/write/clear must be scoped to the current user/session key; no cross-user recommendation leakage. [ASSUMED] |
| Input Validation | Yes | Validate preferences, consent metadata, and recommendation responses with Zod; bound string lengths and arrays. [VERIFIED: Context7 `/websites/zod_dev_v4`, existing Zod code] |
| Cryptography / Secrets | Limited | Do not store secrets or API keys in preference/audit data; hash or omit sensitive query/profile data if logging. [VERIFIED: `src/audit/audit-log.ts`, `AGENTS.md`] |
| Stored Data / Privacy | Yes | Persist only minimized structured preferences after consent, retention, and deletion behavior exist. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Output Encoding / Injection Resistance | Yes | Treat source text as untrusted, never let source text override citation/privacy/safety instructions, and validate citation markers. [VERIFIED: `src/chat/prompt.ts`, `src/chat/output-validation.ts`] |

### Threat Patterns for Phase 4

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Preference data over-collection | Information Disclosure | Required fields only; optional free text session-only; persistent structured values only after consent. [VERIFIED: `AGENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Cross-user preference leakage | Information Disclosure / Elevation of Privilege | Store adapter must scope reads/writes/clears by explicit user/session key and tests must verify isolation if persistence exists. [ASSUMED] |
| Hostile source text changes match reasons | Tampering | Source text remains `untrusted_source_text`; reason builder uses templates and citations, not source instructions. [VERIFIED: `src/ingestion/normalized-record.ts`, `src/chat/prompt.ts`] |
| Recommendation overclaiming fit/outcomes | Spoofing / Repudiation / Safety risk | Block “official endorsement”, “guaranteed job”, and unsupported personal-fit claims; weak matches use general guidance labels. [VERIFIED: `AGENTS.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md`] |
| Citation/freshness stripping | Tampering | Validate every source-grounded reason has allowed inline `[n]` and structured citation metadata. [VERIFIED: `src/chat/output-validation.ts`, `src/chat/chat-contract.ts`] |
| Durable storage without deletion | Information Disclosure / Repudiation | Persistent write fails closed unless consent, retention, and deletion behavior are available. [VERIFIED: SAFE-06] |
| Stale/expired listing promoted as current | Integrity / Safety risk | Use `deadline_status`, `posted_at`, and `fetched_at` in source-quality/freshness scoring and labels. [VERIFIED: `src/ingestion/normalized-record.ts`, `src/retrieval/bm25-retriever.ts`] |

## Sources

### Primary (HIGH confidence)
- `AGENTS.md` — Project constraints for Korean-first behavior, citations/freshness, no endorsement/private crawling, explicit preferences, and minimal stored data. [VERIFIED: local file]
- `.planning/PROJECT.md` — Product intent, constraints, out-of-scope items, and key decisions. [VERIFIED: local file]
- `.planning/REQUIREMENTS.md` — Phase 4 requirements PERS-01 through PERS-04 and SAFE-03/04/06. [VERIFIED: local file]
- `.planning/ROADMAP.md` — Phase 4 goal, deliverables, success criteria, and phase boundaries. [VERIFIED: local file]
- `.planning/STATE.md` — Completed Phase 3 state and active personalization assumptions. [VERIFIED: local file]
- `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md` — Locked Phase 4 decisions and code contract references. [VERIFIED: local file]
- `src/chat/chat-contract.ts`, `src/chat/chat-service.ts`, `src/retrieval/retriever.ts`, `src/retrieval/bm25-retriever.ts`, `src/audit/audit-log.ts`, `src/ingestion/normalized-record.ts` — Existing code contracts inspected. [VERIFIED: code inspection]
- `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md` and `.planning/research/seed-sources.md` — Source audit and collection-boundary notes. [VERIFIED: local files]
- Context7 `/websites/zod_dev_v4` — Zod v4 object/refinement/default/schema documentation. [CITED: https://zod.dev/v4]
- Context7 `/vitest-dev/vitest` — Vitest CLI and fixture documentation. [CITED: https://context7.com/vitest-dev/vitest/llms.txt]
- OWASP ASVS project page — ASVS purpose and stable 5.0.0 reference. [CITED: https://owasp.org/www-project-application-security-verification-standard/]
- npm registry checks — `zod`, `vitest`, and `typescript` current versions and modified timestamps. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Existing Phase 3 verification report for live smoke, deterministic eval, and verified RAG behavior. [VERIFIED: `.planning/phases/03-source-grounded-chat-mvp/03-VERIFICATION.md`]

### Tertiary (LOW confidence)
- No unverified web-search-only source was used. [VERIFIED: research log]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified through package files, local tool probes, npm registry, and Context7 docs. [VERIFIED: `package.json`, npm registry, Context7]
- Architecture: HIGH for integration boundaries — based on direct code inspection and locked Phase 4 decisions. [VERIFIED: code inspection, `04-CONTEXT.md`]
- Ranking constants: MEDIUM — equal primary weights are locked, but exact numerical constants require fixture calibration. [VERIFIED: `04-CONTEXT.md`; ASSUMED constants]
- Pitfalls/security: HIGH for project-specific privacy/source constraints; MEDIUM for exact adapter implementation until planned. [VERIFIED: `AGENTS.md`, `.planning/REQUIREMENTS.md`, OWASP ASVS]

**Research date:** 2026-05-04  
**Valid until:** 2026-06-03 for project-code findings; 2026-05-11 for package latest-version claims.

## RESEARCH COMPLETE
