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
  - 03-07-SUMMARY.md
  - 03-VERIFICATION.md
started: 2026-05-03T12:36:20Z
updated: 2026-05-03T13:35:43Z
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
result: pass
previous_result: issue
reported: "User first ran `npm run chat:smoke -- \"ERICA 현장실습 모집 공고 알려줘\"` and got `chat_smoke_failed: OPENAI_COMPAT_BASE_URL is required for OpenAI-compatible chat provider configuration` despite `.env` containing the variables. After sourcing `.env`, the command ran but returned `refusal_tier: hard_refuse`, `citations: []`, and the generic insufficient-evidence answer instead of a Korean cited response."
resolution: "Fixed by 03-07 dotenv autoload and configurable 90s smoke timeout; Test 6 live smoke retest passed with a Korean cited normal answer and safe output fields."

### 4. Insufficient-Evidence Refusal Behavior
expected: The Phase 3 chat path should not fabricate guidance for an unsupported question like `ERICA 기숙사 식단 알려줘`; the deterministic gate should cover this case as a hard refusal with zero citations, and any live/manual check should show transparent Korean uncertainty instead of unrelated career guidance.
result: pass

### 5. Provider Setup Documentation
expected: Opening `.env.example` should show the optional OpenAI-compatible provider variables `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, and `OPENAI_COMPAT_MODEL` with placeholder values only, plus guidance not to commit real API keys.
result: pass

### 6. Live Smoke Gap Retest
expected: After the 03-07 gap closure, running `npm run chat:smoke -- "ERICA 현장실습 모집 공고 알려줘"` with local `.env` provider values configured should load `.env` automatically, avoid the old `OPENAI_COMPAT_BASE_URL is required` error, use the smoke CLI's longer configurable timeout, and return only safe JSON fields (`answer`, `citations`, `refusal_tier`, `confidence`, `trace_id`) without exposing provider secrets, prompt text, or raw retrieved source text.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "With local OpenAI-compatible provider configuration present, `npm run chat:smoke -- \"ERICA 현장실습 모집 공고 알려줘\"` should return a Korean cited smoke response instead of missing-env failure."
  status: resolved
  reason: "User reported: `.env` already has the variables. Without sourcing `.env`, the smoke CLI fails with `OPENAI_COMPAT_BASE_URL is required`; after sourcing `.env`, the answerable 현장실습 query returns `hard_refuse` with zero citations instead of a cited Korean answer."
  severity: major
  test: 3
  root_cause: "Two issues surfaced in the live smoke path. First, `scripts/chat-smoke.ts` constructs the provider from `process.env` without importing `dotenv/config`, so local `.env` values are not loaded unless the user manually sources the file. Second, after the user sourced `.env`, retrieval/evidence for the answerable 현장실습 query was normal (`evidence_policy: normal_answer`), but `data/audit/phase3-chat.jsonl` recorded `provider_error: The operation was aborted due to timeout`; ChatService then correctly failed closed to `hard_refuse` with zero citations."
  artifacts:
    - path: "scripts/chat-smoke.ts"
      issue: "Smoke CLI does not load `.env` automatically before calling `createOpenAiCompatibleChatProviderFromEnv()`."
    - path: "src/chat/openai-compatible-provider.ts"
      issue: "Provider has a fixed 30s default timeout and no smoke-script override for slower live models."
    - path: "src/chat/chat-service.ts"
      issue: "Provider timeout or validation failure is intentionally converted to a safe hard refusal with confidence 0, masking live smoke readiness as an answer refusal."
    - path: "data/audit/phase3-chat.jsonl"
      issue: "Latest answerable 현장실습 smoke run recorded `evidence_policy: normal_answer` and `provider_error: The operation was aborted due to timeout`."
  missing:
    - "Load `.env` in the smoke CLI using the existing repo pattern `import \"dotenv/config\";` without printing values."
    - "Allow the smoke CLI/provider factory to use a configurable or longer timeout for live provider smoke testing."
    - "Add deterministic tests that prove `.env` loading is wired and provider timeouts are reported safely without secrets."
  debug_session: "ses_2120ecfffffe9NaVstXNrQDXX0, ses_2120ece8effevzTT0l6JedojI6"
  resolution: "03-07 added `import \"dotenv/config\"`, `createSmokeProvider(process.env)`, `OPENAI_COMPAT_TIMEOUT_MS=90000`, deterministic smoke config tests, and the user-confirmed live smoke retest passed."
