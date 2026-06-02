# Layer 3: 근거 증명 정책 (Evidence Policy)

## 실험 일시

- **날짜**: 2026-05-31
- **대상 시스템**: ERICA Career Chat (한양대학교 ERICA 학생 대상 한국어 우선 취업정보 RAG 상담 서비스)
- **테스트 프레임워크**: Vitest v4.1.5
- **대상 소스**: `src/chat/evidence-policy.ts`

---

## 1. 실험 개요

Layer 3은 RAG 파이프라인의 근거 증명 정책을 담당한다. 검색 엔진이 반환한 청크들을 평가하여, 답변을 생성할 근거가 충분한지 판단한다. 근거가 부족하면 사용자에게 정직하게 거부 응답을 반환하고, 근거가 한계적이라면 답변에 한계를 명시하는 접두어를 붙인다.

핵심 설계 철학은 **"근거 없이 추측하지 않는다"**다. 취업 정보는 학생의 진로 결정에 직접적인 영향을 미치므로, 근거가 불충분한 답변은 아예 생성하지 않는 것이 잘못된 답변을 주는 것보다 낫다.

이 레이어는 3단계 거부 시스템(3-Tier Refusal System)을 통해 confidence 점수와 다양한 품질 지표를 종합적으로 평가하며, 의심스러운 경우에는 항상 보수적으로 판단한다(fail-closed).

---

## 2. 3-Tier 거부 시스템

근거 평가는 세 가지 단계(Refusal Tier)로 나뉜다. 각 단계는 normalized confidence 점수와 다수의 품질 조건에 따라 결정된다.

### Refusal Tier 분류표

| Refusal Tier | confidence 범위 | 동작 | 사용자 경험 |
|---|---|---|---|
| **hard_refuse** | 0.00 ~ 0.29 또는 품질 조건 위반 | 답변 생성 차단, 거부 메시지 반환 | "현재 수집된 자료만으로는 답변을 뒷받침할 충분한 근거를 찾지 못했습니다." |
| **soft_hedge** | 0.30 ~ 0.50 | 답변 생성 허용, 한계 명시 접두어 강제 부착 | "현재 수집된 자료 기준으로는 [답변 내용]" |
| **normal_answer** | 0.51 ~ 1.00 | 답변 정상 생성, 접두어 없음 | 일반 상담 응답 |

### Confidence 임계값 구성

```typescript
export const DEFAULT_EVIDENCE_POLICY: EvidencePolicyConfig = {
  hard_refuse_below: 0.30,   // 0.30 미만이면 hard_refuse
  soft_hedge_through: 0.50,  // 0.50 이하이면 soft_hedge (단 hard_refuse 조건 없을 때)
  soft_hedge_prefix: "현재 수집된 자료 기준으로는",
};
```

### Confidence 구간별 판정 흐름

```
confidence 점수 (normalized_score)
│
├── 0.00 ─────── 0.29 ─────── 0.30 ─────── 0.50 ─────── 0.51 ─────── 1.00
│     hard_refuse    │         soft_hedge    │        normal_answer
│                    │                        │
│  단, hard_refuse   │      모든 hard_refuse   │   hard_refuse/soft_hedge
│  품질 조건이       │      조건이 없고,        │   조건이 모두 통과된 경우
│  없을 때만         │      confidence가       │   에만 도달 가능
│  confidence로      │      구간 내일 때        │
│  판정              │                        │
```

이 흐름의 핵심은 **confidence가 높아도 다른 품질 조건에서 fall-through 될 수 있다는 점**이다. confidence 0.8이라 하더라도, 모든 청크가 boilerplate뿐이거나 인용 앵커가 없다면 hard_refuse로 판정된다.

---

## 3. hard_refuse 트리거 조건

`evaluateEvidence` 함수는 다섯 가지 독립적인 품질 조건을 검사한다. **하나라도 충족되면 즉시 hard_refuse**가 반환된다.

