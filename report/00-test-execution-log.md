# 테스트 실행 로그 (Test Execution Log)

실험 일시: 2026-05-31
테스트 프레임워크: Vitest v4.1.5

---

## 1. 종합 안전 필터링 평가

```bash
$ npx tsx scripts/evaluate-safety-filtering.ts
safety filtering evaluation passed
```

---

## 2. Layer 1: 입력 안전 정책 테스트

```bash
$ npx vitest run src/chat/input-safety-policy.test.ts --reporter=verbose

 RUN  v4.1.5 /Users/wantap/workspace/Capstone/erica-career-website

 ✓ evaluateInputSafety > 'refuses prompt injection to ignore pr…'
 ✓ evaluateInputSafety > 'refuses citation omission'
 ✓ evaluateInputSafety > 'refuses citationless wording'
 ✓ evaluateInputSafety > 'refuses arbitrary citation laundering'
 ✓ evaluateInputSafety > 'refuses private access request'
 ✓ evaluateInputSafety > 'refuses other student data request'
 ✓ evaluateInputSafety > 'refuses application submission'
 ✓ evaluateInputSafety > 'refuses email sending'
 ✓ evaluateInputSafety > 'refuses reservation acting on a phone…'
 ✓ evaluateInputSafety > 'refuses official endorsement manipulation'
 ✓ evaluateInputSafety > 'refuses guaranteed outcome manipulation'
 ✓ evaluateInputSafety > 'refuses full resume rewriting'
 ✓ evaluateInputSafety > 'refuses unsupported interview answer …'
 ✓ evaluateInputSafety > 'allows a legitimate guarantee question'
 ✓ evaluateInputSafety > 'redacts a phone number in a source-gr…'
 ✓ evaluateInputSafety > 'redacts an email in a benign question'
 ✓ evaluateInputSafety > keeps 채용 and 합격 language allowed when the request is otherwise safe
 ✓ evaluateInputSafety > redacts student ids without refusing source-grounded questions

 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  14:19:44
   Duration  121ms (transform 18ms, setup 0ms, import 26ms, tests 6ms, environment 0ms)
```

---

## 3. Layer 2: 소스 안전 정책 테스트

```bash
$ npx vitest run src/chat/source-safety-policy.test.ts --reporter=verbose

 RUN  v4.1.5 /Users/wantap/workspace/Capstone/erica-career-website

 ✓ source prompt safety policy > redacts hostile source instructions, fake prompt tags, unsafe links, claims, and PII before prompt construction
 ✓ source prompt safety policy > preserves canonical citation identity, freshness metadata, anchors, and retrieval scores exactly
 ✓ source prompt safety policy > keeps downstream citation marker mapping stable for redacted chunks
 ✓ source prompt safety policy > quarantines chunks with empty or invalid citation anchors instead of passing them to the prompt
 ✓ source prompt safety policy > does not mutate original RetrievedChunk objects

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  14:19:55
   Duration  140ms (transform 27ms, setup 0ms, import 57ms, tests 7ms, environment 0ms)
```

---

## 4. Layer 3+5: 근거 판정 + 출력 검증 + 안전 정책 공통 테스트

