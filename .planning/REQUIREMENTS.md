# Requirements: ERICA Career Chat v1.1 UI Redesign

**Defined:** 2026-05-04  
**Core Value:** Students can ask career and recruitment questions in Korean and receive current, source-cited, personally relevant answers from Hanyang ERICA employment information.

## v1.1 Requirements

Requirements for the UI redesign milestone. Each maps to roadmap phases 7 and onward.

### Information Architecture

- [x] **IA-01**: User can understand the service purpose, source-grounded answer model, and primary actions from the home page.
- [ ] **IA-02**: User can navigate a clear four-page structure: home, career information explore, information detail/source verification, and career consultation.
- [x] **IA-03**: User can distinguish the information exploration flow from the consultation flow through page structure, labels, and primary actions.

### Career Information Exploration

- [ ] **INFO-01**: User can browse official or collected ERICA career information on a dedicated exploration page.
- [ ] **INFO-02**: User can quickly compare deadline status, posted/fetched dates, and source status in the information list.
- [ ] **INFO-03**: User can narrow visible information with core filters while the UI avoids presenting itself as a new matching or ranking product.
- [ ] **INFO-04**: User receives clear empty-state and insufficient-condition guidance when there is no visible information or not enough context.

### Source Verification

- [ ] **SRCV-01**: User can inspect original source link, source name, source_id/chunk_id, posted/fetched dates, and deadline status from an information detail page.
- [ ] **SRCV-02**: User can see which source or citation evidence supports an AI interpretation.
- [ ] **SRCV-03**: User can clearly see when evidence is insufficient, uncertain, or general guidance rather than verified source-backed information.

### Career Consultation

- [ ] **CHAT-01**: User can use chat as the primary action on a dedicated career consultation page.
- [ ] **CHAT-02**: Consultation answers preserve Korean-first behavior, citations, freshness metadata, and refusal/no-answer behavior.
- [ ] **CHAT-03**: Related information connected to a consultation answer is shown as supporting evidence, not as a job-board product surface.
- [ ] **CHAT-04**: User can understand example questions and service limits from the consultation empty state.

### Visual Design and UX Quality

- [x] **UXR-01**: UI applies the current `DESIGN.md` as the independent design standard for spacing, typography, rounded surfaces, pill controls, restrained color roles, and CTA hierarchy.
- [ ] **UXR-02**: UI removes the current problems of overloaded left-side content, weak central consultation emphasis, ambiguous empty right panel, and unclear information hierarchy.
- [x] **UXR-03**: UI reduces competing color, badge, card, and CTA emphasis so each page has a clear primary action.
- [ ] **UXR-04**: UI can be verified on mobile and desktop for the four-page flow, readable Korean typography, 44px touch targets, and source/citation inspection.

### Scope Guardrails

- [ ] **GUARD-01**: v1.1 does not add or change matching algorithms, ranking weights, or matching logic.
- [ ] **GUARD-02**: v1.1 does not add semantic retrieval, ingestion-source expansion, production crawling, or authenticated/private crawling.
- [ ] **GUARD-03**: v1.1 does not add saved jobs, reminders, application tracking, SSO, official Hanyang endorsement claims, or job-board workflow tooling.

## Future Requirements

Deferred beyond v1.1. Tracked but not in this roadmap.

### Retrieval and Data

- **RET-01**: System can add semantic or hybrid retrieval if future evaluation shows lexical retrieval is insufficient.
- **SRC-NEW-01**: Operator can expand source coverage after renewed access review and permission checks.

### Product Workflow

- **JOBFLOW-01**: User can save career information items for later review.
- **JOBFLOW-02**: User can receive deadline reminders if notification consent, retention, and delivery channels are designed.
- **JOBFLOW-03**: User can manage application status if the product intentionally expands beyond source-grounded consultation.

## Out of Scope

Explicitly excluded for v1.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New matching or ranking algorithm | v1.1 is an information architecture and UI redesign milestone, not a matching-system upgrade. |
| Semantic/hybrid retrieval | Deferred until retrieval evaluation motivates the added complexity. |
| Ingestion-source expansion or production crawling | Requires separate source access review and is outside the UI redesign scope. |
| Saved jobs, reminders, application tracking | These shift the product toward job-board workflow tooling beyond the current consultation scope. |
| Official Hanyang SSO or endorsement claims | No authorization evidence exists in planning docs. |
| Resume, cover-letter, interview, or application automation | Valuable future career-tool scope, but not part of v1.1 UI information architecture. |

## Traceability

Which phases cover which requirements. Updated during v1.1 roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IA-01 | Phase 7 | Complete |
| IA-02 | Phase 8 | Pending |
| IA-03 | Phase 7 | Complete |
| INFO-01 | Phase 9 | Pending |
| INFO-02 | Phase 9 | Pending |
| INFO-03 | Phase 9 | Pending |
| INFO-04 | Phase 9 | Pending |
| SRCV-01 | Phase 9 | Pending |
| SRCV-02 | Phase 9 | Pending |
| SRCV-03 | Phase 9 | Pending |
| CHAT-01 | Phase 10 | Pending |
| CHAT-02 | Phase 10 | Pending |
| CHAT-03 | Phase 10 | Pending |
| CHAT-04 | Phase 10 | Pending |
| UXR-01 | Phase 7 | Complete |
| UXR-02 | Phase 8 | Pending |
| UXR-03 | Phase 7 | Complete |
| UXR-04 | Phase 11 | Pending |
| GUARD-01 | Phase 11 | Pending |
| GUARD-02 | Phase 11 | Pending |
| GUARD-03 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0
- Duplicate mappings: 0

---
*Requirements defined: 2026-05-04*  
*Last updated: 2026-05-04 after v1.1 roadmap creation*
