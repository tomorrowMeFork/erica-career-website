# Source Coverage Status

**Updated:** 2026-05-17T00:00:00Z  
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
| 6 | `ibus-employment-board` | 경상대학 취업정보 게시판 | implemented bounded collector | `npm run ingest:ibus` fixture/live bounded board path |
| 7 | `ewil-internship-system` | 현장실습 지원 시스템 | public landing page indexed | Static reviewed public landing-page KB under `data/knowledge-base/ewil-homepage` |
| 8 | `ewil-notice-board` | E-WIL 공지사항/인턴공고 | manual authenticated exact-URL collector | `npm run ingest:ewil:authenticated` opens a headed ephemeral browser; user logs in manually; collector visits only `data/list.do?type=NOTICE` |
| 9 | `ewil-info-board` | E-WIL 설명회 | manual authenticated exact-URL collector | `npm run ingest:ewil:authenticated` visits only `data/list.do?type=INFO` after manual login |
| 10 | `ewil-internship-reviews` | E-WIL 실습 후기 | manual authenticated exact-URL collector | `npm run ingest:ewil:authenticated` visits only `internphoto/compList.do` after manual login |
| 11 | `cdp-recruit-general-board` | CDP 일반채용공고 | manual authenticated exact-URL collector | `npm run ingest:cdp:authenticated` opens a headed ephemeral browser; user logs in manually; collector visits only `Career/Job/RecruitList.aspx` and same-host detail pages discovered from that list |
| 12 | `cdp-recruit-event-board` | CDP 채용상담 및 설명회 | manual authenticated exact-URL collector | `npm run ingest:cdp:authenticated` visits only `Community/Notice/RecruitEvent.aspx` and same-host detail pages discovered from that list |

## Bounds And Safety

- Playwright collection uses one ephemeral context per source, same-origin request routing, no `storageState`, no persistent profile, no traces, no screenshots, and no stored cookies.
- The Playwright source script is fixed to four exact public URLs and inserts a 1200ms delay between source navigations.
- CDP authenticated recruitment boards now have an optional E-WIL-style manual-session collector. It is exact-list-URL-only, requires user-manual login in a headed ephemeral Playwright context, blocks off-host requests, does not automate login, does not save storage state/cookies/traces/screenshots/HAR, and writes optional output under `data/knowledge-base/cdp-authenticated-sources`.
- The older CDP manual JSON export path remains available: when the user manually provides post exports for `채용정보 > 채용상담 및 설명회` or `채용정보 > 일반채용공고`, `npm run ingest:cdp:manual-posts -- --input <manual-export.json>` can convert that local export into citation-ready records under `data/knowledge-base/manual-cdp-posts`, preserving each provided post detail URL as the primary citation anchor.
- E-WIL public landing-page text is represented under `data/knowledge-base/ewil-homepage`.
- E-WIL NOTICE/INFO/실습후기 collection requires user-manual login in a headed ephemeral Playwright context. The collector is exact-URL-only, does not automate login, does not save storage state/cookies/traces/screenshots/HAR, and keeps scheduled crawling disabled.
- Ibus live collection enforces `COLLECT_MAX_PAGES <= 5`, `COLLECT_DELAY_MS >= 1200`, strict integer parsing, and delay before each detail request.
- `scheduled_crawling_enabled` remains `false` for every source.
- Generated JSONL outputs remain under ignored `data/knowledge-base/` paths and are not committed.

## Verification Commands

```bash
npm run typecheck
npm test
npm run validate:sources
npm run verify:source-governance
npm run ingest:ibus -- --fixture
npm run ingest:cdp:manual-posts -- --input fixtures/ingestion/cdp-manual-posts.example.json --output /tmp/manual-cdp-posts
npm run ingest:cdp:authenticated -- --source all --max-list-pages 1 --max-detail-pages 10
npm run ingest:cdp-pdf:sample -- --fixture
npm run ingest:playwright:sources
npm run verify:knowledge-base -- data/knowledge-base/fixture-ibus
npm run verify:knowledge-base -- data/knowledge-base/fixture-cdp-pdf
npm run verify:knowledge-base -- data/knowledge-base/playwright-sources
npm run verify:knowledge-base -- data/knowledge-base/ewil-homepage
npm run ingest:ewil:authenticated -- --output data/knowledge-base/ewil-authenticated-sources
npm run verify:knowledge-base -- data/knowledge-base/ewil-authenticated-sources
```

## Constraints Maintained

- Korean source labels, official URLs, citation anchors, fetched timestamps, and `source_text_trust: "untrusted_source_text"` are preserved.
- No official Hanyang endorsement, production crawling permission, SSO access, or scheduled crawling is claimed.
- No `.env` values, cookies, auth state, screenshots, traces, or generated live corpus are committed.
