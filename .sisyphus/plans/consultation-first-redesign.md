# Consultation-First Redesign

## TL;DR
> **Summary**: Reframe ERICA Career Chat from an information/source-management interface into a consultation-first service where chat is the protagonist and sources/postings appear as supporting evidence under answers.
> **Deliverables**:
> - Consultation-first IA/navigation and page hierarchy
> - Korean-natural copy rewrite with no uppercase English kickers
> - Sans-serif Korean typography and quieter, content-first cards
> - User-facing source/evidence UI without raw `source_id`, `chunk_id`, or `trace_id`
> - Updated Vitest/Playwright/verification assertions
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Tasks 4-8 → Task 9 → Final Verification

## Context

### Original Request
The user said the current UI feels like “정보를 모아둔 시스템,” not a 상담 service. The service identity should be: **“ERICA 학생을 위한 AI 커리어 상담”** where verified ERICA postings/programs and sources support answer trust rather than dominating the interface.

### Interview Summary
- Main experience is 상담; information browsing is secondary.
- Sources/postings are answer evidence, not standalone top-level product value.
- “출처 확인” should not be a primary nav item; `/source/[id]` should remain for deep links from evidence actions.
- Copy must be Korean-natural, benefit-first, and avoid stiff phrases like “근거가 있는 범위에서,” “수집된 정보,” raw field labels, and uppercase English kickers.
- Typography should favor readable Korean sans-serif (Pretendard/SUIT/Wanted Sans/Noto Sans KR style), not decorative serif display headings.
- Cards should be fewer, simpler, and hierarchically distinct.

### Metis Review (gaps addressed)
- Metis identified current uncommitted visual-tuning changes in `app/layout.tsx`, `app/globals.css`, `next-modules.d.ts`, and `next-env.d.ts`. Task 1 reconciles these before redesign.
- Metis flagged a live typography contradiction: current/working tree uses serif display fonts while user requested readable sans-serif. Task 2 explicitly removes serif display direction.
- Metis flagged old Playwright smoke tests expecting dashboard-era UI. Task 9 rewrites affected tests instead of patching text only.
- Metis flagged raw source/debug IDs in user UI. Tasks 5 and 6 remove them from citations/evidence/source detail.
- Metis flagged mobile nav grid dependency on nav item count. Task 3 updates mobile layout for the new 3-item primary nav.

## Work Objectives

### Core Objective
Make the app immediately read as a friendly, trustworthy ERICA AI career consultation service: the user asks questions first, gets a helpful answer first, and sees sources/postings as supporting context only when needed.

### Deliverables
- Reconciled clean starting point from current working tree.
- Sans-serif typography system and simplified visual hierarchy.
- Primary nav ordered around 상담, with source detail removed from top-level nav.
- Home page copy and CTA focused on asking questions.
- Consultation page centered on chat flow, question chips, and answer evidence summary.
- Source/citation/evidence components rewritten in user-facing language.
- Explore page reframed as “정보 둘러보기” auxiliary archive.
- Source detail page retained but rewritten as deep-link detail, not a primary feature.
- Tests and verification scripts updated to encode the new approved UI.

