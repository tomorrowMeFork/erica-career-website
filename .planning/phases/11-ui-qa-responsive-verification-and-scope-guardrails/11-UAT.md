# Phase 11 UAT — UI QA, Responsive Verification, and Scope Guardrails

Date: 2026-05-04  
Project root: `/Users/wantap/workspace/Capstone/New`  
Dev server: `npm run dev`, verified ready at `http://localhost:3000` with HTTP 200  
Mode: verification only; no source fixes performed

Screenshot note: Playwright generated the screenshot files listed below during the run. The transient PNG artifacts were removed after verification so the working tree remains limited to this UAT document and no source files are changed.

## Summary

| Area | Result | Notes |
| --- | --- | --- |
| UXR-04 desktop rendering | PASS | All four routes rendered at 1280x800 and screenshots were captured. |
| UXR-04 mobile rendering | PASS | All four routes rendered at 375x812 with mobile bottom navigation visible and no horizontal overflow. |
| Touch targets | PASS | No visible `button`, `a`, `input`, `select`, `textarea`, `[role=button]`, or focusable `[tabindex]` elements below 44px height on tested desktop or mobile routes. |
| Korean typography | PASS | Body font stack is `Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif`; tested route headings contain Korean. |
| GUARD-01 matching/ranking | PASS | `git diff v1.0..HEAD -- src/recommendations/ src/personalization/` returned no changes. Named recommendation contract/service files are unchanged in the diff. |
| GUARD-02 retrieval/ingestion/crawling | PASS | `git diff v1.0..HEAD -- src/ingestion/ src/retrieval/` returned no changes; no new source files matching crawl/scrape/semantic/retrieval patterns under `src/**`. |
| GUARD-03 prohibited product features | PASS with expected guardrail-copy matches | Application diff grep returned no prohibited terms. Full diff grep only found planning guardrail language and negative safety/disclaimer copy, not implemented saved jobs/reminders/application tracking/SSO/endorsement/guarantee features. |

## PART 1 — UXR-04 Responsive and Quality Verification

### A. Dev server readiness

- Command run: `npm run dev`
- Server output: Next.js 16.2.4 (Turbopack), `Local: http://localhost:3000`, `✓ Ready in 234ms`
- Readiness check: `http://localhost:3000` returned HTTP 200.

### B. Desktop verification — 1280x800

Viewport set with Playwright to 1280x800. Each route was navigated directly and captured with a real full-page screenshot.

| Route | Screenshot | Verification findings |
| --- | --- | --- |
| `/` | `phase11-desktop-home.png` | Home page renders Korean-first hero, service-limit copy, CTA links for consultation and explore, and evidence/freshness guidance cards. |
| `/explore` | `phase11-desktop-explore.png` | Explore page renders filter/action pills including `전체`, `마감 임박`, `최신순`, `출처별`, `상태별`; info cards include source/freshness/deadline metadata and original-source actions. |
| `/source/test-chunk-123` | `phase11-desktop-source.png` | Source verification page renders selected chunk ID and metadata grid fields: `source_id`, `chunk_id`, `게시일`, `수집일`, `마감 상태`; includes original-source and consultation handoff actions. |
| `/consultation` | `phase11-desktop-consultation.png` | Consultation page renders chat area, Korean safety/disclaimer card, preference/input controls, and source/evidence rail content. |

Additional desktop DOM checks:

- `/explore`: 21 visible interactive elements; 13 section/article/card-like elements; filter pill texts present.
- `/source/test-chunk-123`: metadata terms `source_id`, `chunk_id`, `게시일`, `수집일`, `마감 상태` present.
- `/consultation`: terms `입력한 조건`, `무엇을 도와드릴까요?`, `출처`, and consultation controls present.
- Browser console: one non-blocking `favicon.ico` 404 resource error observed; no app-rendering failure observed.

### C. Mobile verification — 375x812

Viewport set with Playwright to 375x812. Each route was navigated directly and captured with a real full-page screenshot.

| Route | Screenshot | Bottom nav | Desktop header nav | Overflow/readability | Heading evidence |
| --- | --- | --- | --- | --- | --- |
| `/` | `phase11-mobile-home.png` | Visible: `홈`, `커리어 정보 탐색`, `출처 확인`, `커리어 상담` | Route nav hidden; brand link remains visible | `scrollWidth=375`, no horizontal overflow | Korean hero and guidance headings present |
| `/explore` | `phase11-mobile-explore.png` | Visible | Route nav hidden; brand link remains visible | `scrollWidth=375`, no horizontal overflow | `커리어 정보 탐색`, `정보 탐색하기`, `수집 정보` |
| `/source/test-chunk-123` | `phase11-mobile-source-test-chunk-123.png` | Visible | Route nav hidden; brand link remains visible | `scrollWidth=375`, no horizontal overflow | `출처 확인`, `test-chunk-123` |
| `/consultation` | `phase11-mobile-consultation.png` | Visible | Route nav hidden; brand link remains visible | `scrollWidth=375`, no horizontal overflow | `커리어 상담`, `입력한 조건`, `무엇을 도와드릴까요?` |

Mobile verification result: PASS. Content is readable at iPhone-size viewport, bottom navigation is available on every route, route-level desktop header navigation is hidden, and no tested route horizontally overflows.

### D. Touch target verification

