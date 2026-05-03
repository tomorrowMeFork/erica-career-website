# Source Coverage Status

**Updated:** 2026-05-03T08:45:00Z  
**Plan:** Phase 2 / 02-06

Every `sources.txt` source intent now has an approved bounded collection path. The latest user instruction superseded the earlier "approve two, hold rest" decision for public robots.txt sources, while keeping collection limited to exact seed or observed same-host public URLs.

## Coverage Summary

| # | source_id | sources.txt intent | disposition | collection path |
|---|---|---|---|---|
| 1 | `cdp-root` | 한양대 커리어 개발센터 | implemented bounded collector | `npm run ingest:playwright:sources` collects `https://cdp.hanyang.ac.kr/Main/default.aspx` |
| 2 | `cdp-career-category-discovery` | CDP 취업정보 하위항목 전체 | implemented bounded collector | `npm run ingest:playwright:sources` collects `https://cdp.hanyang.ac.kr/Community/Notice/NoticeList.aspx` |
| 3 | `cdp-recruit-category-discovery` | CDP 채용정보 하위항목 전체 | implemented bounded collector | `npm run ingest:playwright:sources` collects `https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx` |
| 4 | `book-success-story-viewer` | 취업성공후기 | implemented bounded collector | `npm run ingest:playwright:sources` collects `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B` |
| 5 | `cdp-student-guide-pdf` | 커리어개발센터 가이드북 | implemented bounded collector | `npm run ingest:cdp-pdf:sample` fixture/live manual PDF path |
| 6 | `ibus-employment-board` | 경상대학 취업정보 게시판 | implemented bounded collector | `npm run ingest:ibus:sample` fixture/live bounded board path |

## Bounds And Safety

- Playwright collection uses one ephemeral context per source, same-origin request routing, no `storageState`, no persistent profile, no traces, no screenshots, and no stored cookies.
- The Playwright source script is fixed to four exact public URLs and inserts a 1200ms delay between source navigations.
- Ibus live collection enforces `COLLECT_MAX_PAGES <= 5`, `COLLECT_DELAY_MS >= 1200`, strict integer parsing, and delay before each detail request.
- `scheduled_crawling_enabled` remains `false` for every source.
- Generated JSONL outputs remain under ignored `data/knowledge-base/` paths and are not committed.

## Verification Commands

```bash
npm run typecheck
npm test
npm run validate:sources
npm run verify:source-governance
npm run ingest:ibus:sample -- --fixture
npm run ingest:cdp-pdf:sample -- --fixture
npm run ingest:playwright:sources
npm run verify:knowledge-base -- data/knowledge-base/fixture-ibus
npm run verify:knowledge-base -- data/knowledge-base/fixture-cdp-pdf
npm run verify:knowledge-base -- data/knowledge-base/playwright-sources
```

## Constraints Maintained

- Korean source labels, official URLs, citation anchors, fetched timestamps, and `source_text_trust: "untrusted_source_text"` are preserved.
- No official Hanyang endorsement, production crawling permission, SSO access, or scheduled crawling is claimed.
- No `.env` values, cookies, auth state, screenshots, traces, or generated live corpus are committed.
