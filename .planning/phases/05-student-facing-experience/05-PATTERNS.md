# Phase 05: Student-Facing Experience - Pattern Map

**Mapped:** 2026-05-04  
**Files analyzed:** 18 new/modified file groups  
**Analogs found:** 15 / 18  

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | batch | existing `package.json` | exact |
| `tsconfig.json` | config | batch | existing `tsconfig.json` | exact |
| `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts` | config | batch | no existing frontend config | no-analog |
| `app/layout.tsx`, `app/page.tsx`, `app/globals.css` | route/component/config | request-response | no existing Next app | no-analog |
| `app/api/chat/route.ts` | route | request-response | `src/chat/chat-service.ts` + `src/chat/chat-contract.ts` | role-match |
| `app/api/recommendations/route.ts` | route | request-response | `src/recommendations/recommendation-service.ts` + contract | role-match |
| `app/api/preferences/route.ts` | route | request-response | `src/personalization/preference-service.ts` + store | role-match |
| `lib/service-container.ts` | service/utility | request-response | `scripts/chat-smoke.ts`, `scripts/evaluate-personalization.ts` | role-match |
| `lib/api-client.ts` | utility | request-response | `src/chat/output-validation.ts`, contracts | role-match |
| `lib/deadline-labels.ts` | utility | transform | `src/recommendations/source-quality.ts`, `src/recommendations/match-reasons.ts` | role-match |
| `lib/session-key.ts` | utility | transform | `src/personalization/preference-store.ts` | partial |
| `components/dashboard/student-dashboard.tsx` | component/provider | event-driven | no existing React components; use service tests for state contracts | no-analog |
| `components/chat/*` | component | event-driven/request-response | `src/chat/chat-contract.ts`, `src/chat/output-validation.test.ts` | role-match |
| `components/citations/*` | component | event-driven | `src/chat/prompt.ts`, `src/chat/chat-contract.ts` | role-match |
| `components/listings/*` | component | event-driven/transform | `src/recommendations/recommendation-contract.ts`, `ranking.ts`, `match-reasons.ts` | role-match |
| `components/preferences/*` | component | event-driven/CRUD | `src/personalization/preference-contract.ts`, `preference-service.ts` | role-match |
| `components/ui/*` | component | event-driven | no existing UI primitives; use shadcn/Radix per `05-UI-SPEC.md` | no-analog |
| `*.test.ts(x)`, smoke/eval scripts | test | batch | `src/**/*test.ts`, `scripts/*evaluate*.ts`, `scripts/chat-smoke.ts` | exact |

## Pattern Assignments

### `package.json` and `tsconfig.json` (config, batch)

**Analog:** existing root config files.

**Script pattern** (`package.json` lines 3-15):
```json
"scripts": {
  "test": "vitest run",
  "typecheck": "tsc --noEmit",
  "evaluate:rag:mvp": "tsx scripts/evaluate-rag-mvp.ts",
  "evaluate:personalization": "tsx scripts/evaluate-personalization.ts",
  "chat:smoke": "tsx scripts/chat-smoke.ts"
}
```

**Dependency style** (`package.json` lines 17-30): dependencies are minimal runtime packages (`zod`, loaders) and dev tooling (`tsx`, `typescript`, `vitest`, `playwright`). Add Next/React/Tailwind scripts without removing `test` or `typecheck`.

**TypeScript baseline** (`tsconfig.json` lines 2-11):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vitest"]
  },
  "include": ["src/**/*.ts", "scripts/**/*.ts"]
}
```

**Planner guidance:** preserve `NodeNext` and `.js` import compatibility for existing services. Add JSX/DOM/Next includes incrementally; do not flip service modules to bundler-style imports.

---

### `app/api/chat/route.ts` (route, request-response)

**Analog:** `src/chat/chat-contract.ts`, `src/chat/chat-service.ts`.

**Imports and schema pattern** (`chat-contract.ts` lines 1-10, 25-31):
```typescript
import { z } from "zod";

export const ChatRequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  top_k: z.number().int().min(1).max(10).default(5),
});

