# Pre-Ingestion Access Evidence

**Generated:** 2026-05-03  
**Scope:** Phase 2 plan 02-01 Tasks 1-2 only.  
**Registry:** `.planning/phases/01-source-discovery-and-governance/source-registry.yaml`

## Gate Result

- Evaluated all 12 current seed source records.
- Parser-eligible records: 12/12.
- Registry-backed access gate decisions reflect the latest approval record.
- `scheduled_crawling_enabled` remains false for every source; scheduled crawling is not implemented.
- This evidence reflects current registry gate decisions. Approval authority remains the explicit approval record, not this generated evidence file.

| source_id | requested parser method | gate status | parser eligible | effective method | auth boundary | response type | robots status | ToS status | scheduled crawling | reasons |
|---|---|---|---|---|---|---|---|---|---|---|
| cdp-root | public_html | allowed | yes | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false |  |
| cdp-career-category-discovery | public_html | allowed | yes | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false |  |
| cdp-recruit-category-discovery | public_html | allowed | yes | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false |  |
| cdp-recruit-general-board | manual_login_session | allowed | yes | manual_login_session | login_required | html | disallow_all_raw_evidence | not_reviewed | false |  |
| cdp-recruit-event-board | manual_login_session | allowed | yes | manual_login_session | login_required | html | disallow_all_raw_evidence | not_reviewed | false |  |
| book-success-story-viewer | public_html | allowed | yes | public_html | public | html | disallow_all_raw_evidence | not_reviewed | false |  |
| cdp-student-guide-pdf | manual_pdf_download | allowed | yes | manual_pdf_download | public | pdf | disallow_all_raw_evidence | not_reviewed | false |  |
| ibus-employment-board | public_html | allowed | yes | public_html | public | html | allow_empty_disallow | not_reviewed | false |  |
| ewil-internship-system | public_html | allowed | yes | public_html | public | html | unreachable | not_reviewed | false |  |
| ewil-notice-board | manual_login_session | allowed | yes | manual_login_session | login_required | html | unreachable | not_reviewed | false |  |
| ewil-info-board | manual_login_session | allowed | yes | manual_login_session | login_required | html | unreachable | not_reviewed | false |  |
| ewil-internship-reviews | manual_login_session | allowed | yes | manual_login_session | login_required | html | unreachable | not_reviewed | false |  |

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

### cdp-recruit-general-board

- Observed URL: `https://cdp.hanyang.ac.kr/Career/Job/RecruitList.aspx`
- Parser eligibility: allowed for approved user-manual-login non-persistent collection from the exact 일반채용공고 board URL only.
- Auth boundary: login_required; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: User explicitly approved E-WIL-style headed manual-session CDP collection on 2026-05-17. Scope is limited to the exact list URL /Career/Job/RecruitList.aspx and same-host detail pages discovered from that list. The user must operate login manually in a fresh non-persistent Playwright browser. No credential entry by script, cookies, localStorage, storageState files, HAR, traces, screenshots, broad crawling, off-host requests, or scheduled crawling are allowed.

### cdp-recruit-event-board

- Observed URL: `https://cdp.hanyang.ac.kr/Community/Notice/RecruitEvent.aspx`
- Parser eligibility: allowed for approved user-manual-login non-persistent collection from the exact 채용상담 및 설명회 board URL only.
- Auth boundary: login_required; response type: html.
- Robots/ToS: disallow_all_raw_evidence / not_reviewed.
- Registry note: User explicitly approved E-WIL-style headed manual-session CDP collection on 2026-05-17. Scope is limited to the exact list URL /Community/Notice/RecruitEvent.aspx and same-host event/detail pages discovered from that list, including FuncScheView.aspx?funcidx=... when linked by the approved list. The user must operate login manually in a fresh non-persistent Playwright browser. No credential entry by script, cookies, localStorage, storageState files, HAR, traces, screenshots, broad crawling, off-host requests, or scheduled crawling are allowed.

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
- Parser eligibility: allowed for approved bounded public HTML board ingestion from the original seed URL only.
- Auth boundary: public; response type: html.
- Robots/ToS: allow_empty_disallow / not_reviewed.
- Registry note: robots.txt returns an empty Disallow: line (allowing all). Board is publicly reachable with Korean title '취업정보', 12 listings per page, dates, hit counts, detail links (/front/recruit/r-1/view?id=...), and pagination to at least page 163. No ToS page located. Faculty-specific scope for ERICA College of Business and Economics; do not treat as campus-wide. Detail URLs should be recorded as patterns but not bulk-ingested during discovery.