Playwright `page.evaluate` checked visible interactive elements on all four routes at both desktop and mobile viewports.

| Viewport | Route | Interactive count | Violations below 44px height |
| --- | --- | ---: | ---: |
| desktop | `/` | 7 | 0 |
| desktop | `/explore` | 21 | 0 |
| desktop | `/source/test-chunk-123` | 7 | 0 |
| desktop | `/consultation` | 18 | 0 |
| mobile | `/` | 7 | 0 |
| mobile | `/explore` | 21 | 0 |
| mobile | `/source/test-chunk-123` | 7 | 0 |
| mobile | `/consultation` | 18 | 0 |

Result: PASS. No touch-target violations found.

### E. Korean typography verification

Observed body font stack on every tested route and viewport:

```text
Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif
```

Heading checks found Korean text on all tested routes:

- `/`: `ERICA 취업 정보를 출처와 함께 확인하고, 근거가 있는 범위에서 커리어 질문을 상담하세요.`
- `/explore`: `커리어 정보 탐색`, `정보 탐색하기`, `수집 정보`
- `/source/test-chunk-123`: `출처 확인`
- `/consultation`: `커리어 상담`, `입력한 조건`, `무엇을 도와드릴까요?`

Result: PASS.

## PART 2 — GUARD-01~03 Scope Guardrail Audit

### GUARD-01 — No matching/ranking changes

Commands run:

```bash
git diff --name-status v1.0..HEAD -- src/recommendations/ src/personalization/
git diff v1.0..HEAD -- src/recommendations/ src/personalization/
git diff --name-only v1.0..HEAD -- src/recommendations/recommendation-contract.ts src/recommendations/recommendation-service.ts src/personalization/recommendation-contract.ts src/personalization/recommendation-service.ts
```

Findings:

- No output from recommendation/personalization diffs.
- No named recommendation contract/service files appeared as changed.
- No matching algorithm, ranking weights, scoring logic, or personalization logic changes were found in the v1.1 diff.

Result: PASS.

### GUARD-02 — No semantic retrieval, ingestion expansion, or production crawling

Commands run:

```bash
git diff --name-status v1.0..HEAD -- src/ingestion/ src/retrieval/
git diff v1.0..HEAD -- src/ingestion/ src/retrieval/
git diff --name-only v1.0..HEAD -- 'src/**' | grep -E 'crawl|scrap|crawler|scraper|ingest|retrieval|semantic|embedding|vector' || true
```

Findings:

- No output from ingestion/retrieval diffs.
- No changed `src/**` files matched crawl/scrape/semantic/retrieval/embedding/vector naming patterns.
- No new ingestion sources, semantic retrieval, production crawling, authenticated crawling, or scraping utilities were found.

Result: PASS.

### GUARD-03 — No saved jobs, reminders, application tracking, SSO, endorsement, or guarantee features

Commands run:

```bash
git diff --name-only v1.0..HEAD
git diff v1.0..HEAD -- . ':(exclude)package-lock.json' | grep -E "saved_jobs|reminders|application_tracking|SSO|endorsement|공식 한양|합격 보장" || true
git diff v1.0..HEAD -- app/ components/ lib/ next-modules.d.ts tsconfig.json | grep -E "saved_jobs|reminders|application_tracking|SSO|endorsement|공식 한양|합격 보장" || true
```

Changed application files in v1.1:

```text
app/consultation/page.tsx
app/explore/page.tsx
app/globals.css
app/layout.tsx
app/page.tsx
app/source/[id]/page.tsx
components/chat/answer-attached-evidence.tsx
components/chat/answer-attached-recommendations.tsx
components/chat/assistant-answer.tsx
components/chat/chat-components.test.tsx
components/chat/chat-message-list.tsx
components/explore/info-filter-pills.tsx
components/explore/info-item-card.tsx
components/safety/disclaimer-notice.tsx
components/shell/app-shell.tsx
next-modules.d.ts
tsconfig.json
```

Findings:

- Application diff grep returned no matches for the prohibited feature terms.
- Full diff grep returned matches in planning/design guardrail language that explicitly excludes these features, plus negative safety/disclaimer wording such as not being an official Hanyang service and not guaranteeing hiring outcomes.
- No implemented saved jobs, reminders, application tracking, SSO, official Hanyang endorsement claim, or `합격 보장` feature was found.

Result: PASS.

## Requirement conclusion

- **UXR-04:** PASS — responsive UI, screenshots, touch targets, and Korean typography verified with Playwright against a live dev server.
- **GUARD-01:** PASS — no recommendation/personalization algorithm changes.
- **GUARD-02:** PASS — no ingestion/retrieval/crawling expansion.
- **GUARD-03:** PASS — no forbidden workflow/login/endorsement/guarantee features added; only expected guardrail/disclaimer references appear outside application feature implementation.

## Issues reported, not fixed

1. Non-blocking browser console item: `favicon.ico` returned 404 during navigation. This did not prevent page rendering and was not fixed because Phase 11 is verification-only.

## Completion verification

- `lsp_diagnostics` on this Markdown UAT document: not applicable because no Markdown LSP server is configured in this environment.
- `npm run build`: not available (`Missing script: "build"`).
- `npm run build:web`: PASS; Next.js production build and TypeScript completed successfully.
- Background dev server was stopped after verification.
