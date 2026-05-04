# Phase 7 Research: UI Information Architecture and Design Contract

**Phase:** 07 — UI Information Architecture and Design Contract  
**Date:** 2026-05-04  
**Scope:** Planning/design-contract research only; no route, component, CSS, API, retrieval, ingestion, ranking, or matching implementation.

## Research Goal

Phase 7 must make ERICA Career Chat understandable as Korean-first, source-grounded ERICA career-information consultation software. The key design problem is not adding another job-board surface; it is separating information exploration, source verification, and career consultation so students know what each page is for and what evidence supports each answer.

## Primary Sources Reviewed

| Source | Use |
|---|---|
| `.planning/PROJECT.md` | v1.1 product framing and milestone constraints |
| `.planning/REQUIREMENTS.md` | IA-01, IA-03, UXR-01, UXR-03 acceptance scope |
| `.planning/ROADMAP.md` | Phase 7 goal, success criteria, verification-first expectation |
| `.planning/STATE.md` | current phase state and active assumptions |
| `DESIGN.md` | active independent design standard for v1.1 |
| `AGENTS.md` | Korean-first, citation/freshness, no-endorsement, no-private-crawling rules |
| `.planning/phases/05-student-facing-experience/05-UI-SPEC.md` | prior artifact format only; not a target UI direction |
| `.planning/phases/05-student-facing-experience/05-CONTEXT.md` | prior single-dashboard decision that v1.1 intentionally replaces |

## Findings

### Product Framing

- The active v1.1 framing is source-grounded ERICA career-information consultation software.
- The home page must explain source-grounding, citations, freshness/deadline metadata, and limits before users rely on information or consultation.
- The UI must not present itself as a generic job board, a new matching/ranking product, or an official Hanyang service.

### Four-Page IA

| Page | Role | Primary Action | Evidence Behavior |
|---|---|---|---|
| Home | Explain service purpose and orient next steps | Start career consultation | Summarize source-grounded model and limits |
| Career information explore | Browse collected/official ERICA career information | Browse information | Show source/deadline freshness metadata in list context |
| Information detail/source verification | Inspect original source and evidence details | Verify source | Foreground source link, source_id/chunk_id, dates, deadline, evidence status |
| Career consultation | Ask questions in Korean | Send consultation question | Show cited supporting evidence only as answer support |

### Phase 5 Anti-Pattern

Phase 5 is a useful reference for file organization and prior requirements coverage, but the Phase 5 UI itself is a negative example for Phase 7. The v1.1 contract must avoid the prior overloaded dashboard, crowded left-side content, weak central consultation emphasis, ambiguous empty source panel, repeated accent-color treatment, overloaded cards, and unclear primary actions.

### Design Standard Interpretation

- `DESIGN.md` is the active independent design standard, not a brand style to copy.
- Phase 7 should translate the standard into restrained color roles, rounded cards, pill controls, readable Korean typography, clear CTA hierarchy, and one dominant page action.
- Cobalt/accent-like treatments should be reserved for one clear active or primary purpose per page, not repeated across every badge, card, and CTA.

## Scope Exclusions

Phase 7 excludes:

- new matching/ranking algorithms, ranking weights, or matching logic
- semantic/hybrid retrieval
- ingestion-source expansion or production crawling
- authenticated/private crawling
- saved jobs, reminders, application tracking, SSO, official endorsement claims
- route/component/CSS implementation

## Research Conclusion

Phase 7 should create a design contract, not code. The contract should define page purpose, page-level CTAs, flow language, evidence behavior, design-standard interpretation, human-intervention items, and binary verification checks for IA-01, IA-03, UXR-01, and UXR-03.
