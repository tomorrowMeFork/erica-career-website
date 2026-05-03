# Source Coverage Status

**Generated:** 2026-05-03T08:22:44Z  
**Plan:** Phase 2 / 02-06  

Every `sources.txt` source intent mapped to its current disposition: verified JSONL records, implemented bounded collector, or evidence-backed blocker.

## Coverage Summary

| # | source_id | sources.txt intent | disposition | status |
|---|-----------|--------------------|-------------|--------|
| 1 | `ibus-employment-board` | 경상대학 취업정보 게시판 | **implemented bounded collector** | ✅ fixture JSONL verified; live `--fixture`/bounded collection script ready |
| 2 | `cdp-student-guide-pdf` | 커리어개발센터 가이드북 | **implemented bounded collector** | ✅ fixture JSONL verified; live manual-download script ready |
| 3 | `cdp-root` | 한양대 커리어 개발센터 | **blocker: held from collection** | 🚫 `none_until_review` — needs access review completion |
| 4 | `cdp-career-category-discovery` | CDP 취업정보 하위항목 전체 | **blocker: held from collection** | 🚫 `none_until_review` — needs access review completion |
| 5 | `cdp-recruit-category-discovery` | CDP 채용정보 하위항목 전체 | **blocker: held from collection** | 🚫 `none_until_review` — needs access review completion |
| 6 | `book-success-story-viewer` | 취업성공후기 | **blocker: held from collection** | 🚫 `none_until_review` — needs access review completion |

## Implemented Bounded Collectors

### ibus-employment-board

- **Script:** `npm run ingest:ibus:sample` (`scripts/ingest-ibus-sample.ts`)
- **Modes:** `--fixture` (fixture-first verified output), live bounded collection from approved seed URL
- **Approval:** `approved_bounded_browser_discovery` via `pre-ingestion-approval-record.md`
- **Seed URL:** `https://ibus.hanyang.ac.kr/front/recruit/r-1`
- **Parser:** `src/ingestion/html/ibus-board-parser.ts`
- **Fixture verification:** `npm run verify:knowledge-base -- data/knowledge-base/fixture-ibus` passes
- **Output:** 1 record, 1 chunk from fixture; extensible to bounded multi-page via `COLLECT_MAX_PAGES`
- **Korean labels preserved:** source_name=경상대학 취업정보 게시판, category=ERICA 경상대학 취업정보
- **Citation anchors:** Official detail URLs preserved

### cdp-student-guide-pdf

- **Script:** `npm run ingest:cdp-pdf:sample` (`scripts/ingest-cdp-pdf-sample.ts`)
- **Modes:** `--fixture` (fixture-first verified output), live bounded manual download from approved seed URL
- **Approval:** `approved_manual_download` via `pre-ingestion-approval-record.md`
- **Seed URL:** `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf`
- **Parser:** `src/ingestion/pdf/pdf-page-parser.ts`
- **Fixture verification:** `npm run verify:knowledge-base -- data/knowledge-base/fixture-cdp-pdf` passes
- **Output:** 1 record, 1 chunk from fixture; page-level `#page=N` citation anchors
- **Korean labels preserved:** source_name=CDP 학생 매뉴얼 PDF, category=CDP 학생 매뉴얼
- **Citation anchors:** `${canonical_url}#page=${page_number}` format

## Evidence-Backed Blockers

### cdp-root (한양대 커리어 개발센터)

**Registry state:**
- `review_status: pending_review`
- `allowed_collection_method: none_until_review`
- `robots_status: disallow_all_raw_evidence`
- `tos_status: not_reviewed`

**Observed evidence:**
1. `robots.txt` returns `Disallow: /` for `User-agent: *`.
2. Root URL `https://cdp.hanyang.ac.kr/` returns an empty body via generic HTTP fetch; requires browser automation.
3. `npm run discover:cdp` observes `/Main/default.aspx` as the redirect/surface target.
4. Same-host candidate URLs observed from CDP discovery script: `NoticeList.aspx`, `RecruitList.aspx`, `RecruitList2.aspx`, `RecruitList3.aspx`, `AlbaList.aspx`, `RecruitEvent.aspx`.
5. Pre-ingestion approval record explicitly holds cdp-root from parser/live collection.
6. No ToS page located during research.

**Blocker:** Access review checklist at `source-access-review.md#cdp-root` must be completed and an explicit approval record update must authorize a specific collection method before any parser or live collection can proceed. The root serves as the top-level discovery anchor but is not approved for data extraction.

**Required resolution:** Complete access review → update registry `allowed_collection_method` → update approval record → then collector implementation can proceed.

