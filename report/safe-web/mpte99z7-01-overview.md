# ERICA Career Chat 답변 가드레일 아키텍처 개요

## 실험 일시

- **날짜**: 2026-05-31
- **대상 시스템**: ERICA Career Chat (한양대학교 ERICA 학생 대상 한국어 우선 취업정보 RAG 상담 서비스)
- **테스트 프레임워크**: Vitest v4.1.5
- **평가 스크립트**: `scripts/evaluate-safety-filtering.ts`

---

## 5-Layer Fail-Closed 파이프라인

```
사용자 질문
  → [Layer 1] 입력 안전 검사 ── refuse → 즉시 거부
                            ── redact → PII 마스킹
                            ── allow → 진행
  → [Layer 2] 소스 정제     ── quarantine → 청크 제거
                            ── redact → 위험 내용 치환
                            ── allow → 진행
  → [Layer 3] 근거 판정     ── hard_refuse → 근거 부족 거부
                            ── soft_hedge → 한계 명시
                            ── normal_answer → 진행
  → [Layer 4] 프롬프트 구성 (시스템 지침 강제)
  → [Layer 5] 출력 검증     ── 실패 → fallback/거부
                            ── 통과 → 사용자 응답
  → 감사 로그 기록
```

---

## 실험 결과 요약

| # | 테스트 스위트 | 테스트 파일 | 통과 | 실패 |
|---|---|---|---|---|
| 1 | 안전 필터링 종합 평가 | `scripts/evaluate-safety-filtering.ts` | PASS | 0 |
| 2 | Layer 1: 입력 안전 정책 | `src/chat/input-safety-policy.test.ts` | **18** | 0 |
| 3 | Layer 2: 소스 안전 정책 | `src/chat/source-safety-policy.test.ts` | **5** | 0 |
| 4 | 공통 안전 유틸 | `src/chat/safety-policy.test.ts` | **4** | 0 |
| 5 | Layer 3: 근거 판정 | `src/chat/output-validation.test.ts` (evaluateEvidence) | **8** | 0 |
| 6 | Layer 4: 프롬프트 엔지니어링 가드 | `src/chat/prompt.test.ts` | **8** | 0 |
| 7 | Layer 5: 출력 안전 정책 | `src/chat/output-safety-policy.test.ts` | **42** | 0 |
| 8 | Layer 5: 출력 검증 | `src/chat/output-validation.test.ts` (validateChatResponseOutput) | **18** | 0 |
| 9 | Chat Service 통합 | `src/chat/chat-service.test.ts` | **14** | 0 |
| 10 | 감사 로그 | `src/audit/audit-log.test.ts` | **4** | 0 |
| 11 | 평가 데이터 무결성 | `data/evaluation/safety-filtering-qa.test.ts` | **5** | 0 |
| 12 | Phase 6 QA | `data/evaluation/phase6-reference-qa.test.ts` | **6** | 0 |
| 13 | 평가 스크립트 | `scripts/evaluate-safety-filtering.test.ts` | **4** | 0 |
| — | **합계** | — | **136** | **0** |

### 종합 평가 스크립트 실행 결과

```
$ npx tsx scripts/evaluate-safety-filtering.ts
safety filtering evaluation passed
```

---

## 핵심 설계 원칙

| 원칙 | 설명 |
|---|---|
| **Fail-closed** | 의심스러우면 항상 차단. false negative보다 false positive를 우선 |
| **근거 없이 추측 금지** | 검색 결과로 뒷받침할 수 없는 정보는 제공하지 않음 |
| **인용 필수** | 모든 사실 주장에 inline numeric citation `[n]` 부착 |
| **PII 최소화** | 입력 마스킹 + 출력 에코 차단 + 감사 로그에 원문 저장 안함 |
| **공식 보장 금지** | "공식 인증", "취업 보장" 등의 표현 절대 사용 불가 |
| **한국어 우선** | 한글 미포함 답변은 자동 거부 |

---

## 관련 보고서

- [Layer 1: 입력 안전 정책](02-layer1-input-safety.md)
- [Layer 2: 소스 안전 정책](03-layer2-source-safety.md)
- [Layer 3: 근거 증명 정책](04-layer3-evidence-policy.md)
- [Layer 4: 프롬프트 엔지니어링 가드](05-layer4-prompt-engineering.md)
- [Layer 5: 출력 검증](06-layer5-output-validation.md)
- [감사 로그](07-audit-log.md)
- [End-to-End 안전 필터링 평가](08-safety-filtering-e2e.md)
