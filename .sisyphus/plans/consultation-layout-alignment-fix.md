# Consultation Layout Alignment and Settings Portal Fix

## TL;DR
> **Summary**: Stabilize `/consultation` around one consultation-scoped container, reduce forced vertical height/spacing, and move `SettingsMenu` popover/dialogs to a portal so they cannot be clipped by card overflow.
> **Deliverables**:
> - One consultation content container controlling header, 안내, 상담 조건, chat/input card width
> - Consultation-only CSS cleanup: no per-card width caps for header/briefing/layout cards
> - Compact first-view spacing and reduced chat/input card height
> - Portal-based settings popover/dialog with Escape/focus behavior
> - Playwright bounding-box layout regression tests at 390, 1280, and 1440 widths
> **Effort**: Short
> **Parallel**: NO
> **Critical Path**: T1 → T2 → T3 → T4 → T5

## Context

### Original Request
사용자는 상담 페이지에서 브라우저 폭이 커질 때 상단 헤더/카드/본문 카드 폭이 서로 다르게 반응하고, 하단 콘텐츠가 불필요하게 아래로 밀려 항상 스크롤해야 하며, 설정 버튼 자식 패널이 카드 경계에서 잘리는 문제를 제보했다. 요구사항은 하나의 공통 container 기준선, 카드별 개별 width 규칙 제거, 자연스러운 반응형 축소, 세로 spacing/height 축소, 입력 카드 compactness, 설정 패널 clipping 수정이다.

### Interview Summary
- User selected **Portal robust** for the settings clipping fix.
- User selected **Bounding-box QA** for layout regression coverage.
- Tailwind was requested if possible, but the codebase uses global CSS classes in `app/globals.css`; plan uses existing CSS variable/class patterns instead of introducing Tailwind.

### Metis Review (gaps addressed)
- Do not mutate shared `.route-hero`, `.home-hero`, or `.shell-container` rules directly; use consultation-scoped selectors.
- Current width mismatch is header at shell max (~1200px) vs briefing/layout at 960px.
- Portal positioning must handle scroll/resize and preserve focus/Escape behavior.
- Source rail open state currently expands layout to 1280px. Default decision: keep the main consultation container stable at 960px; if source rail opens on desktop, it must not change header/briefing/chat width. Use a floating/fixed rail pattern for desktop source inspection rather than widening the core content container.
- Use tolerant Playwright bounding-box assertions to avoid flake.

## Work Objectives

### Core Objective
Make `/consultation` feel like a single stable centered layout: every primary card aligns to one parent-controlled width, settings overlays are never clipped, and first-view vertical space is compact enough that users can access the main chat/input area without unnecessary scrolling.

### Deliverables
- `app/consultation/page.tsx`: add one `.consultation-content` wrapper around hero, briefing, and chat/source layout.
- `app/globals.css`: consultation-scoped layout rules for common width, card spacing, compact hero, compact chat/input, stable source-open behavior, and portal popover styling.
- `components/preferences/settings-menu.tsx`: portal-based popover/dialog rendering with robust anchor positioning.
- `tests/phase5-web-smoke.spec.ts`: bounding-box regression tests for alignment, clipping, compact height, and keyboard behavior.

