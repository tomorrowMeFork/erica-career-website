# Phase 1: Source Discovery and Governance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 1-Source Discovery and Governance
**Areas discussed:** Source approval criteria, CDP/book handling, approval scope, evidence basis, authenticated access, rate limit posture, source registry rigor, additional gray areas

---

## Source Approval Criteria

| Option | Description | Selected |
|--------|-------------|----------|
| 소스 승인 기준 | What counts as an approved source: robots.txt, ToS, login status, publicness | |
| CDP/Book 처리 | How to handle CDP and book.hanyang.ac.kr where robots.txt blocks crawling | |
| Registry 필드 | What fields and approval statuses the source registry requires | |
| Rate limit | Conservative/moderate/adaptive collection posture | |

**User's choice:** User responded that all sources must be collected, including via Playwright, because a school capstone-design exception approval process has already been completed.
**Notes:** The assistant rejected planning an unrestricted robots/auth bypass, then reframed the decision as capstone-exception-scoped seed-source collection.

---

## Approval Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Seed URLs only | Limit approval scope to `sources.txt` seed URLs | ✓ |
| Hanyang career | Hanyang/ERICA career-related public pages broadly | |
| All Hanyang | All Hanyang domains | |

**User's choice:** Seed URLs only
**Notes:** This is the controlling scope for Phase 1 planning.

---

## Approval Evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Registry evidence | Record evidence location, owner, date; no sensitive contents | |
| Private note | Keep evidence privately and mark checked in docs | |
| User assertion | Use the user's statement as the basis | ✓ |

**User's choice:** User assertion
**Notes:** CONTEXT records this as user-stated capstone exception approval, not independently verified official authorization.

---

## Authenticated Access

| Option | Description | Selected |
|--------|-------------|----------|
| No login first | Only unauthenticated seed URLs first | |
| Env credentials | Use `.env` credentials within approved capstone scope | ✓ |
| Manual export | Human-exported files only for login-required material | |

**User's choice:** Env credentials
**Notes:** Credentials must never be committed, logged, or written into planning docs.

---

## Rate Limit

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative | 1 request per 5-10 seconds, concurrency 1 | |
| Moderate | 1 request per 1-2 seconds, low concurrency | ✓ |
| Adaptive | Start conservative, relax only after stable checks | |

**User's choice:** Moderate
**Notes:** CONTEXT adds backoff/stop behavior to avoid uncontrolled load.

---

## Registry Rigor

| Option | Description | Selected |
|--------|-------------|----------|
| Full audit | URL, source type, approval scope, auth mode, robots status, ToS note, rate limit, owner, refresh cadence, last checked | ✓ |
| MVP fields | URL, category, access method, approved status, auth required, rate limit, refresh cadence | |
| Minimal | URL and description only | |

**User's choice:** Full audit
**Notes:** CONTEXT makes the registry the main Phase 1 contract.

---

## Additional Gray Areas

| Option | Description | Selected |
|--------|-------------|----------|
| URL 열거 범위 | How deep to enumerate subpages under seed URLs | |
| 완료 기준 | Exact Phase 1 pass/fail output criteria | |
| 실패 처리 | How to record access/login/PDF failures | |
| You decide | Let the agent choose conservative defaults | ✓ |

**User's choice:** You decide
**Notes:** CONTEXT records agent discretion for URL enumeration depth, failure-state names, and checklist wording.

---

## the agent's Discretion

- Choose exact registry file format during planning.
- Choose URL enumeration depth conservatively: discover/record candidate subpages in Phase 1; ingestion begins in Phase 2.
- Define failure states for blocked, auth-required, access-denied, parse-unsupported, and pending approval/evidence.

## Deferred Ideas

- Broader Hanyang-domain expansion beyond seed URLs.
- Official Hanyang SSO or production crawling permission.
- Resume, cover-letter, interview, and application-tracking tools.
