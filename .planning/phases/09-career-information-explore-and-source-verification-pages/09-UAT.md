# Phase 9 UAT: Career Information Explore and Source Verification Pages

**Phase:** 9  
**Date:** 2026-05-04  
**Status:** PASS

## Acceptance Checks

### INFO-01: Browse career information on dedicated page
- [x] `/explore` page shows "커리어 정보 탐색" heading
- [x] Information card list renders items from fetchRecommendations data
- [x] No recommendation/ranking framing visible ("추천", "맞춤", "매칭" absent)

### INFO-02: Compare deadline, dates, source in list
- [x] Each `InfoItemCard` shows source_id, category, fetched_at, posted_at
- [x] `DeadlineStatusBadge` renders per item
- [x] Date metadata uses `<time>` elements with dateTime attributes

### INFO-03: Core filters without matching/ranking framing
- [x] Filter pills: 전체, 마감 임박, 최신순, 출처별, 상태별
- [x] Filter logic sorts/filters items without exposing scores or ranks
- [x] Helper copy: "필터는 보기 범위를 줄이는 용도이며, 새로운 매칭/순위 산정이 아닙니다."

### INFO-04: Empty-state and insufficient-condition guidance
- [x] Empty state: "조건에 맞는 정보가 없습니다."
- [x] Guidance: "조건을 줄이거나 상담에서 질문해 보세요."

### SRCV-01: Inspect source metadata on detail page
- [x] `/source/[id]` shows decoded identifier
- [x] Metadata grid: 정보 식별자, source_id, chunk_id, 게시일, 수집일, 마감 상태
- [x] Dynamic lookup noted as "준비 중" placeholder

### SRCV-02: See citation/evidence support
- [x] Evidence note present: "source_id, chunk_id, 게시일, 수집일, 마감 상태를 함께 확인할 수 있어야 합니다."
- [x] Original source verification action (placeholder)

### SRCV-03: Insufficient-evidence visibility
- [x] "근거가 불충분한 해석은 일반 안내로만 참고하세요." displayed
- [x] Badge indicates "동적 원문 조회 준비 중"

## Verification Results

| Check | Result |
|---|---|
| typecheck | PASS |
| build (7 routes) | PASS |
| tests (247) | PASS |
| No recommendation framing | PASS |
| Korean-first labels | PASS |

**Verdict: PASS** — All 7 requirements verified.
