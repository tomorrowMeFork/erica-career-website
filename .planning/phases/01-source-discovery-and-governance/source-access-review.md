# Source Access Review Checklist

**Purpose:** Human-readable access review checklist and evidence log for seed sources. No scheduled crawling may be enabled until each source row below is reviewed and `review_status` is updated from `pending` to `reviewed`.

**Date created:** 2026-05-03

---

## Scope

This checklist covers the registered seed source intents in `source-registry.yaml`, derived from `sources.txt` and `.planning/research/seed-sources.md`. Per D-01 and D-02, the approved scope is limited to these seed URLs only. No other Hanyang domains, ERICA pages, or external sites are included.

The capstone approval recorded here uses `approval_basis: user_assertion`. This is **not official Hanyang authorization**. It reflects the user's statement that a capstone-design exception approval process has been completed for these seed URLs. No independently verified official authorization from Hanyang University, Hanyang ERICA, or any department has been obtained.

## Required Checks

Each seed source must pass these checks before `allowed_collection_method` can be changed from `none_until_review` and before `scheduled_crawling_enabled` can be set to `true`:

1. **robots.txt status**: Confirm or re-check the current robots.txt at each seed host. Record whether it allows, disallows, or requires manual review for the target paths.
2. **Terms of Service status**: Locate and review the site's ToS or usage policy. Record whether it allows automated access for the intended use case, restricts it, or could not be found.
3. **Approval basis**: Verify that the recorded `approval_basis` matches available evidence. `user_assertion` means the capstone user stated approval was granted; it does not constitute independent legal authorization.
4. **Rate limit and load**: Confirm the moderate posture of one request every 1-2 seconds with low concurrency and immediate backoff/stop on errors is appropriate for each source.
5. **Freshness assumption**: Confirm the assigned `refresh_cadence` matches expected content update frequency.
6. **Auth requirements**: Confirm whether login or authentication is required. If so, credentials must come from `.env` and **must never be committed** to version control, printed to logs, or included in planning documents.

## Seed Source Review Table

### cdp-root

| Field | Value |
|-------|-------|
| review_status | pending |
| allowed_collection_method | none_until_review |
| robots_status | disallow_all_raw_evidence |
| tos_status | not_reviewed |
| approval_basis | user_assertion |
| freshness_assumption | weekly_when_approved |
| next_action | Held/no live ingestion approval for now; original seed source remains blocked from parser collection until a separate explicit approval decision is recorded. |

### cdp-career-category-discovery

| Field | Value |
|-------|-------|
| review_status | pending |
| allowed_collection_method | none_until_review |
| robots_status | disallow_all_raw_evidence |
| tos_status | not_reviewed |
| approval_basis | user_assertion |
| freshness_assumption | daily_when_approved |
| next_action | Held/no live ingestion approval for now; do not infer or crawl category URLs until safe public structure or explicit approved access evidence is recorded. |

### cdp-recruit-category-discovery

| Field | Value |
|-------|-------|
| review_status | pending |
| allowed_collection_method | none_until_review |
| robots_status | disallow_all_raw_evidence |
| tos_status | not_reviewed |
| approval_basis | user_assertion |
| freshness_assumption | daily_when_approved |
| next_action | Held/no live ingestion approval for now; do not infer or crawl category URLs until safe public structure or explicit approved access evidence is recorded. |

#### cdp-authenticated manual-session scope

The user requested E-WIL-style CDP collection from these exact board/list pages while manually logged in:

- `https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx` — 일반채용공고
- `https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx` — 채용상담 및 설명회

These pages may require an authenticated CDP session for complete detail access. Any collection must therefore use a user-operated, headed browser login in a fresh ephemeral Playwright context. The script may navigate only to the exact URLs above after manual login, may collect only same-host detail pages discovered from those approved lists, must not automate login, must not persist cookies/localStorage/storageState/HAR/traces/screenshots/credentials, must block off-host requests, and must keep `scheduled_crawling_enabled: false`.

### book-success-story-viewer

| Field | Value |
|-------|-------|
| review_status | pending |
| allowed_collection_method | none_until_review |
| robots_status | disallow_all_raw_evidence |
| tos_status | not_reviewed |
| approval_basis | user_assertion |
| freshness_assumption | monthly_or_on_manual_change_when_approved |
| next_action | Held/no live ingestion approval for now; viewer remains structure-observation-only until a separate explicit approval decision is recorded. |

