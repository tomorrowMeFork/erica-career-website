# 07 Summary: UI Information Architecture and Design Contract

**Phase:** 07 — UI Information Architecture and Design Contract  
**Requirements:** IA-01, IA-03, UXR-01, UXR-03  
**Status:** Execution artifacts drafted  
**Scope:** Planning/design-contract artifacts only; no application code, routes, components, CSS, tests, APIs, retrieval, ingestion, ranking, or matching logic.

## Artifacts Created

| Artifact | Purpose | Requirement coverage |
|---|---|---|
| `07-01-PAGE-IA-CONTRACT.md` | Defines the four-page model, page jobs, CTAs, empty states, evidence/source behavior, and scope guardrails. | IA-01, IA-03 |
| `07-02-FLOW-LANGUAGE-CONTRACT.md` | Defines Korean-first labels, helper copy, no-answer language, service-limit copy, and forbidden-framing replacements. | IA-01, IA-03 |
| `07-03-DESIGN-STANDARD-INTERPRETATION.md` | Interprets `DESIGN.md` as this project's independent design standard and records Phase 5 UI as an anti-pattern only. | UXR-01, UXR-03 |
| `07-04-HUMAN-INTERVENTION-REGISTER.md` | Separates deferred human decisions with conservative defaults, reasons, risks, and revisit phases. | IA-01, IA-03, UXR-01, UXR-03 |
| `07-05-VERIFICATION-ACCEPTANCE-CHECKS.md` | Provides binary PASS/FLAG/BLOCK pre-implementation checks for Phase 8+ readiness. | IA-01, IA-03, UXR-01, UXR-03 |

## Confirmed Contract Decisions

| Decision | Result |
|---|---|
| Product framing | Source-grounded ERICA career-information consultation software, not a job-board or recommendation-system upgrade. |
| Four-page model | Home, career information explore, information detail/source verification, career consultation. |
| Korean-first language | Navigation, CTAs, helper copy, no-answer copy, and service-limit examples default to Korean. |
| Source-grounding | Citations, source identity, posted/fetched dates, deadline status, source_id/chunk_id where relevant, and insufficient-evidence behavior remain visible. |
| Design standard | `DESIGN.md` is active as an independent project design standard; do not copy or frame as another brand style. |
| Visual hierarchy | One dominant primary action per page; restrained accent, badge, card, and CTA emphasis. |
| Phase 5 treatment | Phase 5 UI is a negative example/anti-pattern only; artifact format may be reused. |

## Requirement Coverage Summary

| Requirement | Covered by | Evidence |
|---|---|---|
| IA-01 | Page IA + Flow Language + Verification | Home purpose, source-grounded answer model, primary actions, citations/freshness/deadline copy, service limits. |
| IA-03 | Page IA + Flow Language + Verification | Separate explore, detail/source verification, and consultation roles with distinct labels, CTAs, and evidence rules. |
| UXR-01 | Design Interpretation + Human Defaults + Verification | `DESIGN.md` translated into spacing, typography, rounded surfaces, pill controls, restrained color roles, CTA hierarchy. |
| UXR-03 | Design Interpretation + Page IA + Verification | One-primary-action rules and reduced competing color/badge/card/CTA emphasis. |

## Deferred Human Items

Deferred decisions are recorded separately in `07-04-HUMAN-INTERVENTION-REGISTER.md`. Recommended defaults preserve source-grounding, Korean-first clarity, and v1.1 scope boundaries until Phase 8–11 implementation needs final choices.

## Guardrail Confirmation

These artifacts do not propose:

- matching/ranking algorithm changes, ranking weights, or matching logic
- semantic retrieval or retrieval infrastructure changes
- ingestion-source expansion, production crawling, authenticated/private crawling, or bypassing access controls
- saved jobs, reminders, application tracking, SSO, official Hanyang endorsement claims, or job-board workflow tooling
- application code, routes, components, CSS, tests, APIs, retrieval, or ingestion work

## Phase 8 Readiness

Phase 8 can use these artifacts as the pre-implementation contract for the four-page routing and shared interaction shell once `07-05-VERIFICATION-ACCEPTANCE-CHECKS.md` passes the binary checklist.
