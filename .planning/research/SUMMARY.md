# Research Summary

**Created:** 2026-05-03  
**Project:** ERICA Career Chat

## Key Findings

**Stack:** Use a modern full-stack web app with streaming chat, source-specific ingestion, hybrid RAG, citation-aware metadata, and evaluation from the start. A practical MVP stack is Next.js, Vercel AI SDK, TypeScript, Tailwind/shadcn UI, PostgreSQL, Qdrant, LlamaIndex/LangChain, and GPT/Claude-class Korean-capable models. Firecrawl or similar crawlers should wait until source access review.

**Table stakes:** Students expect Korean chat Q&A, job search, recommendation matching, citation/source links, deadlines/freshness, preference controls, and clear safety/privacy language. Comparable university products increasingly add resume, interview, and application tools, but ERICA Career Chat should first win on source-grounded ERICA employment information.

**Watch out for:** The main failure modes are stale job data, unsupported hallucinated advice, indirect prompt injection from crawled content, opaque matching, over-collection of student data, unapproved crawling, and UI that hides citation/freshness details.

## Prescriptive Direction

1. Start with source governance and source registry design.
2. Build ingestion with metadata and citation anchors before chat polish.
3. Use hybrid retrieval and refusal behavior for Korean source-grounded answers.
4. Add explicit preference-based personalization only after baseline RAG is reliable.
5. Treat citations, freshness, and privacy controls as product surfaces.
6. Gate release with a Korean QA/evaluation set covering citations, stale listings, no-answer behavior, and answer quality.

## Research Files

- `.planning/research/seed-sources.md`
- `.planning/research/design-seed.md`
- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
