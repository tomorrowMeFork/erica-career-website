# Requirements: ERICA Career Chat v1.2 Markdown Rendering and Prompt Context

**Defined:** 2026-05-08  
**Core Value:** Students can ask career and recruitment questions in Korean and receive current, source-cited, personally relevant answers from Hanyang ERICA employment information.

## v1.1 Shipped Reference

v1.1 UI Redesign shipped on 2026-05-04. It delivered the four-page Korean-first consultation flow, reference review, source verification, evidence-based consultation framing, responsive QA, and scope guardrails. The v1.1 archive remains preserved in historical planning notes and milestone records.

## v1.2 Requirements

Requirements for the v1.2 milestone. Each maps to roadmap phases 12 through 14. v1.2 is a chat-answer presentation and privacy-safe prompt-context milestone, not a retrieval, crawling, ranking, or job-board workflow milestone. Targeted implementation and focused verification are complete; typecheck, build, and Playwright QA pass; broad Vitest/evaluation gates still fail and block `release:ready`.

### Markdown Answer Rendering

- [x] **V12-MD-01**: Chat answers render through `react-markdown` or an equivalent React markdown rendering path so users no longer see raw markdown symbols, stray heading markers, or raw bullet syntax in normal 답변 text.
- [x] **V12-MD-02**: Korean answer readability improves for paragraphs, lists, emphasis, and section-like answer structure without making the chat feel like a generic document page.
- [x] **V12-MD-03**: Rendering preserves existing citations, source labels, posted/fetched freshness metadata, deadline status, confidence, and refusal/no-answer presentation.
- [x] **V12-MD-04**: Rendering handles numbered and bulleted guidance cleanly while avoiding duplicate bullets, visible `#` heading artifacts, broken spacing, or citation detachment from the answer text.

### Safe Rendering and Guardrails

- [x] **V12-SAFE-01**: Markdown rendering is sanitized or constrained so untrusted answer text cannot inject unsafe HTML, scripts, event handlers, hostile links, or UI-breaking markup. Targeted implementation constrains raw HTML/script/style/iframe handling and disables markdown images.
- [x] **V12-SAFE-02**: Links in rendered answers follow the existing source trust model and do not create new claims of official Hanyang endorsement, SSO access, production crawling permission, or private-source access.
- [x] **V12-SAFE-03**: Refusal and insufficient-evidence answers remain visually clear in Korean and cannot be hidden by markdown formatting.

### Prompt Context Personalization Bonus

- [x] **V12-PCTX-01**: When users explicitly provide stable preference information such as 전공 or target role, the chat request can include that minimized context in stable system/developer prompt context rather than relying only on ad hoc user-message repetition. Targeted implementation adds an optional `session_key` request path.
- [x] **V12-PCTX-02**: Prompt-context personalization uses only explicit preference data, avoids hidden profiling, and does not infer sensitive traits from chat history without user-provided preference fields.
- [x] **V12-PCTX-03**: Prompt context includes only the minimum useful preference fields, `major` and `target_role`, and excludes raw chat history, session-only optional text, extra preference fields, secrets, storage metadata, and unrelated personal data.
- [x] **V12-PCTX-04**: Users retain existing preference-clearing and privacy expectations, and clearing preferences prevents cleared context from being added to future prompt context.
- [x] **V12-PCTX-05**: Personalized prompt context preserves the same Korean-first, source-grounded citation, freshness, and refusal constraints as non-personalized answers.

### Regression and Verification

- [x] **V12-TEST-01**: Add or update regression tests proving markdown-formatted answers render cleanly without raw heading, bullet, or emphasis artifacts in the chat UI.
- [x] **V12-TEST-02**: Add or update tests proving citations, freshness metadata, deadline status, and refusal/no-answer behavior remain present after markdown rendering.
- [x] **V12-TEST-03**: Add or update tests proving unsafe markdown or HTML input is sanitized, escaped, or rejected according to the chosen rendering policy.
- [x] **V12-TEST-04**: Add or update tests proving explicit preference prompt context includes only allowed minimized fields and is omitted when preferences are absent or cleared.
- [x] **V12-TEST-05**: Targeted verification shows v1.2 does not add semantic retrieval, crawling, ranking algorithm changes, saved jobs/reminders, SSO, official endorsement claims, or job-board workflow scope. Typecheck, build, and Playwright QA pass, but broad Vitest/evaluation gates still fail and block `release:ready`.

**Verification evidence:**

