# 감사 로그 및 모니터링 (Audit Log)

## 1. 개요

ERICA Career Chat의 감사 로그는 모든 채팅 요청-응답 주기(Chat Cycle)에서 발생하는 구조화된 이벤트 레코드를 JSON Lines 형식으로 누적 저장한다. 단일 파일에 append-only 방식을 사용하며, 각 레코드는 Zod 스키마로 엄격하게 검증된다. 이 보고서는 스키마 설계, 개인정보 보호 정책, prompt_snapshot 저장 규칙, guardrail_results 누적 구조를 분석하고 테스트 결과를 정리한다.

## 2. 감사 로그 스키마 분석

`ChatAuditRecordSchema`는 Zod 스키마로 정의되며, 각 필드의 역할은 다음과 같다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `trace_id` | string (min 1) | 요청의 고유 추적 식별자. 분산 로그 상관관계(correlation)에 사용된다. |
| `timestamp` | ISO datetime | 사용자 쿼리 수신 시각. |
| `query_hash` | string (SHA-256 hex) | 원본 질문을 SHA-256으로 해싱한 값. 원문은 저장하지 않는다. |
| `retrieved_chunks` | RetrievedAuditChunkSchema[] | 검색된 출처 청크 메타데이터. 인용(citation) 추적에 활용된다. |
| `refusal_tier` | RefusalTierSchema | 응답의 거부 수준. `normal_answer`, `soft_refuse`, `hard_refuse` 중 하나다. |
| `model_config` | SafeModelConfigSchema | 호출된 LLM 모델 구성. 민감 설정은 마스킹된다. |
| `prompt_version` | string (min 1) | 프롬프트 템플릿 버전 식별자. 회귀 추적에 사용된다. |
| `citation_ids` | int[] (positive) | 실제 응답에 포함된 인용 ID 목록. |
| `guardrail_results` | Record<string, union> | 모든 안전 필터 레이어의 실행 결과가 누적된다. |
| `response_timestamp` | ISO datetime | 최종 응답 생성 완료 시각. 응답 지연(Latency) 계산에 사용된다. |
| `prompt_snapshot` | string (max 2000), optional | 프롬프트 스냅샷. 거부/가드레일 실패/예외 시에만 저장된다. |
| `prompt_snapshot_reason` | enum, optional | 스냅샷 저장 사유. `refusal`, `guardrail`, `failure` 중 하나다. |

## 3. 개인정보 보호 설계

감사 로그는 사용자 질문의 원문을 절대 저장하지 않는다. 대신 `hashQuery()` 함수가 질문을 SHA-256 해시로 변환한다.

```typescript
export function hashQuery(query: string): string {
  return createHash("sha256").update(query, "utf8").digest("hex");
}
```

- 해시 알고리즘: SHA-256 (64자 hex 문자열)
- 정규식 검증: `/^[a-f0-9]{64}$/u`
- 복구 불가: 단방향 해시이므로 원본 질문 복원이 불가능하다.
- 의도: 사용자 프라이버시 보호와 동시에 중복 질문 패턴 분석은 해시 기반으로 가능하다.

## 4. prompt_snapshot 저장 정책

prompt_snapshot은 디버깅과 사후 분석에 필요하지만, 남용하면 프라이버시 위험이 있다. Zod의 `superRefine`으로 강제하는 저장 정책은 다음과 같다.

| refusal_tier | prompt_snapshot 저장 | 이유 |
|---|---|---|
| `hard_refuse` (refusal) | 허용 | 입력 안전 필터 거부 시 프롬프트 원인 분석이 필요하다. |
| `hard_refuse` (guardrail) | 허용 | 출력 검증 실패 시 가드레일 트리거 원인 분석이 필요하다. |
| `hard_refuse` (failure) | 허용 | LLM 프로바이더 예외 시 장애 원인 파악이 필요하다. |
| `normal_answer` | **금지** | 정상 응답에는 프롬프트 스냅샷이 필요 없다. Zod 스키마가 이를 강제한다. |