---

### cdp-career-category-discovery (CDP 취업정보 하위항목 전체)

**Registry state:**
- `review_status: pending_review`
- `allowed_collection_method: none_until_review`
- `robots_status: disallow_all_raw_evidence`
- `tos_status: not_reviewed`

**Observed evidence:**
1. `robots.txt` returns `Disallow: /` for `User-agent: *` on `cdp.hanyang.ac.kr`.
2. Exact 취업정보 category URLs not yet enumerated; discovery script observed same-host candidate URLs but did not map them to specific category subpages.
3. Category URL enumeration requires browser-based interaction with ASP.NET postback navigation, which is not approved for automated collection.
4. Pre-ingestion approval record explicitly holds cdp-career-category-discovery from parser/live collection.
5. No ToS page located during research.

**Blocker:** Category URLs have not been enumerated, and no collection method is approved. Even if enumerated, `robots.txt` disallow and absent ToS review create a compliance barrier.

**Required resolution:** (1) Complete access review → (2) Enumerate 취업정보 subpage URLs through approved discovery → (3) Update registry and approval record → (4) Implement category-specific parsers.

---

### cdp-recruit-category-discovery (CDP 채용정보 하위항목 전체)

**Registry state:**
- `review_status: pending_review`
- `allowed_collection_method: none_until_review`
- `robots_status: disallow_all_raw_evidence`
- `tos_status: not_reviewed`

**Observed evidence:**
1. `robots.txt` returns `Disallow: /` for `User-agent: *` on `cdp.hanyang.ac.kr`.
2. Exact 채용정보 category URLs not yet enumerated; discovery script observed candidate URLs (RecruitList.aspx, RecruitList2.aspx, RecruitList3.aspx) but these are unconfirmed mapping to 채용정보 subpages.
3. Freshness is critical: stale recruitment listings must be detected and excluded or marked.
4. Pre-ingestion approval record explicitly holds cdp-recruit-category-discovery from parser/live collection.
5. No ToS page located during research.

**Blocker:** Same as cdp-career-category-discovery. Candidate URLs exist from observation but are not confirmed, and no collection method is approved.

**Required resolution:** (1) Complete access review → (2) Confirm 채용정보 subpage URLs → (3) Update registry and approval record → (4) Implement category-specific parsers with freshness validation.

---

### book-success-story-viewer (취업성공후기)

**Registry state:**
- `review_status: pending_review`
- `allowed_collection_method: none_until_review`
- `robots_status: disallow_all_raw_evidence`
- `tos_status: not_reviewed`

**Observed evidence:**
1. `robots.txt` returns `Disallow: /` for `User-agent: *` on `book.hanyang.ac.kr`.
2. Viewer URL `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B` exposes a document viewer with title "[E 커리어개발팀] 2024 EBS 취업성공후기_한양인의 취업지식기부".
3. Viewer renders pages client-side; exact asset format (PDF pages, images, or DOM text) is not identified.
4. Pre-ingestion approval record explicitly holds book-success-story-viewer from parser/live collection.
5. No ToS page located during research.
6. No download or print button behavior has been tested under approved conditions.

**Blocker:** Viewer content extraction requires understanding the rendering mechanism (PDF/image/DOM), and no collection method is approved. Even DOM-text extraction would require collection authorization.

**Required resolution:** (1) Complete access review → (2) Identify asset format through approved structure-observation → (3) Update registry and approval record → (4) Implement viewer-specific extraction if approved.

## Verification Commands

All implemented collectors and governance artifacts pass verification:

```bash
npm run typecheck                                    # TypeScript type checking
npm test                                             # 66 tests pass
npm run validate:sources                             # source-registry.yaml valid
npm run verify:source-governance                     # governance invariants pass
npm run ingest:ibus:sample -- --fixture              # fixture ibus sample output
npm run ingest:cdp-pdf:sample -- --fixture           # fixture CDP PDF sample output
npm run verify:knowledge-base -- data/knowledge-base/fixture-ibus    # ibus KB verification
npm run verify:knowledge-base -- data/knowledge-base/fixture-cdp-pdf # CDP PDF KB verification
```

## Constraints Maintained

- `scheduled_crawling_enabled: false` for all sources
- No credentials, cookies, Playwright storage state, traces, or screenshots committed
- No generated live/raw corpus committed (data/knowledge-base/ is .gitignored)
- Korean-first source labels preserved
- All records carry `source_text_trust: "untrusted_source_text"`
- All records carry `citation_anchors` with official URLs