- `npm test -- src/chat/prompt.test.ts src/chat/chat-service.test.ts app/api/chat/route.test.ts lib/api-client.test.ts components/chat/chat-components.test.tsx` passed with 5 files and 30 tests.
- `npm run typecheck -- --pretty false` passed.
- `npm run build:web` passed.
- Initial `npm run qa:web` failed only because the Playwright Chromium/headless shell executable was missing locally.
- `npx playwright install chromium` installed the required browser artifacts.
- Re-run `npm run qa:web` passed with 28/28 tests.
- Full `npm test` failed: 42 test files total, 40 passed, 2 failed; 292 tests total, 287 passed, 5 failed.
- Failed test files: `scripts/evaluate-rag-mvp.test.ts` and `scripts/evaluate-release-readiness.test.ts`.
- Direct `npm run evaluate:rag:mvp` reported: `CDP 학생 가이드북: expected source cdp-student-guide-pdf in top 5`.
- Direct `npm run evaluate:release-readiness` reported failures for `phase6-listing-deadline: expected chunk 3986f65fde23212320ca478290394113c27ffaa776f8de59f7e292989ee8f270 in top results`, `phase6-personalization-recommendation: expected chunk 3986f65fde23212320ca478290394113c27ffaa776f8de59f7e292989ee8f270 in top results`, and `rag_mvp: CDP 학생 가이드북: expected source cdp-student-guide-pdf in top 5`.
- `release:ready`, tag, shipped release status, and release-ready status are not claimed. `release:ready` remains blocked/pending because broad Vitest/evaluation gates are failing.

## Future Requirements

Deferred beyond v1.2. Tracked but not in this roadmap.

### Retrieval and Data

- **RET-01**: System can add semantic or hybrid retrieval if future evaluation shows lexical retrieval is insufficient.
- **SRC-NEW-01**: Operator can expand source coverage after renewed access review and permission checks.

### Product Workflow

- **JOBFLOW-01**: User can save career information items for later review.
- **JOBFLOW-02**: User can receive deadline reminders if notification consent, retention, and delivery channels are designed.
- **JOBFLOW-03**: User can manage application status if the product intentionally expands beyond source-grounded consultation.

## Out of Scope

Explicitly excluded for v1.2. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New matching or ranking algorithm | v1.2 improves answer presentation and explicit prompt context, not recommendation logic. |
| Semantic/hybrid retrieval | Deferred until retrieval evaluation motivates the added complexity. |
| Ingestion-source expansion or production crawling | Requires separate source access review and is outside the markdown/prompt-context scope. |
| Saved jobs, reminders, application tracking | These shift the product toward job-board workflow tooling beyond the current consultation scope. |
| Official Hanyang SSO or endorsement claims | No authorization evidence exists in planning docs. |
| Resume, cover-letter, interview, or application automation | Valuable future career-tool scope, but not part of v1.2 answer rendering or prompt context. |
| Hidden profiling from chat history | v1.2 only allows explicit, minimized preference context. |

## Traceability

Which phases cover which requirements. Updated during v1.2 roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| V12-MD-01 | Phase 12 | Targeted implementation complete |
| V12-MD-02 | Phase 12 | Targeted implementation complete |
| V12-MD-03 | Phase 12 | Targeted implementation complete |
| V12-MD-04 | Phase 12 | Targeted implementation complete |
| V12-SAFE-01 | Phase 12 | Targeted implementation complete |
| V12-SAFE-02 | Phase 12 | Targeted implementation complete |
| V12-SAFE-03 | Phase 12 | Targeted implementation complete |
| V12-PCTX-01 | Phase 13 | Targeted implementation complete |
| V12-PCTX-02 | Phase 13 | Targeted implementation complete |
| V12-PCTX-03 | Phase 13 | Targeted implementation complete |
| V12-PCTX-04 | Phase 13 | Targeted implementation complete |
| V12-PCTX-05 | Phase 13 | Targeted implementation complete |
| V12-TEST-01 | Phase 14 | Targeted verification passed |
| V12-TEST-02 | Phase 14 | Targeted verification passed |
| V12-TEST-03 | Phase 14 | Targeted verification passed |
| V12-TEST-04 | Phase 14 | Targeted verification passed |
| V12-TEST-05 | Phase 14 | Targeted verification passed; typecheck/build/Playwright passed; broad Vitest/evaluation gates failing |

**Coverage:**

- v1.2 requirements: 17 total, targeted implementation and focused verification complete
- Mapped to phases: 17
- Unmapped: 0
- Duplicate mappings: 0
- Broad release gate blocked: full `npm test` and direct evaluation commands fail as recorded above; typecheck, build, and Playwright QA pass

---
*Requirements defined: 2026-05-08*  
*Last updated: 2026-05-08 after v1.2 broad verification update*