### Definition of Done (verifiable conditions with commands)
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build:web` passes.
- `npm run qa:web` passes or affected Playwright specs pass with updated assertions.
- `npm run verify:phase5-ui` and `npm run verify:phase6-safety` pass after deliberate assertion updates.
- Browser routes `/`, `/consultation`, `/explore`, `/source/example` return HTTP 200.
- No user-visible raw `source_id`, `chunk_id`, or `trace_id` text appears in rendered UI.
- No top-level nav item named “출처 확인” appears in desktop/mobile nav.

### Must Have
- Korean-first labels and aria names.
- Safety disclaimer still states: reference-only, not official Hanyang service, no outcome guarantee, important details must be checked in original source.
- Existing citations/source actions remain accessible by keyboard and mobile sheet behavior remains intact.
- Existing chat/preferences/API behavior preserved.

### Must NOT Have
- No backend/retrieval/ingestion/recommendation/ranking changes.
- No `src/` backend changes.
- No `app/api/**` route-handler changes.
- No official Hanyang endorsement claims.
- No new saved-answer route unless an actual existing route supports it.
- No global blind copy replacement; update per component with context.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using existing Vitest + Playwright + custom verification scripts.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (working tree reconciliation), Task 2 (typography/tokens), Task 3 (IA/nav)
Wave 2: Task 4 (home), Task 5 (consultation/chat), Task 6 (evidence/citations), Task 7 (explore/source detail)
Wave 3: Task 8 (visual hierarchy CSS), Task 9 (tests/scripts), Task 10 (browser QA polish)
Wave 4: Final verification agents F1-F4

### Dependency Matrix (full, all tasks)
- Task 1 blocks all tasks.
- Task 2 blocks Tasks 4, 5, 7, 8, 9, 10.
- Task 3 blocks Tasks 4, 5, 9, 10.
- Task 4 can run after Tasks 1-3.
- Task 5 can run after Tasks 1-3.
- Task 6 can run after Task 5 starts but must finish before Task 9.
- Task 7 can run after Tasks 1-3.
- Task 8 can run after Tasks 4-7.
- Task 9 can run after Tasks 4-8.
- Task 10 can run after Tasks 8-9.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → quick, visual-engineering, visual-engineering
- Wave 2 → 4 tasks → writing, visual-engineering, visual-engineering, writing
- Wave 3 → 3 tasks → visual-engineering, unspecified-high, visual-engineering
- Wave 4 → 4 review tasks → oracle, unspecified-high, unspecified-high, deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Reconcile Working Tree Before Redesign

  **What to do**: Inspect current changes in `app/layout.tsx`, `app/globals.css`, `next-modules.d.ts`, and `next-env.d.ts`. Preserve only changes that align with this plan. Revert/remove prior decorative serif/font-loading direction and any generated `next-env.d.ts` noise. Keep `.playwright-mcp/`, `.sisyphus/`, and `claude/` untracked unless explicitly needed for evidence; do not commit them.
  **Must NOT do**: Do not discard user-authored `DESIGN.md` changes. Do not commit tool-output directories. Do not change app behavior.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: scoped git/worktree cleanup with clear file list.
  - Skills: [`git-master`] - Needed for safe status/diff/revert/atomic commit discipline.
  - Omitted: [`frontend-ui-ux`] - No design decisions needed yet.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: all tasks | Blocked By: none

  **References**:
  - Working tree from planning: `app/layout.tsx`, `app/globals.css`, `next-modules.d.ts`, `next-env.d.ts` currently modified.
  - Guardrail: `.playwright-mcp/`, `.sisyphus/`, `claude/` are untracked tool/planning outputs.

  **Acceptance Criteria**:
  - [ ] `git status --short` shows no unrelated generated source changes such as `next-env.d.ts` path churn.
  - [ ] If `next-modules.d.ts` was only changed for removed font imports, restore it to previous committed shape.
  - [ ] `git diff -- app/layout.tsx app/globals.css next-modules.d.ts next-env.d.ts` contains only changes needed by this redesign after Task 2, or is clean before Task 2 begins.

  **QA Scenarios**:
  ```
  Scenario: Worktree contains only intentional redesign inputs
    Tool: Bash
    Steps: Run `git status --short`; run `git diff --stat`.
    Expected: No accidental `.next`/`next-env.d.ts` generated churn remains; untracked tool output is not staged.
    Evidence: .sisyphus/evidence/task-1-working-tree.txt

  Scenario: No behavior changed during cleanup
    Tool: Bash
    Steps: Run `npm run typecheck`.
    Expected: Typecheck passes after cleanup.
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: YES | Message: `chore(ui): reconcile redesign worktree` | Files: only intentional cleanup files if any

- [x] 2. Replace Decorative Serif Display With Readable Sans-Serif System

  **What to do**: Update `app/layout.tsx` and `app/globals.css` so the app uses a readable Korean sans-serif stack throughout: `Pretendard, SUIT, Wanted Sans, Inter, Noto Sans KR, system-ui, sans-serif`. Remove `EB_Garamond`, `Noto_Serif_KR`, serif display imports/classes, and any `--font-display` value that points to serif fonts. Set headings to the same sans-serif system with weight-based hierarchy (`h1` 700/800, h2 700, body 400/500). Remove `text-transform: uppercase` from `.eyebrow` and `.panel-kicker`.
  **Must NOT do**: Do not add new dependencies. Do not use decorative Korean serif/display fonts. Do not leave `Copernicus`, `Tiempos`, `EB Garamond`, or `Noto Serif KR` active in user-facing headings.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: typography and design-token refactor.
  - Skills: [] - Existing CSS conventions are enough.
  - Omitted: [`frontend-ui-ux`] - Direction is already decided; no creative exploration needed.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 4, 5, 7, 8, 9, 10 | Blocked By: Task 1

  **References**:
  - Typography source: `app/layout.tsx` root font setup.
  - Token source: `app/globals.css` `--font-body`, `--font-display`, `.eyebrow`, `.panel-kicker`, heading rules.
  - User decision: readable sans-serif Korean typography, avoid decorative serif display.

  **Acceptance Criteria**:
  - [ ] `app/layout.tsx` has no `EB_Garamond`, `Noto_Serif_KR`, or serif-display font import.
  - [ ] `app/globals.css` has no active `Copernicus`, `Tiempos`, `EB Garamond`, `Noto Serif KR`, `Georgia`, or `Times New Roman` in `--font-display` or heading rules.
  - [ ] `.eyebrow` and `.panel-kicker` do not use `text-transform: uppercase`.
  - [ ] `npm run typecheck` passes.

  **QA Scenarios**:
  ```
  Scenario: Browser computes sans-serif heading and body fonts
    Tool: Playwright
    Steps: Open `/consultation`; evaluate computed `fontFamily` for `h1` and `body`.
    Expected: Both include Pretendard/SUIT/Wanted Sans/Inter/Noto Sans KR/system sans stack and do not include EB Garamond/Noto Serif KR/Georgia.
    Evidence: .sisyphus/evidence/task-2-fonts.json

  Scenario: No uppercase English kicker styling remains
    Tool: Bash
    Steps: Search `app/globals.css` for `text-transform: uppercase` in `.eyebrow`/`.panel-kicker` block.
    Expected: No uppercase transform for those classes.
    Evidence: .sisyphus/evidence/task-2-uppercase-check.txt
  ```

  **Commit**: YES | Message: `style(ui): switch to readable Korean sans typography` | Files: `app/layout.tsx`, `app/globals.css`, possibly `next-modules.d.ts` if font declarations are removed/updated

- [x] 3. Reframe Primary Navigation Around Consultation

  **What to do**: Update `components/shell/app-shell.tsx` navigation order and labels to: `커리어 상담` (`/consultation`), `정보 둘러보기` (`/explore`), `홈` (`/`) unless the component convention requires home first. Remove `/source/example` / “출처 확인” from primary desktop and mobile nav. Keep `app/source/[id]/page.tsx` route intact for deep links. Update mobile nav CSS grid from fixed 4 columns to resilient `repeat(var(--nav-count), minmax(0, 1fr))` or `repeat(3, minmax(0, 1fr))` after removal.
  **Must NOT do**: Do not add a dead “저장한 답변” route. Do not delete `/source/[id]`. Do not break active-route aria-current behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: IA/nav and responsive layout.
  - Skills: [] - Direct component/CSS change.
  - Omitted: [`git-master`] - Commit handled by executor workflow.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 4, 5, 9, 10 | Blocked By: Task 1

  **References**:
  - Nav component: `components/shell/app-shell.tsx`.
  - Mobile nav CSS: `app/globals.css` `.shell-mobile-nav`.
  - Route kept: `app/source/[id]/page.tsx`.

  **Acceptance Criteria**:
  - [ ] Desktop nav has no link named `출처 확인`.
  - [ ] Mobile nav has no link named `출처 확인` and lays out 3 items without overflow at 390px width.
  - [ ] `/source/example` returns 200 when visited directly.
  - [ ] Active nav link still exposes `aria-current="page"` on `/consultation`, `/explore`, and `/`.

  **QA Scenarios**:
  ```
  Scenario: Consultation is primary nav and source is not top-level
    Tool: Playwright
    Steps: Open `/consultation`; query nav links by role/name.
    Expected: `커리어 상담`, `정보 둘러보기`, and `홈` exist; `출처 확인` does not exist; `커리어 상담` has aria-current page.
    Evidence: .sisyphus/evidence/task-3-nav-desktop.json

  Scenario: Mobile nav remains usable after removing source tab
    Tool: Playwright
    Steps: Set viewport 390x844; open `/`; inspect nav link count and document scrollWidth.
    Expected: 3 mobile nav links; no horizontal overflow; all touch targets at least 44px high.
    Evidence: .sisyphus/evidence/task-3-nav-mobile.json
  ```

  **Commit**: YES | Message: `refactor(nav): prioritize consultation in app shell` | Files: `components/shell/app-shell.tsx`, `app/globals.css`, affected nav tests

- [x] 4. Rewrite Home Page As Consultation Entry Point

  **What to do**: Update `app/page.tsx` copy and hierarchy. Replace current long/system copy with:
  - H1: `커리어 상담`
  - Primary supporting copy: `ERICA의 확인된 커리어 정보를 바탕으로 질문에 답해드려요.`
  - Secondary supporting copy: `답변에 참고한 공고와 마감 정보도 함께 확인할 수 있습니다.`
  - Primary CTA: `질문하러 가기` or `커리어 상담 시작하기` linking to `/consultation`.
  - Secondary CTA: `정보 둘러보기` linking to `/explore`.
  Replace proof card kickers `Evidence`/`Freshness` with Korean labels `답변 근거` and `마감 확인`. Make proof cards explain benefits, not system mechanics.
  **Must NOT do**: Do not lead with source/audit mechanics. Do not use English kickers. Do not claim official service.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: Korean UX copy rewrite.
  - Skills: [] - Copy replacements are specified.
  - Omitted: [`visual-engineering`] - Layout style handled in Task 8.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 9 | Blocked By: Tasks 1-3

  **References**:
  - Page: `app/page.tsx`.
  - Style classes: `app/globals.css` `.home-hero`, `.home-proof-grid`, `.home-proof-card`.
  - Copy audit IDs: K1, K2, E1-E7.

  **Acceptance Criteria**:
  - [ ] Home H1 is exactly `커리어 상담`.
  - [ ] Home page includes `ERICA의 확인된 커리어 정보를 바탕으로 질문에 답해드려요.`.
  - [ ] Home page includes `답변에 참고한 공고와 마감 정보도 함께 확인할 수 있습니다.`.
  - [ ] Home page does not include `Evidence`, `Freshness`, `출처 기반`, or `근거가 있는 범위`.

  **QA Scenarios**:
  ```
  Scenario: Home presents consultation first
    Tool: Playwright
    Steps: Open `/`; query h1 and primary CTA.
    Expected: H1 is `커리어 상담`; primary CTA links to `/consultation`; no English proof-card kickers are visible.
    Evidence: .sisyphus/evidence/task-4-home.json

  Scenario: Home safety still present
    Tool: Playwright
    Steps: Open `/`; locate 안내/disclaimer section.
    Expected: It states the service is reference-only and not an official Hanyang service.
    Evidence: .sisyphus/evidence/task-4-home-safety.json
  ```

  **Commit**: YES | Message: `copy(home): make consultation the entry point` | Files: `app/page.tsx`, affected tests

- [x] 5. Rebuild Consultation Page Around Chat Flow

  **What to do**: Update `app/consultation/page.tsx`, `components/chat/chat-message-list.tsx`, and `components/chat/chat-composer.tsx` so the consultation page visually centers the chat/question flow. Required copy:
  - Hero eyebrow/kicker should be Korean or removed; no `Career Consultation`.
  - Hero text: `궁금한 점을 물어보세요. ERICA 커리어 정보를 바탕으로 답변드려요.`
  - Empty state title: `어떤 점이 궁금하신가요?`
  - Example chips, not heavy cards: `이번 주 마감 공고 알려줘`, `컴퓨터공학 전공에게 맞는 활동은?`, `이 공고 지원해도 될까?`, `대외활동/인턴 중 뭐가 더 좋을까?`
  - Composer helper: `⌘/Ctrl + Enter로 전송 · 답변은 참고용이며, 중요 내용은 원문에서 확인하세요.`
  Demote preference/source panels visually; keep them accessible but not equal-weight cards. The main chat column should be the largest/primary region on desktop and first meaningful region on mobile.
  **Must NOT do**: Do not remove preferences functionality. Do not remove citations. Do not expose trace/source internals.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: route layout + chat UI hierarchy.
  - Skills: [] - Existing components suffice.
  - Omitted: [`writing`] - Copy is specified.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 6, 8, 9 | Blocked By: Tasks 1-3

  **References**:
  - Route: `app/consultation/page.tsx`.
  - Empty state: `components/chat/chat-message-list.tsx`.
  - Composer: `components/chat/chat-composer.tsx`.
  - CSS: `app/globals.css` `.consultation-layout`, `.chat-column`, `.empty-chat`, `.empty-chat__examples`, `.chat-composer`.
  - Copy audit IDs: K3, K8, C1-C3, C9-C10, E10.

  **Acceptance Criteria**:
  - [ ] `/consultation` h1/copy is consultation-first and contains no `Career Consultation`.
  - [ ] Empty state shows the exact title `어떤 점이 궁금하신가요?`.
  - [ ] Four example question chips are visible and keyboard focusable.
  - [ ] Main chat region precedes source/evidence rail in mobile reading order.
  - [ ] Existing preference/settings controls remain accessible by role/name.

  **QA Scenarios**:
  ```
  Scenario: Consultation empty state invites questions
    Tool: Playwright
    Steps: Open `/consultation`; locate h1, empty-state heading, and four example chips.
    Expected: `어떤 점이 궁금하신가요?` and all four exact chip labels are visible; no `Career Consultation` text is visible.
    Evidence: .sisyphus/evidence/task-5-consultation-empty.json

  Scenario: Chat composer keeps safety without dominating
    Tool: Playwright
    Steps: Open `/consultation`; locate textarea and helper text.
    Expected: Textarea is labelled for question input; helper says `답변은 참고용이며, 중요 내용은 원문에서 확인하세요.`.
    Evidence: .sisyphus/evidence/task-5-composer.json
  ```

  **Commit**: YES | Message: `refactor(consultation): center the chat experience` | Files: `app/consultation/page.tsx`, `components/chat/chat-message-list.tsx`, `components/chat/chat-composer.tsx`, `app/globals.css`, affected tests

- [x] 6. Convert Source/Evidence UI From Debug Metadata To User Evidence Summary

  **What to do**: Update `components/chat/assistant-answer.tsx`, `components/chat/answer-attached-evidence.tsx`, `components/citations/source-card.tsx`, `components/citations/source-inspection-rail.tsx`, and `components/citations/mobile-source-sheet.tsx`. Remove user-visible `trace_id` details entirely. Replace raw `source_id` and `chunk_id` labels with user language:
  - Section title: `답변에 참고한 정보`
  - Source label: `출처: {human readable source label}`. If only an internal ID is available, map known IDs to user labels or display neutral fallback `확인된 출처`; never render the raw ID value.
  - Actions: `근거 보기`, `원문 보기`
  - Rail title: `답변 출처`
  Keep dates/deadline status, but phrase as `게시일`, `확인일`, `마감 상태` only when available.
  **Must NOT do**: Do not remove citation buttons or mobile sheet accessibility behavior. Do not show `chunk_id`. Do not show trace IDs to users.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: evidence/citation component refactor with accessibility.
  - Skills: [] - Existing patterns enough.
  - Omitted: [`writing`] - Copy is specified.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 8, 9 | Blocked By: Task 5

  **References**:
  - Answer: `components/chat/assistant-answer.tsx`.
  - Evidence cards: `components/chat/answer-attached-evidence.tsx`.
  - Citations: `components/citations/source-card.tsx`, `components/citations/source-inspection-rail.tsx`, `components/citations/mobile-source-sheet.tsx`.
  - Copy audit IDs: S6-S9, C18-C20, M5, M8.

  **Acceptance Criteria**:
  - [ ] Rendered answer UI contains no `trace_id`, `source_id`, or `chunk_id` literal labels.
  - [ ] Evidence section title is `답변에 참고한 정보`.
  - [ ] Source rail title is `답변 출처`.
  - [ ] Mobile source sheet still opens, traps focus, closes, and restores focus.

  **QA Scenarios**:
  ```
  Scenario: Evidence summary uses user language
    Tool: Playwright
    Steps: Seed/render a chat answer with citations; inspect visible text.
    Expected: `답변에 참고한 정보`, `출처:`, `근거 보기`, and/or `원문 보기` visible; `source_id`, `chunk_id`, and `trace_id` not visible.
    Evidence: .sisyphus/evidence/task-6-evidence-summary.json

  Scenario: Mobile citation sheet accessibility preserved
    Tool: Playwright
    Steps: At 390x844, open `/consultation`, trigger a citation/source button, press Escape.
    Expected: Sheet opens with Korean dialog title, closes on Escape, and focus returns to trigger.
    Evidence: .sisyphus/evidence/task-6-mobile-sheet.json
  ```

  **Commit**: YES | Message: `refactor(evidence): hide source internals from users` | Files: chat/citation components, affected tests

- [x] 7. Demote Explore And Source Detail Into Supporting Information Surfaces

  **What to do**: Update `app/explore/page.tsx`, `components/explore/info-filter-pills.tsx`, `components/explore/info-item-card.tsx`, and `app/source/[id]/page.tsx`. Explore page title/copy:
  - H1: `정보 둘러보기`
  - Description: `ERICA 공고와 프로그램을 한눈에 살펴볼 수 있어요. 필요하면 원문도 바로 확인할 수 있습니다.`
  Remove `Information Explore`, `Collected Information`, `source_id`, and disclaimer about “새로운 매칭/순위 산정.” Cards should show max: title, one-line summary, one status badge, source/date, actions. Source detail should be deep-link copy:
  - H1: `출처 상세`
  - Copy: `이 정보의 원문 출처를 확인하세요.`
  - No `source_id`/`chunk_id` literal field labels.
  **Must NOT do**: Do not create ranking/matching language. Do not delete direct source route. Do not expose raw chunk metadata.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: support-surface copy rewrite and card simplification.
  - Skills: [] - Copy replacements specified.
  - Omitted: [`visual-engineering`] - Major CSS handled in Task 8.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 8, 9 | Blocked By: Tasks 1-3

  **References**:
  - Explore route: `app/explore/page.tsx`.
  - Explore components: `components/explore/info-filter-pills.tsx`, `components/explore/info-item-card.tsx`.
  - Source route: `app/source/[id]/page.tsx`.
  - Copy audit IDs: K4-K7, S1-S5, S12, C4-C8, M3-M4, M7.

  **Acceptance Criteria**:
  - [ ] `/explore` h1 is exactly `정보 둘러보기`.
  - [ ] `/explore` contains no `Information Explore`, `Collected Information`, `source_id`, or `새로운 매칭/순위 산정`.
  - [ ] `/source/example` contains no `Source Verification`, `source_id`, or `chunk_id` literal labels.
  - [ ] `/source/example` still contains a clear CTA to ask about the information in consultation.

  **QA Scenarios**:
  ```
  Scenario: Explore is auxiliary archive, not main product
    Tool: Playwright
    Steps: Open `/explore`; inspect h1, description, filters, and first info card.
    Expected: H1 `정보 둘러보기`; no raw IDs; card has title, summary, status/date/source, and actions only.
    Evidence: .sisyphus/evidence/task-7-explore.json

  Scenario: Source detail deep link is user-facing
    Tool: Playwright
    Steps: Open `/source/example`; inspect visible labels.
    Expected: `출처 상세` or equivalent user-facing title; no `source_id`/`chunk_id`; CTA `이 정보에 대해 질문하기` links to `/consultation`.
    Evidence: .sisyphus/evidence/task-7-source-detail.json
  ```

  **Commit**: YES | Message: `copy(info): make sources supporting surfaces` | Files: explore/source files, affected tests

- [x] 8. Simplify Card Hierarchy And Consultation Visual Weight

  **What to do**: Update `app/globals.css` to reduce similar beige card stacking and make the chat/content hierarchy clear. Required direction:
  - Background: warm off-white/warm gray.
  - Primary cards: white or near-white.
  - Supporting sections: subtle beige only where grouping helps.
  - Main chat column: visually dominant width/position on desktop.
  - Source/preference side panels: lower emphasis, smaller headers, less border noise.
  - Example questions: chips, not large cards.
  - Buttons: one clear primary style; secondary buttons quieter.
  - Cards should avoid more than 4 strong elements: title, one-line summary, status, action.
  **Must NOT do**: Do not reintroduce heavy gradients, decorative serif headings, excessive shadows, or equal-weight beige boxes everywhere.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: CSS hierarchy, responsive layout, polish.
  - Skills: [] - Use existing global CSS conventions.
  - Omitted: [`frontend-ui-ux`] - User has supplied design direction.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 9, 10 | Blocked By: Tasks 4-7

  **References**:
  - CSS: `app/globals.css` `.card-surface`, `.soft-surface`, `.home-hero`, `.route-hero`, `.consultation-layout`, `.chat-column`, `.empty-chat`, `.source-rail`, `.info-item-card`, `.source-detail-card`.
  - User principle: friendly but not light; trustworthy but not stiff; content-first.

  **Acceptance Criteria**:
  - [ ] Desktop `/consultation` main chat column is the largest visual region.
  - [ ] At 1280px, preference/source panels do not have the same visual emphasis as chat.
  - [ ] At 390px, consultation content has no horizontal overflow and chat/empty state appears before supporting panels.
  - [ ] Primary CTA color is used sparingly for primary action only.

  **QA Scenarios**:
  ```
  Scenario: Desktop visual hierarchy centers consultation
    Tool: Playwright
    Steps: Open `/consultation` at 1280x800; measure bounding boxes for chat column and side panels.
    Expected: Chat column width is greater than each side panel and appears as main content; no overflow.
    Evidence: .sisyphus/evidence/task-8-desktop-hierarchy.json

  Scenario: Mobile reading order starts with consultation
    Tool: Playwright
    Steps: Open `/consultation` at 390x844; inspect first main landmarks/sections and scrollWidth.
    Expected: No horizontal overflow; chat/empty state appears before source detail/supporting content.
    Evidence: .sisyphus/evidence/task-8-mobile-hierarchy.json
  ```

  **Commit**: YES | Message: `style(ui): simplify consultation visual hierarchy` | Files: `app/globals.css`, affected components if class hooks needed

- [x] 9. Update Tests And Verification Scripts For Consultation-First IA

  **What to do**: Update affected Vitest, Playwright, and custom verification assertions. Rewrite old dashboard-era smoke tests to target the current four-route model:
  - `/` verifies home consultation entry.
  - `/consultation` verifies chat empty state, composer, preferences access, evidence/source interactions.
  - `/explore` verifies auxiliary information browsing.
  - `/source/example` verifies deep-link source detail copy.
  Update component tests for exact new Korean labels. Update verification scripts to preserve safety/scope intent while encoding new copy/design tokens.
  **Must NOT do**: Do not loosen tests with vague regex where exact approved copy exists. Do not remove safety assertions. Do not skip mobile source sheet/focus tests.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: broad test refactor across component/browser/custom scripts.
  - Skills: [] - Existing test infra is clear.
  - Omitted: [`visual-engineering`] - This task is verification-heavy.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 10 | Blocked By: Tasks 4-8

  **References**:
  - Playwright: `tests/phase5-web-smoke.spec.ts`, `tests/phase6-web-smoke.spec.ts`.
  - Component tests: `components/chat/chat-components.test.tsx`, `components/listings/listing-components.test.tsx`, `components/preferences/preference-components.test.tsx`, `components/citations/citation-components.test.tsx`.
  - Verification scripts/tests: `scripts/verify-phase5-ui.ts`, `scripts/verify-phase6-safety.ts`, related script tests if present.
  - Config: `vitest.config.ts`, `playwright.config.ts`, `package.json` scripts.

  **Acceptance Criteria**:
  - [ ] `npx vitest run components/chat components/listings components/preferences components/citations --environment jsdom` passes.
  - [ ] `npm run verify:phase5-ui` passes.
  - [ ] `npm run verify:phase6-safety` passes.
  - [ ] `npm run qa:web` or `npx playwright test` passes in desktop and mobile projects.
  - [ ] Tests assert exact approved strings such as `어떤 점이 궁금하신가요?`, `답변에 참고한 정보`, `정보 둘러보기`, and absence of `source_id`/`chunk_id` user labels.

  **QA Scenarios**:
  ```
  Scenario: Component tests encode new IA/copy
    Tool: Bash
    Steps: Run `npx vitest run components/chat components/listings components/preferences components/citations --environment jsdom`.
    Expected: All targeted component tests pass with new Korean copy and accessibility names.
    Evidence: .sisyphus/evidence/task-9-component-tests.txt

  Scenario: Browser smoke covers four-route model
    Tool: Bash
    Steps: Run `npm run qa:web` or `npx playwright test`.
    Expected: Desktop and mobile projects pass for `/`, `/consultation`, `/explore`, `/source/example`.
    Evidence: .sisyphus/evidence/task-9-playwright.txt
  ```

  **Commit**: YES | Message: `test(ui): update coverage for consultation-first flow` | Files: tests and verification scripts

- [x] 10. Final Browser QA And Scope Guardrail Checks

  **What to do**: Run full automated verification and browser checks. Capture evidence for desktop and mobile. Verify no source/debug internals, no top-level source nav, no prohibited backend/scope changes, and route health.
  **Must NOT do**: Do not rely on human visual approval. Do not modify backend files to make tests pass.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: browser QA and responsive UI polish.
  - Skills: [`playwright`] - Browser verification, screenshots, computed style checks.
  - Omitted: [`git-master`] - Commit handled after QA if polish changes are made.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification | Blocked By: Tasks 8-9

  **References**:
  - Routes: `/`, `/consultation`, `/explore`, `/source/example`.
  - Guardrails: no `src/` or `app/api/**` changes.
  - Safety: `components/safety/disclaimer-notice.tsx`.

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` passes.
  - [ ] `npm test` passes.
  - [ ] `npm run build:web` passes.
  - [ ] `npm run qa:web` passes or explicit Playwright command passes.
  - [ ] `git diff --name-only` contains no `src/**` and no `app/api/**` files.
  - [ ] Browser rendered text contains no `source_id`, `chunk_id`, `trace_id`, `Career Consultation`, `Information Explore`, `Collected Information`, `Source Verification`, `Evidence`, or `Freshness`.

  **QA Scenarios**:
  ```
  Scenario: Full command verification passes
    Tool: Bash
    Steps: Run `npm run typecheck && npm test && npm run build:web`.
    Expected: All commands exit 0.
    Evidence: .sisyphus/evidence/task-10-full-commands.txt

  Scenario: Route and negative-copy browser audit passes
    Tool: Playwright
    Steps: Open `/`, `/consultation`, `/explore`, `/source/example`; collect visible text and console errors.
    Expected: All routes load; no forbidden strings visible; no horizontal overflow at desktop/mobile widths; only known favicon 404 allowed if it still exists.
    Evidence: .sisyphus/evidence/task-10-browser-audit.json
  ```

  **Commit**: YES | Message: `chore(ui): verify consultation-first redesign` | Files: only QA polish/evidence metadata if repo tracks evidence; otherwise no commit if no code/test changes

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Verify every user concern is addressed: consultation-first IA, source de-emphasis, Korean-natural copy, sans typography, fewer/easier cards, no internal IDs.
- [x] F2. Code Quality Review — unspecified-high
  - Review component changes, tests, CSS maintainability, and no accidental backend changes.
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Use Playwright to exercise desktop/mobile consultation flow, nav, evidence actions, source sheet, and route health.
- [x] F4. Scope Fidelity Check — deep
  - Confirm no ingestion/retrieval/ranking/source-governance changes and no official endorsement claims.

## Commit Strategy
- Commit after each task if files changed, using atomic messages listed above.
- Never commit `.playwright-mcp/`, `.sisyphus/`, `claude/`, `.env`, credentials, or generated `.next/` output.
- If pre-commit or tests auto-modify files, re-run status/diff before committing again.
- Do not push unless explicitly requested by user.

## Success Criteria
- The first impression of `/` and `/consultation` is “ask a career question,” not “inspect collected source data.”
- `커리어 상담` is the primary nav/product center.
- Source detail exists for deep links but is not a top-level destination.
- Answer evidence is visible as a concise support block, with source detail available on demand.
- UI text is Korean-first and natural.
- Typography is readable sans-serif, not decorative serif.
- All automated tests/build/QA pass.
