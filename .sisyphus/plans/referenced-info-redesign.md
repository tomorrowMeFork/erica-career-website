# Session-Scoped References UI Redesign

## TL;DR
> **Summary**: Remove the broad `정보 둘러보기` primary tab and replace it with `참고한 정보`, a session-scoped page that collects only links/cards actually referenced during consultation answers. Make consultation more centered, compact preference controls, and hide the source panel until evidence exists.
> **Deliverables**:
> - Primary nav: `커리어 상담 / 참고한 정보 / 설정`
> - New canonical `/references` route
> - `/explore` compatibility path without old browsing UX
> - Client-only session reference store from answer citations/recommendations
> - Chat-centered consultation layout with compact/collapsible preferences
> - Conditional source rail/sheet behavior
> - Updated tests and verification scripts
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: T0/T1/T2 -> T3 -> T5/T6 -> T9/T10 -> T11 -> Final Verification

## Context

### User Direction
The user concluded that `정보 둘러보기` should be removed because it makes the product feel like a source/list browsing system. They proposed a better tab: links and information that appeared during consultation answers. They also flagged that the consultation screen still feels too panel-heavy and that the safety/reference notice is below the initial fold.

### Current Code Findings
- `components/shell/app-shell.tsx` owns primary nav, currently `커리어 상담`, `정보 둘러보기`, `홈`.
- `app/page.tsx` links to `/explore` via `정보 둘러보기`.
- `app/consultation/page.tsx` manages chat state, preference state, citations, source rail, and mobile sheet. It renders a visible preferences side panel and a source placeholder before evidence exists.
- `app/explore/page.tsx` fetches recommendations and renders a general browsing page, which conflicts with the new product framing.
- `components/chat/answer-attached-evidence.tsx` already displays answer-attached evidence as `답변에 참고한 정보`.
- `components/citations/*` already provide user-facing source cards, rail, and mobile sheet labels.
- `components/listings/listing-card.tsx` still renders raw `source_id`; it must be cleaned even if legacy/unrouted.
- `components/dashboard/student-dashboard.tsx` is legacy/unrouted but still tested and duplicates older dashboard patterns.

### External UX Findings
- Common RAG/chat UX uses inline citations plus a collapsible/source panel.
- Dedicated source/reference pages work best when they accumulate sources from actual sessions, not when they expose the entire source database.
- Mobile citation UX should remain a bottom sheet/drawer.
- Empty states should explain when references will appear, not say generic “no data.”

## Objectives
1. Keep consultation as the product center.
2. Replace broad browsing with session-derived `참고한 정보`.
3. Avoid fake history or persistence claims.
4. Make first-load consultation visually calm and centered.
5. Keep source/citation verification available after answers.
6. Preserve safety constraints and Korean-first copy.
7. Keep backend/retrieval/API behavior unchanged.

## Deliverables
- Updated shell/nav IA.
- Updated planning-doc alignment notes for the superseded broad-browse phase framing.
- New `/references` page.
- `/explore` Next.js redirect to `/references`.
- Client `sessionStorage` helper for referenced information.
- Consultation page that stores answer-derived references.
- Compact/collapsible preference controls.
- Conditional source panel rendering.
- Home/source CTA copy aligned with `참고한 정보`.
- Legacy raw-ID cleanup in listing/dashboard surfaces.
- Updated Vitest, Playwright, and custom verification scripts.

## Definition of Done
- Primary nav does not include `정보 둘러보기` or `홈`.
- Brand/logo still links to `/`.
- `/references` is accessible from primary nav.
- `/references` empty state appears before any cited answer.
- `/references` populates only from consultation answer citations/recommendations.
- `/references` never calls `/api/recommendations`.
- `/explore` no longer exposes broad browsing copy or general recommendation UI.
- Consultation first load has no empty source placeholder.
- Preferences are compact/collapsible by default.
- Citation click still opens desktop rail and mobile sheet.
- Safety notice is visible near the consultation start.
- Rendered UI contains no raw `source_id`, `chunk_id`, `trace_id`, `수집일`, or old English labels.
- `npm run typecheck`, `npm test`, `npm run build:web`, `npm run qa:web`, `npm run verify:phase5-ui`, and `npm run verify:phase6-safety` pass.

## Must NOT Have
- No backend/retrieval/ingestion/recommendation/ranking changes.
- No new API routes unless separately approved.
- No fake `상담 기록`.
- No SSO, official endorsement, saved jobs, reminders, application tracking, or resume tooling.
- No advanced hover citations, resizable rails, or source snippets beyond existing data.
- No raw internal IDs in user-facing UI.

