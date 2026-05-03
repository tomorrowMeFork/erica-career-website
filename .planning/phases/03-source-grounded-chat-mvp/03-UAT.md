---
status: complete
phase: 03-source-grounded-chat-mvp
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
  - 03-05-SUMMARY.md
  - 03-06-SUMMARY.md
  - 03-VERIFICATION.md
started: 2026-05-03T12:36:20Z
updated: 2026-05-03T13:03:58Z
---

## Current Test

[testing complete]

## Tests

### 1. Deterministic RAG Evaluation Gate
expected: Running `npm run evaluate:rag:mvp` should complete without OpenAI-compatible credentials and print `rag mvp evaluation passed`. This confirms the local Korean RAG gate exercises retrieval, citations, refusals, hostile-source isolation, and audit behavior without using live secrets.
result: pass

### 2. Safe Missing-Env Smoke Failure
expected: Running `env -u OPENAI_COMPAT_BASE_URL -u OPENAI_COMPAT_API_KEY -u OPENAI_COMPAT_MODEL npm run chat:smoke` should fail safely before any provider call, naming the missing env variable and not printing secret values, prompts, or retrieved source text.
result: pass

### 3. Live Korean Chat Smoke With Citations
expected: With `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, and `OPENAI_COMPAT_MODEL` configured locally, running `npm run chat:smoke -- "ERICA 현장실습 모집 공고 알려줘"` should return a Korean answer with inline numeric citations, structured citation/freshness metadata, `refusal_tier`, `confidence`, and `trace_id`, without exposing provider secrets, prompt text, or raw retrieved chunk text.
result: issue
reported: "User first ran `npm run chat:smoke -- \"ERICA 현장실습 모집 공고 알려줘\"` and got `chat_smoke_failed: OPENAI_COMPAT_BASE_URL is required for OpenAI-compatible chat provider configuration` despite `.env` containing the variables. After sourcing `.env`, the command ran but returned `refusal_tier: hard_refuse`, `citations: []`, and the generic insufficient-evidence answer instead of a Korean cited response."
severity: major

### 4. Insufficient-Evidence Refusal Behavior
expected: The Phase 3 chat path should not fabricate guidance for an unsupported question like `ERICA 기숙사 식단 알려줘`; the deterministic gate should cover this case as a hard refusal with zero citations, and any live/manual check should show transparent Korean uncertainty instead of unrelated career guidance.
result: pass

### 5. Provider Setup Documentation
expected: Opening `.env.example` should show the optional OpenAI-compatible provider variables `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, and `OPENAI_COMPAT_MODEL` with placeholder values only, plus guidance not to commit real API keys.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "With local OpenAI-compatible provider configuration present, `npm run chat:smoke -- \"ERICA 현장실습 모집 공고 알려줘\"` should return a Korean cited smoke response instead of missing-env failure."
  status: failed
  reason: "User reported: `.env` already has the variables. Without sourcing `.env`, the smoke CLI fails with `OPENAI_COMPAT_BASE_URL is required`; after sourcing `.env`, the answerable 현장실습 query returns `hard_refuse` with zero citations instead of a cited Korean answer."
  severity: major
  test: 3
  artifacts: []
  missing: []
