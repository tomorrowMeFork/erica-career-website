# ERICA Career Chat

## What This Is

ERICA Career Chat v1.0 is a Korean-first career-information assistant for Hanyang University ERICA students. It combines bounded public-source ingestion, cited source-grounded chat, explicit-preference recommendations, listing browse, source inspection, and safety/evaluation gates in a responsive web dashboard.

The shipped v1.0 uses approved fixture-first Hanyang/ERICA source records and a local JSONL knowledge base to answer Korean questions with citations, freshness/deadline metadata, refusal behavior for weak evidence, and transparent safety guidance. It does not claim official Hanyang endorsement, SSO access, private/authenticated crawling, or production crawling permission.

## Core Value

Students can ask career and recruitment questions in Korean and receive current, source-cited, personally relevant answers from Hanyang ERICA employment information.

## Current State

- **Shipped version:** v1.0 — ERICA Career Chat v1.0, shipped 2026-05-04.
- **Tech stack:** Next.js, TypeScript, Tailwind, Playwright, Vitest, Zod, local JSONL knowledge base, and an OpenAI-compatible provider boundary.
- **Release gates:** `npm run release:ready` passed after blocker closure; automated coverage included 41 Vitest files / 247 tests and Playwright 8/8.
- **Provider-backed E2E:** Manual Playwright MCP browser E2E exercised the real `/api/chat` provider path; automated browser QA still mocks `/api/chat`.
- **Audit status:** `tech_debt` — archived audit reports 32/32 requirements and 5/5 milestone flows covered, with known follow-up items documented in `.planning/MILESTONES.md`.
- **Current focus:** Planning the next milestone. Run `/gsd-new-milestone` to define fresh requirements and roadmap.

## Requirements

### Validated

- [x] Build a source discovery and ingestion pipeline for the listed Hanyang career sources. — v1.0
- [x] Provide RAG-based chat answers with source citations and freshness metadata. — v1.0
- [x] Support personalized recommendations using explicitly provided student preferences. — v1.0
- [x] Present a Korean-first responsive web UI for chat, recommendations, and source review. — v1.0
- [x] Add safety, privacy, and evaluation gates so the assistant does not hallucinate unsupported career guidance. — v1.0

### Active

Next milestone requirements are not defined yet. Run `/gsd-new-milestone`.

### Out of Scope

- Official Hanyang SSO integration — requires university authorization not established during v1.0.
- Applying to jobs on behalf of students — v1.0 links users to source pages instead.
- Scraping behind authentication or bypassing access controls — only approved/public access patterns may be used.
- Production crawling without access review and explicit permission — fixture-first/manual collection remains the safe default.
- Fully automated resume rewriting, cover-letter generation, or interview coaching — valuable future expansions but outside v1.0's source-grounded employment-information scope.
- Claiming official Hanyang endorsement — the project is ERICA-focused but authorization is not assumed.

## Context

- The seed idea provided by the user is: "개인 맞춤형 LLM 채팅 기반 한양대 ERICA 전용 취업 정보 제공 서비스".
- `sources.txt` lists Hanyang Career Development Center pages, career/recruitment subcategories, employment success stories, a CDP student guide PDF, and the ERICA College of Business and Economics employment board.
- v1.0 established bounded source governance before ingestion, including source registry/access gates and evidence-backed blockers for sources that require authenticated or otherwise constrained access.
- v1.0 uses fixture-first HTML/PDF parsing into normalized source records and citation-ready chunks with source URLs, source names, posted/fetched timestamps, deadline status, and page/anchor metadata.
- RAG behavior is Korean-first, citation-aware, freshness-aware, and fail-closed when evidence is missing, stale, unsafe, or citation validation fails.
- `DESIGN.md` and `.planning/research/design-seed.md` informed polish and component quality, but the shipped UI is rebranded as a calm academic career-support interface.

## Constraints

- **Language**: Korean-first content, queries, and answers — sources and users are primarily Korean-speaking.
- **Source Trust**: Answers must be grounded in indexed Hanyang/ERICA sources and cite their origin — employment information changes quickly.
- **Freshness**: Job postings and deadlines must carry posted/fetched timestamps and expired-status handling — stale advice can harm students.
- **Privacy**: Personalization should use explicit student-provided preferences first and minimize sensitive stored data — career goals and chat history can be sensitive.
- **Authorization**: Public-source discovery is allowed for planning, but production crawling and university integrations require access review and permission.
- **No Private Access**: Do not crawl authenticated/private pages or bypass access controls.
- **No Official Claims**: Do not claim official Hanyang endorsement, SSO access, or production crawling permission unless new evidence is added to planning docs.
- **UX**: The service should feel trustworthy and lightweight, not like a generic chatbot or commerce app.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as a source-grounded RAG assistant before adding advanced career tools | The core pain is fragmented ERICA employment information; reliable retrieval must come before resume/interview features | Shipped in v1.0 with BM25-style retrieval, citations, refusals, and audit logs |
| Use explicit preference-based personalization in v1 | Reduces privacy risk and avoids opaque profiling before product value is validated | Validated in v1.0 with session-first preferences, consent gates, ranking, and Korean match reasons |
| Treat `DESIGN.md` as inspiration only | It is high-quality but Meta-specific and commerce-oriented | Shipped as a distinct academic career-service UI; revisit visual language as user testing identifies needs |
| Avoid official partnership claims | No authorization evidence exists in the workspace | Validated and preserved across safety copy, disclaimers, and release checks |
| Keep semantic/hybrid retrieval as a future upgrade | v1.0 prioritized deterministic local retrieval and citation reliability over embeddings/vector infrastructure | Revisit in a future milestone after collecting real query/evaluation needs |
| Keep automated browser QA deterministic by mocking `/api/chat` | CI should not depend on provider secrets, network availability, or live model variability | Shipped with mocked Playwright automation plus manual Playwright MCP E2E evidence for the real provider path |

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
*Last updated: 2026-05-04 after v1.0 milestone*