## Decision-Complete Implementation Contracts

### Planning Document Alignment Contract
- Existing `.planning/REQUIREMENTS.md` / `.planning/ROADMAP.md` references to broad `정보 둘러보기` exploration are superseded by this plan's product decision.
- Executor must update planning docs before source implementation if those docs still require a broad browse page.
- Required alignment: describe Phase 9/INFO requirements as consultation-derived referenced information, not an open-ended source browser.
- Do not remove source verification requirements; reinterpret them as citation/reference verification in chat and `/references`.

### Session Reference Storage Contract
- Storage API file: `lib/session-references.ts`.
- Test file: `lib/session-references.test.ts`.
- Storage location: browser `sessionStorage` only.
- Storage key: `erica-career-chat:session-references`.
- Stored envelope:
  ```ts
  interface SessionReferencesEnvelope {
    _v: 1;
    items: SessionReferenceItem[];
  }

  interface SessionReferenceItem {
    url: string; // canonicalized absolute/relative user-facing URL; primary dedupe key
    title: string;
    sourceLabel: string;
    postedAt: string | null;
    fetchedAt: string | null;
    deadlineStatus: "open" | "closing_soon" | "closed" | "unknown";
    firstReferencedAt: string; // ISO datetime, set only on first insert
    lastReferencedAt: string; // ISO datetime, updated on repeated references
    referenceCount: number; // increments once per answer/reference occurrence
    lastQuery?: string; // latest user query that produced this reference; do not render if empty
  }
  ```
- Canonical URL rule: trim whitespace; preserve path/query/hash; if URL is missing, do not store the item.
- Dedupe rule: canonical `url` is the only stable key. Do not dedupe by `source_id`, `chunk_id`, `record_id`, score, or title.
- Repeat rule: if the same canonical `url` appears again, keep original `title/sourceLabel/postedAt/fetchedAt/deadlineStatus` unless the old value is empty and new value is non-empty; increment `referenceCount`; update `lastReferencedAt`; update `lastQuery` if provided.
- Read failure behavior: unavailable storage, malformed JSON, unsupported `_v`, missing `items`, or invalid item shapes return `[]` without throwing.
- Write failure behavior: unavailable storage or `QuotaExceededError` is a no-op; UI remains usable and `/references` shows empty state if nothing can be saved.
- Clear behavior: `clearSessionReferences()` removes only `erica-career-chat:session-references`, not session key, preferences, or chat messages.
- Internal ID rule: `source_id` may be used internally only as input to existing label lookup helpers; it must never be persisted in this store or rendered as visible text.

### Navigation and Route Contract
- Primary nav labels and routes are exactly:
  - `커리어 상담` -> `/consultation` -> icon `✦`
  - `참고한 정보` -> `/references` -> icon `◫`
  - `설정` -> `/settings` -> icon `⚙`
- `홈` is not a primary nav item. Brand/logo remains the only persistent route to `/`.
- Active state is exact-match only for `/consultation`, `/references`, and `/settings`; `/source/example` and `/` should not mark a primary tab active.
- Mobile nav remains three items; keep `--shell-mobile-nav-count: 3` unless tests prove existing CSS breaks.
- No rendered link should point users to `/explore` except the compatibility redirect itself.
- `/explore` behavior: implement a Next.js redirect from `/explore` to `/references`; do not keep the old client browsing page active.

### `/references` Page Contract
- File: `app/references/page.tsx`.
- Component: create `components/references/reference-card.tsx` for `SessionReferenceItem`; do not force-fit `SourceCard` if it requires chat-only shapes.
- Empty state copy:
  - Heading: `아직 참고한 정보가 없습니다`
  - Body: `커리어 상담에서 질문하면 이 탭에서 답변에 참고한 출처와 공고를 확인할 수 있어요.`
  - CTA: `커리어 상담 시작하기` -> `/consultation`
- Populated page heading: `참고한 정보`.
- Populated page intro: `이번 상담에서 답변에 참고된 출처와 공고만 모았어요.`
- Sort order: `lastReferencedAt` descending; tie-break by `title.localeCompare(other.title, "ko")` ascending.
- Card fields, in order: title; source label; deadline status badge if known; `게시일` if `postedAt`; `확인일` if `fetchedAt`; `답변에서 N회 참고`; original link button `원문 열기`; secondary CTA `상담 이어가기` -> `/consultation`.
- Card must not show answer snippets, source snippets, ranking scores, raw IDs, or fake saved/history state.
- `/references` must not call `fetchRecommendations`, `/api/recommendations`, chat APIs, source APIs, or any backend route.

