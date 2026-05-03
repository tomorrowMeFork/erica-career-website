# Phase 6: Safety, Evaluation, and Release Readiness - Context

**Gathered:** 2026-05-04T12:00:00Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 adds safety disclaimers, a comprehensive evaluation suite, freshness/operator status visibility, hostile-source testing, and a manual release checklist on top of the completed Phase 3/4/5 foundation. It must ensure the assistant is safe, source-faithful, fresh enough, privacy-conscious, and ready for a first user test before any deployment.

Phase 6 does **not** add official Hanyang SSO, production crawling, authenticated/private source access, saved jobs/reminders/resume tools, application submission, or v2 career-tool features. It also does not modify the existing chat, recommendation, or personalization service logic beyond adding disclaimer copy and status endpoints.

</domain>

<decisions>
## Implementation Decisions

### Safety And Disclaimer Copy
- **D-01:** All user-facing safety and disclaimer text must be Korean-first. English may appear alongside Korean where clarity demands it, but Korean is the primary language.
- **D-02:** Disclaimer copy must state that answers are informational only and users should verify important details on official source pages. This satisfies SAFE-01.
- **D-03:** The system must not claim official Hanyang endorsement or guaranteed job outcomes. This satisfies SAFE-02 and is consistent with the long-standing project constraint from PROJECT.md and AGENTS.md.
- **D-04:** Disclaimer copy should appear in the chat UI, preferably as a persistent or first-visit notice, and should reference the official source pages as the authoritative source of truth.
- **D-05:** No `.env` values, API keys, or internal configuration should appear in user-facing disclaimer or status text.

### Evaluation Suite Architecture
- **D-06:** The evaluation suite runs deterministically and locally by default, using fixtures and mock providers. No live credentials, network calls, or `.env` value reading/printing are required for the default evaluation path.
- **D-07:** Optional env-gated live/provider checks may exist but must only activate when all required environment variable names are present. The default path must never fail or behave unexpectedly due to missing env configuration.
- **D-08:** This pattern extends the approach established in Phase 3 (`evaluate:rag:mvp`) and Phase 4 (`evaluate:personalization`), both of which use deterministic local evaluation with optional D-27 judge gating.
- **D-09:** The Phase 6 evaluation suite should compose or extend prior evaluation scripts rather than replacing them. Phase 3 MVP eval and Phase 4 personalization eval remain valid and runnable.

### Reference QA Dataset
- **D-10:** The reference QA dataset must cover these categories, satisfying EVAL-01:
  1. **CDP usage questions** (CDP 학생 가이드북 활용법, 서비스 이용 방법)
  2. **Job listing and deadline discovery** (채용/인턴 공고 조회, 마감일 확인)
  3. **Success stories** (취업성공후기, 선배 사례)
  4. **Guidebook/PDF content** (CDP PDF 내용, 안내서 관련 질문)
  5. **No-answer/refusal cases** (수집된 출처에 없는 질문, 근거 부족 케이스)
  6. **Personalization recommendation** (선호 설정 후 맞춤 추천 동작)
  7. **Hostile source / prompt injection** (출처 텍스트가 시스템 지시를 덮어쓰려는 시도)
- **D-11:** Each QA case should include the Korean question, expected retrieval behavior (which source/chunk should appear in top results), expected answer characteristics (citation presence, refusal tier, faithfulness markers), and freshness/deadline expectations where applicable.
- **D-12:** No-answer/refusal cases should verify the system produces transparent uncertainty or hard refusal rather than fabricated guidance. This is consistent with RAG-04 and Phase 3 evidence policy.

### Retrieval Evaluation
- **D-13:** Retrieval evaluation (EVAL-02) must measure whether expected source chunks appear in top results for reference questions. This extends the Phase 3 MVP eval retrieval checks into a more comprehensive dataset.
- **D-14:** Retrieval evaluation should also verify that freshness and deadline metadata are preserved through the retrieval pipeline. Retrieved chunks must carry `fetched_at`, `posted_at`, and `deadline_status` from the original Phase 2 normalized records.

### Answer Evaluation
- **D-15:** Answer evaluation (EVAL-03) must check:
  1. **Citation accuracy** (인용 출처가 실제 검색된 청크와 일치하는지)
  2. **Faithfulness** (답변이 검색된 근거에 기반하는지, 근거 없는 주장이 없는지)
  3. **Korean answer quality** (한국어 자연스러움, 상담형 톤 유지)
  4. **Refusal behavior** (근거 부족 시 적절한 거부/회피 동작)
- **D-16:** Hostile-source and prompt-injection cases (EVAL-06) must verify that retrieved content attempting to override assistant instructions or citation requirements is properly contained. This extends the Phase 3 RAG-06 and 03-06 eval hostile-source isolation patterns.
- **D-17:** Answer evaluation should also verify that unsafe claims (official endorsement, guaranteed outcomes) do not appear in generated answers. This supports SAFE-02 enforcement at the eval level.
- **D-18:** Source-link and freshness preservation must be checked: answers should include working citation URLs and correct `fetched_at`/`posted_at`/`deadline_status` values from the cited chunks.

