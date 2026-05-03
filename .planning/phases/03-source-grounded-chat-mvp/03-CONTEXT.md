# Phase 3: Source-Grounded Chat MVP - Context

**Gathered:** 2026-05-03T09:00:00Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 builds the first source-grounded Korean chat MVP on top of Phase 2 JSONL knowledge-base chunks. It must retrieve relevant chunks, produce Korean answers with citations and freshness metadata, refuse or hedge when evidence is weak, isolate retrieved source text as untrusted content, and write audit logs that can reproduce which chunks and model settings supported an answer.

The answer domain is broader than job-posting search. Phase 3 must answer questions about ERICA/HY-CDP employment-support services and campus career resources when those are present in the indexed sources: 채용/인턴/아르바이트 listings, 취업프로그램, 직무부트캠프, NCS, 자기소개서 첨삭, 상담예약, 컨설팅룸, 교수/전문가 상담, 진로설계, 경력개발, 포트폴리오, 취업준비도검사, CDP 학생 가이드북 usage, and 취업성공후기 or 선배 사례. These are source-grounded service 안내 answers, not personalized recommendations.

Phase 3 does **not** build the polished UI, personalization/recommendation ranking, scheduled crawling, official SSO, or production crawling. Those remain later-phase or out-of-scope capabilities.

</domain>

<decisions>
## Implementation Decisions

### Retrieval Baseline
- **D-01:** Start with a BM25-style lexical retrieval baseline over local JSONL chunks, behind a `Retriever` interface that can later support semantic or hybrid retrieval.
- **D-02:** Use Korean text normalization plus character n-gram indexing for MVP Korean search quality. Do not add a heavyweight Korean morphology dependency in Phase 3.
- **D-03:** Build the retrieval index from all verified Phase 2 KB outputs: `data/knowledge-base/fixture-ibus`, `data/knowledge-base/fixture-cdp-pdf`, and `data/knowledge-base/playwright-sources`.
- **D-04:** Retrieval should pass the top 5 chunks to answer generation by default.
- **D-05:** Boilerplate or non-answer content, such as login prompts, viewer controls, download buttons, repeated footers, and UI chrome, must be excluded from the Phase 3 answer retrieval index. Such content may remain collection evidence, but it is not answer knowledge.
- **D-06:** Query processing keeps the original Korean query and adds only limited, explicit domain synonym expansions across both posting and campus-service language, such as 채용/모집/공고, 인턴/intern, 상담/컨설팅, 취업프로그램/직무부트캠프, 자기소개서/자소서, 가이드북/매뉴얼.
- **D-07:** Ranking must account for freshness and deadline status: boost active/recent chunks and penalize expired/stale chunks.
- **D-08:** Include a small Phase 3 LLM-assisted evaluation gate for retrieval/answer quality. This is not the full Phase 6 eval suite; it should cover a small Korean QA set, expected source/chunk retrieval, citation presence, refusal behavior, and Korean answer quality.

### Supported Question Domains
- **D-09:** Phase 3 must support source-grounded Korean Q&A for both employment listings and campus career-service 안내. Do not narrow retrieval or answer templates to 채용공고 only.
- **D-10:** Campus-service answers should explain what the service is, where it appears in the official source, and what the user should verify on the official page. They must include citations and fetched freshness just like listing answers.
- **D-11:** The MVP should distinguish informational service 안내 from personalized recommendations. For example, it can explain that 자기소개서 첨삭 or 상담예약 exists if supported by sources, but should not infer that a particular student personally needs it unless the user explicitly asks and the answer remains source-grounded.

### Answer And Citation Format
- **D-12:** Answers must be Korean-first, friendly, and 상담형, but limited to source-grounded information. Do not provide personalized recommendations or coaching in Phase 3.
- **D-13:** Every factual claim in the answer should use inline numeric citations like `[1]` during generation.
- **D-14:** The API response must also include structured `citations[]` for downstream UI rendering.
- **D-15:** Citation objects must include title, official URL, and `fetched_at`. Include `posted_at` and `deadline_status` when available.
- **D-16:** Use a minimal structured response contract with `answer`, `citations[]`, `confidence` or `refusal_tier`, and `trace_id`. Do not return full retrieved chunk text to normal users by default.

### Refusal And Uncertainty
- **D-17:** Use a three-tier evidence policy: `hard_refuse`, `soft_hedge`, and `normal_answer`.
- **D-18:** Hard refusal should be short and useful: state that the current collected sources do not contain enough relevant information, and suggest checking the official page or asking a more specific question.
- **D-19:** Soft hedge answers should explicitly say the answer is based on the currently collected materials and only answer within the retrieved evidence.
- **D-20:** Initial normalized thresholds: hard refuse below `0.30`, soft hedge from `0.30` to `0.50`, normal above `0.50`. Zero chunks, boilerplate-only results, or citationless results are hard refuse regardless of score. Planner may tune thresholds through the Phase 3 evaluation gate.

