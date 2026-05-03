# Phase 4 Pattern Map

**Generated:** 2026-05-04  
**Purpose:** Codebase pattern context for Phase 4 plan execution.

## Relevant Existing Contracts

| File | Contract / Pattern | Phase 4 Use |
|---|---|---|
| `src/chat/chat-contract.ts` | `ChatCitationSchema`, `ChatResponseSchema`, strict Zod-first chat surfaces | Mirror citation/freshness metadata in recommendation responses. |
| `src/retrieval/retriever.ts` | `Retriever`, `RetrieveInput`, `RetrievedChunk` with `normalized_score`, `matched_terms`, and `ranking_features` | Feed recommendation candidate ranking without replacing retrieval. |
| `src/retrieval/bm25-retriever.ts` | BM25-style ranking with freshness boost, deadline penalty, boilerplate penalty | Treat current retrieval score as evidence relevance and add preference/source-quality scoring on top. |
| `src/ingestion/normalized-record.ts` | `KnowledgeChunkSchema`, citation anchors, deadline/freshness metadata, `source_text_trust` | Preserve official URLs, timestamps, deadline status, and untrusted-source boundary. |
| `src/audit/audit-log.ts` | Query hashing, stable JSONL, metadata-only audit posture | Reuse privacy posture; do not log raw optional preference free text. |
| `src/chat/output-validation.ts` | Korean/citation/safety validation concepts | Mirror validation for Korean match reasons and allowed citation markers. |

## Implementation Patterns to Preserve

- Strict TypeScript ESM with `.js` import specifiers.
- Zod schemas exported beside inferred TypeScript types.
- Vitest tests for schema parsing, deterministic scoring, unsafe-output guards, and no-network fixtures.
- Dependency injection for services so retrievers, stores, clocks, and trace IDs are deterministic in tests.
- Korean-first user-facing strings and citation/freshness metadata on every source-grounded recommendation.
- No new external dependency is needed for Phase 4.

## Recommended New Structure

```text
src/personalization/
  preference-contract.ts
  preference-contract.test.ts
  preference-store.ts
  preference-store.test.ts
  preference-service.ts
  preference-service.test.ts
src/recommendations/
  recommendation-contract.ts
  source-quality.ts
  source-quality.test.ts
  ranking.ts
  ranking.test.ts
  match-reasons.ts
  match-reasons.test.ts
  recommendation-service.ts
  recommendation-service.test.ts
scripts/evaluate-personalization.ts
scripts/evaluate-personalization.test.ts
```

## Verification Commands

- `npm test -- src/personalization`
- `npm test -- src/recommendations`
- `npm test -- scripts/evaluate-personalization.test.ts`
- `npm run typecheck`
- `npm test`