### Consultation State Transition Contract
- First load desktop/mobile: chat is the visual center; preferences are collapsed/compact; source rail is absent from DOM or `display: none`; no empty `출처 패널` placeholder.
- Preference collapsed default: show a compact trigger/summary in the consultation header area. Summary text is `상담 조건 설정` when no preferences exist; otherwise summarize 1-2 non-empty preference dimensions. Full `PreferencePanel` appears only after expansion.
- Safety notice placement: render a compact `DisclaimerNotice` or equivalent within the top consultation/chat header area, above the composer/message list, visible without deep scroll on desktop and mobile.
- Citation opening: clicking an inline citation/evidence item still sets `selectedCitation`, opens desktop `SourceInspectionRail`, and opens `MobileSourceSheet` on mobile.
- Source rail closed state: no right-column placeholder; closed rail should not reserve a visibly empty panel.
- Reference capture timing: after a successful chat response and after attached recommendations are resolved, append references from both `chatResult.data.citations` and `attached` recommendation items using `appendSessionReferences({ citations, recommendations, query })` before ending the loading state.
- Clear coupling: existing `onClearChatHistory` / clear-chat action must also call `clearSessionReferences()` so `/references` returns to empty state with the chat.
- Refusal/no-answer behavior: if an answer contains no citations/recommendations, do not add placeholder references.

### Copy and CTA Contract
- Home (`app/page.tsx`): remove the secondary browse CTA entirely. Keep the primary CTA focused on `커리어 상담 시작하기`.
- Source detail (`app/source/[id]/page.tsx`): replace `정보 더 둘러보기` with `커리어 상담으로 돌아가기` linking to `/consultation`.
- Allowed freshness label: `확인일`.
- Forbidden user-facing freshness/internal labels: `수집일`, `source_id`, `chunk_id`, `record_id`, `trace_id`, raw score labels.

### Legacy Cleanup Contract
- In `components/listings/listing-card.tsx`:
  - Replace rendered `{item.source_id}` with `getSourceDisplayLabel(item.source_id, item.url)` or equivalent user-facing source label.
  - Replace `수집일` with `확인일`.
  - Remove rendered numeric score such as `점수 {item.score...}`.
  - Remove `MatchStrengthBadge` and `MatchReasonList` from user-facing output unless they are rewritten as non-ranking Korean labels without scores/internal reasons.
  - Remove citation/context IDs from visible output.
- In `components/dashboard/student-dashboard.tsx`: do not add features; only ensure rendered legacy UI does not expose raw internals or browse-first framing.
- `InfoFilterPills` / `InfoItemCard`: remove active imports/usages with `/explore`; leave files only if tests or future code still need them and they do not render in active routes.

### Testing and Fixture Contract
- Playwright populated references fixture must seed sessionStorage before visiting `/references`:
  ```js
  sessionStorage.setItem(
    "erica-career-chat:session-references",
    JSON.stringify({
      _v: 1,
      items: [
        {
          url: "https://www.hanyang.ac.kr/career/example",
          title: "ERICA 현장실습 모집",
          sourceLabel: "한양대학교 ERICA",
          postedAt: "2026-05-01",
          fetchedAt: "2026-05-04",
          deadlineStatus: "open",
          firstReferencedAt: "2026-05-04T09:00:00.000Z",
          lastReferencedAt: "2026-05-04T09:00:00.000Z",
          referenceCount: 1,
          lastQuery: "컴퓨터공학과 현장실습 알려줘"
        }
      ]
    })
  );
  ```
- Tests for `/references` must intercept `/api/recommendations` and fail if it is requested.
- Chat capture tests must stub `/api/chat` and any attached recommendation call with deterministic citation/recommendation payloads; no live model/network dependency.
- Forbidden string scanning should focus on rendered route output and active UI components; avoid false positives in contracts, schemas, tests, and internal helper parameter names.

## Execution Strategy

### Waves
- **Wave 1**: T0 planning-doc alignment, T1 tests-first contract, T2 reference store.
- **Wave 2**: T3 nav/settings, T4 settings page, T5 references route, T7 home/source copy, T8 legacy cleanup.
- **Wave 3**: T6 consultation layout/reference capture, T9 static verification, T10 browser/component QA.
- **Wave 4**: T11 full verification and final review.

### Dependency Matrix
- T0 blocks implementation tasks that would otherwise conflict with existing roadmap/requirements wording.
- T1 blocks implementation tasks that need test contracts.
- T2 blocks T5 and T6.
- T3 blocks T4, T5, T7, and nav/browser QA.
- T5 and T6 block T9/T10.
- T8 blocks final forbidden-string verification.
- T10 blocks T11.

