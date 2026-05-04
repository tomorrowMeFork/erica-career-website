# 07-02 Flow and Language Contract

**Phase:** 07 — UI Information Architecture and Design Contract  
**Requirements:** IA-01, IA-03  
**Status:** Korean-first language and framing contract  
**Scope:** Defines labels, helper copy, and forbidden framing only. No implementation.

## Product Language Principles

| Principle | Contract |
|---|---|
| Korean-first | Navigation, CTAs, empty states, service limits, source labels, and answer examples default to Korean. English technical labels may appear only as supporting metadata. |
| Source-grounded | The product is described as `출처 기반 ERICA 커리어 상담` or `ERICA 커리어 정보 상담`, not as a job-board or recommendation system. |
| Evidence before confidence | Copy must surface citations, freshness/deadline metadata, insufficient evidence, and no-answer behavior before promising usefulness. |
| Consultation vs exploration | Exploration copy says browse/verify information. Consultation copy says ask/receive cited guidance. The two flows must not share ranking/matching language. |
| Limits visible | Copy must state that information can be stale, deadlines require source verification, and the service is not an official Hanyang endorsement. |

## Preferred Labels

| Concept | Preferred Korean label | Secondary/technical label | Avoid |
|---|---|---|---|
| Product role | 출처 기반 ERICA 커리어 상담 | ERICA Career Chat | 채용 공고 추천 시스템, 공식 한양 취업 서비스 |
| Home | 홈 | Home | 추천 홈 |
| Explore page | 커리어 정보 탐색 | Information Explore | 맞춤 공고 추천, 채용 피드 |
| Detail/source page | 출처 확인 | Source Verification | 지원 관리, 지원 현황 |
| Consultation page | 커리어 상담 | Career Consultation | 자동 매칭 상담, 합격 보장 상담 |
| Source evidence | 답변 근거 | Citation / source evidence | 순위 근거, 매칭 점수 |
| Freshness | 수집일 / 게시일 | fetched_at / posted_at | 실시간 보장 |
| Deadline | 마감 상태 | deadline status | 지원 마감 알림 |
| Insufficient evidence | 확인된 근거가 부족합니다 | insufficient evidence | 결과 없음, 추천 실패 |

## Page Copy Contract

| Page | Hero / intro copy example | Primary CTA | Helper copy | Limit copy |
|---|---|---|---|---|
| Home | `ERICA 취업 정보를 출처와 함께 확인하고, 근거가 있는 범위에서 커리어 질문을 상담하세요.` | `커리어 상담 시작하기` | `답변에는 출처, 수집일, 게시일, 마감 상태가 함께 표시됩니다.` | `공식 한양 서비스가 아니며, 최종 확인은 원문 출처에서 해 주세요.` |
| Explore | `수집된 ERICA 커리어 정보를 출처와 마감 상태 중심으로 살펴보세요.` | `정보 탐색하기` | `필터는 보기 범위를 줄이는 용도이며, 새로운 매칭/순위 산정이 아닙니다.` | `마감 및 모집 조건은 원문에서 다시 확인해야 합니다.` |
| Detail/source verification | `이 정보가 어떤 원문과 근거에서 왔는지 확인하세요.` | `원문 출처 확인하기` | `source_id, chunk_id, 게시일, 수집일, 마감 상태를 함께 확인할 수 있어야 합니다.` | `근거가 불충분한 해석은 일반 안내로만 표시합니다.` |
| Consultation | `질문을 입력하면 확인된 ERICA 커리어 정보에 근거해 한국어로 답변합니다.` | `질문 보내기` | `예: “컴퓨터학부 학생이 이번 달 확인할 만한 인턴 정보가 있나요?”` | `근거가 부족하거나 오래된 정보만 있으면 답변을 제한합니다.` |

## Forbidden-Framing Audit

| Forbidden wording | Replace with | Reason |
|---|---|---|
| 채용 공고 추천 | 커리어 정보 탐색 / 상담 답변 근거 | Avoid job-board/recommendation framing. |
| 맞춤 공고 | 명시한 관심 기준에 맞춰 참고할 정보 | Avoid implying opaque matching. |
| 매칭 점수 / 랭킹 | 출처 상태 / 마감 상태 / 답변 근거 | Phase 7 must not introduce ranking or matching language. |
| 지원하기 / 저장하기 / 알림 받기 | 원문 출처 확인하기 / 상담에서 질문하기 | Avoid saved jobs, reminders, application workflow tooling. |
| 공식 한양대 서비스 | ERICA 정보를 바탕으로 한 상담 도구 | No official endorsement claim exists. |
| 실시간 크롤링 | 수집된 정보 / 수집일 기준 정보 | No production crawling permission is claimed. |
| SSO 로그인 | 필요한 경우 일반 사용자 입력 | SSO is out of scope. |
| 합격 가능성 / 합격 보장 | 확인된 정보에 근거한 참고 안내 | Avoid unsafe outcome claims. |
| 자동 추천 엔진 | 출처 기반 상담 흐름 | Keep product category as consultation software. |

## No-Answer and Insufficient-Evidence Copy

| Situation | Required Korean-first behavior |
|---|---|
| No source evidence | `확인된 출처 근거가 부족해 답변을 제한합니다. 커리어 정보 탐색에서 관련 출처를 먼저 확인해 주세요.` |
| Stale or expired listing | `이 정보는 마감되었거나 오래되었을 수 있습니다. 원문 출처에서 최신 상태를 확인해 주세요.` |
| General guidance only | `아래 내용은 확인된 모집 정보가 아니라 일반 안내입니다. 출처 기반 정보와 구분해서 참고해 주세요.` |
| Unsupported official claim request | `공식 한양 승인 또는 SSO 연동을 전제로 안내할 수 없습니다. 확인된 공개 출처 기준으로만 설명합니다.` |

## Requirement Coverage

| Requirement | Coverage |
|---|---|
| IA-01 | Home and product copy explain purpose, source-grounded model, primary actions, and service limits. |
| IA-03 | Labels and forbidden-framing audit separate information exploration, source verification, and consultation. |
