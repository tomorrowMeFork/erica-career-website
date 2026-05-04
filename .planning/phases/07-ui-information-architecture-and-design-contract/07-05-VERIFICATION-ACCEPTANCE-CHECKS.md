# 07-05 Verification Acceptance Checks

**Phase:** 07 — UI Information Architecture and Design Contract  
**Requirements:** IA-01, IA-03, UXR-01, UXR-03  
**Status:** Binary pre-implementation checks  
**Scope:** Checks artifacts and future implementation readiness. No code, tests, routes, APIs, retrieval, or ingestion changes.

## Binary Check Rules

- **PASS** only when the artifact makes the expected user-facing outcome observable.
- **FLAG** when a decision is deferred but has a recommended conservative default in `07-04-HUMAN-INTERVENTION-REGISTER.md`.
- **BLOCK** when an artifact introduces implementation work or prohibited v1.1 scope.

## Pre-Implementation Acceptance Checklist

| ID | Requirement | Binary check | PASS condition |
|---|---|---|---|
| V-01 | IA-01 | Home purpose clarity | Home contract explains Korean-first, source-grounded ERICA career-information consultation in one intro surface. |
| V-02 | IA-01 | Source-grounded answer model | Home copy states answers use citations and freshness/deadline metadata. |
| V-03 | IA-01 | Primary actions | Home has one dominant primary action and one quieter exploration action. |
| V-04 | IA-01 | Service limits | Home/consultation copy says the service is not official Hanyang endorsement and users must verify original sources. |
| V-05 | IA-03 | Four-page distinction | Artifacts define home, career information explore, information detail/source verification, and career consultation. |
| V-06 | IA-03 | Explore vs consultation separation | Explore is browsing/inspection; consultation is Korean chat with cited evidence support. |
| V-07 | IA-03 | Detail/source verification role | Detail page foregrounds original source link, source identity, source_id/chunk_id, posted/fetched dates, deadline status, and evidence limits. |
| V-08 | IA-03 | Forbidden-framing audit | Artifacts replace job-board/recommendation-system wording with source-grounded consultation wording. |
| V-09 | UXR-01 | `DESIGN.md` interpretation | Artifacts treat `DESIGN.md` as this project's active independent design standard, not a brand style to copy. |
| V-10 | UXR-01 | Design dimensions covered | Spacing, typography, rounded surfaces, pill controls, restrained color roles, and CTA hierarchy are all specified. |
| V-11 | UXR-03 | One dominant action per page | Each page table identifies one primary action and quieter secondary actions. |
| V-12 | UXR-03 | Reduced visual competition | Contract restricts accent color, badge, card, and CTA emphasis to purposeful states. |
| V-13 | Cross-cutting | Korean-first language | Labels, CTAs, helper copy, no-answer copy, and service-limit examples are Korean-first. |
| V-14 | Cross-cutting | Source metadata visibility | Citations, freshness/fetched date, posted date, deadline status, source identity, and insufficient-evidence behavior are specified where relevant. |
| V-15 | Cross-cutting | Phase 5 handling | Phase 5 is referenced only as artifact format or anti-pattern critique, not as a positive UI direction. |
| V-16 | Guardrail | No implementation | Artifacts do not implement routes, components, CSS, tests, APIs, retrieval, ingestion, ranking, or matching logic. |
| V-17 | Guardrail | No prohibited features | Artifacts do not propose saved jobs, reminders, application tracking, SSO, production crawling, private/auth crawling, official endorsement claims, semantic retrieval, ingestion expansion, or matching/ranking changes. |
| V-18 | Human intervention | Defaults recorded separately | Deferred choices are recorded in `07-04-HUMAN-INTERVENTION-REGISTER.md` with defaults, reason, risk, and revisit phase. |

## BLOCK Terms and Scope-Creep Audit

The following are BLOCK unless used only in a forbidden-framing audit or explicit out-of-scope statement:

| Term / concept | Allowed only as | BLOCK if artifact suggests |
|---|---|---|
| job board / 채용 공고 추천 | Forbidden framing to replace | Product category or navigation goal |
| matching/ranking algorithm, rank weights | Scope guardrail | New UI controls or logic changes |
| semantic retrieval | Scope guardrail | Phase 7/8+ implementation requirement |
| production crawling, private/auth crawling | Scope guardrail | Permission or feature assumption |
| saved jobs, reminders, application tracking | Scope guardrail | User workflow or CTA |
| SSO, official Hanyang endorsement | Scope guardrail | Trust claim or login path |

## Phase 8 Readiness Gate

Phase 8 may proceed only if all of these are PASS or FLAG-with-default:

- [ ] Four-page model is explicit and stable.
- [ ] Home purpose, primary CTA, source-grounded model, and limits are defined.
- [ ] Explore and consultation flows use different labels, actions, and evidence behavior.
- [ ] `DESIGN.md` interpretation is project-specific and not brand-copy framing.
- [ ] Human-intervention items are separated with conservative defaults.
- [ ] No prohibited scope is introduced.