### Freshness And Operator Status
- **D-19:** The freshness/operator status view (EVAL-04) must expose local ingestion manifest and knowledge-base freshness information. This is a local-only status endpoint or CLI command, not a production monitoring dashboard.
- **D-20:** Status information should include: last successful ingestion timestamp per source, total chunks in the knowledge base, any stale-source warnings, and any sources with unknown freshness status.
- **D-21:** Status must not require production crawling or live network access to compute. It reads from local ingestion artifacts (JSONL manifests, `manifest.json`) only.
- **D-22:** Stale/unknown freshness warnings should be surfaced clearly so operators know which sources may need re-ingestion before the system is considered fresh enough for user testing.
- **D-23:** Last successful sample ingestion and evaluation status should be included so operators can verify the pipeline is working end-to-end.

### Manual Release Checklist
- **D-24:** The release checklist (EVAL-05) must cover at minimum these manual verification paths:
  1. **One ingestion-to-cited-answer E2E path** (source ingestion through knowledge base, retrieval, chat answer with correct citations)
  2. **Web UI verification** (chat, citation cards, listing browse, preference controls render correctly)
  3. **Preference clear flow** (user can clear preferences and system returns to no-preference behavior)
  4. **Privacy controls** (consent, retention, deletion behavior visible and functional)
  5. **No-answer behavior** (questions outside collected sources produce transparent refusal, not fabricated answers)
  6. **Hostile-source containment** (injected hostile content does not override system behavior)
  7. **Mobile/desktop citation inspection** (citations are readable and source links work on both viewports)
  8. **Disclaimer visibility** (safety/informational-use disclaimer is visible to users)
  9. **No official endorsement claims** (no text implying Hanyang official endorsement or guaranteed outcomes)
  10. **No `.env` or secret leakage** (no API keys, internal config, or sensitive values visible in UI or status output)

### Explicit Exclusions
- **D-25:** Phase 6 must not introduce production crawling, SSO integration, or any mechanism that bypasses the Phase 1 source-governance access review boundaries.
- **D-26:** Phase 6 must not add saved jobs, deadline reminders, resume tools, or any v2 career-tool feature.
- **D-27:** Phase 6 must not claim official Hanyang endorsement or guaranteed job outcomes in any generated text, UI copy, or status output.
- **D-28:** Phase 6 must not read or print `.env` values in any user-facing or evaluation output. Secret handling follows the Phase 3 D-23/D-27 pattern.

### Agent's Discretion
- The user delegated all decisions to autonomous sensible defaults. All decisions D-01 through D-28 are locked and downstream agents should not re-ask these questions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product And Scope
- `.planning/PROJECT.md` — Korean-first, source-cited ERICA career assistant intent, authorization/privacy constraints, and explicit out-of-scope items including SSO, production crawling, and official endorsement claims.
- `.planning/REQUIREMENTS.md` — Phase 6 requirements `SAFE-01`, `SAFE-02`, `EVAL-01` through `EVAL-06`, plus all prior completed requirements that Phase 6 evaluation must not regress.
- `.planning/ROADMAP.md` — Phase 6 goal, deliverables, success criteria, and parallelization note for eval dataset, safety copy, privacy controls, and freshness status.
- `.planning/STATE.md` — Current project state showing Phase 5 complete, all 25 plans done, Phase 6 next.
- `AGENTS.md` — Repository rules for Korean-first behavior, citation/freshness metadata, no official endorsement, prompt-injection safety, no production crawling, no `.env` reading/printing.

### Prior Phase Decisions
- `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md` — Source approval boundaries, seed-source scope, no production permission claim, rate-limit posture.
- `.planning/phases/02-ingestion-and-knowledge-base/02-CONTEXT.md` — Normalized record contract, citation/freshness requirements, local-first KB, and `untrusted_source_text` handling.
- `.planning/phases/03-source-grounded-chat-mvp/03-CONTEXT.md` — Chat contract decisions, evidence policy, refusal tiers, hostile-source isolation, audit logging, and D-27 optional judge gating.
- `.planning/phases/03-source-grounded-chat-mvp/03-06-SUMMARY.md` — Phase 3 eval pattern: deterministic local retrieval/mock, optional env-gated D-27 judge, Korean QA cases, hostile-source isolation, secret-redacted smoke CLI.
- `.planning/phases/04-personalization-and-recommendations/04-CONTEXT.md` — Preference schema, privacy/consent gates, minimum-data storage, and deferred polished UI boundary.
- `.planning/phases/04-personalization-and-recommendations/04-04-SUMMARY.md` — Phase 4 eval pattern: deterministic local-only evaluation covering lifecycle, reranking, no-preference fallback, hostile-source safety, consent gate.
- `.planning/phases/05-student-facing-experience/05-CONTEXT.md` — Next.js dashboard structure, citation/source card layout, preference UI, visual direction, and safety copy placeholder notes.
- `.planning/phases/05-student-facing-experience/05-05-SUMMARY.md` — Phase 5 Playwright QA pattern with mocked API routes, static UI verifier, and responsive mobile/desktop test projects.

