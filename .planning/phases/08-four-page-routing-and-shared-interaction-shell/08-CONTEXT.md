# Phase 8: Four-Page Routing and Shared Interaction Shell - Context

**Gathered:** 2026-05-04  
**Status:** Ready for planning  
**Source:** Phase 7 verified contracts, current codebase analysis

<domain>
## Phase Boundary

Phase 8 implements the four-page routing structure and shared interaction shell defined by Phase 7 contracts. It creates Next.js App Router pages for home, career information explore, information detail/source verification, and career consultation, along with a shared layout shell with navigation.

Phase 8 does **not** implement page-specific content beyond the shell and navigation. Detailed explore/browse pages, source verification detail, and consultation chat integration belong to Phase 9 and Phase 10.

</domain>

<decisions>
## Locked Decisions

### Routing Structure
- **D-08-01:** Use Next.js App Router with four route segments matching the Phase 7 page model.
- **D-08-02:** The shared shell includes a persistent header with product identity and navigation, applied via a layout component.
- **D-08-03:** Each page renders its own content area within the shared shell.

### Navigation
- **D-08-04:** Navigation uses Korean-first labels from `07-02-FLOW-LANGUAGE-CONTRACT.md`: 홈, 커리어 정보 탐색, 출처 확인, 커리어 상담.
- **D-08-05:** Navigation shows active state for the current page. Only one page can be active at a time.
- **D-08-06:** Navigation is accessible on desktop and mobile. Mobile may collapse to a bottom nav or hamburger menu.

### Current Dashboard Replacement
- **D-08-07:** The current single-page `StudentDashboard` component will be decomposed. Chat functionality moves to the consultation page. Listing/recommendation panel moves to the explore page. Preferences move to consultation or a settings overlay.
- **D-08-08:** The current `app/page.tsx` becomes the home page with service orientation content.
- **D-08-09:** The current Phase 5 CSS class names (phase5-shell, phase5-container, dashboard-grid, etc.) will be replaced with design-contract-aligned names.

### Design Contract
- **D-08-10:** All visual changes follow `07-03-DESIGN-STANDARD-INTERPRETATION.md` and `DESIGN.md` token conventions.
- **D-08-11:** Each page has one dominant primary action per `07-01-PAGE-IA-CONTRACT.md`.
- **D-08-12:** Accent color is reserved for one active/primary purpose per page.

### Scope Guardrails
- **D-08-13:** Phase 8 does not add matching/ranking algorithms, semantic retrieval, ingestion expansion, production crawling, private crawling, saved jobs, reminders, application tracking, SSO, or official endorsement claims.
- **D-08-14:** API routes under `app/api/` remain unchanged. Chat, preferences, and recommendations API contracts are not modified in Phase 8.

</decisions>

<canonical_refs>
## Canonical References

### Phase 7 Contracts (MUST follow)
- `.planning/phases/07-ui-information-architecture-and-design-contract/07-01-PAGE-IA-CONTRACT.md` — four-page model, CTAs, empty states, evidence rules
- `.planning/phases/07-ui-information-architecture-and-design-contract/07-02-FLOW-LANGUAGE-CONTRACT.md` — Korean labels, helper copy, forbidden framing
- `.planning/phases/07-ui-information-architecture-and-design-contract/07-03-DESIGN-STANDARD-INTERPRETATION.md` — design token translation and Phase 5 anti-pattern
- `.planning/phases/07-ui-information-architecture-and-design-contract/07-04-HUMAN-INTERVENTION-REGISTER.md` — deferred decisions with defaults
- `.planning/phases/07-ui-information-architecture-and-design-contract/07-05-VERIFICATION-ACCEPTANCE-CHECKS.md` — binary verification checks

### Current Implementation
- `app/page.tsx` — renders `StudentDashboard` (to become home page)
- `app/layout.tsx` — root layout with Pretendard font (to gain shared shell)
- `components/dashboard/student-dashboard.tsx` — 165-line monolith to decompose
- `app/globals.css` — current Phase 5 CSS tokens to update
- `components/chat/` — chat components to relocate to consultation page
- `components/listings/` — listing components to relocate to explore page
- `components/citations/` — citation components to share across pages
- `components/preferences/` — preference components to integrate into consultation or settings
- `components/safety/` — disclaimer notice to place in home and consultation

### Planning
- `.planning/ROADMAP.md` — Phase 8 goal, requirements, success criteria
- `.planning/REQUIREMENTS.md` — IA-02, UXR-02
- `DESIGN.md` — design token standard

</canonical_refs>

<current_state>
## Current Codebase State

### Route Structure
- Single route: `app/page.tsx` -> `StudentDashboard`
- Root layout: `app/layout.tsx` with Pretendard font, lang="ko"
- API routes: `app/api/chat/`, `app/api/preferences/`, `app/api/recommendations/`

### Component Inventory
- `components/dashboard/`: `student-dashboard.tsx` (165 lines, "use client", monolith)
- `components/chat/`: 7 files (composer, message list, answer, refusal, etc.)
- `components/citations/`: 6 files (source card, inspection rail, mobile sheet, etc.)
- `components/listings/`: 7 files (listing panel, cards, filter pills, badges, etc.)
- `components/preferences/`: 6 files (panel, fields, settings menu, etc.)
- `components/safety/`: 1 file (disclaimer notice)

### CSS
- `app/globals.css` defines Phase 5 era tokens: phase5-shell, phase5-container, dashboard-grid, card-surface, soft-surface, pill-control, etc.
- Tailwind is available but Phase 5 mostly used custom CSS classes.

### Data Flow
- `student-dashboard.tsx` manages all state in one component
- API calls via `lib/api-client.ts`
- Session key via `lib/session-key.ts`
- Types imported from `src/chat/chat-contract.ts`, `src/personalization/preference-contract.ts`, `src/recommendations/recommendation-contract.ts`

</current_state>

<specifics>
## Specific Ideas for Phase 8

### Route Map
```
app/
  page.tsx                    -> Home (service orientation)
  layout.tsx                  -> Root layout + shared shell
  explore/
    page.tsx                  -> Career information explore
  source/
    [id]/
      page.tsx                -> Information detail / source verification
  consultation/
    page.tsx                  -> Career consultation (chat)
  api/                        -> Unchanged
```

### Shared Shell
- Persistent top navigation bar with product identity and page links
- Korean-first labels from flow language contract
- Active state indication for current page
- Mobile-responsive (collapse or bottom nav on small screens)

### Component Decomposition
- `StudentDashboard` decomposes into page-level components
- State management needs to be lifted or shared (session key, preference state)
- Chat components move to consultation page
- Listing components move to explore page
- Citation components stay shared (used in both explore and consultation)
- Disclaimer notice appears on home and consultation pages

### CSS Migration
- Replace Phase 5 class names with design-contract-aligned names
- Use Tailwind utility classes where practical
- Keep custom CSS only for complex layout tokens from DESIGN.md

</specifics>

<deferred>
## Deferred to Later Phases

- Explore page browse/filter implementation -> Phase 9
- Source verification detail with full metadata -> Phase 9
- Consultation chat with evidence linking -> Phase 10
- Responsive/browser QA and scope guardrail verification -> Phase 11
- Matching/ranking algorithm changes, semantic retrieval, ingestion expansion -> Outside v1.1
- Saved jobs, reminders, application tracking, SSO, official endorsement -> Outside v1.1

</deferred>

---

*Phase: 08-four-page-routing-and-shared-interaction-shell*  
*Context gathered: 2026-05-04*