### 품질 조건 체크리스트

- [x] **zero_chunks**: 검색 결과가 0건 (results.length === 0)
- [x] **boilerplate_only_results**: 반환된 모든 청크가 boilerplate로 분류됨
- [x] **missing_citation_anchors**: 인용 앵커(citation_anchors)가 없는 청크가 하나라도 포함됨
- [x] **below_hard_refuse_threshold**: 상위 청크의 confidence가 0.30 미만
- [x] **weak_absolute_score**: 상위 청크의 lexical_score가 0 이하이거나 상위 청크 자체가 없음
- [x] **generic_overlap_only**: 상위 청크의 매칭 용어가 모두 범용 캠퍼스 용어에 해당

이 조건들은 OR 논리로 결합된다. 즉, 다섯 가지 중 **어느 하나라도 true이면 hard_refuse**다. 이는 fail-closed 설계의 핵심이다. 하나의 약한 신호라도 무시하지 않는다.

```typescript
// 소스 코드의 판정 로직
if (everyResultIsBoilerplateOnly)     reasons.push("boilerplate_only_results");
if (hasMissingCitationAnchors)        reasons.push("missing_citation_anchors");
if (topConfidence < config.hard_refuse_below)
                                       reasons.push("below_hard_refuse_threshold");
if (topResult === undefined || topResult.ranking_features.lexical_score <= 0)
                                       reasons.push("weak_absolute_score");
if (meaningfulTopMatches.length === 0) reasons.push("generic_overlap_only");

if (reasons.length > 0) {
  return { refusal_tier: "hard_refuse", confidence: topConfidence, reasons };
}
```

refusal 이유를 reasons 배열에 모두 수집한 뒤 일괄 판정하는 방식이다. 이 설계는 감사 로그에서 "어떤 조건들이 동시에 위반되었는지"를 파악할 수 있어, 근거 부족의 원인을 정확히 추적할 수 있다.

---

## 4. soft_hedge 동작

soft_hedge는 hard_refuse 조건을 모두 통과했지만, confidence가 아직 완전히 신뢰할 수준은 아닐 때 발동한다. 0.30 이상 0.50 이하 구간이 해당한다.

### 강제 접두어

soft_hedge 판정이 내려지면 답변 앞에 접두어가 자동으로 붙는다.

```
접두어: "현재 수집된 자료 기준으로는"
```

이 접두어는 설정(config.soft_hedge_prefix)에서 변경 가능하다. 사용자에게 "이 답변은 제한적인 자료에 기반한 것"임을 명시적으로 알리는 역할을 한다.

### 한계 명시의 의미

soft_hedge는 답변을 아예 차단하지는 않지만, 사용자가 답변의 신뢰도를 스스로 판단할 수 있는 정보를 제공한다. 예를 들어:

> "현재 수집된 자료 기준으로는, ERICA 캠퍼스의 2025년 채용 박람회는 3월과 9월에 주로 개최됩니다."

사용자는 이 접두어를 보고, 답변을 그대로 수용하기보다 공식 페이지에서 추가 확인이 필요함을 인지하게 된다.

---

## 5. Generic Campus Terms 제외 로직

검색 매칭 시 "erica", "한양", "한양대", "한양대학교"와 같은 범용 캠퍼스 용어는 의미 있는 매칭에서 제외한다. 이 용어들은 ERICA Career Chat의 모든 질문과 문서에 공통적으로 등장하므로, 이들만 매칭된 것으로는 실제 관련성을 증명할 수 없기 때문이다.

```typescript
const genericCampusTerms = new Set(["erica", "한양", "한양대", "한양대학교"]);
```

상위 청크의 matched_terms에서 이 용어들을 제외한 뒤, 남은 의미 있는 매칭 용어(meaningfulTopMatches)가 0개이면 generic_overlap_only로 hard_refuse한다. 대소문자 구분 없이 비교한다(term.toLowerCase()).