```bash
$ npx vitest run src/chat/output-validation.test.ts src/chat/evidence-policy.test.ts src/chat/safety-policy.test.ts --reporter=verbose

 RUN  v4.1.5 /Users/wantap/workspace/Capstone/erica-career-website

 ✓ src/chat/safety-policy.test.ts > normalizeSafetyText > removes zero-width characters and normalizes spacing and case
 ✓ src/chat/safety-policy.test.ts > hasNegationNear > recognizes safe negated outcome claims near the phrase
 ✓ src/chat/safety-policy.test.ts > redactSensitiveText > redacts phone numbers, emails, and student-id-like values
 ✓ src/chat/safety-policy.test.ts > buildPolicyRefusalAnswer > returns the exact refusal copy
 ✓ src/chat/output-validation.test.ts > evaluateEvidence > hard-refuses when no chunks are available
 ✓ src/chat/output-validation.test.ts > evaluateEvidence > maps normalized score 0.29 to 'hard_refuse'
 ✓ src/chat/output-validation.test.ts > evaluateEvidence > maps normalized score 0.3 to 'soft_hedge'
 ✓ src/chat/output-validation.test.ts > evaluateEvidence > maps normalized score 0.5 to 'soft_hedge'
 ✓ src/chat/output-validation.test.ts > evaluateEvidence > maps normalized score 0.51 to 'normal_answer'
 ✓ src/chat/output-validation.test.ts > evaluateEvidence > hard-refuses when every returned chunk is boilerplate-only
 ✓ src/chat/output-validation.test.ts > evaluateEvidence > hard-refuses citationless chunks even when score is high
 ✓ src/chat/output-validation.test.ts > evaluateEvidence > builds a short Korean no-answer refusal
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > accepts a Korean listing answer with mapped inline citations and freshness metadata
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > accepts a Korean PDF answer with page_number: 1 citation context
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > accepts a no-answer hard refusal without citations
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects citationless factual Korean mock-model output
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects unsafe output safety variant 0
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects unsafe output safety variant 1
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects unsafe output safety variant 2
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects unsafe output safety variant 3
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects unsafe output safety variant 4
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects unsafe output safety variant 5
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects PII echoed in an otherwise cited Korean answer
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > allows safe negated guarantee phrasing when citation and tier are valid
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects markdown link citation laundering even with a visible citation marker
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects citation marker only inside 'inline code' as citationless
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects citation marker only inside 'markdown image alt' as citationless
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects citation markers that do not map to structured citations
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > canonicalizes provider-controlled citation metadata from the retrieved citation map
 ✓ src/chat/output-validation.test.ts > validateChatResponseOutput > rejects non-HTTPS canonical citation URLs

 Test Files  2 passed (2)
      Tests  30 passed (30)
   Start at  14:20:07
   Duration  131ms (transform 48ms, setup 0ms, import 81ms, tests 10ms, environment 0ms)
```

### 내역 분해

| 테스트 파일 | 테스트 수 | 비고 |
|---|---|---|
| `src/chat/safety-policy.test.ts` | 4 | 공통 안전 유틸 (normalize, redact, negation, refusal) |
| `src/chat/output-validation.test.ts` → `evaluateEvidence` | 8 | Layer 3 근거 판정 |
| `src/chat/output-validation.test.ts` → `validateChatResponseOutput` | 18 | Layer 5 출력 검증 |
| **소계** | **30** | |

---

## 5. Layer 5: 출력 안전 정책 테스트

