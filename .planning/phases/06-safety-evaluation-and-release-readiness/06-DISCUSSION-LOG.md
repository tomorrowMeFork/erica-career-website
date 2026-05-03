# Phase 6: Safety, Evaluation, and Release Readiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the autonomous decision rationale.

**Date:** 2026-05-04T12:00:00Z
**Phase:** 6-Safety, Evaluation, and Release Readiness
**Mode:** Autonomous (user delegated all decisions to sensible defaults)

---

## Source Documents Inspected

| Document | Purpose |
|----------|---------|
| `.planning/PROJECT.md` | Korean-first intent, privacy constraints, out-of-scope items, key decisions |
| `.planning/REQUIREMENTS.md` | Phase 6 requirements: SAFE-01, SAFE-02, EVAL-01 through EVAL-06 |
| `.planning/ROADMAP.md` | Phase 6 goal, deliverables, success criteria, parallelization notes |
| `.planning/STATE.md` | Current state: Phase 5 complete, 25/25 plans done, Phase 6 next |
| `AGENTS.md` | Project rules: no official endorsement, no `.env` reading/printing, no production crawling |
| `.planning/phases/03-source-grounded-chat-mvp/03-CONTEXT.md` | Chat contract, evidence policy, refusal tiers, hostile-source isolation, audit logging, D-27 judge gating |
| `.planning/phases/03-source-grounded-chat-mvp/03-06-SUMMARY.md` | Phase 3 eval pattern: deterministic local, optional env-gated judge, Korean QA cases |
| `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md` | Preference schema, privacy/consent gates, minimum-data storage |
| `.planning/phases/04-personalization-and-recommendations/04-04-SUMMARY.md` | Phase 4 eval pattern: deterministic local-only, hostile-source safety, consent gate |
| `.planning/phases/05-student-facing-experience/05-CONTEXT.md` | Next.js dashboard, citation cards, preference UI, visual direction, disclaimer placeholder notes |
| `.planning/phases/05-student-facing-experience/05-05-SUMMARY.md` | Phase 5 Playwright QA: mocked API routes, static verifier, responsive tests |
| `.planning/phases/05-student-facing-experience/05-DISCUSSION-LOG.md` | Prior discussion log format reference |

---

## Autonomous Decisions

### Safety And Disclaimer Copy (SAFE-01, SAFE-02)

| Decision | Rationale |
|----------|-----------|
| Korean-first disclaimer text | PROJECT.md and AGENTS.md mandate Korean-first for all user-facing content. Consistent with Phase 5 UI direction. |
| Informational-use framing | SAFE-01 requires users be told answers are informational. This is standard for AI assistants providing employment guidance. |
| No official endorsement or guaranteed outcomes | SAFE-02 requirement plus long-standing PROJECT.md constraint. No authorization evidence exists. |
| Persistent or first-visit chat UI notice | Phase 5 dashboard is chat-centered; a persistent notice ensures visibility without disrupting workflow. |
| No `.env` values in disclaimer | Extends Phase 3 D-23/D-27 and AGENTS.md secret handling rules. |

### Evaluation Suite Architecture

| Decision | Rationale |
|----------|-----------|
| Deterministic/local by default | Phase 3 and Phase 4 both established this pattern. No credentials required for default eval path. |
| Optional env-gated live checks | Same gating pattern as Phase 3 D-27 judge. Only activates when all required env names are present. |
| Compose/extend prior eval scripts | Phase 3 MVP eval and Phase 4 personalization eval remain valid. Phase 6 should add, not replace. |
| No `.env` reading/printing | Consistent with every prior phase's secret handling posture. |

### Reference QA Dataset (EVAL-01)

| Decision | Rationale |
|----------|-----------|
| 7 categories: CDP usage, listings/deadlines, success stories, guidebook/PDF, no-answer/refusal, personalization, hostile-source | Covers all source types in the knowledge base, all chat behaviors from Phase 3/4, and the specific EVAL-01 requirement areas. |
| Each case includes expected retrieval, answer characteristics, and freshness expectations | Enables automated verification beyond binary pass/fail. Matches the Phase 3 eval case structure. |
| No-answer cases verify transparent uncertainty | RAG-04 and Phase 3 evidence policy require this. A critical safety gate. |

### Retrieval Evaluation (EVAL-02)

| Decision | Rationale |
|----------|-----------|
| Check expected chunks in top results | Directly satisfies EVAL-02. Extends Phase 3 retrieval checks to a broader dataset. |
| Verify freshness/deadline metadata preservation | Phase 2 normalized records carry these fields through chunks. Eval must confirm they survive retrieval. |

### Answer Evaluation (EVAL-03, EVAL-06)

| Decision | Rationale |
|----------|-----------|
| Check citation accuracy, faithfulness, Korean quality, refusal behavior | Directly satisfies EVAL-03. These are the four required dimensions. |
| Hostile-source/prompt-injection cases | EVAL-06 requirement. Extends Phase 3 RAG-06 isolation and 03-06 eval hostile-source patterns. |
| Verify no unsafe claims (endorsement/outcomes) | SAFE-02 enforcement at the eval level. Catches any model output that violates the no-endorsement constraint. |
| Check source-link and freshness preservation | Citations must carry working URLs and correct metadata from cited chunks. |

### Freshness And Operator Status (EVAL-04)

| Decision | Rationale |
|----------|-----------|
| Local-only status from ingestion manifests | No production crawling required. Reads from existing `data/knowledge-base/` JSONL and `manifest.json`. |
| Stale/unknown freshness warnings | Operators need to know which sources may need re-ingestion before user testing. |
| Include last successful ingestion/eval status | End-to-end pipeline health verification without live network access. |

### Manual Release Checklist (EVAL-05)

| Decision | Rationale |
|----------|-----------|
| 10-item checklist covering E2E, UI, privacy, no-answer, hostile, responsive, disclaimer, no-endorsement, no-secrets | Covers all Phase 6 requirements and integrates prior phase verification commands. |
| References existing npm scripts | `typecheck`, `test`, `evaluate:rag:mvp`, `evaluate:personalization`, `verify:phase5-ui`, `qa:web`, `build:web` are all established and passing. |

### Explicit Exclusions

| Decision | Rationale |
|----------|-----------|
| No production crawling | Phase 1 SAFE-05 and PROJECT.md constraint. Phase 6 must not weaken this boundary. |
| No SSO, saved jobs, reminders, resume tools | These are v2 requirements (CARE-01 through CARE-04, INT-01 through INT-03) explicitly out of scope for v1. |
| No official endorsement claims | SAFE-02, PROJECT.md, AGENTS.md. Non-negotiable. |
| No `.env` reading/printing | Every prior phase enforces this. Phase 6 must not be the exception. |

---

## Gray Areas Resolved

No gray areas remained after analysis. All 8 required decision areas had clear, constraint-driven answers from prior phase decisions, project rules, and requirement text. The user's delegation to autonomous sensible defaults was fully applicable.

---

## Deferred Ideas

- Automated CI/CD regression pipeline
- Production monitoring dashboards and alerting
- User-facing freshness indicators in chat UI
- A/B testing of disclaimer/refusal messaging

---

*Phase: 6-Safety, Evaluation, and Release Readiness*
*Discussion completed: 2026-05-04T12:00:00Z*
