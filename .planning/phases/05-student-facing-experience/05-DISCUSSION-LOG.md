# Phase 5: Student-Facing Experience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03T19:25:38Z
**Phase:** 5-Student-Facing Experience
**Areas discussed:** 앱 구조, 채팅 경험, 목록 탐색, 선호 설정 흐름, 비주얼 방향

---

## 앱 구조

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| frontend 골격 | Next.js | App Router에서 page/API route를 함께 만들 수 있어 greenfield UI와 service wrapper를 한 번에 묶기 좋습니다. | yes |
| frontend 골격 | Vite React | UI는 단순하지만 별도 HTTP API 서버를 추가해야 해서 Phase 5 계획이 둘로 나뉩니다. | |
| frontend 골격 | You decide | downstream planner가 프로젝트 제약과 Phase 5 범위에 맞춰 최종 stack을 고르게 둡니다. | |
| 화면 구조 | Single dashboard | 한 화면에서 채팅을 중심에 두고 추천/출처/목록을 side panel 또는 tab으로 연결해 citation context를 잃지 않습니다. | yes |
| 화면 구조 | Separate pages | `/chat`, `/listings`, `/preferences`처럼 분리해 구조는 명확하지만 chat context 이동 설계가 더 필요합니다. | |
| 화면 구조 | Hybrid | 메인은 dashboard로 두고 상세 목록이나 설정만 별도 route로 분리합니다. | |
| backend 연결 | Thin API routes | Next.js route handlers로 chat/recommend/preferences를 감싸고, 기존 service contract는 유지합니다. | yes |
| backend 연결 | Mock UI first | Phase 5는 UI shell과 fixture 렌더링 중심으로 만들고 live service 연결은 뒤로 미룹니다. | |
| backend 연결 | Full server boundary | 별도 API/server abstraction까지 설계해 확장성은 높이지만 Phase 5 범위가 커집니다. | |
| chat 응답 | 완성 응답 우선 | 현재 service contract에 맞춰 안정적으로 구현하고, loading 상태만 polished하게 처리합니다. | yes |
| chat 응답 | Streaming 필요 | SSE/streaming route를 설계하지만 현재 service/provider 구조를 더 많이 바꿔야 합니다. | |
| chat 응답 | You decide | planner가 구현 리스크와 사용자 체감 사이에서 결정하도록 둡니다. | |

**User's choice:** Next.js, single dashboard, thin API routes, 완성 응답 우선.
**Notes:** 현재 repo에는 web app/API server가 없고, 기존 TypeScript service contract를 유지하는 방향이 선택되었습니다.

---

## 채팅 경험

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| citation card 위치 | Right side panel | desktop에서는 오른쪽 source rail, mobile에서는 bottom sheet로 열어 chat context를 유지합니다. | yes |
| citation card 위치 | Inline expandable | 답변 아래에서 citation을 바로 펼쳐 단순하지만 긴 답변에서는 화면이 복잡해질 수 있습니다. | |
| citation card 위치 | Modal overlay | 집중해서 볼 수 있지만 chat 흐름을 가리고 context 유지가 약합니다. | |
| 히스토리 보존 | Client session only | 브라우저 세션 동안만 메시지를 보여주고 새로고침/종료 후 저장하지 않아 privacy risk가 낮습니다. | yes |
| 히스토리 보존 | LocalStorage opt-in | 사용자 선택 시 로컬에 보존하지만 clear control과 consent copy가 필요합니다. | |
| 히스토리 보존 | Server persistence | 대화 threading이 가능하지만 Phase 5 범위와 SAFE-06 부담이 커집니다. | |
| refusal 표시 | Gentle notice card | 답변 bubble 안에 차분한 안내 카드로 근거 부족/확인 필요를 표시하고 official source 확인을 유도합니다. | yes |
| refusal 표시 | Warning banner | 눈에 잘 띄지만 취업지원 서비스 톤보다 오류/위험처럼 보일 수 있습니다. | |
| refusal 표시 | Plain text only | 구현은 단순하지만 evidence state가 사용자에게 덜 명확합니다. | |
| 추천 링크 위치 | Answer-attached cards | 각 답변 아래에 관련 추천/출처 카드를 붙여 질문-근거-추천 연결이 명확합니다. | yes |
| 추천 링크 위치 | Persistent side rail | 항상 최신 추천을 보여주지만 어떤 답변과 연결되는지 약해질 수 있습니다. | |
| 추천 링크 위치 | Separate tab only | 채팅은 깨끗하지만 추천 링크 발견성이 낮습니다. | |

**User's choice:** Right side panel, client session only, gentle notice card, answer-attached cards.
**Notes:** Citation context 유지와 privacy-minimized chat history가 우선되었습니다.

---

## 목록 탐색

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| layout | Card list | 모바일/데스크톱 모두 읽기 쉽고 title, source, deadline, match reasons, citation을 한 카드에 담기 좋습니다. | yes |
| layout | Dense table | 많은 공고 비교에는 좋지만 모바일과 Korean copy, citation 표시가 답답할 수 있습니다. | |
| layout | Grid cards | 시각적으로 풍부하지만 취업 공고 정보 밀도와 날짜/출처 비교에는 약할 수 있습니다. | |
| 기본 정렬 | Recommended first | 선호가 있으면 추천 점수순, 없으면 최신/활성순으로 보여줘 Phase 4 계약과 맞습니다. | yes |
| 기본 정렬 | Latest first | 항상 최신/활성 공고 중심이라 예측 가능하지만 개인화 가치가 덜 드러납니다. | |
| 기본 정렬 | Source grouped | CDP/ibus/PDF 등 출처별로 묶어 검증성은 좋지만 추천 흐름은 약해집니다. | |
| filter 범위 | Core pills only | 전체/추천/최신/마감임박/출처/상태 정도로 제한해 UX-03~05를 만족하고 scope를 지킵니다. | yes |
| filter 범위 | Preference filters | 전공/직무/지역/고용형태까지 노출해 개인화와 연결하지만 필터 UX가 커집니다. | |
| filter 범위 | No filters | 단순하지만 UX-05의 pill filters와 browse 탐색성이 약해집니다. | |
| deadline label | Status badge + copy | `모집중`, `마감됨`, `마감일 확인 필요` badge와 짧은 설명을 함께 보여줘 오해를 줄입니다. | yes |
| deadline label | Color badge only | 공간은 적게 쓰지만 색만으로 상태를 이해하기 어렵고 접근성도 약합니다. | |
| deadline label | Separate stale section | 마감/불확실 항목을 따로 모아 안전하지만 일반 browse 흐름이 끊깁니다. | |