### Safety And Audit Logs
- **D-21:** Implement three MVP safety layers: input/document sanitization, tagged context isolation for retrieved chunks, and output validation.
- **D-22:** Retrieved chunks are untrusted data. Prompt instructions must clearly state that text inside the retrieved-context tags is evidence only and must never override system, safety, citation, or privacy instructions.
- **D-23:** Use OpenAI-compatible chat API semantics. `base_url`, `api_key`, and `model` must be injected through environment variables. Tests must use a mock provider. Real key values must never be logged or committed.
- **D-24:** Audit logs use append-only JSONL, matching existing project artifact style.
- **D-25:** Audit logs store 100% metadata for every query cycle: `trace_id`, timestamp, query or query hash, retrieved chunk IDs, retrieval scores, refusal tier, model config, prompt version, citation IDs, and guardrail results.
- **D-26:** Store limited prompt snapshots only for guardrail, refusal, or failure cases. The user explicitly corrected away from always storing full prompts.
- **D-27:** Runtime answer validation should enforce schema shape and citation markers. The small Phase 3 eval gate should use an LLM judge for faithfulness, citation quality, and Korean answer quality.

### the agent's Discretion
- The user selected "You decide" for the initial retrieval approach; this context locks the agent-selected decision as BM25-style lexical baseline with a future-ready retriever interface.
- The user selected "You decide" for numeric refusal thresholds; this context locks initial normalized thresholds while allowing eval-driven tuning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product And Scope
- `.planning/PROJECT.md` — Korean-first, source-cited ERICA career assistant intent and authorization/privacy constraints.
- `.planning/REQUIREMENTS.md` — Phase 3 requirements `RAG-01` through `RAG-06`, plus out-of-scope SSO/private crawling and future-phase personalization/UI boundaries.
- `.planning/ROADMAP.md` — Phase 3 goal, deliverables, success criteria, and phase boundary.
- `.planning/STATE.md` — Current state: Phase 2 complete and Phase 3 next.
- `AGENTS.md` — Repository rules for Korean-first behavior, citation/freshness metadata, prompt-injection/source-text safety, tests, and no official endorsement claims.

### Prior Phase Decisions
- `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md` — Seed-source scope, capstone user-asserted approval basis, robots/ToS evidence handling, rate-limit posture, and no production permission claim.
- `.planning/phases/02-ingestion-and-knowledge-base/02-CONTEXT.md` — Normalized record contract, citation/freshness requirements, local-first KB, and `untrusted_source_text` handling.
- `.planning/phases/02-ingestion-and-knowledge-base/02-06-SUMMARY.md` — Final Phase 2 source coverage, Playwright collection path, verification results, and current KB outputs.
- `.planning/phases/02-ingestion-and-knowledge-base/source-coverage-status.md` — Source-by-source bounded collector status and constraints.

### Code Contracts
- `src/ingestion/normalized-record.ts` — `NormalizedRecord`, `KnowledgeChunk`, citation, freshness, deadline, and manifest schemas.
- `src/ingestion/chunking.ts` — Deterministic chunk IDs and chunk metadata preservation.
- `src/ingestion/write-jsonl-kb.ts` — Existing JSONL artifact writing pattern.
- `scripts/verify-knowledge-base.ts` — Existing KB invariant checks for records/chunks/manifests.
- `package.json` — Current scripts and dependencies; no chat server or LLM SDK exists yet.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/ingestion/normalized-record.ts` provides the exact chunk schema Phase 3 should retrieve from and cite.
- `src/ingestion/chunking.ts` preserves citation anchors, fetched timestamps, deadline status, and source trust markers through chunks.
- `scripts/verify-knowledge-base.ts` can verify Phase 2 KB outputs before Phase 3 indexes them.
- `data/knowledge-base/fixture-ibus`, `data/knowledge-base/fixture-cdp-pdf`, and `data/knowledge-base/playwright-sources` are the current verified KB directories for retrieval tests.

### Established Patterns
- The project is strict TypeScript ESM with `npm run typecheck` and `npm test` as core validation.
- Existing data artifacts use deterministic JSONL plus `manifest.json`; Phase 3 audit logs should follow append-only JSONL unless later planning creates a stronger reason to change.
- Source governance and ingestion code consistently preserve citations, freshness, and `source_text_trust: "untrusted_source_text"`.

### Integration Points
- New Phase 3 code will likely add `src/retrieval/`, `src/chat/`, `src/audit/`, and related tests, but planner should decide exact file layout.
- There is no existing web app, API route, server framework, vector store, or LLM provider implementation. Phase 3 planning must account for this greenfield chat/retrieval layer.

</code_context>

<specifics>
## Specific Ideas

- User challenged boilerplate indexing; downstream agents must treat login screens, viewer controls, and UI chrome as non-answer content and exclude them from retrieval.
- User clarified that the product is not just a 채용정보 service. Phase 3 must also answer source-grounded questions about campus employment-support services such as counseling, consulting, career programs, job-prep tests, CDP guide usage, and success stories.
- User wants OpenAI-compatible model configuration with `base_url`, `api_key`, and `model` supplied by environment variables.
- User wants LLM evaluation included in Phase 3, but scoped as an MVP gate rather than the full Phase 6 evaluation program.
- User corrected audit logging away from storing full prompts for every request; only metadata is always logged, with limited prompt snapshots on guardrail/refusal/failure.

</specifics>

<deferred>
## Deferred Ideas

- Semantic or hybrid retrieval is a future upgrade after the BM25-style baseline is working and evaluated.
- Full Phase 6 evaluation suite remains later; Phase 3 includes only a small MVP evaluation gate.
- Polished chat UI and citation cards belong to later UI phases, though Phase 3 response contracts must support them.
- Personalization and recommendation ranking remain Phase 4.

</deferred>

---

*Phase: 3-Source-Grounded Chat MVP*
*Context gathered: 2026-05-03T09:00:00Z*
