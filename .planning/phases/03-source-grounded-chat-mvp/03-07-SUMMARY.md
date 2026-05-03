---
phase: 03-source-grounded-chat-mvp
plan: 07
subsystem: smoke-cli-gap-closure
tags: [rag, smoke-cli, dotenv, timeout, secret-redaction, uat-gap]

requires:
  - phase: 03-source-grounded-chat-mvp
    provides: 03-06 local Korean chat smoke CLI
provides:
  - Dotenv-loaded local chat smoke CLI provider configuration
  - Configurable 90,000ms default OpenAI-compatible provider timeout for smoke runs
  - Deterministic regression coverage for dotenv ordering, timeout parsing/forwarding, and redaction
affects: [03-source-grounded-chat-mvp, local-smoke-testing, uat-test-3]

tech-stack:
  added: []
  patterns: [side-effect-free smoke config helper, source-inspected dotenv entrypoint test, injected provider factory test]

key-files:
  created:
    - scripts/chat-smoke-config.ts
    - scripts/chat-smoke.test.ts
  modified:
    - scripts/chat-smoke.ts
    - .env.example

key-decisions:
  - "Keep `import \"dotenv/config\"` only in `scripts/chat-smoke.ts` as the first import so reusable helpers and tests never load local `.env`."
  - "Use `OPENAI_COMPAT_TIMEOUT_MS` only for smoke CLI provider construction, defaulting to 90,000ms and rejecting malformed values without echoing the supplied value."

requirements-completed: [RAG-01, RAG-03, RAG-04, RAG-05]

duration: 5min
completed: 2026-05-03
---

# Phase 03 Plan 07: Smoke CLI Gap Closure Summary

**Closed `.planning/phases/03-source-grounded-chat-mvp/03-UAT.md` Test 3 by making `npm run chat:smoke` load local `.env` automatically and pass a configurable 90,000ms timeout to the OpenAI-compatible provider.**

## Accomplishments

- Added `scripts/chat-smoke-config.ts` as a side-effect-free helper module exporting `parseSmokeTimeoutMs`, `getSmokeProviderOptions`, `createSmokeProvider`, and `redactSecretLikeText`.
- Updated `scripts/chat-smoke.ts` so `import "dotenv/config";` is the first import, then the CLI constructs its provider through `createSmokeProvider(process.env)` and uses shared redaction.
- Added deterministic `scripts/chat-smoke.test.ts` coverage for dotenv import ordering by source inspection, default and override timeout parsing, invalid timeout rejection without value echoing, injected provider timeout forwarding, and secret redaction.
- Documented placeholder-only `OPENAI_COMPAT_TIMEOUT_MS=90000` in `.env.example` without adding any real credentials.

## Verification

| Command | Result |
|---|---|
| `npm test -- scripts/chat-smoke.test.ts` | Pass, 7 tests |
| `npm run typecheck` | Pass |
| `npm test` | Pass, 18 files and 140 tests |
| `npm run evaluate:rag:mvp` | Pass, prints `rag mvp evaluation passed` |

## UAT Closure

- Closes `.planning/phases/03-source-grounded-chat-mvp/03-UAT.md` Test 3's missing local `.env` autoload gap.
- Mitigates the diagnosed premature 30s provider timeout by forwarding `{ timeout_ms: 90_000 }` by default, with strict positive-integer override via `OPENAI_COMPAT_TIMEOUT_MS`.
- Does not run live provider calls during automated tests and does not read, print, snapshot, or commit real `.env` values.

## Threat Flags

None. Error output remains redacted for bearer tokens, `OPENAI_COMPAT_API_KEY=...`, and long secret-like strings while preserving safe missing-variable names for diagnosis.

## Self-Check: PASSED

- Found `scripts/chat-smoke-config.ts`.
- Found `scripts/chat-smoke.test.ts`.
- Found first-line `import "dotenv/config";` in `scripts/chat-smoke.ts`.
- Found placeholder-only `OPENAI_COMPAT_TIMEOUT_MS=90000` in `.env.example`.

---
*Phase: 03-source-grounded-chat-mvp*
*Completed: 2026-05-03*
