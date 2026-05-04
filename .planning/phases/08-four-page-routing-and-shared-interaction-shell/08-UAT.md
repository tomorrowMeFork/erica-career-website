# 08 UAT: Four-Page Routing and Shared Interaction Shell

**Phase:** 08 — Four-Page Routing and Shared Interaction Shell  
**Requirements verified:** IA-02, UXR-02  
**Verification date:** 2026-05-04  
**Scope:** Code implementation — Next.js App Router pages, shared shell, CSS migration, and component decomposition.

## Verification Method

- typecheck: `tsc --noEmit` — PASS (0 errors)
- build: `next build` — PASS (8 routes: 5 static, 3 dynamic)
- tests: `npm test` — PASS (247 tests, 41 files)
- test:ui: `npm run test:ui` — PASS (25 tests, 9 files)
- Code review: read all new/modified files
- Scope guardrail audit: grep for prohibited terms and Phase 5 remnants

## Requirement-Level Verification

| Requirement | Result | Evidence |
|---|---|---|
| IA-02 | PASS | Four App Router pages at `/`, `/explore`, `/source/[id]`, `/consultation`. Shared `AppShell` component wraps all pages via root layout. Navigation links use Korean labels: 홈, 커리어 정보 탐색, 출처 확인, 커리어 상담. Active state via `aria-current="page"` and `usePathname()`. |
| UXR-02 | PASS | Home page replaces crowded dashboard with service orientation hero + two CTAs. Consultation page has dedicated chat layout. Explore page has dedicated listing layout. No overloaded left-side content, no ambiguous empty source panel, no single-dashboard experience. |

## Success Criteria Verification

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | User can navigate between four pages through clear navigation | PASS | `AppShell` renders desktop header nav and mobile bottom nav. `next/link` used for all navigation. Build generates all four routes. |
| 2 | User can tell where they are without crowded dashboard | PASS | Each page has its own route-hero header with Korean eyebrow + h1 + description. Active nav link highlighted. No three-column dashboard on any page. |
| 3 | User no longer encounters overloaded left-side content, weak consultation, or ambiguous source panel | PASS | StudentDashboard is no longer imported from any route page. Preferences moved to consultation aside. Source panel only appears when citation is selected. |
| 4 | User can use shared navigation on desktop and mobile | PASS | Desktop: horizontal header nav. Mobile: bottom nav bar (hidden above 768px). Both use same navigation items and active state logic. |

## Scope Guardrail Audit

| Check | Result |
|---|---|
| No matching/ranking algorithm changes | PASS — No algorithm code touched |
| No semantic retrieval | PASS — No retrieval code touched |
| No ingestion/crawling changes | PASS — No ingestion code touched |
| No API route changes | PASS — `app/api/` files unchanged |
| No saved jobs, reminders, application tracking, SSO | PASS — Not introduced |
| No official endorsement claims | PASS — `DisclaimerNotice` preserved with v1.0 safety language |
| Phase 5 class names removed from active pages | PASS — Phase 5 classes only remain in unused `StudentDashboard` file kept for test compatibility |

## Residual Notes

- `components/dashboard/student-dashboard.tsx` is preserved because `chat-components.test.tsx` imports and renders it. It is not imported by any route page. Can be removed when tests are updated to test the new page components directly.
- `listing-components.test.tsx` contains "맞춤 공고" in test data from v1.0. This is test fixture data, not user-facing framing. Phase 9 may update test labels.
- Explore page renders `ListingPanel` with existing recommendation data as a Phase 9 placeholder.
- Source page is a minimal shell awaiting Phase 9 detail implementation.

## Final Decision

**PASS.** Phase 8 implementation is verified. Four-page routing works, shared shell provides consistent Korean-first navigation, StudentDashboard is decomposed, and Phase 5 dashboard class names are removed from active pages. Ready for Phase 9.
