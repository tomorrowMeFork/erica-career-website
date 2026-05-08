# Learnings

## Research: Next.js App Router Redirects & Playwright Patterns (2026-05-04)

### 1. Next.js App Router: Redirecting `/explore` → `/references`

**Recommended: `next.config.ts` redirects (simplest, no files needed)**

Source: https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.mdx

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/explore",
        destination: "/references",
        permanent: false, // 307 temporary; use true for 308 permanent
      },
    ];
  },
};

export default nextConfig;
```

**Key details:**
- `permanent: false` → HTTP 307 (temporary, browsers re-POST on redirect).
- `permanent: true` → HTTP 308 (permanent, browsers cache and may not re-POST).
- `source`/`destination` are automatically prefixed with `basePath` if configured.
- These run at the edge/server layer before any rendering — no client JS involved.
- For wildcard support: `source: '/explore/:path*'` with `destination: '/references/:path*'`.

**Alternative: Route-level redirect via `redirect()` from `next/navigation`**

Source: https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/04-functions/redirect.mdx

```ts
// app/explore/page.tsx
import { redirect } from "next/navigation";

export default function ExplorePage() {
  redirect("/references"); // throws internally, returns 307
}
```

**Gotchas:**
- `redirect()` throws an error internally (NEXT_REDIRECT); it must NOT be wrapped in try/catch.
- Works in both Server and Client Components.
- In Server Actions it defaults to `'push'` type; elsewhere defaults to `'replace'`.
- `next.config.ts` redirects are preferred for static/always-on path changes because they don't require a page file and run before rendering.

**Decision: Use `next.config.ts` redirects** — zero page files, runs before rendering, standard for path renames.

---

### 2. Playwright: Seeding `sessionStorage` Before Page Visit

**Recommended: `addInitScript` on browser context (runs before any page scripts)**

Source: https://github.com/microsoft/playwright.dev/blob/main/nodejs/versioned_docs/version-stable/auth.mdx

```ts
import { test, expect } from "@playwright/test";

test("references page renders seeded items", async ({ page }) => {
  // Seed sessionStorage BEFORE navigating
  const seedData = JSON.stringify([
    { id: "1", title: "한양대 취업 통계", url: "https://example.com/1", source: "hanyang" }
  ]);

  await page.context().addInitScript((data) => {
    if (window.location.hostname === "localhost") {
      window.sessionStorage.setItem("erica-career-chat:session-references", data);
    }
  }, seedData);

  // Now navigate — sessionStorage is already populated
  await page.goto("/references");

  await expect(page.getByText("한양대 취업 통계")).toBeVisible();
});
```

**Key details:**
- `addInitScript` runs after document creation but before any page scripts execute.
- Must be called BEFORE `page.goto()` — the script is injected into the context and runs on every navigation.
- Hostname guard (`window.location.hostname === "localhost"`) prevents cross-origin issues.
- The argument is serialized automatically; pass the raw value (string/object), not `JSON.stringify` of the argument wrapper.
- For test fixtures, consider creating a custom fixture that seeds sessionStorage automatically.

**Alternative: Evaluate after goto (less reliable for SSR pages)**

```ts
await page.goto("/references");
await page.evaluate((data) => {
  window.sessionStorage.setItem("erica-career-chat:session-references", data);
}, seedData);
// NOTE: This runs AFTER initial render, so the page won't see the data on first load.
// NOT suitable for client-only pages that read sessionStorage on mount.
```

**Decision: Always use `addInitScript` before `goto`** — ensures data is available when the page's client components mount.

---

### 3. Playwright: Fail Test if `/api/recommendations` Is Requested

**Recommended: `page.route()` + `route.abort()` — the API call simply never reaches the server**

Source: https://github.com/microsoft/playwright.dev/blob/main/nodejs/versioned_docs/version-stable/api/class-route.mdx

```ts
import { test, expect } from "@playwright/test";

