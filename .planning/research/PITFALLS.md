# Pitfalls Research

**Created:** 2026-05-03

## Critical Pitfalls

| Pitfall | Warning Signs | Prevention Strategy | Phase |
|---|---|---|---|
| Unapproved crawling | Scheduled jobs run before source review, no robots/access notes | Require source registry access review before scheduled crawling | Phase 1 |
| Stale listings | Answers cite expired deadlines or old posts without warning | Store posted/fetched dates, deadline status, TTL, and freshness labels | Phase 2 |
| Generic career advice | Answers sound plausible but do not cite ERICA/Hanyang sources | Enforce RAG-only answers and no-answer behavior | Phase 3 |
| Weak retrieval | Exact job names, deadlines, and Korean department terms are missed | Use hybrid lexical + semantic retrieval and Korean eval queries | Phase 3 |
| Citation drift | Citation marker does not support the sentence it follows | Preserve chunk/source IDs and verify citation mapping in evals | Phase 3/6 |
| Indirect prompt injection | Crawled pages contain instructions like ignoring system rules or hiding citations | Treat retrieved text as untrusted data, isolate it from system instructions, and test hostile-source cases | Phase 3/6 |
| Opaque personalization | Recommendations appear arbitrary or biased | Use explicit preferences and show match reasons | Phase 4 |
| Privacy overreach | Storing resumes, grades, or inferred sensitive traits before needed | Start with minimal explicit preferences and clear/delete controls | Phase 4/6 |
| UI hides trust details | Source links, freshness, or uncertainty are buried | Design source cards and status labels as primary UI components | Phase 5 |
| AI positioned as counselor replacement | Product copy implies official or definitive advice | State informational use and human-advisor complement clearly | Phase 6 |
| No regression evals | Changes are judged by vibe checks only | Maintain reference QA, retrieval metrics, citation checks, and no-answer cases | Phase 6 |

## Korean-Specific Risks

- Korean tokenization and retrieval quality can degrade with English-centric models; evaluate Korean queries early.
- Honorific tone should be consistent and student-appropriate.
- Mixed Korean/English job and company terms require retrieval that handles code-switching.
- University-specific terms should become glossary/source material rather than relying on model priors.

## Organizational Risks

- Without source ownership, data freshness will degrade after the demo.
- Without explicit disclaimers, users may mistake the assistant for an official Hanyang channel.
- Without feedback loops, the team will not learn which answers are wrong or missing.
- Without accessibility/mobile checks, students may not adopt the service even if the model works.
