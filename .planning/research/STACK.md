# Stack Research

**Created:** 2026-05-03  
**Scope:** Personalized Korean RAG chat service for Hanyang ERICA employment information.

## Candidate Stack

These are research-backed recommendations, not final architecture decisions. Adopt or revise them during phase planning after source-access, team, budget, and deployment constraints are known.

| Layer | Recommendation | Rationale |
|---|---|---|
| Frontend | Next.js App Router, TypeScript, Vercel AI SDK, Tailwind CSS, shadcn/ui | Strong full-stack web foundation, streaming chat support, fast UI iteration, accessible component base |
| Chat streaming | Server-Sent Events through Vercel AI SDK | Simpler than WebSockets for one-way model streaming and works well through common hosting/CDN paths |
| Backend | Next.js API/server actions for MVP; FastAPI optional for Python-heavy ingestion/RAG | Keeps MVP compact while leaving room for Python RAG tooling |
| Ingestion | Source-specific fetchers first; Firecrawl/Crawl4AI only after source access review | Avoids premature production crawling and respects source authorization constraints |
| Parsing | HTML parser for board/list pages; PDF parser with page-level metadata | Needed for Hanyang board pages, CDP guidebook, and success-story documents |
| RAG framework | LlamaIndex for ingestion/retrieval pipelines; LangChain optional for agents/tools | LlamaIndex is strong for document pipelines and evaluation; LangChain ecosystem remains broad |
| Retrieval | Hybrid lexical + semantic retrieval with reranking | Exact Korean titles/deadlines and semantic user questions both matter |
| Embeddings | OpenAI `text-embedding-3-large` or BGE-M3 | Both support multilingual/Korean retrieval; BGE-M3 is attractive for self-hosting and hybrid retrieval |
| Vector storage | Qdrant for vector/hybrid search; PostgreSQL for metadata, user preferences, source registry, sync state | Qdrant offers strong retrieval performance; Postgres keeps operational metadata relational |
| LLM | GPT-4o/Claude-class model for MVP; evaluate HyperCLOVA X, K-EXAONE, or Mi:dm K if Korean nuance becomes central | MVP needs reliable Korean and citation-following; Korean-specialized models are future evaluation candidates |
| Observability | Langfuse or equivalent traces | Needed to debug retrieval, citations, prompt versions, and answer failures |
| Evaluation | RAGAS plus custom Korean/citation/freshness checks | Measures faithfulness, answer relevance, retrieval recall, and source-grounded behavior |

## Architecture Pattern

1. Source registry defines allowed URLs, source type, refresh cadence, access notes, and owner label.
2. Ingestion fetches approved sources, normalizes records, extracts metadata, and stores raw/clean text.
3. Chunking preserves title, URL, source category, posted date, fetched timestamp, page/section anchors, and content hash.
4. Retrieval uses Korean query handling, metadata filters, hybrid search, and reranking.
5. Generation receives only retrieved context and must cite source numbers or refuse.
6. UI renders answers with source cards, freshness labels, and official-page links.
7. Evaluation and tracing run against a golden Korean QA dataset before release.

## Stack Decisions to Revisit

- Whether ingestion should remain source-specific or adopt Firecrawl after access review.
- Whether Python service separation is worth the complexity before the first MVP.
- Whether Korean-specialized LLMs outperform GPT/Claude on ERICA-specific student queries.
- Whether Qdrant alone can handle hybrid retrieval needs or if a separate BM25 index is required.

## Pitfalls the Stack Must Avoid

- Pure vector search that misses exact job titles, deadlines, and department names.
- Fixed-size chunks without page/section metadata.
- Citation formatting that is not mechanically tied to retrieved source metadata.
- Mixing embedding model versions in one index without migration.
- Stale job postings with no visible deadline/freshness state.
- Prompt injection from crawled pages.
- No golden dataset or traces, making hallucination regressions invisible.
