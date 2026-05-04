# Phase 7: UI Information Architecture and Design Contract - Context

**Gathered:** 2026-05-04  
**Status:** Ready for planning  
**Source:** `/ulw-loop` Phase 7 kickoff, v1.1 roadmap, user design critique, and current `DESIGN.md`

<domain>
## Phase Boundary

Phase 7 creates the v1.1 UI information architecture and design contract before any UI implementation. It clarifies what ERICA Career Chat is, how the four-page model works, how source-grounded consultation differs from career-information exploration, and how the current `DESIGN.md` should be interpreted for this project.

Phase 7 does **not** implement routes, components, CSS, API changes, retrieval changes, ingestion changes, ranking/matching algorithm changes, saved jobs, reminders, application tracking, SSO, or official Hanyang endorsement claims. It produces planning/design artifacts and verification criteria that Phase 8+ can execute.

</domain>

<decisions>
## Locked User Decisions

### Product Framing
- **D-07-01:** v1.1 is a UI redesign for source-grounded ERICA career-information consultation software, not a job-board or recommendation-system upgrade.
- **D-07-02:** The product should guide students through information discovery, source/deadline verification, and career consultation while preserving Korean-first source citations and freshness metadata.
- **D-07-03:** Career-information exploration and career consultation are related but distinct user flows. The UI must make their roles and primary actions clear.

### Four-Page Structure
- **D-07-04:** The confirmed v1.1 structure has four pages: home, career information explore, information detail/source verification, and career consultation.
- **D-07-05:** Home explains the service purpose, source-grounded answer model, and next actions without foregrounding a recommendation product.
- **D-07-06:** Career information explore is a browsing/inspection surface for official or collected ERICA career information. It may expose filters and source/deadline status, but it must not look like a new matching/ranking product.
- **D-07-07:** Information detail/source verification foregrounds original source links, source identity, source_id/chunk_id, posted/fetched dates, deadline status, citation evidence, and AI interpretation limits.
- **D-07-08:** Career consultation makes chat the primary surface. Related information appears only as supporting cited evidence for an answer, not as job-board workflow inventory.

### Design Standard
- **D-07-09:** The current `DESIGN.md` is the active independent design standard for v1.1. Do not frame it as Meta-style or another brand style.
- **D-07-10:** The redesign should address the current UI critique: overcrowded left-side content, weak central consultation emphasis, unclear empty right-side source panel, repeated accent color, overloaded cards, weak information hierarchy, and unclear page primary actions.
- **D-07-11:** The design contract should reduce competing color, badge, card, and CTA emphasis so each page has one clear primary action.

### Scope Guardrails
- **D-07-12:** Phase 7 and v1.1 planning must exclude new matching/ranking algorithms, ranking weights, semantic retrieval, ingestion-source expansion, production crawling, authenticated/private crawling, saved jobs, reminders, application tracking, SSO, and official endorsement claims.
- **D-07-13:** Existing `.planning/phases/` directories remain preserved for continuity. Do not clear, move, or delete old phase directories without explicit approval.

### the agent's Discretion
- **D-07-14:** Downstream agents may choose exact artifact names, route labels, section names, and design-contract table structure if they satisfy IA-01, IA-03, UXR-01, UXR-03 and the locked decisions above.
- **D-07-15:** When a question would normally require the user, choose the recommended conservative case and record human-intervention items separately.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing Phase 7.**

### Active Milestone
- `.planning/PROJECT.md` — v1.1 product framing, active requirements, current `DESIGN.md` decision, source-grounded constraints.
- `.planning/REQUIREMENTS.md` — v1.1 requirements and traceability, especially IA-01, IA-03, UXR-01, UXR-03.
- `.planning/ROADMAP.md` — Phase 7 goal, success criteria, requirement mapping, and Phase 7-to-11 roadmap.
- `.planning/STATE.md` — current v1.1 state, Phase 7 next action, preserved phase-history decision.
- `AGENTS.md` — Korean-first behavior, citation/freshness metadata, no official claims, no private crawling, UI rules.

### Design References
- `DESIGN.md` — active independent design standard for v1.1.
- `.planning/phases/05-student-facing-experience/05-UI-SPEC.md` — prior UI design contract pattern to learn from, but Phase 7 must update the model away from the Phase 5 single dashboard.
- `.planning/phases/05-student-facing-experience/05-CONTEXT.md` — prior Phase 5 UI decisions, including the single-dashboard choice that v1.1 intentionally revises.

### Current Implementation Reference
- `app/page.tsx` — currently renders the single `StudentDashboard` route.
- `components/dashboard/student-dashboard.tsx` — current crowded dashboard composition to be redesigned in later phases.
- `app/globals.css` — current visual token and layout implementation that Phase 7 may critique but should not edit.

</canonical_refs>

<specifics>
## Specific Ideas To Capture In Phase 7 Artifacts

- Four-page sitemap with purpose, primary action, secondary actions, empty state, and evidence/source behavior for each page.
- Product-language guide that avoids job-board and matching/ranking-system framing.
- Design interpretation guide for `DESIGN.md` as this project's own standard.
- Explicit page-level CTA hierarchy and badge/color role rules.
- Human-intervention list for items that likely need later product/design choice, while proceeding with recommended conservative defaults.
- Verification acceptance checks for purpose clarity, exploration-vs-consultation distinction, Korean-first copy, design-standard conformance, and scope guardrails.

</specifics>

<deferred>
## Deferred Ideas

- Route/component implementation belongs to Phase 8+.
- Career information explore/detail implementation belongs to Phase 9.
- Consultation page implementation belongs to Phase 10.
- Responsive/browser QA and scope-guard automation belongs to Phase 11.
- Matching/ranking algorithm changes, semantic retrieval, ingestion expansion, saved jobs, reminders, application tracking, SSO, and official endorsement claims remain outside v1.1.

</deferred>

---

*Phase: 07-ui-information-architecture-and-design-contract*  
*Context gathered: 2026-05-04 via /ulw-loop Phase 7 kickoff*