### ewil-internship-system

- Observed URL: `https://e-wil.hanyang.ac.kr/index.do`
- Parser eligibility: allowed for approved bounded public HTML collection from the public index.do landing page only.
- Auth boundary: public; response type: html.
- Robots/ToS: unreachable / not_reviewed.
- Registry note: User added this seed URL on 2026-05-17. The public landing page is reachable and identifies '현장실습업무지원시스템' / '한양대학교 에리카 현장실습 지원시스템 (E-WIL)' with public notices. robots.txt returned 404 during review. The page states service use requires login and login buttons route to portal/login areas; do not collect authenticated student/professor, institution, or support-center content. Collection scope is limited to the public index.do landing page text, no stored auth state, no broader crawling, no scheduled crawling, and low concurrency.

### ewil-notice-board

- Observed URL: `https://e-wil.hanyang.ac.kr/data/list.do?type=NOTICE`
- Parser eligibility: allowed for approved user-manual-login non-persistent collection from the exact E-WIL NOTICE URL only.
- Auth boundary: login_required; response type: html.
- Robots/ToS: unreachable / not_reviewed.
- Registry note: User explicitly approved E-WIL authenticated manual-session collection on 2026-05-17. Scope is limited to the exact NOTICE list URL and same-host detail pages discovered from that approved list. The user must operate login manually in a fresh non-persistent Playwright browser. No credential entry by script, cookies, localStorage, storageState files, HAR, traces, screenshots, broad crawling, off-host requests, or scheduled crawling are allowed.

### ewil-info-board

- Observed URL: `https://e-wil.hanyang.ac.kr/data/list.do?type=INFO`
- Parser eligibility: allowed for approved user-manual-login non-persistent collection from the exact E-WIL INFO URL only.
- Auth boundary: login_required; response type: html.
- Robots/ToS: unreachable / not_reviewed.
- Registry note: User explicitly approved E-WIL authenticated manual-session collection on 2026-05-17. Scope is limited to the exact INFO list URL and same-host detail pages discovered from that approved list. The user must operate login manually in a fresh non-persistent Playwright browser. No credential entry by script, cookies, localStorage, storageState files, HAR, traces, screenshots, broad crawling, off-host requests, or scheduled crawling are allowed.

### ewil-internship-reviews

- Observed URL: `https://e-wil.hanyang.ac.kr/internphoto/compList.do`
- Parser eligibility: allowed for approved user-manual-login non-persistent collection from the exact E-WIL review URL only.
- Auth boundary: login_required; response type: html.
- Robots/ToS: unreachable / not_reviewed.
- Registry note: User explicitly approved E-WIL authenticated manual-session collection on 2026-05-17. Scope is limited to the exact internphoto company-list URL, same-host company pages discovered from that list, and same-host review detail URLs generated as /internphoto/view.do?jid_seq=<reviewId>&jim_seq=<companyId>. The user must operate login manually in a fresh non-persistent Playwright browser. No credential entry by script, cookies, localStorage, storageState files, HAR, traces, screenshots, broad crawling, off-host requests, or scheduled crawling are allowed.

## Task 3 checkpoint

Task 3 approval is recorded in `.planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md`. Downstream parser commands must remain limited to currently allowed registry decisions and exact approved public URLs.
