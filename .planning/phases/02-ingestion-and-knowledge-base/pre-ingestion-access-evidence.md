# Pre-Ingestion Access Evidence

**Generated:** 2026-05-03  
**Scope:** Phase 2 plan 02-01 Tasks 1-2 only.  
**Registry:** `.planning/phases/01-source-discovery-and-governance/source-registry.yaml`

## Gate Result

- Evaluated all six current seed source records.
- Parser-eligible records: 2/6.
- All currently pending records are blocked from parser collection by the registry-backed access gate.
- `scheduled_crawling_enabled` remains false for every source; scheduled crawling is not implemented.
- This evidence reflects current registry gate decisions. Approval authority remains the explicit approval record, not this generated evidence file.

| source_id | requested parser method | gate status | parser eligible | effective method | auth boundary | response type | robots status | ToS status | scheduled crawling | reasons |
|---|---|---|---|---|---|---|---|---|---|---|
| cdp-root | public_html | blocked | no | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false | source not reviewed: review_status is pending; unapproved collection method: none_until_review does not allow requested public_html; collection method is none_until_review until human access review is complete |
| cdp-career-category-discovery | public_html | blocked | no | structure_observation_only | public | html | disallow_all_raw_evidence | not_reviewed | false | source not reviewed: review_status is pending; unapproved collection method: none_until_review does not allow requested public_html; collection method is none_until_review until human access review is complete; CDP category/book viewer remains structure-observation-only until explicit approval evidence exists |
| cdp-recruit-category-discovery | public_html | blocked | no | structure_observation_only | public | html | disallow_all_raw_evidence | not_reviewed | false | source not reviewed: review_status is pending; unapproved collection method: none_until_review does not allow requested public_html; collection method is none_until_review until human access review is complete; CDP category/book viewer remains structure-observation-only until explicit approval evidence exists |
| book-success-story-viewer | public_html | blocked | no | structure_observation_only | public | viewer | disallow_all_raw_evidence | not_reviewed | false | source not reviewed: review_status is pending; unapproved collection method: none_until_review does not allow requested public_html; collection method is none_until_review until human access review is complete; requested method mismatch: public_html cannot collect viewer; CDP category/book viewer remains structure-observation-only until explicit approval evidence exists |
| cdp-student-guide-pdf | manual_pdf_download | allowed | yes | manual_pdf_download | public | pdf | disallow_all_raw_evidence | not_reviewed | false |  |
| ibus-employment-board | public_html | allowed | yes | public_html | public | html | allow_empty_disallow | not_reviewed | false |  |

## CDP category/login gap

- Phase 1 UAT recorded a major CDP structure/login feasibility gap: CDP collection planning must be based on observed website structure and access status, not schema tests alone.
- `cdp-career-category-discovery` and `cdp-recruit-category-discovery` remain conditional. The last local discovery notes recorded `no_candidates_observed`; no category URLs are fabricated here.
- CDP category parser work remains blocked until safe public structure or explicit human-approved access evidence exists.
- Login automation is not implemented in this phase. If a login boundary is observed later, separate explicit authorization and a non-persistent, redacted observation plan are required before any collection work.

## Parser eligibility by source

### cdp-root

- Observed URL: `https://cdp.hanyang.ac.kr/`
- Parser eligibility: blocked pending review.
- Auth boundary: public; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. Generic markdown fetch failed with JavaScript error; root likely requires browser automation or targeted HTTP inspection. No ToS page located during research. Category subpages are separate source intents. CDP root serves as the top-level discovery anchor for career and recruitment subpages.

### cdp-career-category-discovery

- Observed URL: `https://cdp.hanyang.ac.kr/`
- Parser eligibility: blocked; structure-observation-only unless explicitly reviewed and approved.
- Auth boundary: public; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. Exact 취업정보 category URLs not yet enumerated; CDP root fetch failed through generic markdown fetcher. Category URLs require browser/manual discovery within seed scope (Plan 03). No ToS page located. Shares CDP host with cdp-root and cdp-recruit-category-discovery but represents a distinct source intent.

### cdp-recruit-category-discovery

- Observed URL: `https://cdp.hanyang.ac.kr/`
- Parser eligibility: blocked; structure-observation-only unless explicitly reviewed and approved.
- Auth boundary: public; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. Exact 채용정보 category URLs not yet enumerated; CDP root fetch failed through generic markdown fetcher. Category URLs require browser/manual discovery within seed scope (Plan 03). No ToS page located. Freshness is critical: stale recruitment listings must be detected and excluded or marked. Shares CDP host with cdp-root and cdp-career-category-discovery but represents a distinct source intent.

### book-success-story-viewer

- Observed URL: `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B`
- Parser eligibility: blocked; viewer remains structure-observation-only unless explicitly reviewed and approved.
- Auth boundary: public; response type: viewer.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. Viewer page exposes Korean title '[E 커리어개발팀] 2024 EBS 취업성공후기_한양인의 취업지식기부' with search/print/download UI labels. Viewer may render PDF pages or images; exact asset format needs identification during discovery. No ToS page located. Success stories serve as qualitative career advice and examples requiring source title/page citations.

### cdp-student-guide-pdf

- Observed URL: `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf`
- Parser eligibility: allowed for approved manual PDF sample ingestion from the original seed URL only.
- Auth boundary: public; response type: pdf.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. Direct PDF URL returned a PDF header with 52 pages. PDF parsing will require page-level citations and refresh checks. No ToS page located. Content grounds answers about CDP usage, student processes, and official guidance. Shares CDP host with cdp-root but represents a distinct document intent.

### ibus-employment-board

- Observed URL: `https://ibus.hanyang.ac.kr/front/recruit/r-1`
- Parser eligibility: allowed for approved bounded public HTML sample ingestion from the original seed URL only.
- Auth boundary: public; response type: html.
- Robots/ToS: allow_empty_disallow / not_reviewed.
- Registry note: robots.txt returns an empty Disallow: line (allowing all). Board is publicly reachable with Korean title '취업정보', 12 listings per page, dates, hit counts, detail links (/front/recruit/r-1/view?id=...), and pagination to at least page 163. No ToS page located. Faculty-specific scope for ERICA College of Business and Economics; do not treat as campus-wide. Detail URLs should be recorded as patterns but not bulk-ingested during discovery.

## Task 3 checkpoint

Task 3 approval is recorded in `.planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md`. Downstream parser commands must remain limited to currently allowed registry decisions and must continue to fail closed for held sources.