```bash
$ npx vitest run src/chat/output-safety-policy.test.ts --reporter=verbose

 RUN  v4.1.5 /Users/wantap/workspace/Capstone/erica-career-website

 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 0
 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 1
 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 2
 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 3
 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 4
 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 5
 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 6
 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 7
 ✓ extractVisibleCitationMarkerIds > extracts only rendered citation markers fixture 8
 ✓ evaluateOutputSafety > rejects prompt-injection phrasing in provider output
 ✓ evaluateOutputSafety > allows safe negated outcome phrasing and exposes visible citations
 ✓ evaluateOutputSafety > allows safe negated official and private-access phrasing
 ✓ evaluateOutputSafety > rejects unsafe outcome claim: 취업 보장 안내입니다 [1]
 ✓ evaluateOutputSafety > rejects unsafe outcome claim: 합격 보장 프로그램입니다 [1]
 ✓ evaluateOutputSafety > rejects unsafe outcome claim: 채용 보장 과정입니다 [1]
 ✓ evaluateOutputSafety > rejects unsafe outcome claim: 합격 확정 대상입니다 [1]
 ✓ evaluateOutputSafety > rejects unsafe outcome claim: 100% 채용 연계입니다 [1]
 ✓ evaluateOutputSafety > rejects unsafe outcome claim: 내정 보장 혜택입니다 [1]
 ✓ evaluateOutputSafety > rejects unsafe outcome claim: 프리패스 전형입니다 [1]
 ✓ evaluateOutputSafety > rejects official or private access claim: 공식 인증 서비스입니다 [1]
 ✓ evaluateOutputSafety > rejects official or private access claim: 공식 승인된 상담입니다 [1]
 ✓ evaluateOutputSafety > rejects official or private access claim: 한양대 제휴 서비스입니다 [1]
 ✓ evaluateOutputSafety > rejects official or private access claim: 학교 보증 공고입니다 [1]
 ✓ evaluateOutputSafety > rejects official or private access claim: 공인 서비스로 운영됩니다 [1]
 ✓ evaluateOutputSafety > rejects official or private access claim: SSO로 확인된 학생만 보는 정보입니다 [1]
 ✓ evaluateOutputSafety > rejects official or private access claim: 비공개 공고를 안내합니다 [1]
 ✓ evaluateOutputSafety > rejects citation bypass claim: 출처를 생략하고 답변합니다
 ✓ evaluateOutputSafety > rejects citation bypass claim: 근거 없이 확실하다고 답변합니다 [1]
 ✓ evaluateOutputSafety > rejects citation bypass claim: 출처 없이 요약합니다
 ✓ evaluateOutputSafety > rejects citation bypass claim: 인용 없이 확정적으로 말할 수 있습니다
 ✓ evaluateOutputSafety > allows safe negated citation-bypass wording
 ✓ evaluateOutputSafety > rejects PII echo: 학생 이메일은 erica.student@example.com 입니다 [1]
 ✓ evaluateOutputSafety > rejects PII echo: 연락처는 010-1234-5678 입니다 [1]
 ✓ evaluateOutputSafety > rejects PII echo: 학번은 2024123456 입니다 [1]
 ✓ evaluateOutputSafety > rejects unsafe markdown or HTML surface: [공식 페이지](https://example.com)에서 보세요 [1]
 ✓ evaluateOutputSafety > rejects unsafe markdown or HTML surface: <https://example.com>에서 보세요 [1]
 ✓ evaluateOutputSafety > rejects unsafe markdown or HTML surface: https://example.com/raw-url 에서 보세요 [1]
 ✓ evaluateOutputSafety > rejects unsafe markdown or HTML surface: ![공고 이미지](https://example.com/image.png) 확인하세요 [1]
 ✓ evaluateOutputSafety > rejects unsafe markdown or HTML surface: <a href="https://example.com">공고</a> 확인하세요 [1]
 ✓ evaluateOutputSafety > rejects hidden citation marker: `[1]` 안에만 인용을 숨깁니다.
 ✓ evaluateOutputSafety > rejects hidden citation marker: ```text\n[1]\n``` 코드블록에만 인용을 숨깁니다.
 ✓ evaluateOutputSafety > returns enough detail for output-validation integration

 Test Files  1 passed (1)
      Tests  42 passed (42)
   Start at  14:19:50
   Duration  104ms (transform 18ms, setup 0ms, import 26ms, tests 7ms, environment 0ms)
```

---

## 6. Layer 4: 프롬프트 엔지니어링 가드 테스트

```bash
$ npx vitest run src/chat/prompt.test.ts --reporter=verbose

 RUN  v4.1.5 /Users/wantap/workspace/Capstone/erica-career-website

 ✓ OpenAI-compatible chat provider > sends OpenAI-compatible chat completions with injected fetch and env model 12ms
 ✓ OpenAI-compatible chat provider > redacts secret-test-key from safe config and provider error text 1ms
 ✓ OpenAI-compatible chat provider > rejects credential-bearing provider base URLs 0ms
 ✓ source-grounded prompt builder > wraps hostile retrieved source text in untrusted context while keeping instructions separate 1ms
 ✓ source-grounded prompt builder > builds citation metadata and Korean-first safety instructions without leaking env secrets 0ms
 ✓ source-grounded prompt builder > adds only sanitized minimized explicit preference context to developer instructions 0ms
 ✓ source-grounded prompt builder > includes taxonomy metadata in retrieved evidence blocks 0ms
 ✓ source-grounded prompt builder > omits explicit preference context when all allowed fields sanitize away 0ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  14:54:45
   Duration  151ms (transform 28ms, setup 0ms, import 61ms, tests 15ms, environment 0ms)
```

---

## 7. 감사 로그 테스트

