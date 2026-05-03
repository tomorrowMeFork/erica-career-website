# Phase 5: Student-Facing Experience - Context

**Gathered:** 2026-05-03T19:25:38Z
**Status:** Ready for UI planning

<domain>
## Phase Boundary

Phase 5 turns the existing source-grounded chat and recommendation services into a polished Korean-first student-facing web experience. It must provide a responsive chat dashboard with answer history, citation/source inspection, recommended source links, latest/recommended listing browsing, visible expired/uncertain posting labels, and a visual system adapted from the design seed into a trustworthy academic career-service interface.

Phase 5 does **not** add official Hanyang SSO, application submission, resume/cover-letter tooling, production crawling, authenticated/private source access, server-side chat-history persistence, or the full Phase 6 safety/evaluation/release suite. Any persistence beyond session defaults must keep the Phase 4 consent, retention, and deletion gates.

</domain>

<decisions>
## Implementation Decisions

### App Structure
- **D-01:** Use Next.js as the frontend foundation for Phase 5. The existing codebase has no web app or API layer, and Next.js lets the phase introduce both the UI and thin service-facing route handlers in one stack.
- **D-02:** Build a single dashboard experience rather than separate primary pages. Chat stays central, while listings, recommendations, citations, and preference controls live as panels, tabs, or rails so users do not lose context.
- **D-03:** Add thin Next.js API routes/route handlers over existing TypeScript services (`ChatService`, `RecommendationService`, `PreferenceService`) instead of creating a separate backend server or mock-only UI.
- **D-04:** Treat chat responses as complete-response interactions for Phase 5. Do not require streaming in this phase; use polished loading states around the existing complete `ChatResponse` contract.

### Chat Experience
- **D-05:** Citation/source cards should open in a right-side panel on desktop and an equivalent mobile bottom sheet or drawer, preserving chat context while allowing source inspection.
- **D-06:** Chat answer history is client-session-only by default. Do not persist chat history server-side in Phase 5.
- **D-07:** `hard_refuse` and `soft_hedge` responses should render as gentle notice cards inside the answer flow, explaining evidence limits and prompting official-source verification without using alarming error styling.
- **D-08:** Recommended source/listing cards should attach to the relevant answer when possible, making the question, evidence, and recommended next source easy to connect.

### Listing Browse
- **D-09:** Use a card-list layout for latest/recommended employment listings. Cards should support title, source, date/deadline status, match strength, match reasons, and citation/source links.
- **D-10:** Default listing order should be recommended-first: preference-aware score order when preferences exist, and latest/active source-grounded ordering when there are no preferences.
- **D-11:** Use only core pill filters in Phase 5: examples include all, recommended, latest, deadline-soon, source, and status. Do not expand into a full advanced search/filter product.
- **D-12:** Show deadline status as a semantic badge plus short Korean copy: `모집중`, `마감됨`, and `마감일 확인 필요` or equivalent labels mapped from `active`, `expired`, and `unknown`.

### Preference Settings Flow
- **D-13:** Initial required preference input (`major`, `target_role`) should live in the dashboard side panel on desktop and a drawer/bottom sheet pattern on mobile.
- **D-14:** Preference storage is session-first by default. Persistent storage may be exposed only as an explicit opt-in with consent, retention, and deletion support.
- **D-15:** Optional preferences should use progressive disclosure. Show required fields first and put industry, region, employment type, and deadline sensitivity under an expandable detail area.
- **D-16:** Clear/update controls may live in a settings submenu rather than always-visible privacy row, but the submenu must still make preference clearing and storage scope understandable and reachable.

### Visual Direction
- **D-17:** Adapt `DESIGN.md` into an academic-calm career-service visual direction. Preserve useful patterns like white surfaces, large rounded cards, pill controls, and clear hierarchy, but do not copy Meta branding, commerce voice, or product-merchandising patterns.
- **D-18:** Use Pretendard as the first-choice Korean UI font, with Noto Sans KR, Apple SD Gothic Neo, and system sans fallbacks.
- **D-19:** Use a muted Hanyang-blue-inspired primary color selectively for trusted source markers and primary actions, balanced with white and soft gray surfaces.
- **D-20:** Use semantic badges consistently for posting status, citation/source trust, and recommendation strength. Badges must combine color with Korean text, not color alone.

### the agent's Discretion
- The user did not choose any `You decide` options. Downstream agents may still decide exact route names, component names, CSS token values, loading microcopy, test fixture details, and API handler file layout as long as D-01 through D-20 and Phase 5 requirements are satisfied.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product And Scope
- `.planning/PROJECT.md` — Product intent, Korean-first source-cited assistant value, explicit preference-based personalization, privacy constraints, and out-of-scope SSO/private crawling/application automation.
- `.planning/REQUIREMENTS.md` — Phase 5 requirements `UX-01` through `UX-05`; Phase 6 `SAFE-01` and `SAFE-02` should inform copy placeholders without expanding Phase 5 into release readiness.
- `.planning/ROADMAP.md` — Phase 5 goal, deliverables, success criteria, and directive that this phase should start with `/gsd-ui-phase 5` before implementation.
- `.planning/STATE.md` — Current project state showing Phase 5 as the active focus after Phase 4 completion.
- `AGENTS.md` — Project rules for Korean-first UI, citation/freshness metadata, no official endorsement claims, no private/authenticated crawling, and mandatory UI planning route.

