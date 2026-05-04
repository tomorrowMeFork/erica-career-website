# Roadmap: ERICA Career Chat

**Created:** 2026-05-03  
**Last updated:** 2026-05-04 for v1.1 UI Redesign roadmap  
**Mode:** Constant-size post-milestone roadmap  
**Active milestone:** v1.1 — UI Redesign  
**Granularity:** coarse

## Milestones

| Milestone | Status | Shipped | Scope | Archives |
|---|---|---:|---|---|
| v1.0 — ERICA Career Chat v1.0 | Shipped with known tech debt | 2026-05-04 | 6 phases, 30 plans, 32/32 requirements covered | [Roadmap](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md) · [Audit](milestones/v1.0-MILESTONE-AUDIT.md) |
| v1.1 — UI Redesign | Active roadmap | — | 5 phases, 21/21 v1.1 requirements mapped | Active in this file |

## v1.0 Archive Reference

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

Full phase details are archived in [v1.0 roadmap archive](milestones/v1.0-ROADMAP.md). Phase directories remain in `.planning/phases/` for near-term continuation and reference and must not be cleared, moved, or deleted as part of v1.1 planning.

</details>

## v1.1 Framing

v1.1 redesigns ERICA Career Chat as source-grounded ERICA career-information consultation software. It is not a job-board, recommendation-system upgrade, application tracker, or official Hanyang service. The UI must preserve Korean-first behavior, citations, freshness/deadline metadata, insufficient-evidence/no-answer behavior, and explicit scope limits from v1.0.

The active design standard is `DESIGN.md` as an independent design standard for this project. It should inform spacing, typography, rounded cards, pill controls, restrained color roles, and CTA hierarchy without framing the result as another brand style or copying another brand identity.

## Verification-First Expectations

- Each v1.1 phase should plan verification before implementation, including route-level expectations, component behavior checks, citation/source metadata visibility checks, and responsive Korean UI checks where relevant.
- UI redesign work should be TDD/verification-first for observable behavior: four-page navigation, page primary actions, empty states, evidence/source inspection, no-answer/refusal display, and scope guardrail copy.
- Automated or manual QA should prove the redesign does not introduce matching/ranking algorithm changes, semantic retrieval, ingestion expansion, saved-job workflows, SSO, or official endorsement claims.

## Phases

- [ ] **Phase 7: UI Information Architecture and Design Contract** - Establish the v1.1 page model, design interpretation, CTA hierarchy, and consultation-vs-exploration distinction.
- [ ] **Phase 8: Four-Page Routing and Shared Interaction Shell** - Users can move through the confirmed home, information explore, information detail/source verification, and career consultation pages with a clear shared shell.
- [ ] **Phase 9: Career Information Explore and Source Verification Pages** - Users can browse ERICA career information and inspect source evidence, freshness, deadline status, and AI interpretation limits.
- [ ] **Phase 10: Career Consultation Page and Evidence Linking** - Users can consult through chat as the primary surface while related information appears only as supporting cited evidence.
- [ ] **Phase 11: UI QA, Responsive Verification, and Scope Guardrails** - The redesigned UI is verified on mobile/desktop and protected from v1.1 scope creep.

## Phase Details

### Phase 7: UI Information Architecture and Design Contract
**Goal**: Users understand what ERICA Career Chat does, how source-grounded consultation differs from information exploration, and which action to take first.  
**Depends on**: v1.0 archive and active v1.1 requirements  
**Requirements**: IA-01, IA-03, UXR-01, UXR-03  
**Success Criteria** (what must be TRUE):
  1. User can understand from the home experience that the product provides Korean, source-grounded ERICA career-information consultation rather than generic job-board browsing.
  2. User can identify one clear primary action per page concept and distinguish exploration actions from consultation actions.
  3. User can see a restrained visual hierarchy aligned with `DESIGN.md` tokens and principles without repeated accent-color or competing badge/CTA emphasis.
  4. User can understand service limits and source-grounding expectations before relying on consultation or information pages.
**Verification-first/TDD expectation**: Define route/page acceptance checks for purpose clarity, primary CTA hierarchy, exploration-vs-consultation labels, Korean-first copy, and design-standard conformance before UI implementation.  
**Plans**: 07-01 — UI Information Architecture and Design Contract  
**UI hint**: yes

### Phase 8: Four-Page Routing and Shared Interaction Shell
**Goal**: Users can navigate the confirmed four-page structure through a shared shell that removes the crowded one-dashboard experience.  
**Depends on**: Phase 7  
**Requirements**: IA-02, UXR-02  
**Success Criteria** (what must be TRUE):
  1. User can move between home, career information explore, information detail/source verification, and career consultation pages through clear navigation.
  2. User can tell where they are and what the page is for without relying on a crowded all-in-one dashboard.
  3. User no longer encounters overloaded left-side content, weak central consultation emphasis, or an ambiguous empty source panel as the default experience.
  4. User can use shared navigation and layout patterns consistently on desktop and mobile entry points.
