# Issues

## Task 1: Reconcile Working Tree (2026-05-04)

- No issues encountered. All four files reverted cleanly.
- The `.pill-control[aria-pressed="true"]` color change in `globals.css` (swapping to primary color) was also reverted as part of the serif-direction cleanup. If this pill styling was intentional and separate from fonts, it would need to be re-applied in a later task.


## Task 2: Readable Sans Typography (2026-05-04)

- A stale Next dev server on port 3000 was serving old CSS during the first Playwright check; stopping it and starting a fresh verifier server made `/consultation` compute the updated sans-serif stack.
- Running Next dev regenerated `next-env.d.ts` to `.next/dev/types/routes.d.ts`; restored it before staging so it is not part of Task 2.
- CSS LSP diagnostics could not run because the configured `biome` server is not installed; TypeScript diagnostics for `app/layout.tsx` were clean and `npm run typecheck` passed.


## Task 3: Consultation-First Navigation (2026-05-04)

- Running Next dev for Playwright verification again regenerated `next-env.d.ts` to `.next/dev/types/routes.d.ts`; restored it before staging and committing Task 3.
- CSS LSP diagnostics still cannot run because the configured `biome` server is not installed; TypeScript diagnostics for `components/shell/app-shell.tsx` were clean and `npm run typecheck` passed.

## Task 4: Home Page Consultation Entry Point (2026-05-04)

- Playwright MCP had a stale browser lock from a previous session; required force-killing Chrome processes and removing SingletonLock/Cookie/Socket files before the browser could launch.
- Console showed 1 error on the home page load (likely the known favicon 404 from earlier tasks, not introduced by this change).

## Task 4 Fix: Soften Proof Card Bodies (2026-05-04)

- Task 4 initial commit left system-mechanics language in proof card bodies: "출처 확인 페이지", "수집 맥락", "수집일" were still visible.
- Fixed by replacing with user-benefit language: "답변에 활용한 공고와 원문을 함께 확인할 수 있어요." and "마감일과 모집 조건은 원문 기준으로 다시 확인하도록 안내합니다."
- Lesson: when proofreading Korean copy changes, grep for internal/field terms (수집, 수집일, 수집 맥락, 출처 확인 페이지) in addition to the explicitly forbidden English strings.


## Task 5: Consultation Chat-First Page (2026-05-04)

- Running the Next dev server for Playwright verification regenerated `next-env.d.ts`; restored it before staging so it is not part of Task 5.
- CSS LSP diagnostics still cannot run because the configured `biome` server is not installed; TSX diagnostics were clean and `npm run typecheck` passed.
- Playwright console still reports the existing `/favicon.ico` 404 during page load; no task code change introduced it.


## Task 6: User-Facing Evidence Copy (2026-05-04)

- Running the Next dev server for Playwright verification regenerated `next-env.d.ts`; restored it before staging.
- Grep still finds `source_id`, `chunk_id`, and `trace_id` in type-backed props and test fixtures, but component tests and browser verification confirmed those internal values are not rendered in the answer, rail, or mobile sheet.
- The broader consultation dashboard still contains older listing/source placeholder copy outside Task 6 target components; left for later planned tasks.


## Task 7: Supporting Explore And Source Detail (2026-05-04)

- Running Next dev for Playwright verification regenerated `next-env.d.ts`; restored it before staging so it is not part of Task 7.
- Playwright console still reports the known `/favicon.ico` 404; no Task 7 code change introduced it.
- Sample recommendation categories can be implementation-flavored, so the explore card summary avoids echoing category text and uses a neutral student-facing one-line summary instead.


## Task 7 QA Fix: Avoid Internal ID Coupling (2026-05-04)

- QA correctly rejected computed-key helpers that obscured access to internal source/chunk fields. Removed them instead of weakening grep checks.
- Running Next dev for the fix again regenerated `next-env.d.ts`; restored it before staging.


## Task 8: Simplified Consultation Visual Hierarchy (2026-05-04)

- CSS LSP diagnostics still cannot run because the configured `biome` server is not installed; `npm run typecheck`, grep checks, and browser measurements were used for verification.
- Running Next dev for Playwright verification regenerated `next-env.d.ts`; restored it before staging and committing.
- Playwright console still reports the known `/favicon.ico` 404; no Task 8 change introduced it.


## Task 9: Test And Verification Script Updates (2026-05-04)

- No issues encountered. All verification commands pass cleanly after updates.
- Running Playwright tests regenerated `next-env.d.ts`; restored before staging as in previous tasks.
- CSS LSP diagnostics still cannot run because the configured `biome` server is not installed; TypeScript diagnostics were clean for all changed files.


## Task 10: Final Browser QA And Scope Guardrails (2026-05-04)

- Browser console still reports the known missing `/favicon.ico` 404; explicit fetch confirmed `/favicon.ico` returns 404 and route navigation produced no other 4xx/5xx failures.
- Grep still finds raw source fields in backend contracts/tests and older unused dashboard/listing components, but the required live routes did not render those strings.
