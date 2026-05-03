# Phase 2 Plan 02-03 Summary

## Completed

- Implemented `src/ingestion/deadline-status.ts` with deterministic Korean deadline classification for `마감`, `채용시까지`, `상시`, D-day markers, explicit full dates, and ambiguous month/day ranges without fabricated dates.
- Added sanitized fixture-first ibus public board coverage in `fixtures/ingestion/ibus-listing.html` and `fixtures/ingestion/ibus-detail.html` using the approved seed URL pattern, Korean `취업정보` title, listing detail links, dates, hit counts, and Korean detail body text.
- Implemented `src/ingestion/html/ibus-board-parser.ts` with Cheerio-based listing/detail parsing and `NormalizedRecordSchema` validation for citation-ready records.
- Added parser and classifier tests covering official HTTPS detail URL resolution, posted/deadline metadata, faculty-specific Korean source/category labels, citation anchors, content hashes, untrusted source marker, and fail-closed blocked/no-approval evidence paths.

## Files changed

- `src/ingestion/deadline-status.ts`
- `src/ingestion/deadline-status.test.ts`
- `src/ingestion/html/ibus-board-parser.ts`
- `src/ingestion/html/ibus-board-parser.test.ts`
- `fixtures/ingestion/ibus-listing.html`
- `fixtures/ingestion/ibus-detail.html`
- `.planning/phases/02-ingestion-and-knowledge-base/02-03-SUMMARY.md`

## Scope and gate status

- No live network fetching, crawling, pagination crawling, auth/login, credentials, scheduler, storage state, UI, vector DB, LLM, or PDF parser work was added.
- `buildIbusNormalizedRecords` requires an allowed `ibus-employment-board` `public_html` access decision plus approval evidence naming `approved_bounded_browser_discovery` and the original ibus seed URL.
- Records preserve the faculty-specific scope: `source_name: 경상대학 취업정보 게시판` and `category: ERICA 경상대학 취업정보`; ibus is not labeled campus-wide.
- Source text remains marked `source_text_trust: untrusted_source_text`.

## Commands run

- `npm run validate:sources`: pass.
- `test -f .planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md`: pass.
- `npm test -- src/ingestion/html/ibus-board-parser.test.ts src/ingestion/deadline-status.test.ts`: pass, 14 tests.
- `npm run typecheck`: pass.
- `npm run verify:source-governance`: pass.
- LSP diagnostics could not run because `typescript-language-server` is not installed in the environment; TypeScript verification passed via `tsc --noEmit`.

## Wave 3 status

- Wave 3 ibus fixture-first HTML parsing is implemented and verified. Held sources remain blocked unless a later approval record and registry update authorizes them.