### Design References
- `DESIGN.md` — Full design seed with color, typography, spacing, radius, component, and responsive patterns. Use as inspiration only.
- `.planning/research/design-seed.md` — Required adaptation guide: keep calm white surfaces, rounded cards, pill filters, Korean-first typography, source cards, explicit status labels, and responsive chat/recommendation panels; replace Meta branding and commerce-specific patterns.

### Prior Phase Decisions
- `.planning/phases/03-source-grounded-chat-mvp/03-CONTEXT.md` — Chat contract decisions: Korean answer tone, inline numeric citations, structured citations, refusal tiers, no raw retrieved text in normal user responses, and source text as untrusted data.
- `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md` — Preference schema, score-based recommendations, no-preference behavior, Korean match reasons, privacy/consent gates, and deferred polished UI boundary.
- `.planning/phases/04-personalization-and-recommendations/04-UAT.md` — Phase 4 accepted as backend/CLI foundation for Phase 5 UI work.

### Code Contracts
- `src/chat/chat-contract.ts` — `ChatResponseSchema`, `ChatCitationSchema`, `RefusalTierSchema`; UI must render answer, citations, confidence/refusal tier, and trace ID safely.
- `src/chat/chat-service.ts` — Existing complete-response chat service orchestration that Phase 5 API routes should wrap.
- `src/recommendations/recommendation-contract.ts` — `RecommendationItemSchema`, match strength, score breakdown, privacy metadata, citations, and deadline status for listing/recommendation cards.
- `src/recommendations/recommendation-service.ts` — Existing recommendation orchestration that Phase 5 API routes should wrap for recommended listing surfaces.
- `src/personalization/preference-contract.ts` — Preference profile, consent, lifecycle, and storage-scope contracts for preference UI.
- `src/personalization/preference-service.ts` — Set/update/clear semantics for preference UI behavior.
- `src/ingestion/normalized-record.ts` — Deadline status values and citation/freshness metadata that UI labels must preserve.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/chat/chat-contract.ts` provides the exact props shape for chat bubbles, citation cards, refusal/uncertainty states, and trace/debug labels.
- `src/recommendations/recommendation-contract.ts` provides the exact props shape for recommendation/listing cards, match-strength badges, match-reason bullets, score breakdowns, and citation links.
- `src/personalization/preference-contract.ts` provides the exact fields for preference forms and storage-scope display.
- `src/ingestion/normalized-record.ts` provides the `deadline_status` enum that maps to visible posting status labels.

### Established Patterns
- The project is strict TypeScript ESM with Zod schemas, Vitest tests, deterministic fixtures, and service-level contracts.
- There is no existing frontend code, component system, route structure, HTTP API server, bundler config, CSS framework, or public asset directory.
- Existing source-grounded outputs preserve citations and freshness metadata; Phase 5 must not flatten or hide these fields.
- Existing personalization behavior is explicit-preference-first and privacy-minimized; Phase 5 UI must not imply inferred profiling or persistent storage by default.

### Integration Points
- Phase 5 should introduce a Next.js app layer and thin API routes that call existing services rather than rewriting chat/recommendation/personalization logic.
- UI planning should define reusable components for chat messages, citation/source cards, recommendation/listing cards, status badges, pill filters, preference controls, and responsive dashboard layout.
- Tests should follow existing patterns: typecheck, co-located tests where practical, and deterministic fixture/service mocks rather than live provider calls.

</code_context>

<specifics>
## Specific Ideas

- Dashboard layout: chat-centered single dashboard with side/bottom panels for citations, listings, and preferences.
- Citation inspection: desktop right rail, mobile bottom sheet/drawer.
- Chat history: client-session-only by default.
- Listing browse: card list with recommended-first ordering, core pill filters, and semantic status labels.
- Preference UI: dashboard side panel, session-first storage, progressive optional fields, settings submenu for clear/update/storage-scope controls.
- Visual tone: academic calm, Pretendard-first typography, muted Hanyang-blue-inspired accents, semantic Korean badges.

</specifics>

<deferred>
## Deferred Ideas

- Streaming chat responses are deferred; Phase 5 should use complete-response UI with polished loading states.
- Server-side chat-history persistence is deferred unless a later phase adds explicit consent, retention, and deletion behavior.
- Full advanced listing search/filtering is deferred; Phase 5 should keep core pill filters only.
- Official Hanyang SSO, application submission, resume/cover-letter tools, and production crawling remain out of scope.

</deferred>

---

*Phase: 5-Student-Facing Experience*
*Context gathered: 2026-05-03T19:25:38Z*