### Definition of Done (verifiable conditions with commands)
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run qa:web` passes.
- `npm run build:web` passes.
- At 1280x900 and 1440x900, `.consultation-hero`, `.consultation-briefing`, and `.chat-column` left/right edges align within tolerance.
- At 390x844, consultation cards fit viewport with at least 16px side padding and no horizontal overflow.
- Settings popover and confirmation dialog remain fully visible after opening; neither is clipped by the hero/card boundary.
- Escape closes settings popover/dialog and returns focus to the settings button.
- Source rail opening must not widen or shift the main header/briefing/chat container.

### Must Have
- Use this exact consultation-scoped parent width rule: `.consultation-content { display: grid; width: min(100%, 960px); margin: 0 auto; gap: var(--space-4); }`.
- Remove width ownership from `.consultation-briefing` and source-closed `.consultation-layout`; these children must be `width: 100%` under the parent.
- Preserve Korean copy, chat submit behavior, reference capture, preferences, source inspection, and mobile source sheet behavior.
- Preserve existing class names `.settings-menu__popover` and `.settings-menu__dialog` so current selectors/tests can continue to target them.

### Must NOT Have
- Do not modify backend, `app/api/**`, retrieval, ingestion, ranking, or recommendations logic.
- Do not introduce Tailwind or new styling dependencies.
- Do not change shared `.shell-container`, `.route-hero`, or `.home-hero` base rules; use `.consultation-*` overrides only.
- Do not create screenshot artifacts or baseline images.
- Do not add fake history, saved jobs, SSO, reminders, official endorsement, or production crawling claims.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing Playwright/Vitest infrastructure.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> This plan is intentionally sequential because CSS/layout, portal positioning, and bounding-box tests depend on the same DOM structure.

Wave 1: T1 layout container; T2 settings portal; T3 compact spacing/source-open stability; T4 regression tests; T5 full verification.

### Dependency Matrix (full, all tasks)
- T1 blocks T3 and T4 because tests must target the final shared container structure.
- T2 blocks T4 because clipping/focus tests must target portal-rendered popover/dialog.
- T3 blocks T4 because compact-height assertions need final spacing.
- T4 blocks T5.

### Agent Dispatch Summary
- Wave 1 → 5 tasks → categories: visual-engineering, unspecified-high.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] T1. Introduce Consultation Content Container and Align Widths

  **What to do**: In `app/consultation/page.tsx`, wrap the existing `header.route-hero.consultation-hero`, `section.consultation-briefing`, and `div.consultation-layout` inside a new `<div className="consultation-content">`. Keep `MobileSourceSheet` as a sibling after `.consultation-content` because it is a fixed overlay, not a card participating in the page width. In `app/globals.css`, add `.consultation-content { display: grid; width: min(100%, 960px); margin: 0 auto; gap: var(--space-4); }`. Change `.consultation-briefing, .consultation-layout` from `width: min(100%, 960px); justify-self: center;` to `width: 100%; min-width: 0; gap: var(--space-4);`. Add `.consultation-hero { width: 100%; overflow: visible; padding: var(--space-5); }` and inside `@media (min-width: 768px)` set `.consultation-hero { padding: var(--space-5) var(--space-6); }`. Ensure header, briefing, preference summary, and chat column share the same parent width.
  **Must NOT do**: Do not alter `.shell-container`, `.route-hero`, or `.home-hero` base rules. Do not add card-level `max-width`, `w-[...]`, `md:w-[...]`, or `lg:w-[...]` equivalents. Do not change copy or chat behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: responsive layout and card alignment.
  - Skills: []
  - Omitted: [`frontend-ui-ux`] - Design invention is not needed; this is layout correction.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T3, T4 | Blocked By: none

  **References**:
  - Pattern: `app/consultation/page.tsx:113-159` - current consultation structure to wrap without behavior changes.
  - Pattern: `app/globals.css:182-185` - existing parent container style pattern.
  - Problem: `app/globals.css:355-356` - child-level consultation width currently causes per-section width ownership.
  - Guardrail: `app/globals.css:278-284` - shared route hero rule must not be modified directly.

  **Acceptance Criteria**:
  - [ ] `app/consultation/page.tsx` has exactly one consultation-scoped visual width wrapper around hero/briefing/main chat layout.
  - [ ] `.consultation-briefing` and source-closed `.consultation-layout` no longer own a 960px max width; they inherit the parent width and use `width: 100%`.
  - [ ] `.consultation-hero`, `.consultation-briefing`, `.preference-summary`, and `.chat-column` share the same left/right bounds at 1280x900 within 10px.
  - [ ] No shared shell/home/route base container rules are modified.
  - [ ] `npm run typecheck` passes.

  **QA Scenarios**:
  ```
  Scenario: Desktop alignment after shared container
    Tool: Playwright
    Steps: Start app, set viewport 1280x900, visit `/consultation`, measure `.consultation-hero`, `.consultation-briefing`, `.chat-column` bounding boxes.
    Expected: Left edges differ by <= 5px and right edges differ by <= 10px; no horizontal overflow.
    Evidence: .sisyphus/evidence/task-1-consultation-alignment.json

  Scenario: Mobile natural shrink
    Tool: Playwright
    Steps: Set viewport 390x844, visit `/consultation`, measure document width and consultation card boxes.
    Expected: `document.documentElement.scrollWidth <= window.innerWidth`; each primary card has x >= 16 and right <= viewportWidth - 16.
    Evidence: .sisyphus/evidence/task-1-mobile-alignment.json
  ```

  **Commit**: YES | Message: `fix: align consultation layout container` | Files: `app/consultation/page.tsx`, `app/globals.css`

- [ ] T2. Convert SettingsMenu Popover and Dialogs to Portal

  **What to do**: In `components/preferences/settings-menu.tsx`, import `useEffect`, `useLayoutEffect`, `useRef`, and `createPortal` from `react-dom`. Keep the public component props unchanged. Add a `buttonRef` on the settings button. When `open` or `confirm` is active, compute anchored fixed-position coordinates from `buttonRef.current.getBoundingClientRect()`: default top is `rect.bottom + 8`; set width to `260px` for popover and `min(320px, viewportWidth - 32px)` for dialog; right-align to `rect.right`; clamp left to `16px` and right to `viewportWidth - 16px`; if bottom would exceed viewport, place above trigger at `rect.top - height - 8` after measuring via ref. Recalculate on open, `resize`, and `scroll`. Render popover/dialog nodes via `createPortal(..., document.body)` only after mounted client-side. Preserve `.settings-menu__popover` and `.settings-menu__dialog` class names. Add `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` on the settings button; set `role="menu"` on the popover and `role="menuitem"` on the two popover buttons. Escape closes dialog first, then popover, and returns focus to the settings button. Confirmation action buttons must call the existing callbacks, set `confirm` to `null`, set `open` to `false`, and return focus to the settings button.
  **Must NOT do**: Do not change `SettingsMenu` props. Do not add dependencies. Do not remove existing Korean labels. Do not rely on absolute positioning inside `.settings-menu`; portal children should use fixed positioning and computed inline style or CSS variables.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: state/focus/portal implementation needs careful React behavior.
  - Skills: []
  - Omitted: [`playwright`] - Browser verification happens in T4/T5.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T4 | Blocked By: T1

  **References**:
  - Current component: `components/preferences/settings-menu.tsx:1-14` - preserve labels and callback behavior.
  - Current CSS: `app/globals.css:344-350` - preserve class names, replace absolute dependency with portal-compatible fixed positioning.
  - Existing test selectors: `tests/phase5-web-smoke.spec.ts:124-131` - tests locate `.settings-menu__popover` and `.settings-menu__dialog` globally.
  - Clipping cause: `app/globals.css:278-284` - route hero overflow clips local absolute children.

  **Acceptance Criteria**:
  - [ ] Settings popover renders under `document.body`, not as a descendant clipped by `.consultation-hero`.
  - [ ] Popover and dialog remain fully visible at 1280x900 and 390x844.
  - [ ] Escape closes popover/dialog and restores focus to the `설정` button.
  - [ ] Existing clear-chat flow still clears messages and session references.
  - [ ] `npm test -- components/preferences/preference-components.test.tsx` passes, followed by `npm test`.

  **QA Scenarios**:
  ```
  Scenario: Portal popover is not clipped
    Tool: Playwright
    Steps: Visit `/consultation` at 1280x900, click `button[name="설정"]`, measure `.settings-menu__popover` and `.consultation-hero` boxes.
    Expected: Popover is visible; popover bottom/right stay within viewport; popover may extend outside hero without being clipped.
    Evidence: .sisyphus/evidence/task-2-settings-popover.json

  Scenario: Keyboard closes portal and returns focus
    Tool: Playwright
    Steps: Click `설정`, press Escape, evaluate `document.activeElement?.textContent` or locator focus state.
    Expected: `.settings-menu__popover` hidden; settings button has focus.
    Evidence: .sisyphus/evidence/task-2-settings-escape.json
  ```

  **Commit**: YES | Message: `fix: render settings menu in portal` | Files: `components/preferences/settings-menu.tsx`, `app/globals.css`, `components/preferences/preference-components.test.tsx` if component tests require selector/focus updates

- [ ] T3. Reduce Consultation Vertical Spacing and Stabilize Source-Open Layout

  **What to do**: In `app/globals.css`, reduce consultation-only vertical spacing with exact values. Set `.consultation-page { gap: var(--space-3); }`. Keep `.consultation-content { gap: var(--space-4); }` from T1. Keep `.consultation-briefing .disclaimer-notice` compact as-is unless T1 changes create overflow. Change `.chat-column` base to `min-height: 50vh; padding: var(--space-4); gap: var(--space-3);`. In `@media (min-width: 1024px)`, replace `.chat-column { min-height: calc(100vh - 230px); padding: var(--space-6); }` with `.chat-column { min-height: 50vh; padding: var(--space-4); }`. Reduce `.empty-chat` from `min-height: 34vh; padding: var(--space-7);` to `min-height: 24vh; padding: var(--space-5);`. Change `.chat-composer textarea` from `min-height: 92px` to `min-height: 84px`. For source-open behavior, keep `.consultation-content` stable at 960px and remove the width expansion from `.consultation-layout--source-open`; it must remain `width: 100%` and one-column for the chat. At `@media (min-width: 1280px)`, render `.consultation-source` as a fixed/floating rail: `position: fixed; top: var(--space-7); right: var(--space-6); width: var(--desktop-source-rail); max-height: calc(100vh - var(--space-8)); z-index: 25;`. Move the `.mobile-sheet, .mobile-sheet-backdrop { display: none; }` rule from `@media (min-width: 1024px)` to `@media (min-width: 1280px)` so source inspection uses the mobile sheet/tablet overlay below 1280px. Keep source inspection content and callbacks unchanged.
  **Must NOT do**: Do not remove source inspection. Do not make the chat composer unusably small. Do not display the desktop source rail below 1280px; below 1280px the existing mobile/tablet sheet must handle source inspection so the rail cannot cover the composer.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: spacing, responsive source rail, and first-view layout balance.
  - Skills: []
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T4 | Blocked By: T1

  **References**:
  - Current spacing: `app/globals.css:270-276` - page grid gaps.
  - Current chat sizing: `app/globals.css:365`, `app/globals.css:373-380`, `app/globals.css:382-405`, `app/globals.css:551-564`.
  - Source rail: `app/consultation/page.tsx:151-154`, `app/globals.css:520-534`.
  - Mobile sheet must remain: `app/consultation/page.tsx:158`, `app/globals.css:533-534`, `app/globals.css:558`.

  **Acceptance Criteria**:
  - [ ] First-load `/consultation` at 1280x900 shows hero, safety notice, 상담 조건 summary, empty chat heading, and composer without requiring vertical scroll to reach the composer.
  - [ ] `document.documentElement.scrollHeight` at 1280x900 is reduced versus the pre-fix baseline recorded before changes.
  - [ ] Source rail open does not change `.consultation-hero`, `.consultation-briefing`, or `.chat-column` left/right bounds by more than 10px.
  - [ ] Mobile source sheet still opens at 390x844.
  - [ ] `npm run typecheck` passes.

  **QA Scenarios**:
  ```
  Scenario: First-view vertical compactness
    Tool: Playwright
    Steps: At 1280x900, visit `/consultation`; record `scrollHeight`, composer bounding box, and viewport height.
    Expected: Composer bottom is visible within viewport or within <= 24px below fold; scrollHeight is lower than baseline captured before T3.
    Evidence: .sisyphus/evidence/task-3-vertical-compactness.json

  Scenario: Source rail does not shift main width
    Tool: Playwright
    Steps: Submit stubbed cited question, measure `.chat-column` box, open citation/source rail, measure again.
    Expected: Chat column left/right differ by <= 10px after source rail opens; source rail visible and not covering composer.
    Evidence: .sisyphus/evidence/task-3-source-stability.json
  ```

  **Commit**: YES | Message: `fix: compact consultation spacing` | Files: `app/globals.css`

- [ ] T4. Add Bounding-Box Layout Regression Tests

  **What to do**: Extend `tests/phase5-web-smoke.spec.ts` with helper functions near the top: `getBox(locator)`, `expectAligned(boxA, boxB, { leftTolerance, rightTolerance })`, and `expectWithinViewport(box, viewport, padding)`. Add a new test `consultation layout cards share one container across breakpoints` that checks 1280x900 and 1440x900. For each viewport, visit `/consultation`, wait for fonts (`await page.evaluate(() => document.fonts.ready)`), then measure `.consultation-hero`, `.consultation-briefing`, `.chat-column`; assert left/right alignment. Add mobile 390x844 assertion that hero/briefing/chat fit with >=16px side padding and no horizontal scroll. Add a new test `settings portal stays visible and keyboard accessible` that opens settings, verifies popover box within viewport, opens chat-clear dialog, verifies dialog within viewport, presses Escape, and verifies focus returns to settings. Update existing clear-chat test selectors only if portal DOM positioning changes timing; class names must remain.
  **Must NOT do**: Do not add screenshot snapshots or generated image baselines. Do not use exact pixel equality. Do not depend on arbitrary animation timing; wait on visibility and fonts.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: deterministic Playwright regression tests and selector stability.
  - Skills: [`playwright`]
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T5 | Blocked By: T1-T3

  **References**:
  - Existing desktop flow: `tests/phase5-web-smoke.spec.ts:63-94`.
  - Existing mobile flow: `tests/phase5-web-smoke.spec.ts:96-110`.
  - Existing settings clear selectors: `tests/phase5-web-smoke.spec.ts:124-131`.
  - Existing nav/regression style: `tests/phase5-web-smoke.spec.ts:144-187`.

  **Acceptance Criteria**:
  - [ ] New Playwright tests fail on the original width mismatch/clipped popover behavior.
  - [ ] New tests pass after T1-T3.
  - [ ] Tests include 1280x900, 1440x900, and 390x844 breakpoints.
  - [ ] Tests assert bounding-box alignment, viewport containment, no horizontal scroll, and Escape/focus behavior.
  - [ ] `npm run qa:web` passes.

  **QA Scenarios**:
  ```
  Scenario: Breakpoint alignment regression
    Tool: Playwright
    Steps: Run `npm run qa:web` after adding bounding-box tests.
    Expected: New and existing Playwright tests pass at desktop/mobile projects.
    Evidence: .sisyphus/evidence/task-4-qa-web.txt

  Scenario: Portal clipping regression
    Tool: Playwright
    Steps: Open `/consultation`, click `설정`, open `대화 기록 지우기`, press Escape.
    Expected: Popover/dialog boxes are fully inside viewport; Escape closes and focus returns to `설정`.
    Evidence: .sisyphus/evidence/task-4-settings-portal.json
  ```

  **Commit**: YES | Message: `test: cover consultation layout alignment` | Files: `tests/phase5-web-smoke.spec.ts`

- [ ] T5. Run Full Verification and Final Review

  **What to do**: Run the complete gate and fix only regressions introduced by T1-T4. Required commands: `npm run typecheck`, `npm test`, `npm run build:web`, `npm run qa:web`, `npm run verify:phase5-ui`, `npm run verify:phase6-safety`. Before Playwright, kill stale dev servers on ports 3000/3010. If `next-env.d.ts` changes due to Next tooling, restore it and do not commit it. Inspect git status to ensure only intended source/test files are tracked. If fixes are required, commit them atomically; if no fixes are required, no commit.
  **Must NOT do**: Do not commit `.playwright-mcp/`, `.sisyphus/`, `claude/`, `.next/`, screenshots, or generated artifacts. Do not change backend/API/retrieval/ranking code.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: full verification and regression triage.
  - Skills: [`playwright`, `git-master`]
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Final Verification | Blocked By: T4

  **References**:
  - Commands: `package.json` scripts.
  - Full smoke: `tests/phase5-web-smoke.spec.ts`, `tests/phase6-web-smoke.spec.ts`.
  - Static verifiers: `scripts/verify-phase5-ui.ts`, `scripts/verify-phase6-safety.ts`.

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` passes.
  - [ ] `npm test` passes.
  - [ ] `npm run build:web` passes.
  - [ ] `npm run qa:web` passes.
  - [ ] `npm run verify:phase5-ui` passes.
  - [ ] `npm run verify:phase6-safety` passes.
  - [ ] Tracked git status contains only intentional source/test changes and no generated `next-env.d.ts` churn.

  **QA Scenarios**:
  ```
  Scenario: Full verification gate
    Tool: Bash
    Steps: Run all required verification commands with noninteractive environment variables.
    Expected: All exit 0; no generated tracked churn remains.
    Evidence: .sisyphus/evidence/task-5-full-verification.txt

  Scenario: Final visual behavior spot-check
    Tool: Playwright
    Steps: Visit `/consultation` at 1440x900 and 390x844, open settings, submit stubbed cited question, open source UI.
    Expected: Aligned cards, no clipping, compact first view, working source rail/sheet.
    Evidence: .sisyphus/evidence/task-5-visual-spotcheck.json
  ```

  **Commit**: YES if fixes are required, otherwise NO | Message: `fix: resolve consultation layout regressions` | Files: only source/test fixes from failed verification

## Final Verification Wave
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after each implementation/test task when changes are verified.
- Use semantic English style matching existing recent commits: `fix: ...`, `test: ...`.
- Never commit `.playwright-mcp/`, `.sisyphus/`, `claude/`, `.env`, `.next/`, screenshots, or generated `next-env.d.ts` churn.
- Do not push unless explicitly requested.

## Success Criteria
- All consultation cards share one stable left/right baseline.
- Wide browser windows do not make header/cards/body cards diverge.
- The first view requires less unnecessary vertical scroll and the input/composer area is reachable sooner.
- Settings popover/dialogs are never clipped by the hero/card boundary.
- Source inspection remains usable without shifting the main consultation container.
- Existing Korean-first, citation, preference, references, and safety behavior remains intact.
