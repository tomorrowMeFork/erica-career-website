---
phase: 03-source-grounded-chat-mvp
verified: 2026-05-03T13:35:43Z
status: pass
score: 10/10 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/10
  gaps_closed:
    - "No-answer or insufficient-evidence Korean questions produce transparent uncertainty instead of fabricated guidance."
    - "Deterministic Phase 3 eval no longer masks the no-answer case with forced hard-refusal thresholds."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run live smoke chat with a configured OpenAI-compatible provider."
    expected: "A Korean query returns a Korean answer with inline citations, structured citations/freshness metadata, trace_id, and no prompt/source text or secret leakage."
    result: pass
    evidence: "User ran `npm run chat:smoke -- \"ERICA 현장실습 모집 공고 알려줘\"` with local provider configuration; output was Korean, `refusal_tier: normal_answer`, included inline citations, structured citation/freshness metadata, confidence, and trace_id, with no provider secrets, prompt text, or raw retrieved chunks printed."
---

# Phase 3: Source-Grounded Chat MVP Verification Report

**Phase Goal:** Ship the first usable Korean chat flow that answers from indexed sources with citations and transparent uncertainty.  
**Verified:** 2026-05-03T13:35:43Z  
**Status:** pass  
**Re-verification:** Yes — after gap closure for the RAG-04 no-answer verifier block and the 03-07 live smoke gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A Korean chat request can run through request validation, retrieval, provider/prompt, output validation, citations, and trace ID generation. | ✓ VERIFIED | `src/chat/chat-service.ts` parses `ChatRequestSchema`, retrieves chunks, evaluates evidence, builds the prompt, validates provider output, returns `trace_id`, and writes audit metadata. `npm test -- src/chat/chat-service.test.ts` passed. |
| 2 | BM25-style retrieval runs over Phase 2 KB chunks with Korean normalization, n-grams, explicit synonyms, top-five default, boilerplate filtering, and freshness/deadline ranking. | ✓ VERIFIED | `src/knowledge-base/jsonl-loader.ts` loads Phase 2 KB chunks; `src/retrieval/bm25-retriever.ts` implements `topK ?? 5`, synonym-expanded Korean terms, boilerplate exclusion, freshness/deadline ranking. `src/retrieval/retrieval-fixtures.test.ts` passed. |
| 3 | Answers carry inline numeric citations plus structured source title, URL, fetched date, posted/deadline/page context where available. | ✓ VERIFIED | `src/chat/chat-contract.ts`, `src/chat/prompt.ts`, and `src/chat/output-validation.ts` preserve citation title/url/fetched_at/posted_at/deadline_status/page_number and reject unmapped markers. Deterministic eval checks citations and Korean output. |
| 4 | Soft-hedge behavior exists for weak evidence. | ✓ VERIFIED | `src/chat/evidence-policy.ts` keeps `soft_hedge` for confidence through 0.50 with Korean prefix `현재 수집된 자료 기준으로는`; `chat-service.test.ts` verifies a soft hedge response and audit tier. |
| 5 | No-answer or insufficient-evidence questions refuse/label uncertainty instead of fabricating guidance. | ✓ VERIFIED | Production-default spot-check with `ChatService + Bm25Retriever(loadKnowledgeBaseChunks())` for `ERICA 기숙사 식단 알려줘` returned `hard_refuse`, 0 citations, Korean uncertainty answer, `providerCalled: false`, and audit `evidence_policy: hard_refuse`. Evidence policy refused because top retrieved matches were generic `erica` only (`generic_overlap_only`). |
| 6 | Retrieved source text is treated as untrusted and isolated from system/developer instructions. | ✓ VERIFIED | `src/chat/prompt.ts` uses `<retrieved_context source_text_trust="untrusted_source_text">`, keeps raw source text out of system message, escapes markup, and developer instructions reject source-text attempts to override citations/safety/privacy. Hostile eval case passes. |
| 7 | Provider boundary is OpenAI-compatible, env-configured, mockable, and secret-safe. | ✓ VERIFIED | `src/chat/openai-compatible-provider.ts` reads only `OPENAI_COMPAT_*` env names through the factory, requires HTTPS, omits credentials, redacts API keys in errors, and exposes safe config without secrets. Tests use injected provider/fetch mocks. |
| 8 | Every chat cycle writes append-only audit JSONL metadata with source IDs/scores, prompt version, safe model config, timestamps, citation IDs, and guardrails. | ✓ VERIFIED | `src/audit/audit-log.ts` schema and `ChatService.writeAudit()` include retrieved chunks, prompt version, model config, response timestamp, citation IDs, and guardrails; success avoids prompt snapshots while refusal/guardrail/failure paths store limited snapshots. Full tests passed. |
| 9 | Deterministic Phase 3 eval gate exercises retrieval, citations, refusals, hostile-source isolation, audit path, and optional D-27 judge dimensions without default credentials. | ✓ VERIFIED | `scripts/evaluate-rag-mvp.ts` has no `forceHardRefusal` path. The no-answer eval case uses default evidence policy (`evidencePolicyForCase` only special-cases `forceSoftHedge`). Direct eval inspection returned `ok: true`, `judgeEnabled: false`, no-answer `tier: hard_refuse`, `citations: 0`, `failures: []`. |
| 10 | Local smoke CLI exists, loads configured provider env for live smoke, and fails safely when provider env is missing. | ✓ VERIFIED | `scripts/chat-smoke.ts` wires loader → BM25 → OpenAI-compatible provider → ChatService and prints only answer/citations/refusal_tier/confidence/trace_id. Missing-env smoke failed safely naming only `OPENAI_COMPAT_BASE_URL`; after 03-07, user-confirmed live smoke returned `normal_answer` with Korean answer, structured citations/freshness metadata, confidence, and trace_id without secret/prompt/raw-source leakage. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/chat/chat-contract.ts` | Validated request/response/citation/refusal schemas | ✓ VERIFIED | Response contract includes `answer`, structured `citations`, `refusal_tier`, `confidence`, `trace_id`, with no full chunk text field. |
| `src/knowledge-base/jsonl-loader.ts` | Fail-closed Phase 2 KB chunk loader | ✓ VERIFIED | Loads default KB directories and validates `KnowledgeChunkSchema` plus `untrusted_source_text`. |
| `src/retrieval/bm25-retriever.ts` | BM25-style Korean retriever | ✓ VERIFIED | Substantive and wired. Generic-only matches can still be retrieved, but downstream evidence policy now refuses them instead of allowing answer generation. |
| `src/chat/evidence-policy.ts` | Three-tier evidence policy and no-answer guard | ✓ VERIFIED | Adds `generic_overlap_only` and `weak_absolute_score` fail-closed reasons while preserving soft/normal thresholds for meaningful evidence. |
| `src/chat/output-validation.ts` | Runtime output/citation/safety validation | ✓ VERIFIED | Validates schema, Korean-first content, citation markers, allowed citations, and unsafe phrases. |
| `src/chat/prompt.ts` | Untrusted retrieved-context prompt builder | ✓ VERIFIED | Provides source-isolated citation map and Korean source-grounded instructions. |
| `src/chat/openai-compatible-provider.ts` | OpenAI-compatible provider boundary | ✓ VERIFIED | Env factory, HTTPS validation, `/chat/completions`, injected fetch, and secret-safe errors/config. |
| `src/chat/chat-service.ts` | Chat orchestration and audit writing | ✓ VERIFIED | Production default evidence policy is used unless explicitly injected; hard refusal bypasses provider and audits refusal metadata. |
| `src/audit/audit-log.ts` | Append-only metadata audit JSONL | ✓ VERIFIED | Schema-validated append-only audit with metadata-only normal path and limited snapshots for refusal/failure. |
| `scripts/evaluate-rag-mvp.ts` | Deterministic RAG MVP eval gate | ✓ VERIFIED | No-answer case exercises default policy; optional judge is env-gated and skipped without credentials. |
| `scripts/chat-smoke.ts` | Local Korean smoke CLI | ✓ VERIFIED | Constructs real service path, loads `.env` via first-line `dotenv/config`, forwards the smoke timeout, and preserves safe output shape. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `jsonl-loader.ts` | `normalized-record.ts` | `KnowledgeChunkSchema` parse | ✓ WIRED | Loader validates every chunk and citation/source-trust invariants. |
| `bm25-retriever.ts` | Phase 2 KB chunks | `KnowledgeChunk[]` constructor input | ✓ WIRED | Eval, tests, and smoke instantiate `new Bm25Retriever(loadKnowledgeBaseChunks())`. |
| `chat-service.ts` | `evidence-policy.ts` | `evaluateEvidence(results, { config })` | ✓ WIRED | The production default path uses `DEFAULT_EVIDENCE_POLICY`; no-answer generic-only retrieval becomes hard refusal. |
| `chat-service.ts` | provider boundary | hard refusal bypasses `provider.complete`; normal/soft paths call provider after prompt build | ✓ WIRED | Production no-answer spot-check confirmed `providerCalled: false`. |
| `chat-service.ts` | `audit-log.ts` | `appendChatAuditRecord` / injected audit logger | ✓ WIRED | Spot-check audit recorded hard refusal with 5 retrieved chunks and `prompt_snapshot_reason: refusal`. |
| `prompt.ts` | `retriever.ts` | `RetrievedChunk` citation map | ✓ WIRED | Prompt builds citations from chunk anchors and validation enforces allowed IDs. |
| `evaluate-rag-mvp.ts` | `ChatService` | real retriever + deterministic provider | ✓ WIRED | Uses real ChatService and Bm25Retriever path; no-answer case is not force-refused. |
| `chat-smoke.ts` | loader/retriever/provider/service | CLI path | ✓ WIRED | Smoke command constructs real loader/retriever/provider/service chain. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `ChatService.ask()` | `results` | `retriever.retrieve({ query, topK })` from `Bm25Retriever(loadKnowledgeBaseChunks())` | Yes | ✓ FLOWING |
| `ChatService.ask()` | `evidence` | `evaluateEvidence(results)` | Yes | ✓ FLOWING — no-answer query classified `hard_refuse` via `generic_overlap_only`. |
| `ChatService.ask()` | `builtPrompt.citationMap` | Retrieved chunk citation anchors | Yes | ✓ FLOWING for non-refusal answers; skipped for hard refusal. |
| `ChatService.ask()` | audit record fields | Retrieved results, safe provider config, prompt version, guardrails | Yes | ✓ FLOWING |
| `scripts/evaluate-rag-mvp.ts` | no-answer refusal result | Default `ChatService` evidence policy | Yes | ✓ FLOWING — no forced hard-refusal threshold remains. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Production-default no-answer path | `npx tsx -e '(async () => { ... ChatService + Bm25Retriever(loadKnowledgeBaseChunks()) ... })();'` | `hard_refuse`, 0 citations, Korean uncertainty answer, `providerCalled: false`, audit `evidence_policy: hard_refuse`; top matches only `matched_terms: ["erica"]` | ✓ PASS |
| Eval no-answer default behavior | `npx tsx -e '(async () => { const { runRagMvpEvaluation } = await import("./scripts/evaluate-rag-mvp.ts"); ... })();'` | `ok: true`, `judgeEnabled: false`, no-answer `tier: hard_refuse`, `citations: 0`, `failures: []` | ✓ PASS |
| Targeted regression tests | `npm test -- src/retrieval/retrieval-fixtures.test.ts src/chat/chat-service.test.ts scripts/evaluate-rag-mvp.test.ts` | 3 files / 22 tests passed | ✓ PASS |
| Deterministic RAG gate | `npm run evaluate:rag:mvp` | `rag mvp evaluation passed` | ✓ PASS |
| Typecheck | `npm run typecheck` | exited 0 | ✓ PASS |
| Full test suite | `npm test` | 17 files / 133 tests passed | ✓ PASS |
| Smoke CLI missing env | `npm run chat:smoke` | failed safely: `OPENAI_COMPAT_BASE_URL is required...`; no values printed | ✓ PASS |
| Live provider smoke | `npm run chat:smoke -- "ERICA 현장실습 모집 공고 알려줘"` | User-confirmed Korean `normal_answer` with inline citations, structured citation/freshness metadata, `confidence`, and `trace_id`; no secrets, prompt text, or raw retrieved chunks printed | ✓ PASS |
| LSP diagnostics | `lsp_diagnostics /Users/wantap/workspace/Capstone/New/src` | 0 errors; 2 unrelated deprecation hints in Phase 1 source-governance schema | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| RAG-01 | 03-01, 03-04, 03-05, 03-06 | User can ask a Korean natural-language career or recruitment question in chat. | ✓ SATISFIED | ChatService and smoke CLI accept Korean queries; tests cover Korean listing/service/no-answer questions. |
| RAG-02 | 03-01, 03-02, 03-06 | System retrieves relevant indexed source chunks using keyword and semantic matching. | ✓ SATISFIED WITH NOTE | Roadmap allowed lexical/semantic if stack supports it; Phase 3 implements the planned BM25 baseline with Korean normalization, n-grams, synonyms, boilerplate filtering, and top-five checks. |
| RAG-03 | 03-01, 03-03, 03-04, 03-05, 03-06 | System answers with citations including title, URL, date/page context. | ✓ SATISFIED | Contract, prompt citation map, output validation, eval checks, and tests enforce inline and structured citation/freshness metadata. |
| RAG-04 | 03-02, 03-03, 03-05, 03-06 | System refuses or labels uncertainty when retrieved evidence is insufficient. | ✓ SATISFIED | Fixed production-default no-answer path hard-refuses `ERICA 기숙사 식단 알려줘` without forced thresholds and does not call the provider. |
| RAG-05 | 03-05, 03-06 | System logs source IDs, prompt version, model config, response timestamp. | ✓ SATISFIED | Audit schema and ChatService write retrieved source/chunk scores, prompt version, model config, timestamps, citations, and guardrails. |
| RAG-06 | 03-02, 03-03, 03-04, 03-05, 03-06 | Treat source text as untrusted and prevent override of system/safety/citation/privacy instructions. | ✓ SATISFIED | Loader requires untrusted source marker; prompt isolates source text; output validation rejects hostile phrases; hostile eval case passes. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `src/retrieval/normalize-korean.ts` | 19 | `return []` | ℹ️ Info | Valid empty-token path; not a user-facing stub. |
| `src/retrieval/bm25-retriever.ts` | 39, 44 | `return []` | ℹ️ Info | Valid no-results paths for topK 0 / empty query / empty index. |
| `scripts/evaluate-rag-mvp.ts`, `scripts/chat-smoke.ts` | various | `console.log` | ℹ️ Info | Intentional CLI reporting; outputs status or safe response fields only. |

No blocker anti-patterns were found in Phase 3 chat/retrieval/eval files.

### Human Verification Completed

#### 1. Live provider smoke

**Test:** Configure `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, and `OPENAI_COMPAT_MODEL`, then run `npm run chat:smoke -- "ERICA 현장실습 모집 공고 알려줘"`.  
**Expected:** Korean answer with inline citations, structured citation/freshness metadata, trace_id, and no prompt/source text or secret values printed.  
**Result:** PASS. User ran the live smoke command with local provider configuration after 03-07; output returned a cited Korean `normal_answer` and safe response fields only.

### Gaps Summary

No blocking gaps remain. The previous RAG-04 blocker is closed: production-default `ChatService + Bm25Retriever(loadKnowledgeBaseChunks())` now hard-refuses the out-of-domain dorm-menu query via evidence policy (`generic_overlap_only`) without forced thresholds, and deterministic eval exercises that default path. The previous live-provider smoke gap is also closed by 03-07 and user-confirmed UAT Test 6.

**Verdict:** PASS / no blocker.

---

_Verified: 2026-05-03T13:35:43Z_  
_Verifier: the agent (gsd-verifier)_