export const ChatResponseSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(ChatCitationSchema),
  refusal_tier: RefusalTierSchema,
  confidence: z.number().min(0).max(1),
  trace_id: z.string().min(1),
});
```

**Core service-call pattern** (`chat-service.ts` lines 61-66, 93-105):
```typescript
async ask(input: ChatServiceAskInput): Promise<ChatResponse> {
  const request = ChatRequestSchema.parse(input);
  const traceId = this.traceIdGenerator();
  const results = await this.retriever.retrieve({ query: request.query, topK: request.top_k });
  const evidence = evaluateEvidence(results, { config: this.evidencePolicyConfig });

  const providerResponse = await this.provider.complete({ messages: builtPrompt.messages });
  const validation = validateChatResponseOutput({
    response: candidate,
    allowedCitationIds,
    expectedTier: evidence.refusal_tier,
  });
}
```

**Fail-closed error pattern** (`chat-service.ts` lines 121-159): provider/validation failures return a hard-refusal response and audit the failure; route handlers should likewise return controlled JSON errors and never fabricate answers.

**Route implementation pattern to copy:** thin adapter only:
```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const input = ChatRequestSchema.parse(await request.json());
  const response = await getChatService().ask(input);
  return Response.json(ChatResponseSchema.parse(response));
}
```

---

### `app/api/recommendations/route.ts` (route, request-response)

**Analog:** `src/recommendations/recommendation-contract.ts`, `src/recommendations/recommendation-service.ts`.

**Strict request/response schema pattern** (`recommendation-contract.ts` lines 9-14, 50-56):
```typescript
export const RecommendationRequestSchema = z.strictObject({
  query: z.string().trim().min(1).max(2000).optional(),
  session_key: z.string().trim().min(1).max(120).optional(),
  profile: PreferenceProfileSchema.optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

export const RecommendationResponseSchema = z.strictObject({
  recommendations: z.array(RecommendationItemSchema),
  generated_at: z.iso.datetime(),
  trace_id: z.string().min(1),
  preference_mode: z.enum(["preference", "no_preference"]),
  privacy_metadata: RecommendationPrivacyMetadataSchema,
});
```

**Service orchestration pattern** (`recommendation-service.ts` lines 47-71):
```typescript
async recommend(input: RecommendationServiceInput): Promise<RecommendationResponse> {
  const request = RecommendationRequestSchema.parse(input);
  const resolvedProfile = await this.resolveProfile(request);
  const preferenceRankingEnabled = resolvedProfile.profile !== undefined;
  const retrievalQuery = preferenceRankingEnabled ? buildProfileQuery(resolvedProfile.profile, request.query) : request.query ?? NO_PREFERENCE_QUERY;
  const candidates = await this.retriever.retrieve({ query: retrievalQuery, topK: request.limit });
  const ranked = rankRecommendationCandidates({ candidates, profile: resolvedProfile.profile, limit: request.limit, referenceDate: this.clock() });
  const recommendations = ranked.map((recommendation, index) => withMatchReasons(recommendation, index + 1, resolvedProfile.profile));

  return RecommendationResponseSchema.parse({ recommendations, generated_at: this.clock().toISOString(), trace_id: this.traceIdGenerator(), ... });
}
```

**No-preference fallback** (`recommendation-service.ts` lines 32, 51): use `"채용 모집 공고 취업 프로그램"` when no profile/query exists.

---

### `app/api/preferences/route.ts` (route, CRUD request-response)

**Analog:** `src/personalization/preference-contract.ts`, `preference-service.ts`, `preference-store.ts`.

**Privacy/storage schema pattern** (`preference-contract.ts` lines 7-16, 22-34):
```typescript
export const PreferenceProfileSchema = z.strictObject({
  major: z.string().trim().min(1).max(80),
  target_role: z.string().trim().min(1).max(120),
  industry: z.array(PreferenceTextSchema).max(5).default([]),
  region: z.array(PreferenceTextSchema).max(5).default([]),
  employment_type: z.array(PreferenceTextSchema).max(5).default([]),
  deadline_sensitivity: DeadlineSensitivitySchema.default("balanced"),
  session_only_optional_text: z.string().trim().max(500).optional(),
});

export const PreferenceConsentSchema = z.strictObject({
  consented_at: z.iso.datetime(),
  retention_days: z.number().int().positive().max(365),
  deletion_supported: z.literal(true),
});
```

**CRUD service pattern** (`preference-service.ts` lines 33-58):
```typescript
async setPreferences(sessionKey: string, input: unknown, options: PreferenceSetOptions = {}): Promise<PreferenceState> {
  const profile = PreferenceProfileSchema.parse(input);
  await this.write(sessionKey, profile, options);
  return this.store.read(sessionKey);
}

async updatePreferences(sessionKey: string, input: unknown, options: PreferenceSetOptions = {}): Promise<PreferenceState> { ... }
async clearPreferences(sessionKey: string): Promise<PreferenceState> { ... }
async readState(sessionKey: string): Promise<PreferenceState> { ... }
```

**Consent gate** (`preference-store.ts` lines 27-33, 75-84):
```typescript
export function requirePreferencePersistenceConsent(consent: unknown): PreferenceConsent {
  const result = PreferenceConsentSchema.safeParse(consent);
  if (!result.success) {
    throw new Error("preference persistence requires explicit consent, retention, and deletion behavior");
  }
  return result.data;
}
```

**Planner guidance:** default Phase 5 UI to session scope; expose persistent scope only with consent timestamp, retention days, deletion support, and clear controls.

---

### `lib/service-container.ts` (service factory/client API helper, request-response)

**Analog:** `scripts/chat-smoke.ts`, `scripts/evaluate-personalization.ts`.

**Chat construction pattern** (`scripts/chat-smoke.ts` lines 12-19):
```typescript
const chunks = loadKnowledgeBaseChunks();
const retriever = new Bm25Retriever(chunks);
const provider = createSmokeProvider(process.env);
const service = new ChatService({
  retriever,
  provider,
  auditLogPath: "data/audit/phase3-chat.jsonl",
});
```

**Recommendation/preference injection pattern** (`scripts/evaluate-personalization.ts` lines 293-303):
```typescript
function recommendationService(input: { candidates: RetrievedChunk[]; calls?: Array<{ query: string; topK?: number }>; preferenceService?: PreferenceService; }): RecommendationService {
  return new RecommendationService({
    retriever: retrieverWith(input.candidates, input.calls ?? []),
    preferenceService: input.preferenceService,
    clock: () => referenceDate,
    traceIdGenerator: () => "trace-personalization-eval",
  });
}
```

**Planner guidance:** create server-only singleton factories that reuse `loadKnowledgeBaseChunks()`, `Bm25Retriever`, `ChatService`, `RecommendationService`, and `PreferenceService(new InMemoryPreferenceStore())`. Keep provider env errors controlled for route handlers.

---

### `lib/api-client.ts` (utility, request-response)

**Analog:** output validators and contract tests.

**Response validation pattern** (`src/chat/output-validation.ts` lines 24-31, 69-73):
```typescript
export function validateChatResponseOutput(input: ValidateChatResponseOutputInput): ValidateChatResponseOutputResult {
  const parsed = ChatResponseSchema.safeParse(input.response);
  if (!parsed.success) {
    return { ok: false, failures: [`schema validation failed: ${summarizeZodError(parsed.error)}`] };
  }
  const response = parsed.data;
  ...
  return { ok: true, response };
}
```

**Unsafe-output validation pattern** (`output-validation.ts` lines 15-22, 36-52): preserve Hangul/citations and reject unsafe phrases (`출처를 생략`, `공식 인증`, `취업을 보장`, `이전 지시를 무시`).

**Planner guidance:** browser fetch helpers should parse `ChatResponseSchema`, `RecommendationResponseSchema`, and `PreferenceStateSchema` before updating component state. UI errors use Korean non-fabrication copy from UI-SPEC.

---

### `lib/deadline-labels.ts` and badge helpers (utility, transform)

**Analog:** `src/ingestion/normalized-record.ts`, `src/recommendations/source-quality.ts`, `match-reasons.ts`.

**Enum source of truth** (`normalized-record.ts` line 17):
```typescript
export const DeadlineStatusSchema = z.enum(["active", "expired", "unknown"]);
```

**Deadline semantic scoring pattern** (`source-quality.ts` lines 72-80):
```typescript
const deadline_score = chunk.deadline_status === "active" ? 1 : chunk.deadline_status === "unknown" ? 0.45 : 0;
const freshness_score = roundScore(deadline_score * 0.5 + posted_recency_score * 0.3 + fetched_recency_score * 0.2);
```

**Korean deadline copy pattern** (`match-reasons.ts` lines 90-98):
```typescript
if (candidate.deadline_status === "active") {
  return `- 마감/최신성: 현재 마감 상태가 진행 중인 정보로 표시되어 우선 확인할 가치가 있습니다 ${citationMarker}`;
}
if (candidate.deadline_status === "expired") {
  return `- 마감/최신성: 마감된 정보일 수 있어 지원 전 원문 날짜를 다시 확인하세요 ${citationMarker}`;
}
return `- 마감/최신성: 마감 상태가 불명확하므로 원문과 게시·수집일을 함께 확인하세요 ${citationMarker}`;
```

**Planner guidance:** UI helper maps `active -> 모집중`, `expired -> 마감됨`, `unknown -> 마감일 확인 필요`; do not infer from titles or raw text.

---

### `components/chat/*` (component, event-driven/request-response)

**Analog:** `src/chat/chat-contract.ts`, `src/chat/evidence-policy.ts`, `src/chat/output-validation.test.ts`.

**Chat response props** (`chat-contract.ts` lines 12-31): components must render citation id, title, URL, fetched/posted dates, deadline status, refusal tier, confidence, and trace ID.

**Refusal copy source** (`evidence-policy.ts` lines 84-86):
```typescript
export function buildHardRefusalAnswer(): string {
  return "현재 수집된 자료만으로는 답변을 뒷받침할 충분한 근거를 찾지 못했습니다. 공식 페이지를 확인하거나 더 구체적으로 질문해 주세요.";
}
```

**Korean/citation validation test pattern** (`output-validation.test.ts` lines 112-121, 147-160): tests accept Korean answers with mapped inline citations and hard refusals without citations.

**Planner guidance:** chat history lives in client component state. No server-side chat history. Complete-response loading only; no streaming UI.

---

### `components/citations/*` (component, event-driven)

**Analog:** `src/chat/prompt.ts`, `src/chat/chat-contract.ts`.

**Citation mapping pattern** (`prompt.ts` lines 109-123):
```typescript
function buildCitation(result: RetrievedChunk, citationId: number): ChatCitation {
  const anchor = result.chunk.citation_anchors[0];
  const url = anchor?.url ?? result.chunk.canonical_url;
  return {
    citation_id: citationId,
    chunk_id: result.chunk.chunk_id,
    record_id: result.chunk.record_id,
    source_id: result.chunk.source_id,
    title: result.chunk.title,
    url,
    fetched_at: result.chunk.fetched_at,
    posted_at: result.chunk.posted_at,
    deadline_status: result.chunk.deadline_status,
    ...(anchor?.page_number !== undefined ? { page_number: anchor.page_number } : {}),
  };
}
```

**Freshness/source fields** (`chat-contract.ts` lines 12-23): `title`, `url`, `fetched_at`, `posted_at`, `deadline_status`, optional `page_number` are mandatory display inputs.

**Planner guidance:** source inspection is stateful rail/sheet, not route navigation. Official links open new tab with `rel="noopener noreferrer"`.

---

### `components/listings/*` (component, event-driven/transform)

**Analog:** `src/recommendations/recommendation-contract.ts`, `ranking.ts`, `match-reasons.ts`.

**Listing item contract** (`recommendation-contract.ts` lines 26-42):
```typescript
export const RecommendationItemSchema = z.strictObject({
  recommendation_id: z.string().min(1),
  chunk_id: z.string().min(1),
  record_id: z.string().min(1),
  source_id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  url: z.url(),
  fetched_at: z.iso.datetime(),
  posted_at: z.iso.datetime().nullable(),
  deadline_status: DeadlineStatusSchema,
  score: z.number().min(0).max(1),
  match_strength: MatchStrengthSchema,
  match_reasons: z.array(z.string().trim().min(1)).min(1).max(3).optional(),
  score_breakdown: RecommendationScoreBreakdownSchema,
  citations: z.array(ChatCitationSchema).min(1),
});
```

**Match strength values** (`recommendation-contract.ts` line 7): `personalized_match`, `partial_match`, `general_recommendation`.

**No raw source text pattern** (`recommendation-contract.test.ts` lines 89-114): tests reject `text`, `raw_text`, `cleaned_text`, and `session_only_optional_text` in recommendation item output.

---

### `components/preferences/*` (component, event-driven/CRUD)

**Analog:** `src/personalization/preference-contract.ts`, `preference-service.test.ts`.

**Required/optional fields** (`preference-contract.ts` lines 7-16): required `major`, `target_role`; optional `industry`, `region`, `employment_type`, `deadline_sensitivity`, `session_only_optional_text`.

**Session-first behavior test** (`preference-service.test.ts` lines 13-31):
```typescript
const state = await service.setPreferences("session-a", {
  major: "컴퓨터학부",
  target_role: "백엔드 개발자",
  session_only_optional_text: "핀테크 회사도 궁금해요",
});

expect(state.preference_ranking_enabled).toBe(true);
expect(state.profile).toEqual({
  major: "컴퓨터학부",
  target_role: "백엔드 개발자",
  industry: [],
  region: [],
  employment_type: [],
  deadline_sensitivity: "balanced",
});
```

**Clear behavior** (`preference-service.test.ts` lines 56-70): clearing returns `preference_ranking_enabled: false`, `profile: null`, `storage_scope: "none"`.

---

### Tests, smoke checks, and eval additions (test, batch)

**Analog:** `src/chat/chat-service.test.ts`, `scripts/evaluate-rag-mvp.ts`, `scripts/evaluate-personalization.ts`.

**Vitest fixture style** (`chat-service.test.ts` lines 27-52, 73-81): build deterministic fixtures and mocked providers in-file; do not call live services in unit tests.

**Korean/citation eval checks** (`evaluate-rag-mvp.ts` lines 217-238):
```typescript
if (!/[가-힣]/u.test(response.answer)) failures.push(`${testCase.label}: answer lacks Hangul Korean content`);
if (response.refusal_tier !== "hard_refuse") {
  if (!/\[\d+\]/u.test(response.answer)) failures.push(`${testCase.label}: answer lacks inline numeric citation marker`);
  if (response.citations.length === 0) failures.push(`${testCase.label}: structured citations are missing`);
}
for (const citation of response.citations) {
  if (citation.title.trim().length === 0 || citation.url.trim().length === 0 || citation.fetched_at.trim().length === 0) {
    failures.push(`${testCase.label}: citation ${citation.citation_id} lacks title, official URL, or fetched_at`);
  }
}
```

**Personalization eval cases** (`evaluate-personalization.ts` lines 7-15): include preference lifecycle, no-preference fallback, weak match labeling, expired downranking, hostile source reason safety, persistence consent gate.

**CLI report pattern** (`scripts/chat-smoke.ts` lines 21-40): print JSON on success; catch unknown errors, redact secret-like text, and set `process.exitCode = 1`.

## Shared Patterns

### Zod schema validation
**Source:** `src/chat/chat-contract.ts`, `src/recommendations/recommendation-contract.ts`, `src/personalization/preference-contract.ts`  
**Apply to:** all route handlers and `lib/api-client.ts`.

- Parse all route request bodies with existing schemas.
- Parse all route responses before returning.
- Client helpers should safe-parse before rendering and convert failures to Korean UI error state.

### Service constructor injection
**Source:** `src/chat/chat-service.ts` lines 49-58; `src/recommendations/recommendation-service.ts` lines 40-45; `src/personalization/preference-service.ts` line 31.  
**Apply to:** `lib/service-container.ts`, route handler tests.

Use constructor-injected retrievers/providers/stores/clocks/trace IDs for deterministic tests and singleton app services.

### Korean-first and citation preservation
**Source:** `src/chat/output-validation.ts` lines 15-22, 36-52; `scripts/evaluate-rag-mvp.ts` lines 217-238.  
**Apply to:** chat answers, notices, source cards, listing cards, component tests.

Answers/reasons must contain Hangul where user-facing, include numeric citation markers for factual responses, and preserve structured citation objects with URL and fetched date.

### Deadline/status mapping
**Source:** `src/ingestion/normalized-record.ts` line 17; `05-UI-SPEC.md` lines 131-141.  
**Apply to:** `DeadlineStatusBadge`, `SourceCard`, `ListingCard`, filters.

Map only enum values: `active` → `모집중`; `expired` → `마감됨`; `unknown` → `마감일 확인 필요`.

### Privacy/storage contract
**Source:** `src/personalization/preference-store.ts` lines 27-33, 67-84, 92-95.  
**Apply to:** preference route, preference panel, settings menu.

Default to session. Persistent preferences require explicit consent and strip `session_only_optional_text` using `toPersistentPreferenceProfile`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/layout.tsx`, `app/page.tsx` | route/component | request-response/event-driven | Repo has no Next app or React components. Use `05-UI-SPEC.md` and Research structure. |
| `app/globals.css`, Tailwind/shadcn config | config/component | batch | Repo has no CSS pipeline or shadcn primitives. Use UI-SPEC tokens and official shadcn/Radix patterns. |
| `components/ui/*` | component | event-driven | No UI primitive library currently exists. Generate/add approved shadcn primitives only. |

## Metadata

**Analog search scope:** `src/chat/*`, `src/recommendations/*`, `src/personalization/*`, `src/ingestion/normalized-record.ts`, `scripts/*.ts`, root config, `app/components/lib` globs.  
**Files scanned:** 35+ files including all requested files and 27 existing test files discovered by glob.  
**Pattern extraction date:** 2026-05-04

## PATTERNS COMPLETE
