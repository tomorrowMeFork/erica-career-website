# Phase 7 Patterns: UI IA and Design Contract

**Phase:** 07 — UI Information Architecture and Design Contract  
**Date:** 2026-05-04

## Artifact Pattern

Phase 7 will use one executable plan and five execution artifacts:

1. `07-01-PLAN.md` — executable plan and verification strategy
2. `07-01-PAGE-IA-CONTRACT.md` — four-page purpose, CTA, empty-state, and evidence contract
3. `07-02-FLOW-LANGUAGE-CONTRACT.md` — Korean-first product language, flow labels, and forbidden framing audit
4. `07-03-DESIGN-STANDARD-INTERPRETATION.md` — project-specific interpretation of `DESIGN.md`, including Phase 5 anti-patterns
5. `07-04-HUMAN-INTERVENTION-REGISTER.md` — questions deferred to humans with recommended default choices
6. `07-05-VERIFICATION-ACCEPTANCE-CHECKS.md` — binary checks before Phase 8 implementation
7. `07-SUMMARY.md` — Phase 7 execution summary and requirement coverage

## Planning Pattern

Each artifact must include:

- explicit requirement mapping to IA-01, IA-03, UXR-01, and/or UXR-03
- a scope boundary that excludes implementation and v1.1 scope creep
- Korean-first UX implications
- citation/freshness/source-grounding implications where relevant
- verification criteria that later implementation can test

## Page Contract Pattern

Use this table pattern for each page:

| Page | User job | Primary action | Secondary action | Empty state | Evidence/source rule | Must not imply |
|---|---|---|---|---|---|---|

This keeps Phase 8+ implementation accountable to a single purpose per page.

## Flow Language Pattern

Use Korean-first labels that distinguish exploration from consultation:

| Concept | Preferred Korean label | Avoid |
|---|---|---|
| Product role | 출처 기반 ERICA 커리어 상담 | 채용 공고 추천 시스템 |
| Explore page | 커리어 정보 탐색 | 맞춤 공고 추천 |
| Detail/source page | 출처 확인 | 지원 관리 |
| Consultation page | 커리어 상담 | 자동 합격/성과 보장 |
| Supporting evidence | 답변 근거 | 순위/매칭 결과 |

## Design Contract Pattern

Translate `DESIGN.md` into project-specific rules:

- one dominant primary CTA per page
- restrained accent usage for active/primary states only
- rounded white cards for grouped information, but fewer cards than Phase 5
- pill controls for filters/navigation only when they clarify state
- source cards must prioritize source identity, freshness/deadline state, and citation traceability
- Korean body text should favor readability over dense metric/card layouts

## Phase 5 Reference Rule

Phase 5 may be referenced only for:

- planning file format
- previous requirement coverage style
- examples of what the v1.1 redesign must fix

Phase 5 must not be used as the desired design direction.

## Verification Pattern

Use binary checks:

- PASS only when the artifact makes the user-facing outcome observable
- FLAG when a decision is deferred but has a recommended conservative default
- BLOCK when an artifact introduces implementation work or prohibited scope
