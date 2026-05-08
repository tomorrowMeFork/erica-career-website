# ERICA Career Chat

## What This Is

ERICA Career Chat is a Korean-first, source-grounded career-information consultation assistant for Hanyang University ERICA students. It helps students ask career and recruitment questions, inspect cited ERICA employment information, and verify freshness/deadline/source metadata without treating the product as a general job-board or ranking product.

The shipped v1.0 uses approved fixture-first Hanyang/ERICA source records and a local JSONL knowledge base to answer Korean questions with citations, freshness/deadline metadata, refusal behavior for weak evidence, and transparent safety guidance. v1.1 shipped a four-page UI information architecture for reference review, source/deadline verification, and career consultation. v1.2 targeted implementation is complete for clean markdown answer rendering plus privacy-safe prompt context for explicit core preferences such as 전공 and target role, while broader release gates remain pending.

## Core Value

Students can ask career and recruitment questions in Korean and receive current, source-cited, personally relevant answers from Hanyang ERICA employment information.

## Current State

- **Shipped versions:** v1.0, ERICA Career Chat v1.0, shipped 2026-05-04; v1.1, UI Redesign, shipped 2026-05-04.
- **Tech stack:** Next.js, TypeScript, Tailwind, Playwright, Vitest, Zod, local JSONL knowledge base, and an OpenAI-compatible provider boundary.
- **Release gates:** `npm run release:ready` passed after blocker closure; automated coverage included 41 Vitest files / 247 tests and Playwright 8/8.
- **Provider-backed E2E:** Manual Playwright MCP browser E2E exercised the real `/api/chat` provider path; automated browser QA still mocks `/api/chat`.
- **Audit status:** `tech_debt`, archived audit reports 32/32 requirements and 5/5 milestone flows covered, with known follow-up items documented in `.planning/MILESTONES.md`.
- **Current milestone:** v1.2, Markdown Rendering and Prompt Context.
- **Current focus:** Targeted v1.2 implementation and verification are complete for `react-markdown` chat answer rendering and privacy-safe prompt context; broad release gate, build, full test suite, and Playwright QA remain pending.

## Requirements

### Validated

- [x] Build a source discovery and ingestion pipeline for the listed Hanyang career sources. v1.0
- [x] Provide RAG-based chat answers with source citations and freshness metadata. v1.0
- [x] Support personalized recommendations using explicitly provided student preferences. v1.0
- [x] Present a Korean-first responsive web UI for chat, recommendations, and source review. v1.0
- [x] Add safety, privacy, and evaluation gates so the assistant does not hallucinate unsupported career guidance. v1.0
- [x] Redesign the product into a four-page source-grounded career-information flow for home, 참고한 정보, source verification, and career consultation. v1.1
- [x] Preserve Korean-first citations, freshness/deadline metadata, refusal behavior, responsive QA, and scope guardrails through the UI redesign. v1.1

### Active

- [x] Render chat answers with `react-markdown` so Korean 답변 no longer shows raw markdown symbols, stray heading markers, or raw bullet artifacts. v1.2 targeted implementation complete
- [x] Preserve citations, source labels, freshness/deadline metadata, confidence, and refusal/no-answer states through the rendered answer UI. v1.2 targeted implementation complete
- [x] Constrain markdown rendering so unsafe raw HTML, scripts, style blocks, iframe handling, and markdown images cannot bypass the safe rendering policy. v1.2 targeted implementation complete
- [x] Include explicit stable preferences in minimized system/developer prompt context when available through an optional `session_key` chat request path. v1.2 targeted implementation complete for `major` and `target_role`
- [x] Keep prompt-context personalization privacy-safe: no hidden profiling, no raw chat history, no session-only optional text, no extra preference fields, no secrets, no storage metadata, and cleared preferences omitted. v1.2 targeted implementation complete

### Out of Scope

- Official Hanyang SSO integration: requires university authorization not established during v1.0.
- Applying to jobs on behalf of students: v1.0 links users to source pages instead.
- Scraping behind authentication or bypassing access controls: only approved/public access patterns may be used.
- Production crawling without access review and explicit permission: fixture-first/manual collection remains the safe default.
- Fully automated resume rewriting, cover-letter generation, or interview coaching: valuable future expansions but outside v1.0's source-grounded employment-information scope.
- New recommendation/ranking algorithm work in v1.2: the milestone is answer rendering and explicit prompt context, not a recommendation-system upgrade.
- Semantic retrieval or ingestion-source expansion in v1.2: useful future work, but outside this milestone.
- Saved jobs, reminders, application tracking, or job-board workflow tooling in v1.2: these would change the product category beyond source-grounded consultation.
- Hidden profiling from chat history: v1.2 prompt context may use explicit minimized preference fields only.
- Claiming official Hanyang endorsement: the project is ERICA-focused but authorization is not assumed.

## Context

