# ERICA Career Chat 답변 가드레일 실험 보고서

한양대학교 ERICA 학생 대상 한국어 우선 취업정보 RAG 상담 서비스의 **5-Layer Fail-Closed 가드레일 아키텍처**에 대한 실험 결과를 정리한 보고서 모음입니다.

## 실험 환경

| 항목 | 내용 |
|---|---|
| 실험 일시 | 2026-05-31 |
| 테스트 프레임워크 | Vitest v4.1.5 |
| 총 테스트 수 | **136개** |
| 통과 | **136개 (100%)** |
| 실패 | **0개** |
| 평가 스크립트 | `scripts/evaluate-safety-filtering.ts` |

## 보고서 목록

| # | 보고서 | 내용 | 분량 |
|---|---|---|---|
| 00 | [테스트 실행 로그](00-test-execution-log.md) | 모든 테스트 실행 원시 출력(Vitest stdout) | 307 lines |
| 01 | [아키텍처 개요](01-overview.md) | 5-Layer 파이프라인 요약, 전체 테스트 결과, 핵심 설계 원칙 | 82 lines |
| 02 | [Layer 1: 입력 안전 정책](02-layer1-input-safety.md) | 7개 카테고리 패턴 매칭, allow/redact/refuse 분기, 18개 테스트 결과 | 393 lines |
| 03 | [Layer 2: 소스 안전 정책](03-layer2-source-safety.md) | 검색 결과 청크 정제·격리, 10개 치환 패턴, quarantine 조건, 5개 테스트 결과 | 280 lines |
| 04 | [Layer 3: 근거 증명 정책](04-layer3-evidence-policy.md) | 3-tier confidence 임계값, hard_refuse/soft_hedge/normal_answer 판정, 8개 테스트 결과 | 264 lines |
| 05 | [Layer 4: 프롬프트 엔지니어링 가드](05-layer4-prompt-engineering.md) | system/developer/user 3-메시지 구조, 안전 지침 주입, 환경변수 노출 방지, 8개 테스트 결과 | 400 lines |
| 06 | [Layer 5: 출력 검증](06-layer5-output-validation.md) | 12개 검증 항목, 안전하지 않은 표현·PII·마크다운·숨은인용 탐지, 64개 테스트 결과 | 388 lines |
| 07 | [감사 로그](07-audit-log.md) | JSONL 감사 기록, query_hash(SHA-256), prompt_snapshot 저장 정책, 4개 테스트 결과 | 116 lines |
| 08 | [End-to-End 안전 필터링 평가](08-safety-filtering-e2e.md) | 19개 QA 케이스 전체 테이블, 14개 통합 테스트, 15개 데이터 무결성 테스트 | 236 lines |

## 핵심 설계 원칙

| 원칙 | 설명 |
|---|---|
| **Fail-closed** | 의심스러우면 항상 차단 |
| **근거 없이 추측 금지** | 검색 결과로 뒷받침할 수 없는 정보는 제공하지 않음 |
| **인용 필수** | 모든 사실 주장에 inline numeric citation `[n]` 부착 |
| **PII 최소화** | 입력 마스킹 + 출력 에코 차단 + 감사 로그에 원문 저장 안함 |
| **공식 보장 금지** | "공식 인증", "취업 보장" 등의 표현 절대 사용 불가 |
| **한국어 우선** | 한글 미포함 답변은 자동 거부 |

## 소스 코드 위치

| 레이어 | 구현 파일 | 테스트 파일 | 테스트 수 |
|---|---|---|---|
| 공통 유틸 | `src/chat/safety-policy.ts` | `src/chat/safety-policy.test.ts` | 4 |
| Layer 1 | `src/chat/input-safety-policy.ts` | `src/chat/input-safety-policy.test.ts` | 18 |
| Layer 2 | `src/chat/source-safety-policy.ts` | `src/chat/source-safety-policy.test.ts` | 5 |
| Layer 3 | `src/chat/evidence-policy.ts` | `src/chat/output-validation.test.ts` (evaluateEvidence 그룹) | 8 |
| Layer 4 | `src/chat/prompt.ts` | `src/chat/prompt.test.ts` | 8 |
| Layer 5 | `src/chat/output-safety-policy.ts` | `src/chat/output-safety-policy.test.ts` | 42 |
| Layer 5 | `src/chat/output-validation.ts` | `src/chat/output-validation.test.ts` (validateChatResponseOutput 그룹) | 18 |
| 감사 | `src/audit/audit-log.ts` | `src/audit/audit-log.test.ts` | 4 |
| 통합 | `src/chat/chat-service.ts` | `src/chat/chat-service.test.ts` | 14 |
| 평가 스크립트 | `scripts/evaluate-safety-filtering.ts` | `scripts/evaluate-safety-filtering.test.ts` | 4 |
| QA 데이터 | `data/evaluation/safety-filtering-qa.ts` | `data/evaluation/safety-filtering-qa.test.ts` | 5 |
| Phase 6 QA | `data/evaluation/phase6-reference-qa.ts` | `data/evaluation/phase6-reference-qa.test.ts` | 6 |

> **참고**: `output-validation.test.ts`에는 Layer 3 근거 판정 테스트(evaluateEvidence, 8개)와 Layer 5 출력 검증 테스트(validateChatResponseOutput, 18개)가 함께 포함되어 있습니다. 전체 원시 실행 로그는 [00-test-execution-log.md](00-test-execution-log.md)에서 확인할 수 있습니다.