### cdp-student-guide-pdf

| Field | Value |
|-------|-------|
| review_status | reviewed |
| allowed_collection_method | approved_manual_download |
| robots_status | disallow_all_raw_evidence |
| tos_status | not_reviewed |
| approval_basis | user_assertion |
| freshness_assumption | monthly_or_on_manual_change_when_approved |
| next_action | Approved by user for original `sources.txt` seed URL only: manual PDF download/sample ingestion with page-level citation preservation; no CDP category URL inference or scheduled crawling. |

### ibus-employment-board

| Field | Value |
|-------|-------|
| review_status | reviewed |
| allowed_collection_method | approved_bounded_browser_discovery |
| robots_status | allow_empty_disallow |
| tos_status | not_reviewed |
| approval_basis | user_assertion |
| freshness_assumption | daily_when_approved |
| next_action | Approved by user for original `sources.txt` seed URL only: bounded public HTML sample ingestion; no broader crawling, inferred URLs, bulk pagination, or scheduled crawling. |

### ewil-internship-system

| Field | Value |
|-------|-------|
| review_status | reviewed |
| allowed_collection_method | approved_bounded_browser_discovery |
| robots_status | unreachable |
| tos_status | not_reviewed |
| approval_basis | user_assertion |
| freshness_assumption | weekly_when_approved |
| next_action | Added by user on 2026-05-17 for the public `index.do` landing page and later expanded by the user to exact E-WIL authenticated pages listed below. Public text can ground answers about the E-WIL 현장실습 지원 시스템 and public notices. Authenticated collection is limited to user-manual-login, non-persistent, exact-URL collection; no credentials, cookies, storage state, broad crawling, or scheduled crawling may be stored or automated. |

#### ewil-internship-system authenticated manual-session scope

The user requested collection from these exact pages while already logged in:

- `https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE` — 공지사항/인턴공고
- `https://e-wil.hanyang.ac.kr/data/list.do?type=INFO` — 설명회
- `https://e-wil.hanyang.ac.kr/internphoto/compList.do` — 실습 후기

These URLs return a non-public login/error boundary without an authenticated session. Any collection must therefore use a user-operated, headed browser login in a fresh ephemeral Playwright context. The script may navigate only to the exact URLs above after manual login, must not automate login, must not persist cookies/localStorage/storageState/HAR/traces/screenshots/credentials, and must keep `scheduled_crawling_enabled: false`.

## Load Posture

All seed sources use `rate_limit_posture: moderate_1_2s_low_concurrency`. This means:

- One request every 1-2 seconds per source.
- Low concurrency: do not send parallel requests to the same host.
- Immediate backoff and stop on errors, throttling responses, unusual latency, or access-denied signals.
- A kill-switch or manual stop path must be available during any collection activity.

This posture applies regardless of robots or ToS outcomes and must be preserved even after access review is completed.

## Auth and Secrets

- CDP and E-WIL manual-session sources require a user-operated headed login but must not use script-managed credentials.
- If login is later observed for any other approved seed URL, credentials must be loaded from `.env` or equivalent local secret storage unless the approval record explicitly requires user-manual non-persistent login instead.
- `.env` files **must never be committed** to version control. The repository `.gitignore` already excludes `.env` and `.env.*`.
- No secret values (passwords, tokens, session cookies) may be stored in the registry, planning docs, test fixtures, or logs.
- Any authenticated access must remain limited to the approved seed URLs and must be represented as either `auth_mode: env_credentials` or `auth_mode: user_manual_login_nonpersistent` with no secret values stored.

## Scheduled Crawling Gate

`scheduled_crawling_enabled: false` is mandatory for every seed source record. This field must remain `false` until:

1. The source's review row above is completed (`review_status` changed from `pending` to `reviewed`).
2. `allowed_collection_method` is updated to a method other than `none_until_review`.
3. `robots_status` and `tos_status` have been confirmed or updated with current evidence.

Phase 2 ingestion code must refuse to create scheduled crawl jobs for any source where `scheduled_crawling_enabled` is `false`. The verify-source-governance-artifacts script enforces this invariant at build time.