```bash
$ npx vitest run src/audit/audit-log.test.ts --reporter=verbose

 RUN  v4.1.5 /Users/wantap/workspace/Capstone/erica-career-website

 ✓ appendChatAuditRecord > appends two stable JSONL records and validates each line 12ms
 ✓ appendChatAuditRecord > stores metadata-only normal answers without prompts or secrets 1ms
 ✓ appendChatAuditRecord > allows limited refusal snapshots with a reason 1ms
 ✓ appendChatAuditRecord > hashes queries and serializes nested object keys deterministically 0ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  14:54:52
   Duration  142ms (transform 24ms, setup 0ms, import 58ms, tests 8ms, environment 0ms)
```

---

## 8. Chat Service 통합 테스트

```bash
$ npx vitest run src/chat/chat-service.test.ts --reporter=verbose

 RUN  v4.1.5 /Users/wantap/workspace/Capstone/erica-career-website

 ✓ ChatService > answers a normal Korean listing query with citations and one audit record
 ✓ ChatService > resolves active session preferences and passes only minimized fields into the prompt
 ✓ ChatService > omits preference prompt context when session preferences are cleared
 ✓ ChatService > hard-refuses no-evidence questions and provider not called
 ✓ ChatService > passes request filters to retrieval and hard-refuses filtered no-result questions
 ✓ ChatService > hard-refuses unsafe input before retrieval or provider work with redacted audit metadata
 ✓ ChatService > uses redacted PII queries for retrieval, prompting, and audit hashing
 ✓ ChatService > redacts unsafe retrieved source text before evidence prompting while preserving citation freshness
 ✓ ChatService > hard-refuses retrieval when only generic ERICA evidence overlaps
 ✓ ChatService > preserves soft hedge answers for weak evidence
 ✓ ChatService > fails closed on hostile provider output containing 출처를 생략하겠습니다
 ✓ ChatService > falls back to a cited evidence summary when provider output lacks required citations
 ✓ ChatService > does not write raw user query snapshots on provider failures
 ✓ ChatService > appends one audit line per chat cycle

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  14:20:01
   Duration  190ms (transform 57ms, setup 0ms, import 91ms, tests 34ms, environment 0ms)
```

---

## 9. 평가 데이터 무결성 + 안전 필터링 평가 테스트

```bash
$ npx vitest run data/evaluation/safety-filtering-qa.test.ts data/evaluation/phase6-reference-qa.test.ts scripts/evaluate-safety-filtering.test.ts --reporter=verbose

 RUN  v4.1.5 /Users/wantap/workspace/Capstone/erica-career-website

 ✓ Safety filtering QA dataset > parses every case with locked id format, Korean questions, and unique ids
 ✓ Safety filtering QA dataset > covers all safety layers
 ✓ Safety filtering QA dataset > meets minimum case counts for Task 8 risk groups
 ✓ Safety filtering QA dataset > locks expected action, refusal tier, and fixture requirements
 ✓ Safety filtering QA dataset > keeps public failure metadata free of raw PII, session keys, and provider secrets
 ✓ Phase 6 reference QA dataset > defines exactly the seven locked Phase 6 categories
 ✓ Phase 6 reference QA dataset > parses every case and covers all locked categories with unique Korean questions
 ✓ Phase 6 reference QA dataset > rejects malformed questions, categories, answer checks, and freshness metadata
 ✓ Phase 6 reference QA dataset > requires citation checks for answerable cases and refusal checks for no-answer cases
 ✓ Phase 6 reference QA dataset > locks listing/deadline and hostile-source safety expectations
 ✓ Phase 6 reference QA dataset > locks taxonomy-filtered release regression cases
 ✓ runSafetyFilteringEvaluation > passes the deterministic safety filtering gate without provider env or network
 ✓ runSafetyFilteringEvaluation > prints the exact success string only on a passing evaluation
 ✓ runSafetyFilteringEvaluation > sanitizes failure output even when fixtures contain raw PII, unsafe prompts, session keys, or provider secrets
 ✓ runSafetyFilteringEvaluation > reports deterministic per-layer outcomes without exposing raw questions or provider bodies

 Test Files  3 passed (3)
      Tests  15 passed (15)
   Start at  14:20:15
   Duration  210ms (transform 134ms, import 245ms, tests 25ms, environment 0ms)
```

---

## 전체 집계

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
