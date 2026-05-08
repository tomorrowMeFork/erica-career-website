# Learnings

## Task 1: Reconcile Working Tree (2026-05-04)

- All four target files (`app/layout.tsx`, `app/globals.css`, `next-env.d.ts`, `next-modules.d.ts`) contained changes exclusively from the now-rejected decorative serif/display-font direction.
- `layout.tsx` had added `Inter`, `EB_Garamond`, `Noto_Serif_KR` imports and CSS variable classes replacing the original `font-pretendard` body class.
- `globals.css` had changed `--font-body` and `--font-display` to use the serif CSS variables, plus a pill-control pressed-state color change (likely experimental).
- `next-env.d.ts` had auto-generated dev server route path churn (`.next/types/` -> `.next/dev/types/`).
- `next-modules.d.ts` had added type declarations for `next/font/google` fonts only to support the reverted serif imports.
- All changes reverted cleanly; `npm run typecheck` passes on the committed baseline.
- No commit needed since all changes were reverted to the clean committed state.
- The committed baseline uses `font-pretendard` class on body and hardcoded font-family strings in CSS variables -- Task 2 will replace this with the sans-serif system.


## Task 2: Readable Sans Typography (2026-05-04)

- `app/layout.tsx` now applies a `font-readable-sans` body class backed by global CSS rather than remote serif/display font setup.
- `app/globals.css` keeps typography centralized in `--font-body` and maps `--font-display` to the same readable Korean sans stack: Pretendard, SUIT, Wanted Sans, Inter, Noto Sans KR, system-ui, sans-serif.
- Heading hierarchy now comes from weight (`h1` 800, section headings 700) instead of decorative serif families, and `.eyebrow`/`.panel-kicker` no longer force uppercase styling.


## Task 3: Consultation-First Navigation (2026-05-04)

- `components/shell/app-shell.tsx` owns both desktop and mobile primary nav through one `navigationItems` array, so removing `/source/example` there updates both surfaces together.
- Primary nav now follows the approved consultation-first order: `커리어 상담` (`/consultation`), `정보 둘러보기` (`/explore`), `홈` (`/`).
- `.shell-mobile-nav` already used tokenized spacing, radii, colors, and 56px link height; changing the grid to a 3-count CSS variable preserved the existing mobile shell pattern without adding new one-off styling.

## Task 4: Home Page Consultation Entry Point (2026-05-04)

- The home page eyebrow ("출처 기반 ERICA 커리어 상담") was the most visible forbidden string; removing it and simplifying the H1 to just "커리어 상담" gives the page a clean, service-first impression.
- Proof card kickers "Evidence"/"Freshness" were the only remaining English UI text on the home page; replacing with "답변 근거"/"마감 확인" completes the Korean-first goal for this surface.
- The secondary CTA text "커리어 정보 둘러보기" was shortened to "정보 둘러보기" to match the nav label exactly, reducing cognitive load.
- Dev server regenerated `next-env.d.ts` again (known pattern from Tasks 2-3); restored before commit as before.
- Playwright browser lock required cleanup (rm SingletonLock/Cookie/Socket) before successful verification session.


## Task 5: Consultation Chat-First Page (2026-05-04)

- `app/consultation/page.tsx` can put the chat section first in DOM order for mobile while desktop still renders preferences/chat/source using CSS grid areas.
- The empty consultation examples work best as `button` chips that reuse `pill-control`, keeping them keyboard focusable and able to seed the composer without adding new state shape.
- Task 5 copy cleanup needed the consultation page, empty chat, composer helper, and source placeholder together to remove English kickers and internal source-collection wording from the first consultation surface.


## Task 6: User-Facing Evidence Copy (2026-05-04)