**Verification-first/TDD expectation**: Define navigation, route, active-state, and responsive shell checks before route implementation; client components should be justified only where interaction requires them.  
**Plans**: TBD  
**UI hint**: yes

### Phase 9: Career Information Explore and Source Verification Pages
**Goal**: Users can browse ERICA career information and verify original source evidence, dates, deadlines, and interpretation limits.  
**Depends on**: Phase 8  
**Requirements**: INFO-01, INFO-02, INFO-03, INFO-04, SRCV-01, SRCV-02, SRCV-03  
**Success Criteria** (what must be TRUE):
  1. User can browse official or collected ERICA career information on a dedicated exploration page.
  2. User can compare deadline status, posted/fetched dates, source status, and source identity from information list items without interpreting the page as a ranking product.
  3. User can narrow visible information with core filters and receive clear Korean guidance when no information is visible or conditions are insufficient.
  4. User can open a detail/source-verification page and inspect original source link, source name, source_id/chunk_id, posted/fetched dates, and deadline status.
  5. User can see which citation evidence supports an AI interpretation and when evidence is insufficient, uncertain, or only general guidance.
**Verification-first/TDD expectation**: Define list/filter, empty-state, detail metadata, citation evidence, insufficient-evidence, and source-link visibility checks before page implementation.  
**Plans**: TBD  
**UI hint**: yes

### Phase 10: Career Consultation Page and Evidence Linking
**Goal**: Users can ask career questions in Korean on a dedicated consultation page and inspect supporting cited information without the UI becoming a job-board or recommendation surface.  
**Depends on**: Phase 9  
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04  
**Success Criteria** (what must be TRUE):
  1. User can use chat as the primary action on the career consultation page.
  2. User receives consultation answers that preserve Korean-first behavior, citations, freshness metadata, and refusal/no-answer behavior.
  3. User can inspect related information as supporting evidence connected to the answer, not as ranked jobs or application workflow items.
  4. User can understand example questions and service limits from the consultation empty state before sending a message.
**Verification-first/TDD expectation**: Define chat empty-state, Korean answer, citation/freshness display, refusal/no-answer, and supporting-evidence-link checks before consultation UI implementation.  
**Plans**: TBD  
**UI hint**: yes

### Phase 11: UI QA, Responsive Verification, and Scope Guardrails
**Goal**: Users can trust the redesigned UI across mobile and desktop while the product remains within the approved v1.1 UI redesign scope.  
**Depends on**: Phase 10  
**Requirements**: UXR-04, GUARD-01, GUARD-02, GUARD-03  
**Success Criteria** (what must be TRUE):
  1. User can complete the four-page flow on mobile and desktop with readable Korean typography, usable source/citation inspection, and 44px touch targets.
  2. User does not encounter new matching/ranking algorithm claims, ranking-weight controls, or matching-logic changes in the redesigned UI.
  3. User does not encounter semantic retrieval, ingestion-source expansion, production crawling, authenticated/private crawling, saved jobs, reminders, application tracking, SSO, or official Hanyang endorsement claims.
  4. User can distinguish the product as source-grounded career-information consultation software throughout final QA, not a general job-board or matching/ranking product.
**Verification-first/TDD expectation**: Define responsive browser checks, Korean readability checks, citation/source inspection checks, and negative guardrail checks before release readiness evaluation.  
**Plans**: TBD  
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. UI Information Architecture and Design Contract | 0/1 | Planned | - |
| 8. Four-Page Routing and Shared Interaction Shell | 0/TBD | Not started | - |
| 9. Career Information Explore and Source Verification Pages | 0/TBD | Not started | - |
| 10. Career Consultation Page and Evidence Linking | 0/TBD | Not started | - |
| 11. UI QA, Responsive Verification, and Scope Guardrails | 0/TBD | Not started | - |

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| IA-01 | Phase 7 |
| IA-02 | Phase 8 |
| IA-03 | Phase 7 |
| INFO-01 | Phase 9 |
| INFO-02 | Phase 9 |
| INFO-03 | Phase 9 |
| INFO-04 | Phase 9 |
| SRCV-01 | Phase 9 |
| SRCV-02 | Phase 9 |
| SRCV-03 | Phase 9 |
| CHAT-01 | Phase 10 |
| CHAT-02 | Phase 10 |
| CHAT-03 | Phase 10 |
| CHAT-04 | Phase 10 |
| UXR-01 | Phase 7 |
| UXR-02 | Phase 8 |
| UXR-03 | Phase 7 |
| UXR-04 | Phase 11 |
| GUARD-01 | Phase 11 |
| GUARD-02 | Phase 11 |
| GUARD-03 | Phase 11 |

**Coverage:** 21/21 v1.1 requirements mapped exactly once ✓

## Next Step

Execute Phase 7 plan `07-01` with `/gsd-execute-phase 7`, keeping work scoped to UI information architecture and design-contract artifacts.
