# Phase 3: Source-Grounded Chat MVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03T09:00:00Z
**Phase:** 3-Source-Grounded Chat MVP
**Areas discussed:** 검색 기준, 답변/인용 형식, 거절 기준, 안전/감사 로그

---

## 검색 기준

| Question | Selected | Alternatives considered |
|---|---|---|
| Retrieval baseline | BM25-style baseline via agent discretion | Hybrid 포함, Semantic 우선 |
| Korean search handling | 정규화+n-gram | 단순 split, 형태소 분석 |
| Indexed KB outputs | 검증 KB 전체 | 실제 수집 우선, 고품질 allowlist |
| Chunks passed to generation | Top 5 | Top 3, Top 8 |
| Low-signal chunks | Exclude boilerplate | Keep with evidence flag |
| Query expansion | 제한적 보강 | 원문 그대로, 나중에 결정 |
| Freshness ranking | 반영한다 | 답변에서만 표시, 반영하지 않음 |
| Evaluation gate | LLM 평가 포함 | 작은 QA set only, 수동 smoke only |

**Notes:** The user clarified that login screens and viewer UI chrome are not answer knowledge and should not be retrieval-index targets.

---

## 답변/인용 형식

| Question | Selected | Alternatives considered |
|---|---|---|
| Citation display | Inline + citations | Source list only, Structured only |
| Citation metadata | Freshness 포함 | URL/title만, 모든 metadata |
| Answer tone | 상담형 안내 | 검색 결과형, 추천형 코칭 |
| Response contract | Minimal structured | Chunks included, Answer only |

**Notes:** Answers should be friendly Korean guidance, but stay source-grounded and avoid Phase 4 personalization/recommendation behavior.

---

## 거절 기준

| Question | Selected | Alternatives considered |
|---|---|---|
| Weak evidence policy | 3단계 기준 | 없을 때만 거절, LLM 판단 |
| Hard refusal copy | 짧은 안내 | 그냥 못 찾음, 대체 주제 제안 |
| Soft hedge behavior | 제한 표시 답변 | 거절로 통합, 표시만 낮음 |
| Numeric thresholds | Agent discretion: hard <0.30, soft 0.30-0.50, normal >0.50 | planner 결정, 숫자 없이 정책만 |

**Notes:** Zero chunks, boilerplate-only retrieval, and citationless results are hard refusal regardless of score.

---

## 안전/감사 로그

| Question | Selected | Alternatives considered |
|---|---|---|
| Prompt-injection defense | 기본 3층 방어 | 태그 격리만, Classifier 포함 |
| Audit content | 100% metadata + failure/guardrail/refusal prompt snapshot | Metadata only, Full prompt always |
| Audit storage | JSONL append | SQLite, schema only |
| LLM provider | OpenAI-compatible with env base_url/api_key/model | Specific SDK fixed, mock-only |
| Answer validation | Schema + eval judge | Schema only, LLM judge runtime |

**Notes:** The user initially selected full prompt logging, then corrected to metadata-first logging with limited snapshots. Real env values must never be logged or documented.

---

## the agent's Discretion

- Retrieval baseline chosen by agent after user selected "You decide": BM25-style lexical baseline with future-ready retriever interface.
- Numeric refusal thresholds chosen by agent after user selected "You decide": hard <0.30, soft 0.30-0.50, normal >0.50, tunable by Phase 3 evaluation.

## Deferred Ideas

- Semantic/hybrid retrieval after BM25 baseline and eval.
- Full Phase 6 evaluation suite.
- Polished UI/citation cards.
- Personalization and recommendation ranking.