- `AssistantAnswer` was the only target component rendering `trace_id`; deleting the details block removes the debug surface without affecting citation callbacks.
- Source/evidence components now translate known internal source IDs through URL/source heuristics (`ibus` -> `ERICA 취업게시판`, `cdp` -> `한양대학교 ERICA 커리어개발센터`) and fall back to `확인된 출처`.
- `AnswerAttachedEvidence`, `SourceCard`, the desktop rail, and the mobile sheet can keep existing tokenized card/pill/badge styling while changing copy to `답변에 참고한 정보`, `답변 출처`, `근거 보기`, and `원문 보기`.


## Task 7: Supporting Explore And Source Detail (2026-05-04)

- `/explore` now works best as a supporting lookup surface when page hero copy, list helper copy, filter labels, and card metadata are changed together; otherwise old source-management language remains visible in nearby UI.
- Explore cards can reuse existing `card-surface`, `listing-meta`, `DeadlineStatusBadge`, `primary-button`, and `pill-control` patterns while showing only title, one-line summary, one status badge, source/date, and actions.
- Source display labels from citation cards are reusable for explore cards, keeping student-facing labels like `ERICA 취업게시판` and `한양대학교 ERICA 커리어개발센터` consistent across answer evidence and browsing surfaces.


## Task 7 QA Fix: Avoid Internal ID Coupling (2026-05-04)

- Explore cards should use `recommendation_id` for the generic `/source/[id]` supporting detail route because the page does not fetch by source/chunk internals.
- Source labels and source sorting can use `getSourceDisplayLabel("", url)`, which keeps user-facing source names from URL hostnames without touching source identifiers in Task 7 files.


## Task 8: Simplified Consultation Visual Hierarchy (2026-05-04)

- Consultation hierarchy can be tuned entirely in `app/globals.css`: the page already has chat-first DOM order and usable class hooks for chat, preferences, source rail, source placeholder, and question chips.
- Making `--desktop-left-panel` and `--desktop-source-rail` narrower gives the 1280px desktop chat column a clear width advantage while preserving the existing CSS grid areas.
- Side panels read as supporting surfaces when they use `--color-surface-soft`, smaller `h2` sizing, softer borders, and neutral selected states instead of the dark rail or primary-accent borders.


## Task 9: Test And Verification Script Updates (2026-05-04)

- Component Vitest tests (chat, citations, listings, preferences) needed no changes because Tasks 5-6 already updated the component code to use consultation-first Korean copy before Task 9.
- Playwright E2E tests required full rewrite: old tests asserted dashboard-era UI (`무엇을 도와드릴까요?`, `출처 확인하기`, panel tabs) that no longer exists on the active routes.
- New E2E tests cover the four-route model: `/` (home entry), `/consultation` (chat flow), `/explore` (auxiliary browsing), `/source/example` (deep-link detail).
- Strict-mode violations are common when the same text appears in nav and page body (e.g., `정보 둘러보기`); use `.first()` to disambiguate.
- The consultation page preferences section is an `<aside>` not a `<section>`, so CSS selectors like `section[aria-label="..."]` fail; use attribute selectors like `[aria-label="..."]` instead.
- `verify-phase5-ui.ts` had stale oklch color token checks from before Task 8; updated to check for hex-based color tokens (`--color-primary`, `--color-canvas`) and the current font stack.
- `verify-phase6-safety.ts` referenced the old `components/dashboard/student-dashboard.tsx` for disclaimer mount; updated to check `app/consultation/page.tsx` which now directly mounts the disclaimer.
- Running Playwright regenerates `next-env.d.ts` (known pattern from Tasks 2-8); must restore before staging.


## Task 10: Final Browser QA And Scope Guardrails (2026-05-04)

- Full verification commands passed: `npm run typecheck`, `npm test`, `npm run build:web`, and `npm run qa:web` (18 Playwright tests).
- Production browser audit covered `/`, `/consultation`, `/explore`, and `/source/example` at 1280x900 and 390x844; every route returned 200 with no horizontal overflow and no forbidden visible strings.
- `next-env.d.ts` regenerated after build/QA as expected and was restored before final status checks.
- Recent redesign commits stayed in app/components/tests/scripts scope; current tracked diff is clean, so no QA commit was needed.
