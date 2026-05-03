# 04-03 Summary: Match Reasons and RecommendationService

**Status:** Completed  
**Wave:** 3  
**Requirements:** PERS-02, PERS-04, SAFE-03, SAFE-06

## Implemented

- Added fixed-template Korean match reasons with 1-3 citation-bearing bullets and validation for allowed inline numeric citation IDs.
- Connected explicit `전공` and `관심직무` labels only when ranking evidence includes corresponding score signals.
- Labeled weak/ambiguous recommendations as `일반 안내` or `참고 정보` instead of strong personalized recommendations.
- Rejected unsupported endorsement, guarantee, citation-suppression, and privacy-risk phrases in recommendation reasons.
- Added `RecommendationService` orchestration over injected `Retriever`, optional `PreferenceService`, deterministic clock, trace ID generation, ranking, reason building, and response validation.
- Extended recommendation contracts minimally with optional `match_reasons` on items and required `privacy_metadata` on responses.
- Preserved citation/freshness metadata while keeping raw chunk text and `session_only_optional_text` out of service responses.

## Verification

- `npm test -- src/recommendations/match-reasons.test.ts`
- `npm test -- src/recommendations/recommendation-service.test.ts`
- `npm test -- src/recommendations`
- `npm run typecheck`

## Notes

- Evaluation CLI, package scripts, UI, crawling, persistence backend, SSO, chat-history persistence, LLM calls, and external provider calls remain out of scope for this wave.