test("references page must NOT call /api/recommendations", async ({ page }) => {
  // Intercept and abort the recommendation API
  await page.route("**/api/recommendations**", (route) => {
    // If this handler fires, the test should FAIL
    test.fail();
    route.abort();
  });

  // Seed sessionStorage so the page has data and shouldn't need the API
  const seedData = JSON.stringify([{ id: "1", title: "Test Ref" }]);
  await page.context().addInitScript((data) => {
    window.sessionStorage.setItem("erica-career-chat:session-references", data);
  }, seedData);

  await page.goto("/references");
  // If we reach here without the route handler firing, the page correctly
  // avoided the API call.
});
```

**Better pattern: Use a flag + explicit assertion (more readable failure messages)**

```ts
test("references page must NOT call /api/recommendations", async ({ page }) => {
  let recommendationApiCalled = false;

  await page.route("**/api/recommendations**", (route) => {
    recommendationApiCalled = true;
    route.abort(); // Block it even if called
  });

  // Seed sessionStorage
  await page.context().addInitScript((data) => {
    window.sessionStorage.setItem("erica-career-chat:session-references", data);
  }, JSON.stringify([{ id: "1", title: "Test" }]));

  await page.goto("/references");
  await page.waitForLoadState("networkidle");

  // Explicit assertion with clear message
  expect(
    recommendationApiCalled,
    "Page should NOT call /api/recommendations — it should read from sessionStorage only"
  ).toBe(false);
});
```

**Key details:**
- `page.route()` uses glob patterns; `**` matches any path segment.
- `route.abort()` prevents the request from reaching the network entirely.
- The handler is called for every matching request; use `networkidle` to ensure all async requests have settled.
- Pattern `**/api/recommendations**` matches `/api/recommendations`, `/api/recommendations/`, and `/api/recommendations?query=1`.

---

### 4. Combined Test Pattern (deterministic, no live network/model calls)

```ts
import { test, expect } from "@playwright/test";

