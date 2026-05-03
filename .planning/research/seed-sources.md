# Seed Source Inventory

**Created:** 2026-05-03  
**Project:** Personalized LLM chat-based Hanyang ERICA employment information service

This inventory converts `sources.txt` into traceable planning inputs. These sources are treated as public reference targets for discovery and prototyping only. No official Hanyang University, Hanyang ERICA, or department authorization is assumed.

## Sources

| Source | Purpose | MVP Use | Caveats |
|---|---|---|---|
| `https://cdp.hanyang.ac.kr/` | Hanyang Career Development Center | Primary employment-information source; discover job/career categories and canonical links | Need source access review before automated crawling; site structure and robots policy must be verified |
| `https://cdp.hanyang.ac.kr/` > 취업정보 하위항목 전체 | Career information subpages | Index career announcements, programs, guidance, and related posts | Category URLs must be enumerated during source-discovery phase |
| `https://cdp.hanyang.ac.kr/` > 채용정보 하위항목 전체 | Recruitment information subpages | Index job postings and recruitment notices | Freshness is critical; stale listings must be detected and excluded or marked |
| `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B` | 취업성공후기 | Retrieve success stories as qualitative advice and examples | Viewer/PDF extraction may require document parsing; cite exact source title/page when possible |
| `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf` | Career Development Center student guidebook | Ground answers about CDP usage, student processes, and official guidance | PDF parsing needs page-level citations and refresh checks |
| `https://ibus.hanyang.ac.kr/front/recruit/r-1` | Hanyang ERICA College of Business and Economics employment board | Supplementary college-level job board; visible public listing includes titles, dates, detail links, and pagination | Faculty-specific scope; do not treat as campus-wide unless validated |

## Direct Fetch Notes

`ibus.hanyang.ac.kr/front/recruit/r-1` was reachable and exposes a paginated Korean employment board with job-post titles, dates, hit counts, and detail links. Example current page entries include public-sector and institution recruitment notices with deadline text embedded in the title.

The root CDP page failed through the generic markdown fetcher during initialization, so source discovery must use browser automation, targeted HTTP inspection, or manual sitemap exploration in Phase 1.

## Source Requirements

- Every indexed item must keep source URL, source name, fetched timestamp, published/posted date if available, and source category.
- Every chat answer using indexed data must cite the source URL and date context.
- Recruitment listings must expose deadline and stale/expired status when available.
- The system must decline to answer or label uncertainty when source evidence is missing.
- Automated collection must be reviewed against robots.txt, terms, and expected load before scheduled crawling.
