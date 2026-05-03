# Phase 4: Personalization and Recommendations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03T15:16:32Z
**Phase:** 04-Personalization and Recommendations
**Areas discussed:** 선호 스키마, 추천 방식, 매칭 이유

---

## 선호 스키마

| Option | Description | Selected |
|--------|-------------|----------|
| 필수 최소 + 선택 | 전공/관심직무/고용형태 정도만 먼저 받고, 산업/지역/마감 민감도는 선택값으로 둔다. | ✓ |
| 전부 선택 입력 | 모든 preference를 선택값으로 두고, 하나만 있어도 추천이 동작하게 한다. | |
| 전체 온보딩 | 전공, 직무, 산업, 지역, 고용형태, 마감 민감도를 한 번에 받는다. | |
| You decide | 다운스트림 agent가 privacy와 UX 균형에 맞춰 결정한다. | |

**User's choice:** 필수 최소 + 선택  
**Notes:** 후속 질문에서 필수 최소 항목은 전공 + 관심직무로 잠김.

| Option | Description | Selected |
|--------|-------------|----------|
| 전공 + 관심직무 | 학생 맥락과 추천 관련성이 가장 크고 민감도를 낮게 유지한다. | ✓ |
| 전공 + 고용형태 | listing 필터에는 좋지만 직무 적합도 설명은 약하다. | |
| 관심직무만 | 가장 가볍지만 ERICA/전공 기반 매칭 이유를 만들기 어렵다. | |
| You decide | planner가 테스트 가능한 최소 스키마를 정한다. | |

**User's choice:** 전공 + 관심직무  
**Notes:** Optional fields can exist but should not be required for recommendation behavior.

| Option | Description | Selected |
|--------|-------------|----------|
| 정해진 선택지 | 산업/지역/고용형태/마감 민감도를 enum/pill 선택으로 제한한다. | |
| 자유입력 허용 | 유연하지만 동의/저장/매칭 이유 검증이 어려워지고 개인정보가 섞일 위험이 있다. | ✓ |
| 선택지 + 기타 | 대부분은 선택지, 필요한 경우 기타 텍스트를 허용한다. | |
| You decide | planner가 MVP 범위에 맞춰 결정한다. | |

**User's choice:** 자유입력 허용  
**Notes:** Privacy conflict was discussed because raw free text can include unnecessary personal data.

| Option | Description | Selected |
|--------|-------------|----------|
| 민감정보만 거부 | 자유입력은 허용하지만 추천에 불필요한 개인정보는 저장 전 거부한다. | |
| 동의 후 그대로 | 명시 동의가 있으면 자유입력 원문을 저장한다. | |
| 세션에만 보관 | 자유입력 원문은 현재 세션에서만 쓰고 persistent 저장은 하지 않는다. | ✓ |

**User's choice:** 세션에만 보관  
**Notes:** Initial preference to store raw free text was adjusted to satisfy SAFE-03/SAFE-06.

---

## 추천 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 점수 랭킹 | 모든 후보를 보여주되 선호와 source metadata로 점수를 매겨 정렬한다. | ✓ |
| 강한 필터링 | 선호와 맞지 않는 항목은 숨긴다. | |
| 하이브리드 | 필수 조건만 필터링하고 나머지는 점수화한다. | |
| You decide | planner가 현재 corpus 규모와 테스트 용이성을 보고 결정한다. | |

**User's choice:** 점수 랭킹  
**Notes:** Strong filtering is avoided because the current corpus is sparse.

| Option | Description | Selected |
|--------|-------------|----------|
| 최신/활성 우선 | personalization 없이도 active, recent, source-grounded listings를 기본 추천으로 보여준다. | ✓ |
| 설정 유도만 | 추천 대신 선호 설정을 먼저 유도한다. | |
| 인기/일반 추천 | 일반적인 CDP 서비스와 채용정보를 섞어 보여준다. | |
| You decide | planner가 fallback ranking을 정한다. | |

**User's choice:** 최신/활성 우선  
**Notes:** Satisfies PERS-04 anonymous/no-preference behavior.

