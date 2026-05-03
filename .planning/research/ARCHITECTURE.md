# Architecture Research

**Created:** 2026-05-03

## System Components

| Component | Responsibility |
|---|---|
| Source Registry | Stores approved sources, source types, access notes, refresh cadence, and authorization status |
| Ingestion Workers | Fetch and parse approved HTML/PDF sources, detect changes, and normalize documents/listings |
| Metadata Store | Stores source records, content hashes, listing deadlines, freshness status, user preferences, and audit logs |
| Retrieval Index | Stores chunks and embeddings with citation metadata for hybrid retrieval |
| RAG Service | Rewrites/handles Korean queries, retrieves evidence, reranks chunks, assembles prompts, and enforces citation/refusal rules |
| Chat API | Streams answers and citations to the web UI while recording retrieval and model audit data |
| Web UI | Provides Korean-first chat, source cards, recommendations, filters, and preference controls |
| Evaluation Harness | Runs reference questions against retrieval and answer-generation metrics |

## Data Flow

1. Operator registers or approves a source in the source registry.
2. Ingestion fetches the source according to access policy and refresh cadence.
3. Parser extracts records and stores raw text, normalized fields, source URL, posted date, fetched timestamp, deadline status, and content hash.
4. Chunker creates citation-ready chunks with page/section anchors.
5. Indexer embeds changed chunks and upserts them into the retrieval index.
6. Student asks a Korean question or opens recommendations.
7. RAG service applies preference filters where appropriate, retrieves/reranks evidence, and prompts the LLM with grounded context.
8. Chat API streams a Korean answer with citations and source cards.
9. Audit logs store source IDs, prompt version, model config, timestamps, and feedback.
10. Evaluation jobs run reference queries to detect retrieval, citation, freshness, and refusal regressions.

## Build Order Implications

- Source governance must precede automated ingestion.
- Ingestion metadata must precede citation-aware RAG.
- RAG audit logs should be built with the first chat MVP, not added after launch.
- Personalization should come after reliable non-personalized answers.
- UI polish should follow a dedicated UI contract because citations and freshness are core trust surfaces.
- Safety/evaluation must be continuous, but the full release gate comes after the main flows exist.

## Recommended Boundaries

- Keep source ingestion and RAG logic modular so crawlers, parsers, embeddings, and LLM providers can change.
- Keep user preference data separate from source documents and audit logs.
- Do not mix official-source data with general web search results unless the UI labels the distinction clearly.
- Prefer deterministic metadata extraction for deadlines and citations over LLM-only extraction where possible.
