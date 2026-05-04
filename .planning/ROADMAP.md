# Roadmap: ERICA Career Chat

**Created:** 2026-05-03  
**Last updated:** 2026-05-04 after v1.0 archive  
**Mode:** Constant-size post-milestone roadmap

## Milestones

| Milestone | Status | Shipped | Scope | Archives |
|---|---|---:|---|---|
| v1.0 — ERICA Career Chat v1.0 | Shipped with known tech debt | 2026-05-04 | 6 phases, 30 plans, 32/32 requirements covered | [Roadmap](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md) · [Audit](milestones/v1.0-MILESTONE-AUDIT.md) |

## Phases

<details>
<summary>v1.0 completed phases (6 phases, 30 plans)</summary>

| # | Phase | Plans | Status | Summary |
|---|---|---:|---|---|
| 1 | Source Discovery and Governance | 3 | Complete | Source registry, access review, bounded public-source discovery, and downstream source metadata contracts. |
| 2 | Ingestion and Knowledge Base | 6 | Complete | Fixture-first HTML/PDF ingestion, normalized citation-ready records, deadline/freshness metadata, and JSONL knowledge-base verification. |
| 3 | Source-Grounded Chat MVP | 7 | Complete | Korean chat contracts, BM25-style retrieval, citation/refusal guardrails, provider boundary, audit logs, and deterministic RAG evaluation. |
| 4 | Personalization and Recommendations | 4 | Complete | Explicit preference lifecycle, privacy/consent gates, ranking, Korean match reasons, and deterministic personalization evaluation. |
| 5 | Student-Facing Experience | 5 | Complete | Next.js/Tailwind Korean dashboard with chat, citations/source inspection, listing browse, preference controls, and responsive UI QA. |
| 6 | Safety, Evaluation, and Release Readiness | 5 | Complete | Safety disclaimer, reference QA/eval gates, freshness/operator status, manual release checklist, and `release:ready` gate. |

Full phase details are archived in [v1.0 roadmap archive](milestones/v1.0-ROADMAP.md). Phase directories remain in `.planning/phases/` for near-term continuation and reference.

</details>

## Next Step

Run `/gsd-new-milestone` to define the next milestone's requirements, roadmap, and active phase sequence.