## TODOs

- [x] T0. Align Planning Docs With References-First Scope

  **What to do**: Update planning context so the executor is not implementing against stale broad-browse requirements. In `.planning/REQUIREMENTS.md`, reinterpret or supersede INFO requirements that require open-ended `정보 둘러보기` browsing so they target answer-derived `참고한 정보`, citation/source verification, and Korean-first reference review. In `.planning/ROADMAP.md`, rename/adjust the relevant explore/source verification phase language so it no longer requires a broad source browser.
  **Must NOT do**: Do not remove citation/freshness/source-verification requirements. Do not add new product scope such as saved jobs, 상담 기록, SSO, reminders, or backend crawling changes. Do not edit source implementation in this task.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: planning-doc alignment and requirement wording.
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T3-T11 | Blocked By: none

  **References**:
  - `.planning/REQUIREMENTS.md` - align INFO/source verification requirements with references-first IA.
  - `.planning/ROADMAP.md` - align phase wording with `참고한 정보` instead of broad exploration.
  - `.planning/PROJECT.md` - preserve product intent and constraints.
  - `AGENTS.md` - preserve Korean-first, citations/freshness, no official endorsement.

  **Acceptance Criteria**:
  - [ ] Planning docs no longer require a primary broad `정보 둘러보기` browser.
  - [ ] Planning docs still require citations, freshness metadata, source verification, and Korean-first behavior.
  - [ ] Planning docs do not introduce fake `상담 기록`, persistence, SSO, saved jobs, reminders, or crawling scope.
  - [ ] Requirement wording makes `/references` a consultation artifact, not a database/search page.

  **QA Scenarios**:
  ```
  Scenario: Planning docs match product IA
    Tool: Bash/Grep
    Steps: Inspect `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` for broad-browse wording and unsupported features.
    Expected: No stale primary browse requirement remains; citation/freshness requirements remain intact.

  Scenario: Scope guardrails remain present
    Tool: Bash/Grep
    Steps: Search planning docs for SSO, official endorsement, saved jobs, reminders, and crawling expansion claims.
    Expected: No unsupported scope is introduced.
  ```

  **Commit**: YES | Message: `docs: align planning docs with references-first IA` | Files: `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, optional `.planning/PROJECT.md`

- [x] T1. Write Redesign Contract Tests First

  **What to do**: Update Playwright/component/static test expectations before implementation. Encode target behavior for primary nav, `/references`, populated/empty references, `/explore` compatibility, compact preferences, no empty source placeholder, safety visibility, and forbidden strings.
  **Must NOT do**: Do not edit product implementation yet. Do not keep old `정보 둘러보기` expectations. Do not add fake `상담 기록` coverage.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI acceptance tests and responsive expectations.
  - Skills: [`playwright`]

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T3-T10 | Blocked By: none

  **References**:
  - `tests/phase5-web-smoke.spec.ts`
  - `tests/phase6-web-smoke.spec.ts`
  - `components/chat/chat-components.test.tsx`
  - `components/preferences/preference-components.test.tsx`
  - `components/citations/citation-components.test.tsx`
  - `scripts/verify-phase5-ui.test.ts`

  **Acceptance Criteria**:
  - [ ] Tests define nav labels `커리어 상담`, `참고한 정보`, `설정`.
  - [ ] Tests define `/references` empty state.
  - [ ] Tests define `/references` populated state after mocked consultation answer.
  - [ ] Tests assert `/references` does not call `/api/recommendations`.
  - [ ] Tests assert initial `/consultation` has no empty source placeholder.
  - [ ] Tests assert preferences are compact/collapsible.
  - [ ] Tests assert forbidden strings are absent.
  - [ ] If tests are committed before implementation, they must be isolated as targeted contract tests that do not break the default `npm test`/CI run until implementation tasks enable them, or be paired with minimal fixtures/utilities that keep the suite green.

  **QA Scenarios**:
  ```
  Scenario: New IA contract fails on current UI
    Tool: Bash
    Steps: Run targeted contract tests after test changes, outside the default CI command if intentionally red.
    Expected: Targeted tests fail only on intended old UI gaps; default committed test suite remains green unless the executor intentionally uses a TDD-red commit policy.

  Scenario: Contract fixture seeds references deterministically
    Tool: Playwright
    Steps: Seed `erica-career-chat:session-references` with the fixture from Testing and Fixture Contract and visit `/references`.
    Expected: Fixture card renders without live API calls.
  ```

  **Commit**: YES | Message: `test: define references-first UI redesign expectations` | Files: tests and verification fixtures only

- [x] T2. Add Session Reference Store

  **What to do**: Add pure client helper for `sessionStorage` references derived from `ChatCitation[]` and `RecommendationItem[]`. Implement the Session Reference Storage Contract exactly: key `erica-career-chat:session-references`, `_v: 1` envelope, `SessionReferenceItem` type, URL-only dedupe, graceful read/write failure, and clear helper. Store only user-facing fields: title, url, source label, postedAt, fetchedAt, deadlineStatus, firstReferencedAt, lastReferencedAt, referenceCount, optional lastQuery. Add unit tests.
  **Must NOT do**: Do not store `source_id`, `chunk_id`, `record_id`, `trace_id`, raw scores, or ranking internals. Do not call APIs. Do not use backend/localStorage persistence.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small pure helper and tests.
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T5, T6 | Blocked By: none

  **References**:
  - `lib/session-key.ts`
  - `src/chat/chat-contract.ts`
  - `src/recommendations/recommendation-contract.ts`
  - `components/citations/source-card.tsx`
  - `lib/deadline-labels.ts`

  **Acceptance Criteria**:
  - [ ] Read returns empty array when storage is unavailable/malformed.
  - [ ] Read returns empty array for unsupported `_v` or invalid item shapes.
  - [ ] Append deduplicates by canonicalized `url` only.
  - [ ] Repeat references increment `referenceCount`.
  - [ ] Repeat references update `lastReferencedAt` and preserve `firstReferencedAt`.
  - [ ] `QuotaExceededError` or unavailable storage does not throw.
  - [ ] Clear removes session references.
  - [ ] Tests prove raw internals are not stored.

  **QA Scenarios**:
  ```
  Scenario: Session reference lifecycle
    Tool: Vitest
    Steps: Append, dedupe, read, clear, malformed JSON tests.
    Expected: Safe deterministic behavior and no raw internals in stored JSON.
  ```

  **Commit**: YES | Message: `feat: add session-scoped referenced information store` | Files: `lib/session-references.ts`, `lib/session-references.test.ts`, optional source-label helper

- [x] T3. Update Shell Navigation and Route Semantics

  **What to do**: Change primary nav to `커리어 상담` -> `/consultation` icon `✦`, `참고한 정보` -> `/references` icon `◫`, `설정` -> `/settings` icon `⚙`. Remove `홈` from primary nav while keeping brand link to `/`. Use exact-match active state for the three primary routes and no active tab for `/` or `/source/*`.
  **Must NOT do**: Do not add `상담 기록`. Do not keep `정보 둘러보기` primary nav. Do not add fake account/settings features.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: IA and responsive shell.
  - Skills: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T4, T5, T7, T10 | Blocked By: T0, T1

  **References**:
  - `components/shell/app-shell.tsx`
  - `app/layout.tsx`
  - `app/globals.css`
  - `tests/phase5-web-smoke.spec.ts`

  **Acceptance Criteria**:
  - [ ] Desktop and mobile nav show exactly the new primary destinations.
  - [ ] Brand link still navigates to `/`.
  - [ ] Active state works exactly for `/consultation`, `/references`, `/settings`.
  - [ ] `/`, `/source/example`, and redirected `/explore` do not incorrectly highlight `홈` or old browse UI.
  - [ ] No primary `홈` or `정보 둘러보기` tab.
  - [ ] No rendered user navigation points to `/explore`.

  **QA Scenarios**:
  ```
  Scenario: Primary nav is consultation/reference/settings
    Tool: Playwright
    Steps: Visit `/consultation`, `/references`, `/settings` at desktop/mobile.
    Expected: Correct nav labels and `aria-current`.
  ```

  **Commit**: YES | Message: `feat: replace browse nav with session references` | Files: shell/nav/CSS/tests

- [x] T4. Add Real Settings Route

  **What to do**: Add minimal `/settings` route using existing preference/storage controls and honest Korean copy. Page structure: centered single-column surface; `h1` = `설정`; intro = `상담 조건과 저장 범위를 관리할 수 있어요.`; reuse existing preference/storage controls or extract a shared preference form only if needed. Expose only real capabilities.
  **Must NOT do**: Do not add fake account, SSO, profile, history, or persistent chat claims. Do not change backend preference APIs.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small route using existing controls.
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T10 | Blocked By: T3

  **References**:
  - `components/preferences/settings-menu.tsx`
  - `components/preferences/preference-panel.tsx`
  - `components/preferences/storage-scope-chip.tsx`
  - `lib/api-client.ts`
  - `lib/session-key.ts`

  **Acceptance Criteria**:
  - [ ] `/settings` renders without errors.
  - [ ] Page exposes only real storage/preference controls.
  - [ ] No fake `상담 기록`, SSO, account, or official endorsement copy.

  **QA Scenarios**:
  ```
  Scenario: Settings route is real and scoped
    Tool: Playwright
    Steps: Visit `/settings`, inspect visible controls.
    Expected: Preference/storage controls only; no fake product scope.
  ```

  **Commit**: YES | Message: `feat: add real settings route for preference controls` | Files: `app/settings/page.tsx`, CSS/tests as needed

- [x] T5. Implement `/references` Page and `/explore` Compatibility

  **What to do**: Add canonical `/references` page using only session references. Implement `/references` Page Contract exactly: empty copy, populated heading/intro, `ReferenceCard`, sorted by `lastReferencedAt` desc then Korean title asc, and cards with title/source/date/status/count/original-link/consultation CTA only. Convert `/explore` to a Next.js redirect to `/references` so the old browsing page does not render.
  **Must NOT do**: Do not call `/api/recommendations`. Do not render old `InfoFilterPills` browsing UI. Do not show general recommendations or raw IDs.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: new user-facing route and empty/card states.
  - Skills: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T9, T10 | Blocked By: T0, T2, T3

  **References**:
  - `next.config.ts`
  - `app/explore/page.tsx`
  - `components/explore/info-item-card.tsx`
  - `components/chat/answer-attached-evidence.tsx`
  - `components/citations/source-card.tsx`
  - `components/listings/deadline-status-badge.tsx`
  - `lib/session-references.ts`

  **Acceptance Criteria**:
  - [ ] `/references` shows empty state before chat references.
  - [ ] `/references` populated cards include title, source label, dates/status, count, original link, and consultation CTA.
  - [ ] `/references` makes no `/api/recommendations` request.
  - [ ] `/explore` redirects to `/references` and no longer shows `정보 둘러보기`.
  - [ ] `/references` does not render snippets, raw IDs, ranking scores, or fake saved/history state.

  **QA Scenarios**:
  ```
  Scenario: References is session-only
    Tool: Playwright
    Steps: Spy on `/api/recommendations`; visit `/references`.
    Expected: No recommendation request and empty state visible.
  ```

  **Commit**: YES | Message: `feat: add session-scoped references page` | Files: references route/components, explore compatibility, CSS/tests

- [x] T6. Redesign Consultation Layout and Reference Capture

  **What to do**: Center/widen consultation chat using the Consultation State Transition Contract. Move preferences into a compact collapsed trigger/summary near the chat header; expand to the existing `PreferencePanel` only on user action. Hide the source rail when closed so no empty panel is visible. Show rail/sheet only after citation/evidence open. Add compact safety notice near the top of the consultation/chat header. After successful answer plus attached recommendations resolution, append both `chatResult.data.citations` and `attached` recommendation items to session references with the current query. Clear references with chat history.
  **Must NOT do**: Do not remove inline citations, evidence cards, source rail/sheet, refusal behavior, or existing API calls. Do not add hover/resizable citations.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: core responsive UI redesign.
  - Skills: [`frontend-ui-ux`, `playwright`]

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: T9, T10 | Blocked By: T0, T1, T2

  **References**:
  - `app/consultation/page.tsx`
  - `components/chat/chat-message-list.tsx`
  - `components/chat/assistant-answer.tsx`
  - `components/chat/answer-attached-evidence.tsx`
  - `components/preferences/preference-panel.tsx`
  - `components/citations/source-inspection-rail.tsx`
  - `components/citations/mobile-source-sheet.tsx`
  - `components/safety/disclaimer-notice.tsx`
  - `app/globals.css`
  - `lib/session-references.ts`

  **Acceptance Criteria**:
  - [ ] Initial consultation has no `출처 패널` placeholder.
  - [ ] Chat area is visually primary at desktop.
  - [ ] Preferences are collapsed/compact by default and expandable.
  - [ ] Safety notice is visible without requiring deep scroll.
  - [ ] Answer citations still open rail/sheet.
  - [ ] Referenced answer sources appear on `/references`.
  - [ ] No references are added for refusal/no-answer responses without citations/recommendations.
  - [ ] Clearing chat history also clears `/references` state.

  **QA Scenarios**:
  ```
  Scenario: Consultation first load is centered
    Tool: Playwright
    Steps: Open `/consultation` desktop/mobile.
    Expected: Chat-first layout, compact preferences, safety visible, no empty source panel.
  ```

  **Commit**: YES | Message: `feat: center consultation and collect cited references` | Files: consultation/preferences/safety/CSS/session references/tests

- [x] T7. Update Home and Source Detail Copy/CTAs

  **What to do**: Remove secondary `정보 둘러보기` CTA from home entirely; keep one primary consultation CTA. Update `/source/[id]` CTA from `정보 더 둘러보기` to `커리어 상담으로 돌아가기` linking to `/consultation`.
  **Must NOT do**: Do not present `/references` as general browsing. Do not imply source detail has real dynamic data if it remains generic. Do not use `수집일`.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: focused Korean UX copy.
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T10 | Blocked By: T0, T3

  **References**:
  - `app/page.tsx`
  - `app/source/[id]/page.tsx`
  - `tests/phase5-web-smoke.spec.ts`

  **Acceptance Criteria**:
  - [ ] Home has no `정보 둘러보기` link.
  - [ ] Home primary action remains consultation.
  - [ ] Home does not add `참고한 정보 보기` as a pre-consultation browse CTA.
  - [ ] Source detail has no `정보 더 둘러보기`.
  - [ ] Source detail CTA points to `/consultation`.

  **QA Scenarios**:
  ```
  Scenario: CTA copy aligns with references flow
    Tool: Playwright
    Steps: Visit `/` and `/source/example`.
    Expected: No old browse labels; CTAs point to consultation/references.
  ```

  **Commit**: YES | Message: `copy: align home and source CTAs with references flow` | Files: home/source/tests

- [x] T8. Audit Legacy Dashboard and Listing Components

  **What to do**: Clean `components/listings/listing-card.tsx` and `components/dashboard/student-dashboard.tsx` according to the Legacy Cleanup Contract. Specifically remove visible raw `source_id`, `수집일`, numeric score labels, match-strength/ranking explanations, match reason lists, and visible citation/context IDs unless rewritten as user-facing non-ranking Korean labels.
  **Must NOT do**: Do not remove legacy components if it creates avoidable churn. Do not expand dashboard functionality. Do not reintroduce broad browsing UX.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: scoped cleanup.
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T9, T10 | Blocked By: T0, T1

  **References**:
  - `components/listings/listing-card.tsx`
  - `components/listings/listing-panel.tsx`
  - `components/listings/listing-components.test.tsx`
  - `components/dashboard/student-dashboard.tsx`
  - `components/chat/chat-components.test.tsx`

  **Acceptance Criteria**:
  - [ ] Listing card renders source/date labels in Korean user language.
  - [ ] Listing card uses `확인일`, not `수집일`.
  - [ ] Listing/dashboard rendered output contains no numeric ranking score or match reason internals.
  - [ ] Legacy dashboard test path has no visible raw internals.
  - [ ] Forbidden sweep passes for app/components active and legacy UI.

  **QA Scenarios**:
  ```
  Scenario: Legacy UI does not leak internals
    Tool: Vitest/Grep
    Steps: Render listing/dashboard tests and sweep source.
    Expected: No rendered `source_id`, `chunk_id`, `trace_id`, `수집일`.
  ```

  **Commit**: YES | Message: `fix: remove raw internals from legacy UI surfaces` | Files: listing/dashboard components and tests

- [x] T9. Update Static Verification Scripts

  **What to do**: Update `verify-phase5-ui.ts` and fixtures for `참고한 정보`, `/references`, no primary `정보 둘러보기`, no `상담 기록`, no raw metadata labels in user-facing route files. Add prohibited rendered/UI patterns for `정보 둘러보기`, `상담 기록`, `수집일`, raw `source_id` display patterns such as `source_id {` or `{item.source_id}`, `chunk_id`, `record_id`, `trace_id`, and visible score labels. Keep verifier scope narrow enough to avoid false positives in schemas/tests/internal helper parameters.
  **Must NOT do**: Do not make regex so broad it fails internal schemas/contracts. Do not require old `/explore` browsing patterns.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: scoped verification script updates.
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T11 | Blocked By: T3, T5, T6, T8

  **References**:
  - `scripts/verify-phase5-ui.ts`
  - `scripts/verify-phase5-ui.test.ts`
  - `scripts/verify-phase6-safety.ts`
  - `scripts/verify-phase6-safety.test.ts`

  **Acceptance Criteria**:
  - [ ] Valid fixture with `참고한 정보` passes.
  - [ ] Fixture with primary `정보 둘러보기` fails.
  - [ ] Fixture with `상담 기록` fails.
  - [ ] Fixture with visible `수집일` or raw ID display fails.
  - [ ] Static verifier still avoids backend/schema false positives.

  **QA Scenarios**:
  ```
  Scenario: Static verifier encodes new IA
    Tool: Vitest/Bash
    Steps: Run script tests and `npm run verify:phase5-ui`.
    Expected: New semantics enforced.
  ```

  **Commit**: YES | Message: `test: update UI verification for references flow` | Files: verification scripts/tests

- [x] T10. Update Browser Smoke and Component QA

  **What to do**: Finalize Playwright and component tests for `/references`, `/explore` compatibility, nav, consultation layout, conditional source rail, mobile sheet, safety notice, clear behavior, and no raw internals. Use the Testing and Fixture Contract: seed `sessionStorage` with `erica-career-chat:session-references`, intercept `/api/recommendations` on `/references` and fail on any request, and stub chat/recommendation payloads deterministically for reference capture.
  **Must NOT do**: Do not rely on live model calls. Do not make tests order-dependent without controlled storage setup. Do not allow `/api/recommendations` on `/references`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: broad deterministic QA update.
  - Skills: [`playwright`]

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: T11 | Blocked By: T1-T9

  **References**:
  - `tests/phase5-web-smoke.spec.ts`
  - `tests/phase6-web-smoke.spec.ts`
  - `components/*/*.test.tsx`
  - `lib/session-references.test.ts`

  **Acceptance Criteria**:
  - [ ] Browser smoke passes desktop/mobile.
  - [ ] Tests detect accidental `/api/recommendations` on `/references`.
  - [ ] Component tests cover session references and collapsible preferences.
  - [ ] Tests cover clearing chat history clears session references.
  - [ ] Tests cover storage malformed/unavailable fallback.
  - [ ] Forbidden sweep covers `/`, `/consultation`, `/references`, `/explore`, `/settings`, `/source/example`.

  **QA Scenarios**:
  ```
  Scenario: Full route model passes
    Tool: Playwright
    Steps: Run `npm run qa:web`.
    Expected: All new route/interaction expectations pass.
  ```

  **Commit**: YES | Message: `test: cover references route and consultation redesign` | Files: Playwright/component/session reference tests

- [x] T11. Run Full Verification and Fix Regressions

  **What to do**: Run full validation commands and fix only redesign-related regressions. Keep tracked status clean except intentional commits. If verification requires fixes, commit those fixes atomically; if all commands pass without changes, no commit is needed.
  **Must NOT do**: Do not change backend/retrieval/ranking/API to make UI tests pass. Do not skip failing tests. Do not commit generated/tool artifacts.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: full verification and regression triage.
  - Skills: [`playwright`, `review-work`]

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: T10

  **References**:
  - `package.json`
  - `tests/`
  - `scripts/`
  - `app/`
  - `components/`
  - `lib/`

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` passes.
  - [ ] `npm test` passes.
  - [ ] `npm run build:web` passes.
  - [ ] `npm run qa:web` passes.
  - [ ] `npm run verify:phase5-ui` passes.
  - [ ] `npm run verify:phase6-safety` passes.
  - [ ] No `src/**` or `app/api/**` behavior changes.

  **QA Scenarios**:
  ```
  Scenario: Full verification gate
    Tool: Bash
    Steps: Run all required commands.
    Expected: All exit 0.
  ```

  **Commit**: YES if fixes are required, otherwise NO | Message: `fix: resolve references UI verification regressions` | Files: only fixes from failed verification