### Code Contracts
- `src/chat/chat-contract.ts` — `ChatResponseSchema`, `ChatCitationSchema`, `RefusalTierSchema`; eval must verify these fields are populated correctly.
- `src/chat/chat-service.ts` — Orchestration path for retrieval, evidence policy, provider, validation, and audit.
- `src/recommendations/recommendation-contract.ts` — Recommendation items with citations, match reasons, scores, and privacy metadata.
- `src/personalization/preference-contract.ts` — Preference profile, consent, lifecycle, and storage-scope contracts.
- `src/ingestion/normalized-record.ts` — Source-data schema with citation, freshness, deadline metadata.
- `scripts/evaluate-rag-mvp.ts` — Phase 3 eval script pattern to extend.
- `scripts/evaluate-personalization.ts` — Phase 4 eval script pattern to extend.
- `scripts/verify-phase5-ui.ts` — Phase 5 static UI verifier pattern for Korean labels, source-link safety, and prohibited-scope tokens.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/evaluate-rag-mvp.ts` provides a deterministic evaluation CLI pattern with Korean-labelled cases, source/chunk top-five checks, citation checks, refusal checks, hostile-source isolation, and optional D-27 judge dimensions.
- `scripts/evaluate-personalization.ts` provides a deterministic evaluation CLI covering preference lifecycle, reranking, no-preference fallback, weak-match labeling, expired downranking, hostile-source safety, and consent gates.
- `scripts/verify-phase5-ui.ts` provides a static UI verifier that checks Korean labels, source-link safety, UI tokens, and prohibited-scope tokens. This pattern can inform UI-level safety verification in Phase 6.
- `scripts/chat-smoke.ts` provides a local ChatService smoke command that prints answer, citations, refusal_tier, confidence, and trace_id with provider errors redacted.
- `data/knowledge-base/` contains fixture and collected JSONL knowledge-base files that evaluation cases should reference.

### Established Patterns
- Deterministic local evaluation with optional env-gated live/provider checks is the project standard (Phase 3 and Phase 4 both follow this).
- Evaluation cases are Korean-labelled and cover both happy paths and edge cases (refusal, hostile source, no-answer).
- Secret/`.env` handling follows a strict pattern: no reading or printing of env values in user-facing output.
- Tests use Vitest, fixtures are in-file, and evaluation scripts export runnable functions for both CLI and test invocation.
- Audit logs use append-only JSONL with metadata-only normal records and limited prompt snapshots on guardrail/refusal/failure cases.

### Integration Points
- Phase 6 should add evaluation scripts, QA dataset files, freshness status CLI/endpoint, and UI disclaimer components without modifying existing service logic.
- The release checklist should be a markdown document that references existing verification commands (`npm run typecheck`, `npm test`, `npm run evaluate:rag:mvp`, `npm run evaluate:personalization`, `npm run verify:phase5-ui`, `npm run qa:web`, `npm run build:web`).
- Freshness status should read from local `manifest.json` and JSONL files in `data/knowledge-base/` without requiring network access.

</code_context>

<specifics>
## Specific Ideas

- Safety disclaimer should appear as a persistent notice in the chat UI, Korean-first, referencing official source pages as authoritative.
- Evaluation dataset should include at least 7 categories: CDP usage, listings/deadlines, success stories, guidebook/PDF, no-answer/refusal, personalization, hostile-source/prompt injection.
- Retrieval eval should check expected chunks in top-N results and verify freshness/deadline metadata preservation.
- Answer eval should check citation accuracy, faithfulness, Korean quality, refusal behavior, unsafe claims, and source-link/freshness preservation.
- Freshness status should be a local CLI command reading ingestion manifests, exposing stale/unknown warnings without production crawling.
- Release checklist should cover the 10 manual verification paths listed in D-24.
- No `.env` values should appear in any user-facing or evaluation output.
- No production crawling, SSO, official endorsement claims, saved jobs/reminders/resume tools, or private/authenticated page access.

</specifics>

<deferred>
## Deferred Ideas

- Full automated regression pipeline with CI/CD integration is a future improvement beyond the Phase 6 manual and deterministic local evaluation.
- Production monitoring dashboards, alerting, and automated re-ingestion triggers are v2 infrastructure.
- User-facing freshness indicators in the chat UI (beyond the operator status view) may be a useful polish item but are not required for release readiness.
- A/B testing of disclaimer copy, refusal messaging, or recommendation presentation is a future optimization.

</deferred>

---

*Phase: 6-Safety, Evaluation, and Release Readiness*
*Context gathered: 2026-05-04T12:00:00Z*
