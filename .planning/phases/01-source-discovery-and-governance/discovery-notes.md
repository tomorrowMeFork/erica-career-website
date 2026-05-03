# Phase 1 Plan 03 Discovery Notes

**Created:** 2026-05-03  
**Scope:** SRC-01, SAFE-05 bounded source discovery only.  
**Boundary:** scheduled_crawling_enabled: false for all Phase 1 discovery outputs.

## CDP Category Discovery

- Seed scope host allowlist: `cdp.hanyang.ac.kr` only.
- Non-dry-run helper navigation target: `https://cdp.hanyang.ac.kr/` only.
- CDP static markdown fetch failed and may need browser/manual discovery; do not assume static HTML is sufficient for CDP category enumeration.
- One-shot helper command run: `npm run discover:cdp`.
- One-shot helper status: `no_candidates_observed`.
- Observed candidate URLs: none.
- Execution note: the first helper attempt could not launch because Playwright Chromium was not installed locally; after `npx playwright install chromium`, the helper ran once and returned the status above.

## CDP Recruitment Category Discovery

- Target source intent from `sources.txt`: `채용정보>하위항목 전체` under `https://cdp.hanyang.ac.kr/`.
- One-shot helper looked for link text or URL hints: `취업정보`, `채용정보`, `recruit`, `job`.
- One-shot helper status for recruitment/category candidates: `no_candidates_observed`.
- Observed recruitment candidate URLs: none.
- Next action: manual or browser-assisted seed-scope inspection may be needed later; do not fabricate URLs not observed.

## CDP Student Guide PDF

- Seed URL: `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf`.
- Research fact: CDP PDF is a 52-page PDF requiring later page-level citation.
- Phase 1 boundary: do not ingest or parse all PDF pages here; later ingestion must preserve URL, title/source label, retrieval timestamp, and page-level citations.

## Book Success Story Viewer

- Seed URL: `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B`.
- Research fact: book viewer title is `[E 커리어개발팀] 2024 EBS 취업성공후기_한양인의 취업지식기부`.
- Phase 1 boundary: do not ingest viewer pages or download/parse all page assets here; later work must determine whether original downloadable content or page assets can be cited safely.

## ibus Employment Board

- Seed URL: `https://ibus.hanyang.ac.kr/front/recruit/r-1`.
- Research fact: ibus exposes `취업정보`, 12 listings per page, detail links like `/front/recruit/r-1/view?id=6468`, and pagination to page 163.
- Phase 1 boundary: record the board pattern only; do not ingest all posts, detail pages, or paginated listings.
- Scope caveat: ibus is a College of Business and Economics board; do not treat it as campus-wide unless later source evidence supports that claim.

## Open Questions

- What are the exact CDP `취업정보` and `채용정보` category URLs, if they are available only after client-side rendering, manual navigation, or approved login?
- Does CDP expose the category links through a sitemap, menu API, or authenticated-only route within the seed scope?
- What ToS/site-use evidence applies to each seed host beyond the current robots and user-asserted capstone scope records?
- If login is required later, which explicit human-added selectors are acceptable for seed-scope-only discovery without printing credentials or storing cookies/session state?

## Non-Ingestion Boundary

- scheduled_crawling_enabled: false for all Phase 1 discovery outputs.
- This file records evidence and unknowns only; it does not approve scheduled crawling, repeated collection, or production crawling.
- Do not ingest all posts, PDFs, viewer pages, category pages, or paginated board listings in Phase 1.
- Do not create cron jobs, intervals, queues, daemons, background schedulers, CI schedules, or repeated collection behavior from these notes.
- Do not crawl authenticated/private pages, bypass access controls, add login selectors, or persist credentials/cookies/storage state.
- Do not claim official Hanyang authorization or endorsement; current approval basis remains user assertion unless stronger evidence is added later.
- do not fabricate URLs not observed.