test.describe("/references page", () => {
  const seedReferences = [
    { id: "1", title: "한양대 취업 통계 2024", url: "https://example.com/1", source: "hanyang" },
    { id: "2", title: "ERICA 채용 공고", url: "https://example.com/2", source: "career" },
  ];

  test("renders seeded references from sessionStorage", async ({ page }) => {
    // Block recommendation API — page should never call it
    let apiCalled = false;
    await page.route("**/api/recommendations**", (route) => {
      apiCalled = true;
      route.abort();
    });

    // Seed sessionStorage before navigation
    await page.context().addInitScript((data) => {
      window.sessionStorage.setItem("erica-career-chat:session-references", data);
    }, JSON.stringify(seedReferences));

    await page.goto("/references");
    await page.waitForLoadState("networkidle");

    // Verify no API was called
    expect(apiCalled, "Should not call /api/recommendations").toBe(false);

    // Verify seeded data rendered
    await expect(page.getByText("한양대 취업 통계 2024")).toBeVisible();
    await expect(page.getByText("ERICA 채용 공고")).toBeVisible();
  });

  test("redirects /explore to /references", async ({ page }) => {
    await page.goto("/explore");
    await expect(page).toHaveURL(/\/references/);
  });
});
```

### Summary of Recommendations

| Concern | Approach | Why |
|---------|----------|-----|

## T6 Consultation Layout and Reference Capture (2026-05-04)

- `app/consultation/page.tsx` can keep the existing chat and recommendation API sequence intact while appending `chatResult.data.citations` and resolved attached recommendations via the T2 `appendCitations` / `appendRecommendations` helpers before ending the loading state.
- The Consultation State Transition Contract is easiest to preserve by conditionally rendering the desktop source rail only while `sourcePanelOpen` is true, with the mobile sheet still controlled by the same open state.
- Clearing chat history should call `clearSessionReferences()` in the same handler so `/references` returns to the session empty state without touching preferences or session keys.
| `/explore` → `/references` | `next.config.ts` `redirects()` | Zero files, edge-level, before rendering |
| Seed `sessionStorage` | `page.context().addInitScript()` before `goto` | Runs before page scripts; data available on mount |
| Fail if API called | `page.route()` + flag + `expect(flag).toBe(false)` | Explicit assertion, clear failure messages, blocks network |
| Deterministic tests | Combine seed + route block + `networkidle` | No live network, no model calls, fully deterministic |

## T0: Planning Doc Alignment (2026-05-04)

### What changed
- REIFIED REQUIREMENTS: IA-02, IA-03, INFO-01, INFO-03, INFO-04, SRCV-01 updated to reference consultation-derived `참고한 정보` instead of open-ended browse/explore.
- Section header renamed from "Career Information Exploration" to "참고한 정보 (References)".
- ROADMAP: Phase 8/9 titles, goals, and success criteria updated. Progress table entry updated.
- PROJECT.md: Current focus, active requirements, and key decisions table updated for consistency.

### What was preserved
- All guardrail requirements (GUARD-01, GUARD-02, GUARD-03) remain unchanged.
- Out-of-scope table unchanged.
- Future requirements (JOBFLOW-01/02/03, RET-01, SRC-NEW-01) unchanged.
- All requirement IDs and traceability table counts preserved.
- Citation, freshness, source-verification, Korean-first behavior all intact.

### What was removed from user-facing requirements
- `source_id/chunk_id` from SRCV-01 (still exists internally; just not user-facing).
- "core filters" framing from INFO-03 (replaced with deadline/source scanning).
- "dedicated exploration page" from INFO-01 (replaced with "dedicated references page").
- "browse" language replaced with "review" throughout.

### Approach notes
- Reinterpretation over deletion: kept all requirement IDs, changed wording to match product intent.
- Phase 7 artifacts (07-01-PLAN.md, 07-01-PAGE-IA-CONTRACT.md, etc.) were NOT modified because they are completed-phase artifacts; T0 scope was limited to REQUIREMENTS.md, ROADMAP.md, and PROJECT.md only.
- The v1.0 milestone archive files (milestones/v1.0-*) were intentionally left untouched.

## T0 Follow-up: Residual Exploration Framing Fix (2026-05-04)

Atlas verification flagged remaining "exploration" language in ROADMAP.md Phase 7 section (lines 57, 62, 65) and "information discovery" in PROJECT.md (lines 7, 84). Fixed all instances:

- ROADMAP.md Phase 7 goal: "information exploration" -> "reference review"
- ROADMAP.md Phase 7 success criterion 2: "exploration actions" -> "reference-review actions"
- ROADMAP.md Phase 7 TDD expectation: "exploration-vs-consultation labels" -> "reference-vs-consultation labels"
- ROADMAP.md Phase 7 one-liner: "consultation-vs-exploration distinction" -> "consultation-vs-references distinction"
- PROJECT.md v1.1 description: "information discovery" -> "reference review"
- PROJECT.md Key Decisions rationale: "information discovery" -> "reference review"

Remaining acceptable matches: v1.0 archive reference ("listing browse" in milestone table) is sealed history. No other active roadmap or requirement wording uses exploration/browse framing.

## T1 Contract Tests (2026-05-04)

- Added skipped Playwright references-first contract coverage in `tests/phase5-web-smoke.spec.ts` so default QA remains green until implementation enables `/references`, `/explore` redirect, compact consultation preferences, and forbidden-string removal.
- The populated references contract seeds `erica-career-chat:session-references` with the plan fixture shape via `page.context().addInitScript()` before `page.goto("/references")` and uses a route flag to assert `/api/recommendations` is not called.
- Active smoke/component tests now avoid broad-browse expectations that were not needed for the current green suite, while preserving current safety, citation, and raw metadata hiding checks.
- `npm run qa:web` covers only `tests/phase5-web-smoke.spec.ts` and `tests/phase6-web-smoke.spec.ts`; the references-first contract tests are intentionally skipped there until source implementation catches up.

## T1 Contract Correction (2026-05-04)

- Corrected the skipped `/references` empty-state contract to require heading `아직 참고한 정보가 없습니다` without a trailing period and CTA `커리어 상담 시작하기` linking to `/consultation`.
- Added `정보 더 둘러보기` to future forbidden rendered strings so stale source-detail browse CTAs are covered when references-first contracts are enabled.

## T2: Session Reference Store (2026-05-04)

### What was built
- `lib/session-references.ts`: Pure client-side helper using sessionStorage with key `erica-career-chat:session-references`, `_v: 1` envelope, URL-only dedupe, repeat tracking, and graceful failure handling.
- `lib/session-references.test.ts`: 21 tests covering read failure modes, dedupe, repeat increment, raw-internal stripping, QuotaExceededError, envelope format, and clear behavior.

### Key design decisions
- **Deadline status mapping**: The plan contract uses `"open" | "closing_soon" | "closed" | "unknown"` while the existing `DeadlineStatus` type uses `"active" | "expired" | "unknown"`. Implemented a `mapDeadlineStatus()` bridge that maps `active→open`, `expired→closed`, `closing-soon→closing_soon`, `unknown→unknown`.
- **Input flexibility**: Both `appendCitations` and `appendRecommendations` accept `Record<string, unknown>[]` rather than typed contracts, allowing snake_case (ChatCitation) and camelCase field names without importing backend types.
- **Backfill on repeat**: When an existing item has empty/null fields and the new input has non-empty values, the old fields are backfilled. This prevents a citation without `postedAt` from permanently blocking a later citation with `postedAt` for the same URL.

### Patterns to follow
- Storage access follows `lib/session-key.ts` pattern: prefix `erica-career-chat:`, safe try/catch wrappers.
- Mock storage uses `Map`-backed `Storage` implementation with `vi.fn()` spies for assertions.
- Date mocking for deterministic timestamps uses a mutable `currentTime` variable with a `vi.stubGlobal("Date", ...)` factory function.

### Commit
- `7d75955` `feat: add session-scoped referenced information store` — 2 files, 483 insertions.

## T2 Correction: Atlas Verification Fixes (2026-05-04)

### Issues found and fixed
1. **Unsafe `window.sessionStorage` default**: Changed all public API signatures from `storage: Storage = window.sessionStorage` to `storage?: Storage` with a `getSafeSessionStorage()` resolver that catches `ReferenceError` when window is undefined. All four public functions (`readSessionReferences`, `appendCitations`, `appendRecommendations`, `clearSessionReferences`) now return `[]` / no-op when storage is unavailable.
2. **Raw source_id persistence**: Replaced `String(c.sourceLabel ?? c.source_id ?? "")` with `(c.sourceLabel as string | undefined) || getSourceDisplayLabel(c.source_id, url)`. The `getSourceDisplayLabel` function was reimplemented locally (same logic as `source-card.tsx` but without importing the React component). This ensures `sourceLabel` is always a user-facing Korean label like "ERICA 취업게시판" or "한양대학교 ERICA 커리어개발센터", never a raw ID like `ibus-hanyang`.
3. **Strengthened tests**: Added `assertNoRawInternalsInJson()` helper that checks the raw JSON string for forbidden substrings (`chunk-`, `record-`, `trace-`, `ibus-hanyang`, `cdp-hanyang`, score values). Added no-window safety tests for `readSessionReferences()`, `appendCitations()`, and `clearSessionReferences()`. Added sourceLabel value assertions. Fixed Date mock lifecycle to use `beforeEach`/`afterEach` instead of module-level stub to prevent cross-file pollution.

### Lesson learned
- `String(undefined)` returns `"undefined"` (truthy string), so `||` doesn't short-circuit. Must use `(value as string | undefined) || fallback` instead of `String(value) || fallback` when the value could be undefined.
- Module-level `vi.stubGlobal("Date", ...)` gets restored by `afterEach` but never re-applied. Use `beforeEach` to re-stub when the mock must be deterministic across all tests.

## T3 Shell Navigation (2026-05-04)

- Primary navigation is centralized in `components/shell/app-shell.tsx`; exact active state can be expressed by comparing `usePathname()` directly to each item href.
- Desktop and mobile navigation share the same `navigationItems`, so keeping three items preserves `--shell-mobile-nav-count: 3` without CSS changes.

## T4. Add Real Settings Route (2026-05-04)

- `/settings` can reuse `PreferencePanel` directly with `read/save/update/clearPreferences`; no shared extraction was needed.
- Keep settings copy scoped to current session preference ranking and deletion, because account, SSO, saved jobs, reminders, and persistent chat are out of scope.

## T4: Settings Route Verification (2026-05-04)

- `app/settings/page.tsx` already existed with correct structure before this task ran; it was created as part of the T3 shell navigation work.
- The settings page reuses `PreferencePanel` directly with `read/save/update/clearPreferences` from `lib/api-client.ts` and `getOrCreateSessionKey` from `lib/session-key.ts`.
- CSS for settings is in `app/globals.css`: `--settings-container-max: 760px` for centered single-column layout, `.settings-page` and `.settings-controls` grid styles.
- No shared preference extraction was needed; the page imports `PreferencePanel` directly.
- The page correctly exposes only real capabilities (preference ranking, storage scope, clear) with honest Korean copy and no fake features.
- Commit: `bb4efef` `feat: add real settings route for preference controls` -- 2 files (new `app/settings/page.tsx`, modified `app/globals.css`).

## T5 References Page Implementation (2026-05-04)

- `/references` should stay client-only for sessionStorage access and call `readSessionReferences()` exactly once on mount.
- `/explore` is now compatibility-only through `next.config.ts` redirect, with no broad browsing page implementation left under `app/explore`.
- Reference cards intentionally omit `lastQuery`, raw IDs, snippets, scores, and recommendation copy; tests seed the session envelope and assert no `/api/recommendations` calls.

## T7: Home and Source Detail CTA Alignment (2026-05-04)

- Removed `정보 둘러보기` secondary CTA from home page (`app/page.tsx`); only `커리어 상담 시작하기` primary CTA remains.
- Updated source detail (`app/source/[id]/page.tsx`): replaced `이 정보에 대해 질문하기` + `정보 더 둘러보기` pair with single `커리어 상담으로 돌아가기` CTA linking to `/consultation`.
- Updated test assertion in `tests/phase5-web-smoke.spec.ts` for new source detail CTA text.
- No `/explore`, `/references`, or `수집일` references remain in the two page files.
- Commit: `fdcbf67` `copy: align home and source CTAs with references flow`.


## T8 Legacy UI Cleanup (2026-05-04)

- Legacy listing cards should reuse `getSourceDisplayLabel(source_id, url)` for Korean source names, show `확인일`, and avoid rendering score, match-strength, match-reason, or citation/context IDs.
- Dashboard raw-internal tests should assert the full rendered legacy path, not only the assistant answer article, because listing cards are mounted in the dashboard aside.

## T6 Consultation Layout and Reference Capture (2026-05-04)

- `/consultation` now starts as a centered, wider chat-first surface with compact safety copy, collapsed preferences, and no closed-state source placeholder.
- Successful answers capture both citations and attached recommendations through the T2 session reference helpers, using the current query.
- Clearing chat history now also clears session references so `/references` returns to its empty state.

## T9: Static Verification Script Updates (2026-05-04)

- Korean UI terms (`정보 둘러보기`, `상담 기록`, `수집일`) are safe to add to the broad prohibited sweep (app/ + components/ + lib/) because they only appear in `tests/` directory (not swept) and `src/` directory (not swept).
- Raw ID patterns (`{item.source_id}`, `{source_id}`, `{item.chunk_id}`, etc.) MUST use a separate narrow-scope sweep (app/ + components/ only) because `lib/` contains `source_id`, `chunk_id`, `record_id`, `trace_id` in schemas, test fixtures, and `getSourceDisplayLabel` parameter usage.
- Component test files (`.test.tsx` in `components/`) legitimately contain forbidden strings inside regex assertions (e.g., `screen.queryByText(/수집일|source_id/u)`). The sweep must filter out `.test.ts` and `.test.tsx` files to avoid false positives.
- verify-phase6-safety.ts did NOT need changes: its prohibited patterns are safety-specific (endorsement claims, guaranteed outcomes, secrets) and do not overlap with references flow IA patterns.
- Commit: `f8422e3` `test: update UI verification for references flow` — 2 files, 60 insertions.

## T10: Browser Smoke and Component QA Update (2026-05-04)

### What was changed
- Expanded the active forbidden-rendered-strings smoke test from 3 routes to all 6 target routes: `/`, `/consultation`, `/references`, `/explore`, `/settings`, `/source/example`.
- Switched the forbidden test to use the module-level `forbiddenRenderedStrings` array (Korean labels + raw IDs + score labels) plus English internal-name checks, replacing the narrow inline list.
- Removed the dead `test.describe.skip("references-first redesign contract")` block (68 lines) that had been written as T1 placeholder tests before implementation. Those tests had incorrect assertions (e.g., expecting `lastQuery` visible when `ReferenceCard` intentionally hides it) and were fully superseded by the active tests.

### What was already covered (no changes needed)
- `/references` empty/populated state with `/api/recommendations` interception and sessionStorage seeding.
- `/explore` redirect to `/references`.
- Clearing chat history clears session references.
- Consultation desktop/mobile smoke, safety notice, source rail, collapsible preferences.
- Navigation active state and link structure.
- `lib/session-references.test.ts` covers malformed JSON, unsupported version, invalid items, no-window fallback, QuotaExceededError, dedupe, backfill, raw-internal stripping (28 tests).
- Component tests for preferences, citations, chat, and listings cover raw-ID hiding and user-facing Korean labels.

### Key observations
- `"홈"` in `forbiddenRenderedStrings` is safe for `getByText({ exact: false })` because the only "홈" on the page is inside an `aria-label` attribute, not visible text content.
- `/settings` route calls `/api/preferences` on mount, which is already stubbed in the `beforeEach` block, so the forbidden sweep visits it without special setup.
- `/explore` redirects via `next.config.ts` before any rendering, so the forbidden sweep effectively checks the `/references` empty state twice (once direct, once via redirect) -- acceptable redundancy.
