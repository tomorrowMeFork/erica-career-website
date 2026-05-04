# Phase 10 UAT: Career Consultation Page and Evidence Linking

**Phase:** 10
**Date:** 2026-05-04
**Status:** PASS

## Acceptance Checks

### CHAT-01: Chat as primary action on consultation page
- [x] Chat composer with "질문 보내기" button present
- [x] Chat message list renders user and assistant messages
- [x] Three-column layout: preferences, chat, source inspection

### CHAT-02: Korean-first, citations, freshness, refusal
- [x] Korean labels throughout (질문 입력, 질문 보내기, 출처 확인하기)
- [x] Answer meta shows "출처 기반 답변" and "공식 출처 확인 필요"
- [x] RefusalNoticeCard handles hard_refuse, soft_refuse, normal_answer
- [x] Disclaimer: "추천" removed, references "수집된 출처를 바탕으로 한 정보 안내"
- [x] Source inspection rail shows citations with source_id, chunk_id, dates, deadline status

### CHAT-03: Related information as supporting evidence
- [x] AnswerAttachedEvidence renders (not AnswerAttachedRecommendations)
- [x] No score display, no match_strength label, no match_reasons list
- [x] Evidence cards show: title, deadline badge, source_id, dates, "원문 출처" link
- [x] aria-label: "답변 근거 정보"

### CHAT-04: Example questions and service limits
- [x] Empty state: "무엇을 도와드릴까요?" heading
- [x] Helper: "채용 공고, 마감일, 취업 프로그램을 한국어로 질문하면 확인된 출처와 수집일을 함께 보여드려요."
- [x] 3 example questions displayed
- [x] Service limits: "근거가 부족하거나 오래된 정보만 있으면 답변을 제한합니다."

## Verification Results

| Check | Result |
|---|---|
| typecheck | PASS |
| build (8 routes) | PASS |
| tests (247) | PASS |
| No recommendation framing | PASS |
| Korean-first labels | PASS |

**Verdict: PASS** — All 4 requirements verified.
