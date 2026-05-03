# ERICA Career Chat

## What This Is

ERICA Career Chat is a personalized LLM chat service for Hanyang University ERICA students who need employment and recruitment information without searching across multiple university pages and documents. It gathers ERICA-relevant career sources, answers Korean natural-language questions with citations, and recommends information based on each student's explicit preferences and optional saved interaction context.

The first usable version is a web-based Korean-first assistant that can answer questions from approved Hanyang career sources, surface current job/recruitment listings, and explain why each recommendation matches the student.

## Core Value

Students can ask career and recruitment questions in Korean and receive current, source-cited, personally relevant answers from Hanyang ERICA employment information.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Build a source discovery and ingestion pipeline for the listed Hanyang career sources.
- [ ] Provide RAG-based chat answers with source citations and freshness metadata.
- [ ] Support personalized recommendations using explicitly provided student preferences.
- [ ] Present a Korean-first responsive web UI for chat, recommendations, and source review.
- [ ] Add safety, privacy, and evaluation gates so the assistant does not hallucinate unsupported career guidance.

### Out of Scope

- Official Hanyang SSO integration — requires university authorization not established during initialization.
- Applying to jobs on behalf of students — the MVP should link users to source pages instead.
- Scraping behind authentication or bypassing access controls — only approved/public access patterns may be used.
- Fully automated resume rewriting, cover-letter generation, or interview coaching — valuable future expansions but not required for the initial source-grounded employment information MVP.
- Claiming official Hanyang endorsement — the project is ERICA-focused but authorization is not assumed.

## Context

- The seed idea provided by the user is: "개인 맞춤형 LLM 채팅 기반 한양대 ERICA 전용 취업 정보 제공 서비스".
- `sources.txt` lists Hanyang Career Development Center pages, career/recruitment subcategories, employment success stories, a CDP student guide PDF, and the ERICA College of Business and Economics employment board.
- Direct initialization research confirms comparable university AI career assistants often combine job aggregation, profile/resume-based matching, conversational Q&A, source-specific university process guidance, privacy controls, and human career-service disclaimers.
- RAG best practices for this domain require provenance, freshness, hybrid retrieval, citation-aware chunks, evaluation datasets, and transparent refusal when evidence is weak.
- `DESIGN.md` is a Meta-inspired design-system seed. It should inform polish and component quality, but future UI should be rebranded for an academic career-support context.

## Constraints

- **Language**: Korean-first content, queries, and answers — sources and users are primarily Korean-speaking.
- **Source Trust**: Answers must be grounded in indexed Hanyang/ERICA sources and cite their origin — employment information changes quickly.
- **Freshness**: Job postings and deadlines must carry posted/fetched timestamps and expired-status handling — stale advice can harm students.
- **Privacy**: Personalization should use explicit student-provided preferences first and minimize sensitive stored data — career goals and chat history can be sensitive.
- **Authorization**: Public-source discovery is allowed for planning, but production crawling and university integrations require access review.
- **UX**: The service should feel trustworthy and lightweight, not like a generic chatbot or commerce app.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as a source-grounded RAG assistant before adding advanced career tools | The core pain is fragmented ERICA employment information; reliable retrieval must come before resume/interview features | — Pending |
| Use explicit preference-based personalization in v1 | Reduces privacy risk and avoids opaque profiling before product value is validated | — Pending |
| Treat `DESIGN.md` as inspiration only | It is high-quality but Meta-specific and commerce-oriented | — Pending |
| Avoid official partnership claims | No authorization evidence exists in the workspace | — Pending |

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
*Last updated: 2026-05-03 after initialization*
