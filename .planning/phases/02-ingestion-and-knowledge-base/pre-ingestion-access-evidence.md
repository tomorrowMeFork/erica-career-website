# Pre-Ingestion Access Evidence

**Generated:** 2026-05-03  
**Scope:** Phase 2 plan 02-01 Tasks 1-2 only.  
**Registry:** `.planning/phases/01-source-discovery-and-governance/source-registry.yaml`

## Gate Result

- Evaluated all six current seed source records.
- Parser-eligible records: 6/6.
- Registry-backed access gate decisions reflect the latest approval record.
- `scheduled_crawling_enabled` remains false for every source; scheduled crawling is not implemented.
- This evidence reflects current registry gate decisions. Approval authority remains the explicit approval record, not this generated evidence file.

| source_id | requested parser method | gate status | parser eligible | effective method | auth boundary | response type | robots status | ToS status | scheduled crawling | reasons |
|---|---|---|---|---|---|---|---|---|---|---|
| cdp-root | public_html | allowed | yes | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false |  |
| cdp-career-category-discovery | public_html | allowed | yes | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false |  |
| cdp-recruit-category-discovery | public_html | allowed | yes | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false |  |
| book-success-story-viewer | public_html | allowed | yes | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false |  |
| cdp-student-guide-pdf | manual_pdf_download | allowed | yes | manual_pdf_download | public | pdf | disallow_all_raw_evidence | not_reviewed | false |  |
| ibus-employment-board | public_html | allowed | yes | public_html | public | html | allow_empty_disallow | not_reviewed | false |  |

## CDP category/login gap

- Phase 1 UAT recorded a major CDP structure/login feasibility gap: CDP collection planning must be based on observed website structure and access status, not schema tests alone.
- `cdp-career-category-discovery` and `cdp-recruit-category-discovery` use currently observed same-host public URLs only.
- CDP category parser work remains limited to the latest explicit human-approved bounded Playwright scope.
- Login automation is not implemented in this phase. If a login boundary is observed later, separate explicit authorization and a non-persistent, redacted observation plan are required before any collection work.

## Parser eligibility by source

### cdp-root

- Observed URL: `https://cdp.hanyang.ac.kr/Main/default.aspx`
- Parser eligibility: allowed for bounded Playwright HTML collection from the observed same-host public URL.
- Auth boundary: public; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. User explicitly approved bounded Playwright collection on 2026-05-03 for Phase 2 completion despite robots evidence. Collection is limited to the observed same-host public surface /Main/default.aspx, one ephemeral browser context, same-origin routing, no stored auth state, no scheduled crawling, and low concurrency. No ToS page located during research.

### cdp-career-category-discovery

- Observed URL: `https://cdp.hanyang.ac.kr/Community/Notice/NoticeList.aspx`
- Parser eligibility: allowed for bounded Playwright HTML collection from the observed same-host public URL.
- Auth boundary: public; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. User explicitly approved bounded Playwright collection on 2026-05-03 for Phase 2 completion despite robots evidence. Current observed public URL for 취업정보 is /Community/Notice/NoticeList.aspx. Collection is limited to this same-host URL with one ephemeral browser context, same-origin routing, no stored auth state, no scheduled crawling, and low concurrency.

### cdp-recruit-category-discovery

- Observed URL: `https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx`
- Parser eligibility: allowed for bounded Playwright HTML collection from the observed same-host public URL.
- Auth boundary: public; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. User explicitly approved bounded Playwright collection on 2026-05-03 for Phase 2 completion despite robots evidence. Current observed public URL for 채용정보 is /Career/Job/RecruitList.aspx. Collection is limited to this same-host URL with one ephemeral browser context, same-origin routing, no stored auth state, no scheduled crawling, and low concurrency. Freshness remains critical for recruitment listings.

### book-success-story-viewer

- Observed URL: `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B`
- Parser eligibility: allowed for bounded Playwright HTML collection from the original public viewer URL.
- Auth boundary: public; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: robots.txt returns Disallow: / for User-agent: *. User explicitly approved bounded Playwright collection on 2026-05-03 for Phase 2 completion despite robots evidence. Collection is limited to the original public viewer seed URL with one ephemeral browser context, same-origin routing, no stored auth state, no scheduled crawling, and low concurrency. Viewer content is treated as HTML-rendered untrusted source text with source-level citation.

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

Task 3 approval is recorded in `.planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md`. Downstream parser commands must remain limited to currently allowed registry decisions and exact approved public URLs.
