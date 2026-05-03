# Pre-Ingestion Approval Record

**Timestamp:** 2026-05-03T00:00:00Z  
**Phase/Plan:** Phase 2 / 02-01 Task 3  
**Evidence reference:** `.planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-access-evidence.md`  
**Decision:** Approve two, hold rest.

## User-approved scope

The user explicitly approved only the original `sources.txt` seed sources listed below. Approval is limited to those exact registered source IDs and their seed URLs. This record does not approve broader crawling, inferred CDP category URLs, off-registry URLs, login automation, private/authenticated pages, scheduled crawling, or production crawling.

`scheduled_crawling_enabled` remains `false` for every source.

## Approved source IDs

| approval option | source_id | approved collection method | scope |
|---|---|---|---|
| approve-ibus-html | `ibus-employment-board` | `approved_bounded_browser_discovery` | Original `sources.txt` ibus seed URL only: `https://ibus.hanyang.ac.kr/front/recruit/r-1` |
| approve-cdp-pdf | `cdp-student-guide-pdf` | `approved_manual_download` | Original `sources.txt` CDP student-guide PDF seed URL only: `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf` |

## Held source IDs

These sources have no live ingestion approval for now and remain blocked from parser collection:

- `cdp-root`
- `cdp-career-category-discovery`
- `cdp-recruit-category-discovery`
- `book-success-story-viewer`

CDP category discovery and the book viewer remain structure-observation-only unless a later explicit approval record and registry update authorizes a specific method.

## Exact registry changes made

Only these registry fields were changed:

| source_id | field | previous value | new value |
|---|---|---|---|
| `ibus-employment-board` | `review_status` | `pending` | `reviewed` |
| `ibus-employment-board` | `allowed_collection_method` | `none_until_review` | `approved_bounded_browser_discovery` |
| `cdp-student-guide-pdf` | `review_status` | `pending` | `reviewed` |
| `cdp-student-guide-pdf` | `allowed_collection_method` | `none_until_review` | `approved_manual_download` |

All other registry source records remain pending with `allowed_collection_method: none_until_review`.

## Rationale

- The user confirmed: `Approve two, hold rest`.
- The user clarified that collection remains limited to original `sources.txt` seed sources only; no broader crawling or inferred URLs are approved.
- `ibus-employment-board` is approved only for bounded public HTML sample ingestion from the registered board seed URL.
- `cdp-student-guide-pdf` is approved only for manual PDF download/sample ingestion from the registered direct PDF seed URL with page-level citation preservation.
- CDP root/category sources and the book viewer are held because current evidence does not approve live ingestion paths for those intents.
- No credentials, cookies, storage state, login automation, schedulers, cron jobs, queues, or background crawling are introduced by this approval record.