| Option | Description | Selected |
|--------|-------------|----------|
| 관심직무 우선 | 관심직무 매칭을 가장 강하게 두고 전공/고용형태/지역은 보조 점수로 둔다. | |
| 전공 우선 | ERICA 학생 맥락에는 좋지만 공고가 전공 정보를 항상 갖지 않을 수 있다. | |
| 마감 임박 우선 | 놓치면 손해인 공고를 먼저 보여주지만 개인 적합성은 약할 수 있다. | |
| 균등 가중치 | 모든 preference를 비슷하게 반영한다. | ✓ |

**User's choice:** 관심직무, 전공만 균등 가중치  
**Notes:** Recorded as equal primary weights for 관심직무 and 전공; other preferences are secondary.

| Option | Description | Selected |
|--------|-------------|----------|
| 강하게 반영 | active/posted_at/detail URL/citation 품질을 강하게 반영해 stale·generic CDP chunk를 줄인다. | ✓ |
| 보조로 반영 | 개인 선호를 우선하고 freshness/source quality는 tie-breaker로만 둔다. | |
| 개인 선호만 | 추천이 개인화에 집중되지만 generic citation 문제가 반복될 수 있다. | |
| You decide | planner가 ranking formula를 정한다. | |

**User's choice:** 강하게 반영  
**Notes:** Source freshness/detail quality should materially affect recommendation ranking.

---

## 매칭 이유

| Option | Description | Selected |
|--------|-------------|----------|
| 짧은 bullet 2-3개 | 한국어로 빠르게 읽히고 preference와 source evidence를 함께 보여주기 쉽다. | ✓ |
| 한 문장 요약 | 가장 가볍지만 왜 추천됐는지 충분히 설명하기 어려울 수 있다. | |
| 상세 근거 패널 | 투명성은 높지만 UI/UX Phase 5 범위와 겹칠 수 있다. | |
| You decide | planner가 MVP 설명 깊이를 정한다. | |

**User's choice:** 짧은 bullet 2-3개  
**Notes:** Keep explanation compact and Korean-first.

| Option | Description | Selected |
|--------|-------------|----------|
| 선호 + 출처 + 최신성 | 관심직무와 일치, 공식 공고 출처, active/posted/fetched 상태를 함께 보여준다. | ✓ |
| 선호만 | 개인화 느낌은 강하지만 source-grounded/citation 원칙이 약해진다. | |
| 출처만 | 안전하지만 개인화 이유가 약하다. | |
| You decide | planner가 match reason 필드를 정한다. | |

**User's choice:** 선호 + 출처 + 최신성  
**Notes:** Match reasons must connect preference and source evidence.

| Option | Description | Selected |
|--------|-------------|----------|
| 약한 추천으로 표시 | 현재 수집된 자료 기준 문구와 낮은 confidence/reason strength를 표시한다. | |
| 추천에서 제외 | 애매한 추천을 숨긴다. | |
| 일반 안내로 표시 | 개인 추천이 아니라 참고 자료로 분리한다. | ✓ |
| You decide | planner가 evidence threshold와 fallback 표현을 정한다. | |

**User's choice:** 일반 안내로 표시  
**Notes:** Avoid overclaiming personalization when evidence is weak.

| Option | Description | Selected |
|--------|-------------|----------|
| 각 bullet에 citation | 각 이유가 어떤 source 근거에 기반하는지 `[n]`으로 바로 연결한다. | ✓ |
| 카드 하단 source만 | UI가 깔끔하지만 개별 이유와 근거 연결이 약하다. | |
| 추천 전체에 citation | 간단하지만 이유별 검증은 어렵다. | |
| You decide | planner가 response/card contract를 정한다. | |

**User's choice:** 각 bullet에 citation  
**Notes:** This preserves Phase 3 citation discipline in Phase 4 recommendations.

---

## the agent's Discretion

- Exact file layout, schema names, ranking constants, and test fixture details are left to downstream research/planning.

## Deferred Ideas

- Full visual recommendation cards and polished preference UI remain Phase 5.
- Chat-history persistence is not required for Phase 4 and should remain deferred unless explicitly planned with consent/retention/deletion behavior.