## Final Verification Wave

- [x] F1. Product/Plan Compliance Review — oracle
  - Confirm `정보 둘러보기` is removed from primary product framing, `참고한 정보` is session-derived, and consultation remains primary.

- [x] F2. Code Quality Review — unspecified-high
  - Review session storage helper, consultation state, route/nav changes, CSS maintainability, and legacy cleanup.

- [x] F3. Real Manual QA — unspecified-high (+ playwright)
  - Exercise desktop/mobile `/consultation`, `/references`, `/settings`, `/source/example`, `/explore` compatibility, citation rail/sheet, and clear flows.

- [x] F4. Scope Fidelity Check — deep
  - Confirm no backend/API/retrieval/ranking changes, no fake history, no unsupported persistence, no official endorsement claims.

## Commit Strategy
- Commit atomically after each task if execution workflow requires commits.
- Never commit `.playwright-mcp/`, `.sisyphus/`, `claude/`, `.env`, `.next/`, screenshots, or generated `next-env.d.ts` churn.
- Do not push unless explicitly requested.

## Success Criteria
- The first impression is “ask a career question,” not “browse collected information.”
- `참고한 정보` feels like a consultation artifact, not a database/search page.
- References are collected only from actual consultation answers.
- Preferences and source panels support the conversation instead of competing with it.
- Safety and source verification remain visible and trustworthy.
