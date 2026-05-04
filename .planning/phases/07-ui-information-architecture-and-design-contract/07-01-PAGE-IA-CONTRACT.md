# 07-01 Page IA Contract

**Phase:** 07 — UI Information Architecture and Design Contract  
**Requirements:** IA-01, IA-03  
**Status:** Pre-implementation contract  
**Scope:** Defines page intent and evidence behavior only. No routes, components, CSS, APIs, retrieval, ingestion, ranking, or matching changes.

## Four-Page Model

ERICA Career Chat v1.1 uses four distinct pages so students can move from service orientation → information exploration → source verification → Korean-first consultation without interpreting the product as a job-board or recommendation/ranking system.

| Page | Korean label | User job | Primary action | Secondary actions | Empty state | Evidence/source rule | Must not imply |
|---|---|---|---|---|---|---|---|
| Home | 홈 | Understand what the service does and choose the right next step | `커리어 상담 시작하기` | `커리어 정보 둘러보기`, `출처 기반 답변 방식 보기` | Explain: “ERICA 커리어 정보에 기반해 답변하며, 근거가 부족하면 답하지 않습니다.” | Summarize citation, freshness/deadline, and service-limit model before use | Generic job board, official Hanyang service, automated placement, SSO |
| Career information explore | 커리어 정보 탐색 | Browse official/collected ERICA career information without asking a chat question | `정보 탐색하기` / open an information item | Filter by source/type/deadline status if available; move to consultation with current context | “조건에 맞는 정보가 없습니다. 조건을 줄이거나 상담에서 질문해 보세요.” | List items must show source name, deadline status, posted/fetched date when available, and source status | Matching/ranking result, personalized job feed, saved-job workflow |
| Information detail/source verification | 출처 확인 | Verify a specific information item and inspect evidence before relying on it | `원문 출처 확인하기` | `상담에서 이 정보로 질문하기`, return to explore | “이 정보의 원문 또는 근거가 충분하지 않습니다. 일반 안내로만 참고하세요.” | Foreground original source link, source name, source_id/chunk_id, posted/fetched dates, deadline status, citation evidence, AI interpretation limits | Application tracker, official guarantee, hidden/private source access |
| Career consultation | 커리어 상담 | Ask Korean career/recruitment questions and receive cited, freshness-aware answers | `질문 보내기` | Use example questions; inspect cited supporting evidence; clear explicit preferences if present | “질문을 입력해 주세요. 답변은 확인된 출처에 근거하며, 근거가 부족하면 안내를 제한합니다.” | Answer area must show citations, freshness/deadline metadata, no-answer/insufficient-evidence behavior, and related information only as answer support | Job recommendation inventory, ranking engine, guaranteed outcomes, application workflow tooling |

## Page-Level Primary Action Rules

| Page | One dominant CTA | Allowed secondary CTA | CTA hierarchy rule |
|---|---|---|---|
| Home | Start consultation | Browse information | Consultation is the main product entry; exploration is a secondary path. |
| Explore | Open/browse information | Ask in consultation | Browsing is primary; consultation handoff must not look like a recommendation funnel. |
| Detail/source verification | Open original source | Ask using this source | Verification is primary; AI interpretation stays subordinate to source evidence. |
| Consultation | Send question | Inspect evidence | Chat input and send action dominate; source cards support the answer only. |

## Source-Grounding Visibility Contract

| Required visible item | Home | Explore | Detail/source verification | Consultation |
|---|---:|---:|---:|---:|
| Korean-first explanation | Required | Required | Required | Required |
| Source/citation model | Summary | Item-level summary | Full detail | Per-answer citations |
| Freshness/fetched date | Summary | Visible when available | Required when available | Required when cited |
| Posted date | Summary | Visible when available | Required when available | Required when cited |
| Deadline status | Summary | Visible when applicable | Required when applicable | Required when cited |
| source_id/chunk_id | Not primary | Optional technical metadata | Required | Available in evidence inspection |
| No-answer / insufficient-evidence behavior | Explain limits | Empty-state guidance | Evidence warning | Refusal/no-answer message |
| Service limits | Required | Required in helper copy | Required near AI interpretation | Required in empty state and answers |

## Scope Guardrails

The page IA must not introduce or imply:

- matching/ranking algorithm changes, ranking weights, or matching logic
- semantic retrieval or retrieval infrastructure changes
- ingestion-source expansion, production crawling, authenticated/private crawling, or bypassing access controls
- saved jobs, reminders, application tracking, SSO, official Hanyang endorsement claims, or job-board workflow tooling
- routes, components, CSS, tests, API changes, retrieval changes, or ingestion changes in Phase 7

## Requirement Coverage

| Requirement | Coverage |
|---|---|
| IA-01 | Home explains service purpose, source-grounded answer model, primary actions, citations/freshness/deadline model, and service limits. |
| IA-03 | Explore, detail/source verification, and consultation have distinct page jobs, labels, primary actions, and evidence rules. |