- The seed idea provided by the user is: "개인 맞춤형 LLM 채팅 기반 한양대 ERICA 전용 취업 정보 제공 서비스".
- `sources.txt` lists Hanyang Career Development Center pages, career/recruitment subcategories, employment success stories, a CDP student guide PDF, and the ERICA College of Business and Economics employment board.
- v1.0 established bounded source governance before ingestion, including source registry/access gates and evidence-backed blockers for sources that require authenticated or otherwise constrained access.
- v1.0 uses fixture-first HTML/PDF parsing into normalized source records and citation-ready chunks with source URLs, source names, posted/fetched timestamps, deadline status, and page/anchor metadata.
- RAG behavior is Korean-first, citation-aware, freshness-aware, and fail-closed when evidence is missing, stale, unsafe, or citation validation fails.
- `DESIGN.md` was the active independent design standard for v1.1 UI redesign. It continues to guide any v1.2 chat rendering UI adjustments without being framed as another brand style or copied branding.
- v1.1 addressed the crowded single-screen UI by shipping a four-page source-grounded flow. v1.2 targeted implementation addresses the next chat quality issue: markdown-formatted model answers should look like readable Korean 답변, not raw markdown text.
- v1.2 prompt-context work reuses the existing explicit preference and privacy posture by sending only minimized stable fields, currently `major` and `target_role`, in system/developer context.
- Targeted v1.2 verification passed `npm test -- src/chat/prompt.test.ts src/chat/chat-service.test.ts app/api/chat/route.test.ts lib/api-client.test.ts components/chat/chat-components.test.tsx`, with 5 files and 30 tests passing. `npm run typecheck -- --pretty false` passed after a TS7006 test typing fix.
- v1.2 is not yet claimed as shipped, tagged, release-ready, or fully gated. Broad `npm test`, build, Playwright QA, and release-readiness checks remain pending unless run separately later.

## Constraints

- **Language**: Korean-first content, queries, and answers, since sources and users are primarily Korean-speaking.
- **Source Trust**: Answers must be grounded in indexed Hanyang/ERICA sources and cite their origin because employment information changes quickly.
- **Freshness**: Job postings and deadlines must carry posted/fetched timestamps and expired-status handling because stale advice can harm students.
- **Privacy**: Personalization should use explicit student-provided preferences first and minimize sensitive stored data because career goals and chat history can be sensitive.
- **Authorization**: Public-source discovery is allowed for planning, but production crawling and university integrations require access review and permission.
- **No Private Access**: Do not crawl authenticated/private pages or bypass access controls.
- **No Official Claims**: Do not claim official Hanyang endorsement, SSO access, or production crawling permission unless new evidence is added to planning docs.
- **UX**: The service should feel trustworthy and lightweight, not like a generic chatbot or commerce app.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as a source-grounded RAG assistant before adding advanced career tools | The core pain is fragmented ERICA employment information; reliable retrieval must come before resume/interview features | Shipped in v1.0 with BM25-style retrieval, citations, refusals, and audit logs |
| Use explicit preference-based personalization in v1 | Reduces privacy risk and avoids opaque profiling before product value is validated | Validated in v1.0 with session-first preferences, consent gates, ranking, and Korean match reasons |
| Treat `DESIGN.md` as the v1.1 UI design standard | The milestone applied the current design contract to the product's own academic career-service identity | Shipped in v1.1; continue using it for v1.2 chat rendering polish without changing product identity |
| Avoid official partnership claims | No authorization evidence exists in the workspace | Validated and preserved across safety copy, disclaimers, and release checks |
| Keep semantic/hybrid retrieval as a future upgrade | v1.0 prioritized deterministic local retrieval and citation reliability over embeddings/vector infrastructure | Revisit in a future milestone after collecting real query/evaluation needs |
| Keep automated browser QA deterministic by mocking `/api/chat` | CI should not depend on provider secrets, network availability, or live model variability | Shipped with mocked Playwright automation plus manual Playwright MCP E2E evidence for the real provider path |
| Split the crowded dashboard into four source-grounded UI routes | The single-screen dashboard made reference review, source verification, and consultation compete visually | Shipped in v1.1 with home, 참고한 정보, detail/source verification, and consultation pages |
| Render markdown answers instead of showing raw markdown symbols | Korean chat answers need readable structure without visible `#`, `*`, or raw list syntax | Targeted v1.2 implementation complete with `react-markdown`, preserved citations/refusals/freshness, constrained unsafe HTML/script/style/iframe handling, and disabled markdown images |
| Add explicit preferences to stable prompt context only when privacy-safe | 전공 and target role can help answer quality, but hidden profiling or raw chat-history context would violate the product's privacy posture | Targeted v1.2 implementation complete with optional `session_key`, server-side explicit preference resolution, only `major` and `target_role` included, and raw chat history/session-only text/extra fields/secrets/storage metadata excluded |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via the active GSD phase-completion workflow):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-08 after v1.2 targeted implementation and verification update*
