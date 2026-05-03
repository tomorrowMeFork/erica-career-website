---
phase: 05-student-facing-experience
plan: 01
subsystem: frontend-foundation
tags: [nextjs, tailwind, dashboard-shell]
key-files:
  created: [next.config.ts, postcss.config.mjs, components.json, app/layout.tsx, app/page.tsx, app/globals.css, components/dashboard/student-dashboard.tsx]
  modified: [package.json, package-lock.json, tsconfig.json, next-env.d.ts, .gitignore]
decisions:
  - Next.js 16/Tailwind v4 shell uses UI-SPEC OKLCH tokens and Korean root metadata.
  - Next build required jsx react-jsx; preserved NodeNext module/moduleResolution and service import style.
metrics:
  tasks_completed: 2
  completed: 2026-05-04
---

# Phase 05 Plan 01: Frontend Foundation Summary

One-liner: Next.js App Router foundation with Korean-first ERICA dashboard shell and UI-SPEC design tokens.

## Completed Tasks

| Task | Result | Commit |
|---|---|---|
| Install Next/Tailwind/shadcn baseline | Added framework deps, scripts, tsconfig DOM/TSX settings, Next/PostCSS/shadcn config | 0e4737b |
| Create Korean root layout and tokens | Added `lang="ko"`, metadata, route entry, globals, and initial session-scoped dashboard card | 0dcc0b2 |

## Verification

- `npm run typecheck` — passed
- `npm test` — passed
- `npm run build:web` — passed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added generated TypeScript build info ignore**
- **Found during:** Build/typecheck setup
- **Issue:** `tsconfig.tsbuildinfo` was generated as untracked output.
- **Fix:** Added `*.tsbuildinfo` to `.gitignore`.
- **Commit:** 0dcc0b2

**2. [Rule 3 - Blocking] Next 16 adjusted JSX mode for build/test compatibility**
- **Found during:** `next build` and Vitest JSX tests
- **Issue:** Next 16 requires automatic React JSX runtime for the app build; Vitest also could not parse TSX under `jsx: preserve`.
- **Fix:** Kept `module` and `moduleResolution` as `NodeNext`, but used `jsx: react-jsx` with explicit Vitest transform config.
- **Commit:** 9854a8a

## Known Stubs

None. The initial dashboard shell intentionally contained static guidance only; later Phase 5 plans wired real helpers and UI panels.

## Self-Check: PASSED

- Created files exist.
- Commits found: 0e4737b, 0dcc0b2.
