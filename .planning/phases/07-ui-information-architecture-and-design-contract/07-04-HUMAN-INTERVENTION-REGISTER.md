# 07-04 Human Intervention Register

**Phase:** 07 — UI Information Architecture and Design Contract  
**Requirements:** IA-01, IA-03, UXR-01, UXR-03  
**Status:** Deferred human choices with conservative defaults  
**Scope:** Records decisions only. Defaults are planning guidance, not implementation.

## Default Policy

When a product/design choice would normally require human input, Phase 7 proceeds with the conservative default that best preserves source-grounding, Korean-first clarity, and v1.1 scope guardrails. These items should be revisited in the indicated later phase only if implementation requires a final decision.

## Register

| ID | Decision needing human input | Recommended conservative default | Reason | Risk if wrong | Revisit phase |
|---|---|---|---|---|---|
| HI-07-01 | Home primary action ordering | Make `커리어 상담 시작하기` primary and `커리어 정보 둘러보기` secondary | Core value is consultation using source-grounded ERICA information | Users who prefer browsing may need an equally visible secondary path | Phase 8 |
| HI-07-02 | Navigation label exact wording | Use `홈`, `커리어 정보 탐색`, `출처 확인`, `커리어 상담` | Clear Korean-first separation of flows | Labels may feel formal; user testing may suggest shorter labels | Phase 8 |
| HI-07-03 | Explore filters shown by default | Start with source/type/deadline-status filters only if existing data supports them | Avoid implying matching/ranking or new data capabilities | Too few filters may slow browsing | Phase 9 |
| HI-07-04 | Detail page metadata density | Show source link/name, source_id/chunk_id, posted/fetched dates, deadline status; collapse deeper technical metadata if needed | Required source verification stays visible while avoiding clutter | Too much metadata may overwhelm non-technical students | Phase 9 |
| HI-07-05 | Consultation example questions | Use 3–4 Korean examples focused on ERICA information, deadlines, source verification, and general career guidance | Teaches safe use without promising outcomes | Examples may not match all majors/roles | Phase 10 |
| HI-07-06 | Insufficient-evidence tone | Use direct but helpful refusal: `확인된 출처 근거가 부족해 답변을 제한합니다.` | Preserves fail-closed behavior and trust | May feel too restrictive without alternative next steps | Phase 10 |
| HI-07-07 | Accent color allocation | Reserve accent for one active/primary state per page; use neutrals for most badges/cards | Fixes repeated accent-color problem and supports UXR-03 | Page may feel too restrained if all states are neutral | Phase 8/9 |
| HI-07-08 | Source card prominence in consultation | Show evidence cards directly under/near the answer, not as a persistent job inventory panel | Prevents job-board framing and keeps answer primary | Users may want faster comparison of multiple sources | Phase 10 |
| HI-07-09 | Official relationship disclaimer placement | Put concise disclaimer on home and consultation empty state; detail pages emphasize original source verification | Avoids official endorsement claims without cluttering every element | Disclaimer could be missed if too low on page | Phase 8/10 |
| HI-07-10 | Mobile information density | Prefer single-column, progressive disclosure for source metadata | Korean readability and touch targets matter more than desktop parity | Extra taps may be needed for full metadata | Phase 11 |

## Explicit Non-Questions

The following are not human-intervention items for v1.1 because they are out of scope:

- adding or changing matching/ranking algorithms, ranking weights, or matching logic
- adding semantic retrieval
- expanding ingestion sources or starting production crawling
- crawling authenticated/private pages or bypassing access controls
- saved jobs, reminders, application tracking, SSO, official Hanyang endorsement claims, or job-board workflow tooling

## Requirement Coverage

| Requirement | Coverage |
|---|---|
| IA-01 | Defaults preserve home purpose, primary action, source-grounded explanation, and service limits. |
| IA-03 | Defaults keep exploration, source verification, and consultation labels/actions separate. |
| UXR-01 | Defaults apply `DESIGN.md` through restrained typography/color/card/CTA choices. |
| UXR-03 | Defaults reduce competing color, badge, card, and CTA emphasis. |