**User's choice:** Card list, recommended first, core pills only, status badge + copy.
**Notes:** Phase 5는 advanced search/filter product가 아니라 source-grounded browse surface로 제한합니다.

---

## 선호 설정 흐름

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| 첫 입력 위치 | Dashboard side panel | 채팅/목록을 보면서 바로 설정하고 추천 변화를 확인할 수 있습니다. 모바일에서는 drawer/bottom sheet로 전환합니다. | yes |
| 첫 입력 위치 | Onboarding modal | 처음부터 개인화는 강하지만 시작 장벽이 생기고 preference-free 사용이 덜 자연스럽습니다. | |
| 첫 입력 위치 | Chat inline prompt | 대화형으로 자연스럽지만 form validation과 clear/update controls가 흩어질 수 있습니다. | |
| 저장 기본값 | Session by default | 기본은 세션 선호로 두고, 영구 저장은 별도 consent toggle이 있을 때만 허용합니다. | yes |
| 저장 기본값 | Persistent opt-in first | 처음부터 저장 여부를 묻지만 privacy copy와 retention UI가 더 중요해집니다. | |
| 저장 기본값 | No persistence UI | Phase 5에서는 세션만 지원하고 영구 저장 선택지는 표시하지 않습니다. | |
| optional fields | Progressive disclosure | 전공/관심직무를 먼저 보이고, 세부 조건은 `상세 조건` 영역에서 펼치게 합니다. | yes |
| optional fields | All fields visible | 한 번에 완전하지만 첫 화면이 복잡해지고 모바일 부담이 큽니다. | |
| optional fields | Required only | 간단하지만 Phase 4 optional preference 가치를 거의 보여주지 못합니다. | |
| clear/update 위치 | Visible privacy row | 선호 패널 하단에 `수정`, `초기화`, 저장 범위/보존 안내를 항상 보여줍니다. | |
| clear/update 위치 | Settings submenu | 화면은 깔끔하지만 개인정보 제어가 숨어 보일 수 있습니다. | yes |
| clear/update 위치 | Clear button only | 최소 구현이지만 consent/retention/deletion 신뢰 설명이 부족합니다. | |

**User's choice:** Dashboard side panel, session by default, progressive disclosure, settings submenu.
**Notes:** clear/update는 settings submenu 선택이므로 planner는 접근성과 발견성을 보완해야 합니다.

---

## 비주얼 방향

| Question | Option | Description | Selected |
|----------|--------|-------------|----------|
| seed 재해석 | Academic calm | white/soft surfaces, rounded cards, pill chips는 유지하되 Hanyang-blue 계열과 Korean typography로 신뢰감 있게 재브랜딩합니다. | yes |
| seed 재해석 | Close to seed | Meta식 stark white/card/blue CTA를 많이 유지하지만 commerce/brand 유사성이 높아질 수 있습니다. | |
| seed 재해석 | Minimal institutional | 학교 행정 포털처럼 매우 절제하지만 polished assistant 느낌은 약해질 수 있습니다. | |
| typography | Pretendard first | Korean UI 가독성이 좋고 현대적인 서비스 톤에 맞으며 fallback으로 Noto/Apple/system을 둡니다. | yes |
| typography | Noto Sans KR first | 공공/학술 문서 느낌과 안정성은 좋지만 서비스 UI 톤은 약간 무거울 수 있습니다. | |
| typography | System stack only | 추가 font 의존성은 없지만 플랫폼별 시각 일관성이 떨어집니다. | |
| primary color | Muted Hanyang blue | 신뢰/출처/primary action에만 절제해서 쓰고, 나머지는 white/soft gray로 둡니다. | yes |
| primary color | Bright cobalt seed | Meta seed의 #0064E0 느낌을 강하게 쓰지만 commerce/product CTA 느낌이 날 수 있습니다. | |
| primary color | Neutral only | 브랜드 리스크는 낮지만 상태/출처/행동 강조가 약할 수 있습니다. | |
| status language | Semantic badges | 모집중/마감/확인필요, 개인화/부분일치/일반안내를 색+텍스트 badge로 일관되게 표현합니다. | yes |
| status language | Icon-heavy | 빠르게 읽히지만 한국어 설명 없이 아이콘 의미가 불분명할 수 있습니다. | |
| status language | Text-only labels | 차분하지만 glanceability가 떨어지고 card density가 높아집니다. | |

**User's choice:** Academic calm, Pretendard first, muted Hanyang blue, semantic badges.
**Notes:** Meta seed는 컴포넌트 품질과 layout pattern 참고로만 사용하고 branding/commerce patterns는 복사하지 않습니다.

---

## the agent's Discretion

No `You decide` options were selected.

## Deferred Ideas

- Streaming chat responses.
- Server-side chat-history persistence.
- Full advanced listing search/filtering.
- Official SSO, application submission, resume/cover-letter tools, production crawling.
