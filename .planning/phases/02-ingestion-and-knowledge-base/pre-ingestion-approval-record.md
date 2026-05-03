# Pre-Ingestion Approval Record

**Timestamp:** 2026-05-03T00:00:00Z  
**Phase/Plan:** Phase 2 / 02-01 Task 3  
**Evidence reference:** `.planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-access-evidence.md`  
**Decision:** Approve bounded public Playwright collection for all `sources.txt` source intents.

## User-approved scope

The user explicitly approved completing Phase 2 with bounded Playwright-based collection even for sources with robots.txt evidence. Approval is limited to exact registered source IDs and their original or currently observed same-host public URLs. This record does not approve broader crawling, off-registry URLs, login automation, private/authenticated pages, auth-state persistence, scheduled crawling, or production crawling.

`scheduled_crawling_enabled` remains `false` for every source.

## Approved source IDs

| approval option | source_id | approved collection method | scope |
|---|---|---|---|
| approve-ibus-html | `ibus-employment-board` | `approved_bounded_browser_discovery` | Original `sources.txt` ibus seed URL only: `https://ibus.hanyang.ac.kr/front/recruit/r-1` |
| approve-cdp-pdf | `cdp-student-guide-pdf` | `approved_manual_download` | Original `sources.txt` CDP student-guide PDF seed URL only: `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf` |
| approve-cdp-root-playwright | `cdp-root` | `approved_bounded_browser_discovery` | Observed same-host public URL only: `https://cdp.hanyang.ac.kr/Main/default.aspx` |
| approve-cdp-career-playwright | `cdp-career-category-discovery` | `approved_bounded_browser_discovery` | Observed same-host public URL only: `https://cdp.hanyang.ac.kr/Community/Notice/NoticeList.aspx` |
| approve-cdp-recruit-playwright | `cdp-recruit-category-discovery` | `approved_bounded_browser_discovery` | Observed same-host public URL only: `https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx` |
| approve-book-viewer-playwright | `book-success-story-viewer` | `approved_bounded_browser_discovery` | Original `sources.txt` viewer seed URL only: `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B` |

## Held source IDs

None for Phase 2 bounded public collection. The approval remains seed/observed-URL scoped and does not authorize broader crawling.

## Exact registry changes made

Only these registry fields were changed:

| source_id | field | previous value | new value |
|---|---|---|---|
| `ibus-employment-board` | `review_status` | `pending` | `reviewed` |
| `ibus-employment-board` | `allowed_collection_method` | `none_until_review` | `approved_bounded_browser_discovery` |
| `cdp-student-guide-pdf` | `review_status` | `pending` | `reviewed` |
| `cdp-student-guide-pdf` | `allowed_collection_method` | `none_until_review` | `approved_manual_download` |
| `cdp-root` | `review_status` | `pending` | `reviewed` |
| `cdp-root` | `allowed_collection_method` | `none_until_review` | `approved_bounded_browser_discovery` |
| `cdp-career-category-discovery` | `review_status` | `pending` | `reviewed` |
| `cdp-career-category-discovery` | `allowed_collection_method` | `none_until_review` | `approved_bounded_browser_discovery` |
| `cdp-recruit-category-discovery` | `review_status` | `pending` | `reviewed` |
| `cdp-recruit-category-discovery` | `allowed_collection_method` | `none_until_review` | `approved_bounded_browser_discovery` |
| `book-success-story-viewer` | `review_status` | `pending` | `reviewed` |
| `book-success-story-viewer` | `allowed_collection_method` | `none_until_review` | `approved_bounded_browser_discovery` |

All registry source records remain constrained to their exact approved method and `scheduled_crawling_enabled: false`.

## Rationale

- The user confirmed: `Approve two, hold rest`.
- The user later superseded the held decision by instructing: `robot.txt 가 있는 사이트는 playwright 기반 크롤링을 통해서라도 반드시 Phase2 완성해`.
- The user clarified that collection remains limited to original `sources.txt` seed sources only; no broader crawling or inferred URLs are approved.
- `ibus-employment-board` is approved only for bounded public HTML sample ingestion from the registered board seed URL.
- `cdp-student-guide-pdf` is approved only for manual PDF download/sample ingestion from the registered direct PDF seed URL with page-level citation preservation.
- CDP root/category sources and the book viewer are approved only for bounded public Playwright collection from exact registered or observed same-host URLs.
- No credentials, cookies, storage state, login automation, schedulers, cron jobs, queues, or background crawling are introduced by this approval record.