이 로직은 "한양대"라는 질문에 "한양대 안내 페이지" boilerplate가 매칭되어 confidence가 부풀려지는 현상을 방지한다.

---

## 6. 테스트 결과

### 전체 테스트 결과

| 테스트 케이스 | 결과 |
|---|---|
| evaluateEvidence > hard-refuses when no chunks are available | **PASS** |
| evaluateEvidence > maps normalized score 0.29 to 'hard_refuse' | **PASS** |
| evaluateEvidence > maps normalized score 0.3 to 'soft_hedge' | **PASS** |
| evaluateEvidence > maps normalized score 0.5 to 'soft_hedge' | **PASS** |
| evaluateEvidence > maps normalized score 0.51 to 'normal_answer' | **PASS** |
| evaluateEvidence > hard-refuses when every returned chunk is boilerplate-only | **PASS** |
| evaluateEvidence > hard-refuses citationless chunks even when score is high | **PASS** |
| evaluateEvidence > builds a short Korean no-answer refusal | **PASS** |

**총 8건 / 통과 8건 / 실패 0건 (100%)**

---

## 7. 실험 시나리오 상세

### 7.1 Confidence Threshold 경계값 테스트

임계값 경계에서 정확히 올바른 tier가 반환되는지 네 개의 경계값을 조합하여 검증했다.

| 입력 normalized_score | 예상 refusal_tier | 실제 결과 | 판정 |
|---|---|---|---|
| 0.29 | hard_refuse | hard_refuse | PASS |
| 0.30 | soft_hedge | soft_hedge | PASS |
| 0.50 | soft_hedge | soft_hedge | PASS |
| 0.51 | normal_answer | normal_answer | PASS |

**0.29 → 0.30 경계**: 0.30은 hard_refuse_below(0.30)과 같거나 크므로 confidence 기준 hard_refuse 조건을 통과한다. 단, 0.50 이하이므로 soft_hedge에 진입한다.

**0.50 → 0.51 경계**: 0.50은 soft_hedge_through(0.50)와 같거나 작으므로 soft_hedge 범위에 남는다. 0.51부터 비로소 normal_answer에 도달한다.

이 경계값 테스트는 strict inequality(`<`)와 inclusive inequality(`<=`)의 조합이 정확히 구현되었음을 확인한다.

### 7.2 Zero Chunks 시나리오

검색 엔진이 빈 결과를 반환할 때의 동작을 검증했다.

**입력**: `results = []`

**예상 동작**: 어떤 품질 검사도 수행하지 않고 즉시 hard_refuse 반환

**실제 결과**:
```typescript
{ refusal_tier: "hard_refuse", confidence: 0, reasons: ["zero_chunks"] }
```

빈 결과는 가장 먼저 처리된다. confidence는 0으로 고정되고, 이유는 "zero_chunks" 하나만 기록된다. 다른 품질 조건 검사(topResult 접근, matched_terms 확인 등)는 수행할 필요가 없으므로 건너뛴다.

이 조건은 검색 인덱스에 해당 키워드가 전혀 없는 경우, 또는 검색 엔진 자체의 오류로 인해 결과를 반환하지 못한 경우를 모두 커버한다.

### 7.3 Boilerplate-Only 시나리오

검색 결과가 존재하지만, 모든 청크가 boilerplate로 분류된 경우를 검증했다.

**입력 조건**:
- results에 청크가 1건 이상 존재
- 모든 청크의 chunk_id가 boilerplateOnlyChunkIds에 포함됨

**예상 동작**: confidence와 무관하게 hard_refuse

**실제 결과**:
```typescript
{ refusal_tier: "hard_refuse", confidence: <top_score>, reasons: ["boilerplate_only_results"] }
```

