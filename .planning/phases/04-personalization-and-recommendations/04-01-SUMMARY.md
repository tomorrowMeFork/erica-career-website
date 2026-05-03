# 04-01 Summary: Preference Lifecycle Foundation

**Status:** Completed  
**Wave:** 1  
**Requirements:** PERS-01, PERS-03, SAFE-03, SAFE-04, SAFE-06

## Implemented

- Added Zod-first preference contracts with required `major` and `target_role`, optional structured arrays defaulting to `[]`, and `deadline_sensitivity` defaulting to `balanced`.
- Kept `session_only_optional_text` limited to non-persistent profile input and excluded it from stored/read preference state.
- Added strict persistent profile and consent schemas that reject unknown keys, unnecessary identifiers, inferred attributes, chat history, resume fields, SSO fields, invalid retention, and unsupported deletion behavior.
- Added `PreferenceStore`, `InMemoryPreferenceStore`, and `requirePreferencePersistenceConsent` with fail-closed persistent writes.
- Added `PreferenceService` set/update/clear/read lifecycle methods; `clearPreferences` erases structured preferences and returns `preference_ranking_enabled: false`.

## Verification

- `npm test -- src/personalization/preference-contract.test.ts`
- `npm test -- src/personalization/preference-store.test.ts src/personalization/preference-service.test.ts`
- `npm test -- src/personalization`
- `npm run typecheck`

## Notes

- Recommendation ranking, match reasons, evaluation CLI, UI, crawling, SSO, chat-history persistence, and provider calls remain out of scope for this wave.
