# 04-02 Summary: Recommendation Contracts and Ranking

**Status:** Completed  
**Wave:** 2  
**Requirements:** PERS-02, PERS-04, SAFE-03

## Implemented

- Added Zod-first recommendation request/item/response contracts with optional `profile` support for no-preference recommendations.
- Reused `ChatCitationSchema` so recommendation items preserve citation IDs, source metadata, fetched/posted timestamps, deadline status, and page numbers.
- Kept normal recommendation item output free of raw source text fields (`text`, `raw_text`, `cleaned_text`) and session-only optional free text.
- Added deterministic source-quality scoring that rewards active deadlines, recent posted/fetched timestamps, detailed official URLs/citation anchors, page anchors, and low boilerplate penalty.
- Added deterministic score-based ranking over `RetrievedChunk` candidates with exact weights: base retrieval `0.30`, major `0.20`, target role `0.20`, optional preferences `0.10`, source quality `0.15`, and freshness `0.05`.
- Preserved candidate visibility for preference mismatches; ranking excludes only candidates whose citation/item schema parsing fails.
- Added no-preference ranking mode that favors active/latest/source-grounded candidates and emits `general_recommendation`.

## Verification

- `npm test -- src/recommendations/recommendation-contract.test.ts src/recommendations/source-quality.test.ts`
- `npm test -- src/recommendations/ranking.test.ts`
- `npm test -- src/recommendations`
- `npm run typecheck`

## Notes

- Match reasons, `RecommendationService`, evaluation CLI, package scripts, UI, crawling, persistence backend, SSO, chat-history persistence, LLM calls, and provider calls remain out of scope for this wave.