superRefine 규칙 두 가지가 동시에 적용된다. 첫째, prompt_snapshot이 존재하면 prompt_snapshot_reason도 반드시 있어야 한다. 둘째, refusal_tier가 `normal_answer`일 때 prompt_snapshot을 저장하면 스키마 검증에 실패한다.

```typescript
// normal_answer 시 스냅샷 저장 → 에러
context.addIssue({
  code: "custom",
  path: ["prompt_snapshot"],
  message: "normal answers must not store prompt snapshots by default"
});
```

## 5. guardrail_results 필드 구조

guardrail_results는 모든 안전 필터 레이어의 실행 결과를 하나의 레코드에 누적 저장한다. 레이어가 실행될수록 필드가 추가된다.

**Layer 1 (기본 가드레일)**:
| 필드 | 설명 |
|---|---|
| `context_isolation` | 문맥 격리 여부 (항상 true) |
| `input_sanitized` | 입력 정제 여부 (항상 true) |
| `input_safety_policy_version` | 입력 안전 정책 버전 |
| `input_safety_action` | 입력 안전 필터 결과 동작 |
| `input_safety_categories` | 트리거된 안전 카테고리 목록 |

**Layer 2~3 (소스 안전 + 증거 정책, Layer 1 병합)**:
| 필드 | 설명 |
|---|---|
| `evidence_policy` | 증거 정책 거부 수준 |
| `source_safety_action` | 소스 안전 필터 결과 동작 |
| `source_safety_categories` | 소스에서 트리거된 카테고리 |
| `source_safety_unsafe_chunk_ids` | 안전하지 않은 청크 ID 목록 |

**Layer 5 (출력 검증)**:
| 필드 | 설명 |
|---|---|
| `output_validation` | 출력 검증 결과: `passed`, `failed`, `skipped_input_refusal`, `skipped_hard_refusal` |
| `output_validation_failures` | 실패 원인 목록 (실패 시에만 존재) |

**Layer별 프롬프트 가드레일 (builtPrompt)**:
프롬프트 빌드 과정에서 추가되는 가드레일 필드도 병합된다.

이 구조는 각 레코드에서 전체 필터 파이프라인의 실행 상태를 한 번에 파악할 수 있게 한다. 사후 분석 시 특정 레이어에서 발생한 문제를 정밀하게 추적할 수 있다.

## 6. 테스트 결과

감사 로그 모듈에 대한 단위 테스트 4건이 모두 통과했다.

| 테스트 | 결과 | 검증 내용 |
|---|---|---|
| appends two stable JSONL records and validates each line | PASS | 2개의 안정적인 JSONL 레코드 작성 및 각 줄 유효성 검증 |
| stores metadata-only normal answers without prompts or secrets | PASS | 정상 응답 시 프롬프트·시크릿 없이 메타데이터만 저장 |
| allows limited refusal snapshots with a reason | PASS | 거부 시 프롬프트 스냅샷과 사유 저장이 정상적으로 허용됨 |
| hashes queries and serializes nested object keys deterministically | PASS | 질문 해시(SHA-256) 및 중첩 객체 키 결정론적 직렬화 |

## 7. 결론

감사 로그 시스템은 세 가지 핵심 원칙을 달성하고 있다.

첫째, **프라이버시 우선 설계**. 사용자 질문 원문을 저장하지 않고 SHA-256 해시만 기록하며, 정상 응답 시 프롬프트 스냅샷 저장을 Zod 스키마 수준에서 강제 차단한다.

둘째, **전체 레이어 추적 가능성**. guardrail_results에 Layer 1부터 Layer 5까지의 모든 필터 실행 결과가 누적되므로, 단일 레코드만으로 전체 안전 파이프라인의 상태를 재구성할 수 있다.

셋째, **원인 분석 가능성**. 거부, 가드레일 실패, 프로바이더 예외 상황에 한해서만 프롬프트 스냅샷을 저장하므로, 문제 원인 파악에 필요한 정보는 보존하면서 불필요한 데이터 노출은 최소화한다.

append-only JSON Lines 방식은 동시 쓰기 충돌 없이 가볍게 동작하며, 단위 테스트에서 기본 기능이 정상 동작함이 확인되었다.