boilerplate 판정은 retrieval 단계에서 수행된다(`boilerplateOnlyChunkIds`로 전달). evidence-policy는 이 판정 결과를 받아, 모든 청크가 boilerplate인지 `results.every()`로 확인한다. every가 true이면 어떤 confidence라도 무시하고 hard_refuse한다.

이 로직은 페이지 네비게이션, 푸터, 공지사항 헤더 같은 비본질적 콘텐츠만 검색된 상황에서, 그것을 "근거"로 삼아 답변을 생성하는 것을 원천 차단한다.

### 7.4 Citationless Chunks 시나리오

인용 앵커(citation_anchors)가 없는 청크가 결과에 섞여 있는 경우를 검증했다.

**입력 조건**:
- results에 청크가 1건 이상 존재
- 최소 1건의 청크에서 citation_anchors.length === 0
- confidence는 임계값 이상일 수 있음 (테스트에서는 높은 점수로 설정)

**예상 동작**: confidence가 높아도 hard_refuse

**실제 결과**:
```typescript
{ refusal_tier: "hard_refuse", confidence: <high_score>, reasons: ["missing_citation_anchors"] }
```

인용 앵커는 해당 정보가 어느 출처에서 왔는지를 나타내는 필수 요소다. 앵커가 없는 청크는 출처 추적이 불가하므로, 근거로 사용할 수 없다. `results.some()`을 사용하여 **하나라도** 앵커가 없으면 전체 결과를 무효화한다.

이 조건은 "-confidence가 높더라도 출처를 밝힐 수 없는 정보는 답변에 사용하지 않는다"는 원칙의 직접적인 구현이다.

### 7.5 Hard Refusal 응답 생성

hard_refuse 판정 시 사용자에게 반환되는 거부 메시지의 내용과 형태를 검증했다.

**예상 응답**:
```
"현재 수집된 자료만으로는 답변을 뒷받침할 충분한 근거를 찾지 못했습니다. 공식 페이지를 확인하거나 더 구체적으로 질문해 주세요."
```

이 메시지는 세 가지 정보를 담고 있다:

1. **거부 사유**: 근거가 충분하지 않음
2. **대안 경로 1**: 공식 페이지 확인 권유
3. **대안 경로 2**: 질문을 더 구체화할 것을 권유

사용자에게 단순히 "모릅니다"라고 하는 대신, 스스로 정보를 찾을 수 있는 실질적인 다음 단계를 안내한다. 응답은 한국어로 작성되며, 기계적인 느낌 없이 자연스러운 문장으로 구성된다.

---

## 8. 결론

Layer 3 근거 증명 정책은 ERICA Career Chat의 답변 품질을 보장하는 핵심 방어선이다.

### 설계의 장점

**다중 조건 평가**: confidence 하나의 지표에만 의존하지 않고, boilerplate 여부, 인용 앵커 존재 여부, 의미 있는 매칭 용어 수 등 다섯 가지 독립적인 품질 조건을 동시에 검사한다. 이로 인해 confidence 점수가 부풀려진 엣지 케이스를 방어할 수 있다.

**Fail-closed 기본값**: 어떤 조건이 위반되었는지를 reasons 배열에 모두 기록하여, 판정 이유를 완전히 추적 가능하게 만든다. 조건 중 하나라도 위반되면 답변 생성이 차단된다.

**사용자 친화적 거부**: 거부 응답은 단순한 에러 메시지가 아니라, 공식 페이지 확인과 질문 재구성이라는 구체적인 대안을 제시한다.

**Soft hedge로 정보 제공 균형**: 모든 정보를 차단하는 대신, 한계를 명시하면서도 일부 답변을 허용한다. 사용자는 접두어를 통해 정보의 신뢰도를 스스로 판단할 수 있다.

### 테스트 검증 완료

8개의 테스트 케이스가 모두 통과하여, confidence 경계값 판정, zero_chunks 응답, boilerplate 필터링, citationless 청크 차단, 거부 메시지 생성의 핵심 동작이 정확히 구현되었음이 확인되었다.
