# Phase 05: Student-Facing Experience - Research

**Researched:** 2026-05-04  
**Domain:** Next.js App Router frontend over existing TypeScript RAG/recommendation services  
**Confidence:** HIGH for stack/API integration, HIGH for UI contract mapping, MEDIUM for shadcn dependency details because exact generated component dependencies should be confirmed after CLI initialization

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### App Structure
- **D-01:** Use Next.js as the frontend foundation for Phase 5. The existing codebase has no web app or API layer, and Next.js lets the phase introduce both the UI and thin service-facing route handlers in one stack.
- **D-02:** Build a single dashboard experience rather than separate primary pages. Chat stays central, while listings, recommendations, citations, and preference controls live as panels, tabs, or rails so users do not lose context.
- **D-03:** Add thin Next.js API routes/route handlers over existing TypeScript services (`ChatService`, `RecommendationService`, `PreferenceService`) instead of creating a separate backend server or mock-only UI.
- **D-04:** Treat chat responses as complete-response interactions for Phase 5. Do not require streaming in this phase; use polished loading states around the existing complete `ChatResponse` contract.

#### Chat Experience
- **D-05:** Citation/source cards should open in a right-side panel on desktop and an equivalent mobile bottom sheet or drawer, preserving chat context while allowing source inspection.
- **D-06:** Chat answer history is client-session-only by default. Do not persist chat history server-side in Phase 5.
- **D-07:** `hard_refuse` and `soft_hedge` responses should render as gentle notice cards inside the answer flow, explaining evidence limits and prompting official-source verification without using alarming error styling.
- **D-08:** Recommended source/listing cards should attach to the relevant answer when possible, making the question, evidence, and recommended next source easy to connect.

#### Listing Browse
- **D-09:** Use a card-list layout for latest/recommended employment listings. Cards should support title, source, date/deadline status, match strength, match reasons, and citation/source links.
- **D-10:** Default listing order should be recommended-first: preference-aware score order when preferences exist, and latest/active source-grounded ordering when there are no preferences.
- **D-11:** Use only core pill filters in Phase 5: examples include all, recommended, latest, deadline-soon, source, and status. Do not expand into a full advanced search/filter product.
- **D-12:** Show deadline status as a semantic badge plus short Korean copy: `모집중`, `마감됨`, and `마감일 확인 필요` or equivalent labels mapped from `active`, `expired`, and `unknown`.

#### Preference Settings Flow
- **D-13:** Initial required preference input (`major`, `target_role`) should live in the dashboard side panel on desktop and a drawer/bottom sheet pattern on mobile.
- **D-14:** Preference storage is session-first by default. Persistent storage may be exposed only as an explicit opt-in with consent, retention, and deletion support.
- **D-15:** Optional preferences should use progressive disclosure. Show required fields first and put industry, region, employment type, and deadline sensitivity under an expandable detail area.
- **D-16:** Clear/update controls may live in a settings submenu rather than always-visible privacy row, but the submenu must still make preference clearing and storage scope understandable and reachable.

#### Visual Direction
- **D-17:** Adapt `DESIGN.md` into an academic-calm career-service visual direction. Preserve useful patterns like white surfaces, large rounded cards, pill controls, and clear hierarchy, but do not copy Meta branding, commerce voice, or product-merchandising patterns.
- **D-18:** Use Pretendard as the first-choice Korean UI font, with Noto Sans KR, Apple SD Gothic Neo, and system sans fallbacks.
- **D-19:** Use a muted Hanyang-blue-inspired primary color selectively for trusted source markers and primary actions, balanced with white and soft gray surfaces.
- **D-20:** Use semantic badges consistently for posting status, citation/source trust, and recommendation strength. Badges must combine color with Korean text, not color alone.

### the agent's Discretion
- The user did not choose any `You decide` options. Downstream agents may still decide exact route names, component names, CSS token values, loading microcopy, test fixture details, and API handler file layout as long as D-01 through D-20 and Phase 5 requirements are satisfied.

### Deferred Ideas (OUT OF SCOPE)
- Streaming chat responses are deferred; Phase 5 should use complete-response UI with polished loading states.
- Server-side chat-history persistence is deferred unless a later phase adds explicit consent, retention, and deletion behavior.
- Full advanced listing search/filtering is deferred; Phase 5 should keep core pill filters only.
- Official Hanyang SSO, application submission, resume/cover-letter tools, and production crawling remain out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UX-01 | User can view a responsive Korean-first chat page with input, answer history, citations, and recommended source links. | Use Next.js `app/page.tsx` + client dashboard state, POST `/api/chat`, and optional answer-attached `/api/recommendations` cards mapped from `ChatResponse` and `RecommendationItem` contracts. [VERIFIED: `.planning/REQUIREMENTS.md`; `src/chat/chat-contract.ts`; `src/recommendations/recommendation-contract.ts`] |
| UX-02 | User can inspect cited source cards from an answer without losing chat context. | Use desktop right rail and mobile sheet/drawer components; keep selected citation in client state instead of navigation. [VERIFIED: `05-UI-SPEC.md`; `.planning/phases/05-student-facing-experience/05-CONTEXT.md`] |
| UX-03 | User can browse latest or recommended employment listings outside the chat flow. | Use single-dashboard `ListingPanel` backed by `RecommendationService.recommend`, with no-preference fallback query and service-provided order. [VERIFIED: `recommendation-service.ts`; `05-UI-SPEC.md`] |
| UX-04 | UI labels expired/uncertain job postings visibly. | Map `deadline_status: active|expired|unknown` to Korean badges `모집중|마감됨|마감일 확인 필요` in chat source cards and listing cards. [VERIFIED: `normalized-record.ts`; `05-UI-SPEC.md`] |
| UX-05 | UI uses the design seed selectively: calm white surfaces, rounded cards, pill filters, clear typography, and trustworthy source presentation. | Implement Tailwind v4 CSS variables from UI-SPEC; use shadcn/Radix primitives for accessible cards/sheets/dialogs/tabs where practical; avoid Meta branding. [VERIFIED: `05-UI-SPEC.md`; `DESIGN.md`; `.planning/research/design-seed.md`; CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs] |
</phase_requirements>

## Summary

Phase 5 should add a root-level Next.js App Router application while preserving the existing strict TypeScript ESM service layer. [VERIFIED: `package.json`; `tsconfig.json`; CITED: https://nextjs.org/docs/app/getting-started/installation] The safest plan is to keep chat, recommendation, and preference intelligence in existing `src/` services, add Node.js runtime route handlers as thin input/output wrappers, and build a single client dashboard that owns transient chat history, selected citations, filter state, and drawer/rail state. [VERIFIED: `05-CONTEXT.md`; `chat-service.ts`; `recommendation-service.ts`; `preference-service.ts`; CITED: https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/01-getting-started/15-route-handlers.mdx]

The main implementation risk is configuration collision: the repo is currently a NodeNext TypeScript service project with no JSX, DOM libs, Next app directory, CSS pipeline, ESLint config, or component library. [VERIFIED: `tsconfig.json`; `package.json`; file glob for frontend config] Planning must include a Wave 0 scaffold that updates `package.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, and `app/globals.css` without breaking existing Vitest and `tsc --noEmit` service tests. [VERIFIED: `package.json`; CITED: https://nextjs.org/docs/app/getting-started/installation; CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs]

**Primary recommendation:** Use Next.js 16.2.4 + React 19.2.5 + Tailwind CSS 4.2.4 + shadcn/Radix primitives, with Node.js App Router route handlers that validate request/response schemas and client-session dashboard state for chat history. [VERIFIED: npm registry; CITED: https://nextjs.org/docs/app/getting-started/installation; CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs]

## Project Constraints (from AGENTS.md)

- Preserve Korean-first behavior for user-facing chat, source labels, and employment information. [VERIFIED: `AGENTS.md`]
- Every answer or recommendation based on source data must keep citations and freshness metadata. [VERIFIED: `AGENTS.md`]
- Do not claim official Hanyang endorsement, SSO access, or production crawling permission unless new evidence is added to planning docs. [VERIFIED: `AGENTS.md`]
- Do not crawl authenticated/private pages or bypass access controls. [VERIFIED: `AGENTS.md`]
- Prefer explicit preference-based personalization before inferred profiling. [VERIFIED: `AGENTS.md`]
- Minimize stored personal data and provide clearing controls when persistence exists. [VERIFIED: `AGENTS.md`]
- Use TDD or verification-first planning for ingestion, retrieval, citation formatting, and safety behavior; for Phase 5, this means route/component tests before UI polish. [VERIFIED: `AGENTS.md`]
- Add evaluation/QA cases for no-answer/refusal behavior, stale listings, citation accuracy, and Korean answer quality where Phase 5 renders those states, without expanding into the full Phase 6 evaluation suite. [VERIFIED: `AGENTS.md`; VERIFIED: `.planning/ROADMAP.md`]
- Keep implementation scoped to active Phase 5 and requirement IDs UX-01 through UX-05. [VERIFIED: `AGENTS.md`; `.planning/REQUIREMENTS.md`]
- UI work must follow the approved UI planning route and adapt the Meta-style design seed into an academic career-service interface; do not copy Meta branding. [VERIFIED: `AGENTS.md`; `05-UI-SPEC.md`]
- Use rounded cards, pill filters, calm white surfaces, clear source cards, and Korean-first typography; verify mobile and desktop layouts for chat, citations, and listings. [VERIFIED: `AGENTS.md`; `05-UI-SPEC.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Responsive dashboard shell | Browser / Client | Frontend Server (SSR) | The dashboard's chat history, selected citation, panels, filters, and drawers are interactive client-session state; SSR only serves the initial shell. [VERIFIED: `05-CONTEXT.md`; CITED: React controlled state docs via Context7 `/reactjs/react.dev`] |
| Complete-response chat submission | API / Backend | Browser / Client | Route handler validates input, calls `ChatService.ask`, and returns a complete `ChatResponse`; client shows loading and appends history. [VERIFIED: `chat-service.ts`; `chat-contract.ts`; CITED: Next route handlers docs] |
| Citation/source inspection | Browser / Client | API / Backend | Citations arrive in the chat response; rail/sheet selection is UI state and must not navigate away. [VERIFIED: `05-UI-SPEC.md`; `chat-contract.ts`] |
| Recommended/latest listings | API / Backend | Browser / Client | `RecommendationService` owns ranking, match reasons, citations, and privacy metadata; client filters only core visible categories/statuses. [VERIFIED: `recommendation-service.ts`; `recommendation-contract.ts`; `05-CONTEXT.md`] |
| Preference entry/update/clear | Browser / Client | API / Backend | Client presents required/optional fields and storage scope; route handler wraps `PreferenceService` for schema/lifecycle semantics. [VERIFIED: `preference-service.ts`; `preference-contract.ts`; `05-UI-SPEC.md`] |
| Deadline/status labels | Browser / Client | API / Backend | Source contracts provide `deadline_status`; UI maps it to semantic Korean badges without changing source truth. [VERIFIED: `normalized-record.ts`; `05-UI-SPEC.md`] |
| Persistence and privacy | API / Backend | Browser / Client | Chat history stays client-session only; preference persistence requires explicit consent and should not be introduced by default. [VERIFIED: `05-CONTEXT.md`; `preference-store.ts`] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.4, modified 2026-05-03 | App Router, route handlers, build/dev server | Official docs state App Router route handlers are `app/**/route.ts` files using Web Request/Response APIs, matching the thin API wrapper decision. [VERIFIED: npm registry; CITED: https://nextjs.org/docs/app/getting-started/installation; CITED: Next route handlers Context7 `/vercel/next.js/v16.1.6`] |
| `react` | 19.2.5, modified 2026-04-30 | Interactive client dashboard components | Next manual installation requires declaring `react` and `react-dom`; React controlled state fits chat composer/history and drawer state. [VERIFIED: npm registry; CITED: https://nextjs.org/docs/app/getting-started/installation; CITED: React Context7 `/reactjs/react.dev`] |
| `react-dom` | 19.2.5, modified 2026-04-30 | React DOM runtime for Next | Required by official Next manual installation. [VERIFIED: npm registry; CITED: https://nextjs.org/docs/app/getting-started/installation] |
| `tailwindcss` | 4.2.4, modified 2026-05-02 | Utility CSS and design tokens | Tailwind official Next guide installs Tailwind with `@tailwindcss/postcss` and uses `@import "tailwindcss"`; v4 supports CSS-first `@theme` variables. [VERIFIED: npm registry; CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs; CITED: Tailwind Context7 `/tailwindlabs/tailwindcss.com`] |
| `@tailwindcss/postcss` | 4.2.4, modified 2026-05-02 | PostCSS plugin for Tailwind v4 in Next | Official Tailwind Next guide configures `postcss.config.mjs` with this plugin. [VERIFIED: npm registry; CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs] |
| `postcss` | 8.5.13, modified 2026-04-30 | CSS build pipeline | Official Tailwind Next guide installs it with Tailwind and `@tailwindcss/postcss`. [VERIFIED: npm registry; CITED: https://tailwindcss.com/docs/installation/framework-guides/nextjs] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shadcn` CLI | 4.6.0, modified 2026-04-30 | Initialize/copy shadcn components | Use after Next/Tailwind scaffold to add only approved primitives; shadcn docs show `components.json` aliases and `npx shadcn@latest add ...`. [VERIFIED: npm registry; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| `lucide-react` | 1.14.0, modified 2026-04-29 | Icons for send, source, status, settings | UI-SPEC recommends lucide icons for Phase 5. [VERIFIED: npm registry; VERIFIED: `05-UI-SPEC.md`] |
| `@radix-ui/react-dialog` | 1.1.15, modified 2025-12-24 | Accessible dialogs/sheets through shadcn | Use for settings/confirmation/source modal primitives when shadcn adds dialog/sheet. [VERIFIED: npm registry; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| `@radix-ui/react-tabs` | 1.1.13, modified 2025-12-24 | Dashboard panel tabs | Use if tabs are implemented via shadcn `tabs`. [VERIFIED: npm registry; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| `@radix-ui/react-select` | 2.2.6, modified 2025-12-24 | Preference selects | Use for deadline sensitivity or constrained fields. [VERIFIED: npm registry; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| `@radix-ui/react-accordion` | 1.2.12, modified 2025-12-24 | Progressive optional preferences | Use for optional preference disclosure. [VERIFIED: npm registry; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| `@radix-ui/react-scroll-area` | 1.2.10, modified 2025-12-24 | Long chat/source rails | Use for scrollable panels when shadcn `scroll-area` is added. [VERIFIED: npm registry; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| `vaul` | 1.1.2, modified 2024-12-14 | Drawer primitive used by shadcn drawer patterns | Use only if choosing shadcn `drawer` for mobile bottom sheets. [VERIFIED: npm registry; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| `@testing-library/react` | 16.3.2, modified 2026-01-19 | Component tests | Use with Vitest jsdom for dashboard/component behavior. [VERIFIED: npm registry; CITED: Vitest Context7 `/vitest-dev/vitest/v4.0.7`] |
| `@testing-library/user-event` | 14.6.1, modified 2025-12-13 | Realistic user interactions in tests | Use for composer submit, filter clicks, sheet close/focus behavior. [VERIFIED: npm registry] |
| `jsdom` | 29.1.1, modified 2026-04-30 | DOM environment for Vitest UI tests | Vitest docs support jsdom/happy-dom for browser-like tests and per-file `@vitest-environment jsdom`. [VERIFIED: npm registry; CITED: Vitest Context7 `/vitest-dev/vitest/v4.0.7`] |
| `@playwright/test` | 1.59.1, modified 2026-05-03 | Manual/automated responsive smoke checks | Use for mobile/desktop verification if adding browser QA scripts; repo already has `playwright` 1.59.1. [VERIFIED: npm registry; VERIFIED: `package.json`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/Radix primitives | Fully hand-rolled dialogs/sheets/tabs | Faster initial install avoidance, but higher accessibility/focus-management risk for UX-02 mobile sheets and settings dialogs. [VERIFIED: `05-UI-SPEC.md`; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| Next route handlers | Separate Express/Fastify backend | More explicit API server but contradicts D-03 and adds deployment/test surface beyond Phase 5. [VERIFIED: `05-CONTEXT.md`] |
| Server-side chat history | Database/session persistence | Explicitly deferred and would require consent/retention/deletion scope beyond Phase 5. [VERIFIED: `05-CONTEXT.md`; `.planning/ROADMAP.md`] |
| Vercel AI SDK streaming | `useChat` streaming UX | Stack research mentioned streaming as future-friendly, but Phase 5 requires complete-response chat and no streaming. [VERIFIED: `.planning/research/STACK.md`; `05-CONTEXT.md`] |

**Installation:**
```bash
npm install next@16.2.4 react@19.2.5 react-dom@19.2.5 tailwindcss@4.2.4 @tailwindcss/postcss@4.2.4 postcss@8.5.13 lucide-react@1.14.0
npm install -D @types/react@19.2.14 @types/react-dom@19.2.3 @testing-library/react@16.3.2 @testing-library/user-event@14.6.1 jsdom@29.1.1 @playwright/test@1.59.1 eslint@10.3.0 eslint-config-next@16.2.4
npx shadcn@latest init
npx shadcn@latest add button card badge sheet dialog drawer tabs accordion textarea select separator scroll-area
```

**Version verification:** All versions above were checked with `npm view <package> version time.modified` on 2026-05-04. [VERIFIED: npm registry]

## Concrete Implementation Architecture

### Recommended Project Structure

```text
app/
├── layout.tsx                         # Korean html root, global font variables, metadata
├── page.tsx                           # Server shell rendering StudentDashboard client entry
├── globals.css                        # Tailwind v4 import + UI-SPEC OKLCH tokens
└── api/
    ├── chat/route.ts                  # POST wrapper over ChatService.ask
    ├── recommendations/route.ts       # POST/GET wrapper over RecommendationService.recommend
    └── preferences/route.ts           # GET/POST/PATCH/DELETE wrapper over PreferenceService
components/
├── dashboard/student-dashboard.tsx     # client-session state coordinator
├── chat/*                             # composer, message list, answer, refusal notice
├── citations/*                        # inline markers, rail, mobile sheet, source card
├── listings/*                         # panel, filters, listing card, badges
├── preferences/*                      # preference panel, fields, settings menu
└── ui/*                               # shadcn copied primitives
lib/
├── api-client.ts                      # browser fetch wrappers + Zod response validation
├── deadline-labels.ts                 # active/expired/unknown label mapping
├── service-container.ts               # server-only singleton service factories
└── session-key.ts                     # browser sessionStorage key creation
src/                                  # existing service/domain code remains authoritative
```

This structure keeps Next-specific UI under `app/`, `components/`, and `lib/`, while existing domain contracts and services stay in `src/`. [VERIFIED: existing repo file layout; CITED: https://nextjs.org/docs/app/getting-started/installation]

### System Architecture Diagram

```text
Student browser
  ├─ app/page.tsx -> StudentDashboard (client state)
  │    ├─ ChatComposer -> POST /api/chat
  │    │    └─ route.ts (runtime=nodejs, dynamic) -> ChatService.ask
  │    │         ├─ loadKnowledgeBaseChunks -> Bm25Retriever
  │    │         ├─ OpenAI-compatible provider from env
  │    │         └─ ChatResponseSchema -> JSON response
  │    ├─ CitationMarker/Trigger -> selectedCitationId state
  │    │    ├─ desktop: SourceInspectionRail
  │    │    └─ mobile: SourceSheet/Drawer
  │    ├─ ListingPanel -> POST /api/recommendations
  │    │    └─ RecommendationService.recommend -> RecommendationResponseSchema
  │    └─ PreferencePanel -> /api/preferences + client sessionStorage state
  │         └─ PreferenceService validates set/update/clear semantics
  └─ External official source links open in new tab
```

The route handlers must export `runtime = "nodejs"` because existing loaders/audit paths use Node filesystem APIs and the provider uses environment values; Next route segment config supports `runtime = 'nodejs'`. [VERIFIED: `jsonl-loader.ts`; `chat-service.ts`; CITED: Next route segment config Context7 `/vercel/next.js/v16.1.6`]

### TypeScript/Next Integration Plan

1. Preserve the existing `type: "module"`, `module: "NodeNext"`, and `moduleResolution: "NodeNext"` service semantics because existing source files use ESM `.js` import specifiers. [VERIFIED: `package.json`; `tsconfig.json`; `src/**/*.ts` imports]
2. Add JSX/DOM/Next support to `tsconfig.json`: `jsx: "preserve"`, `lib: ["dom", "dom.iterable", "es2022"]`, `baseUrl: "."`, paths such as `@/*`, and include `next-env.d.ts`, `app/**/*.ts`, `app/**/*.tsx`, `components/**/*.ts(x)`, `lib/**/*.ts`, existing `src/**/*.ts`, and `scripts/**/*.ts`. [CITED: https://nextjs.org/docs/app/getting-started/installation]
3. Keep `npm run typecheck` as `tsc --noEmit` and add `npm run build:web` as `next build`; both should pass before Phase 5 completion. [VERIFIED: `package.json`; CITED: https://nextjs.org/docs/app/getting-started/installation]
4. Avoid moving existing `src/` service files into `app/`; route handlers should import them with ESM-compatible specifiers and use shared factories to prevent duplicate initialization. [VERIFIED: existing service constructors]
5. Add `next-env.d.ts` generated/expected by Next and do not remove existing Node/Vitest types until tests are split or config supports both. [CITED: https://nextjs.org/docs/app/getting-started/installation; CITED: Vitest Context7]

### API Route Wrapper Strategy

| Endpoint | Method | Request | Service Call | Response | Notes |
|----------|--------|---------|--------------|----------|-------|
| `/api/chat` | POST | `{ query: string, top_k?: number }` parsed by `ChatRequestSchema` | `ChatService.ask({ query, top_k })` | `ChatResponseSchema` JSON | Complete-response only; no streaming; catch setup/provider errors into non-fabricated UI error, not fake answers. [VERIFIED: `chat-contract.ts`; `chat-service.ts`] |
| `/api/recommendations` | POST preferred | `{ query?, session_key?, profile?, limit? }` parsed by `RecommendationRequestSchema` | `RecommendationService.recommend(input)` | `RecommendationResponseSchema` JSON | Use profile from client session state when available; no advanced server search. [VERIFIED: `recommendation-contract.ts`; `recommendation-service.ts`] |
| `/api/preferences` | GET/POST/PATCH/DELETE | `session_key` plus profile/update payload | `PreferenceService.readState/setPreferences/updatePreferences/clearPreferences` | `PreferenceStateSchema` JSON | Session-first; persistent option should be hidden or gated by consent fields if exposed. [VERIFIED: `preference-contract.ts`; `preference-service.ts`; `preference-store.ts`] |

**Service factory pattern:** create a server-only singleton that loads knowledge chunks once, constructs `Bm25Retriever`, `ChatService`, `RecommendationService`, and `PreferenceService`, and reuses them across route calls in development. [VERIFIED: `scripts/chat-smoke.ts`; `recommendation-service.ts`] Use `import "server-only"` if adding that package or keep factories only imported from route handlers. [ASSUMED]

**Provider hazard:** `createOpenAiCompatibleChatProviderFromEnv` fails if `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, or `OPENAI_COMPAT_MODEL` is missing, so `/api/chat` should return a Korean error state rather than crashing the whole page. [VERIFIED: `openai-compatible-provider.ts`; `05-UI-SPEC.md`]

### Component/Data Contract Mapping

| UI Component | Source Contract Fields | Must Preserve |
|--------------|------------------------|---------------|
| `AssistantAnswer` | `ChatResponse.answer`, `citations`, `refusal_tier`, `confidence`, `trace_id` | Korean answer text, refusal tier, confidence, trace ID, citation count. [VERIFIED: `chat-contract.ts`] |
| `InlineCitationMarker` | `ChatCitation.citation_id` | Numeric marker and accessible Korean label `n번 출처 보기`. [VERIFIED: `chat-contract.ts`; `05-UI-SPEC.md`] |
| `SourceCard` | `title`, `url`, `fetched_at`, `posted_at`, `deadline_status`, `page_number`, `source_id` | Official URL, freshness dates, page number, status badge; never show raw source text. [VERIFIED: `chat-contract.ts`; `normalized-record.ts`; `05-UI-SPEC.md`] |
| `ListingCard` | `RecommendationItem.title`, `category`, `url`, `deadline_status`, `score`, `match_strength`, `match_reasons`, `citations` | Match reasons, citation links, deadline status, score/match metadata; no raw text or private free text. [VERIFIED: `recommendation-contract.ts`] |
| `PreferencePanel` | `PreferenceProfile.major`, `target_role`, optional arrays, `deadline_sensitivity`, `session_only_optional_text`; `PreferenceState.storage_scope` | Required fields first, progressive optional fields, session-only label for optional free text, clear controls. [VERIFIED: `preference-contract.ts`; `05-UI-SPEC.md`] |

## Architecture Patterns

### Pattern 1: Complete-response client action with guarded schema validation
**What:** Submit the chat query from a client component, display pending state, POST to `/api/chat`, parse the response with `ChatResponseSchema`, then append to in-memory React state. [VERIFIED: `chat-contract.ts`; CITED: React controlled textarea docs; CITED: Next route handler docs]

**Example:**
```typescript
// Source: React controlled textarea docs + project ChatResponseSchema
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [query, setQuery] = useState("");

async function submitQuestion() {
  const submitted = query.trim();
  if (submitted.length === 0) return;
  setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", query: submitted, status: "pending" }]);
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: submitted, top_k: 5 }),
  });
  // Parse with ChatResponseSchema in lib/api-client.ts before rendering.
}
```

### Pattern 2: Node.js route handler as service adapter
**What:** Keep handlers thin: parse request, call service, validate response, return JSON. [VERIFIED: `chat-service.ts`; CITED: Next route handlers docs]

**Example:**
```typescript
// Source: Next route handlers docs + src/chat/chat-contract.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const input = ChatRequestSchema.parse(body);
  const response = await getChatService().ask(input);
  return Response.json(ChatResponseSchema.parse(response));
}
```

### Pattern 3: Citation selection by state, not routing
**What:** Store `selectedCitationId` and `sourcePanelOpen` in `StudentDashboard`; render right rail on desktop and modal drawer on mobile from the same citation array. [VERIFIED: `05-UI-SPEC.md`]

### Pattern 4: Session-first preferences with explicit profile request
**What:** Store the current session key and draft preference form in browser session state; send `profile` to `/api/recommendations` for ranking and optionally mirror through `/api/preferences` for lifecycle validation/clear. [VERIFIED: `preference-service.ts`; `recommendation-service.ts`; `05-CONTEXT.md`]

### Anti-Patterns to Avoid
- **Using streaming chat UI:** Phase 5 explicitly requires complete-response loading states, not SSE/streaming. [VERIFIED: `05-CONTEXT.md`]
- **Persisting chat history server-side:** D-06 defers server persistence; client state/sessionStorage is the maximum unless future consent work is planned. [VERIFIED: `05-CONTEXT.md`]
- **Flattening citations into plain links:** Citation and freshness metadata must remain visible and inspectable. [VERIFIED: `AGENTS.md`; `chat-contract.ts`; `recommendation-contract.ts`]
- **Making source cards navigate away:** UX-02 requires source inspection without losing context; official URLs open separately. [VERIFIED: `05-UI-SPEC.md`]
- **Advanced filtering/search:** Keep core pill filters only; no saved jobs, reminders, advanced query builder, resume/application tooling. [VERIFIED: `05-CONTEXT.md`; `05-UI-SPEC.md`]
- **Claiming official endorsement or SSO:** Explicitly prohibited for Phase 5. [VERIFIED: `AGENTS.md`; `.planning/REQUIREMENTS.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialog/sheet focus management | Custom focus trap and escape handling | shadcn/Radix `Dialog`, `Sheet`, `Drawer` | UX-02 requires mobile focus trap, restored focus, and keyboard close; primitives reduce accessibility risk. [VERIFIED: `05-UI-SPEC.md`; CITED: shadcn Context7 `/shadcn-ui/ui`] |
| Schema validation | Manual `typeof` checks in routes | Existing Zod schemas | Existing contracts already validate requests/responses and prevent field flattening. [VERIFIED: `chat-contract.ts`; `recommendation-contract.ts`; `preference-contract.ts`] |
| Recommendation ranking/filtering | UI-side scoring algorithm | `RecommendationService.recommend` | Ranking weights, Korean match reasons, no-preference fallback, and privacy metadata already exist. [VERIFIED: `recommendation-service.ts`; `.planning/STATE.md`] |
| Deadline labels | Ad-hoc string inference from title text | `deadline_status` from normalized records/contracts | Deadline extraction was prior-phase work; UI should only map enum to labels. [VERIFIED: `normalized-record.ts`; `05-UI-SPEC.md`] |
| Chat answer generation | Mock answers in frontend | `ChatService.ask` | Source-grounded citation/refusal/audit guardrails live in the service. [VERIFIED: `chat-service.ts`; `.planning/STATE.md`] |

**Key insight:** Phase 5 is a presentation/adaptation layer, not a second implementation of RAG, ranking, deadline extraction, privacy, or safety policy. [VERIFIED: `.planning/ROADMAP.md`; `05-CONTEXT.md`]

## Common Pitfalls

### Pitfall 1: Breaking existing NodeNext tests while adding Next
**What goes wrong:** Changing `moduleResolution` or import style for Next can break service imports that use `.js` ESM specifiers. [VERIFIED: `tsconfig.json`; `src/**/*.ts`]  
**How to avoid:** Preserve NodeNext service settings; add JSX/DOM/includes incrementally; verify `npm run typecheck`, `npm test`, and `next build`. [CITED: Next installation docs]

### Pitfall 2: Route handlers accidentally running on Edge
**What goes wrong:** Edge runtime cannot safely use Node `fs` loaders/audit paths. [VERIFIED: `jsonl-loader.ts`; `audit-log.ts`]  
**How to avoid:** Export `runtime = "nodejs"` and avoid route caching for chat/recommendations. [CITED: Next route segment config docs]

### Pitfall 3: Missing provider env makes chat UI look broken
**What goes wrong:** Provider construction throws when `OPENAI_COMPAT_*` env vars are absent. [VERIFIED: `openai-compatible-provider.ts`]  
**How to avoid:** Route handler returns a controlled 503 JSON error; UI displays `요청을 처리하지 못했어요...` without fabricating an answer. [VERIFIED: `05-UI-SPEC.md`]

### Pitfall 4: Client filters mutate trust semantics
**What goes wrong:** UI filters might hide expired/unknown status or detach recommendations from citations. [VERIFIED: `05-UI-SPEC.md`]  
**How to avoid:** Filters are visual subsets only; every card still renders `deadline_status`, citations, fetched/posted metadata, and official link. [VERIFIED: `recommendation-contract.ts`; `chat-contract.ts`]

### Pitfall 5: Over-scoping Phase 6 safety/release work
**What goes wrong:** Planner adds full eval suite, disclaimers governance, or release gates. [VERIFIED: `.planning/ROADMAP.md`; `05-CONTEXT.md`]  
**How to avoid:** Phase 5 tests render refusal/stale/citation states, but full `SAFE-*`/`EVAL-*` requirements stay in Phase 6. [VERIFIED: `.planning/REQUIREMENTS.md`]

## Testing and Manual QA Strategy

`workflow.nyquist_validation` is explicitly `false`, so the formal Validation Architecture section is omitted. [VERIFIED: `.planning/config.json`] Planning should still include verification-first tasks because AGENTS.md requires it. [VERIFIED: `AGENTS.md`]

### Existing Test Infrastructure
- Existing tests run with Vitest via `npm test` and TypeScript via `npm run typecheck`. [VERIFIED: `package.json`]
- There are 27 existing `*.test.ts` files and no React/DOM tests yet. [VERIFIED: glob `**/*.{test,spec}.ts`]
- Vitest defaults to Node environment; jsdom can be enabled per file or config for browser-like component tests. [CITED: Vitest Context7 `/vitest-dev/vitest/v4.0.7`]

### Recommended New Tests
| Area | Test Type | Concrete Coverage |
|------|-----------|-------------------|
| Route handlers | Vitest unit/integration with mocked services | `/api/chat` parses request, returns valid `ChatResponse`, handles provider/setup errors; `/api/recommendations` returns valid `RecommendationResponse`; `/api/preferences` set/update/clear. [VERIFIED: contracts] |
| Data mappers | Vitest unit | Deadline badge labels, match strength labels, storage-scope labels, refusal notice labels. [VERIFIED: `05-UI-SPEC.md`] |
| Components | Vitest + jsdom + Testing Library | Composer disabled state, answer history append, citation trigger opens rail/sheet, listing filters, preference required/optional fields. [CITED: Vitest docs; VERIFIED: `05-UI-SPEC.md`] |
| Responsive/manual QA | Playwright or manual browser checklist | Mobile `<768px` sheet/drawer; desktop `>=1024px` right rail; keyboard focus restore; Korean labels; official links open with `noopener noreferrer`. [VERIFIED: `05-UI-SPEC.md`] |

### Commands to Add
```json
{
  "scripts": {
    "dev": "next dev",
    "build:web": "next build",
    "start:web": "next start",
    "test:ui": "vitest run components app lib --environment jsdom",
    "qa:web": "playwright test"
  }
}
```
The exact script names are discretionary, but planning must keep existing `test` and `typecheck` working. [VERIFIED: `package.json`; VERIFIED: `05-CONTEXT.md`]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js, existing TS services | ✓ | v25.2.1 | None needed; Next requires Node >=20.9. [VERIFIED: shell; CITED: https://nextjs.org/docs/app/getting-started/installation] |
| npm/npx | Package install and shadcn CLI | ✓ | 11.6.2 | None needed. [VERIFIED: shell] |
| TypeScript | Existing service and Next typecheck | ✓ | 5.9.3 installed, latest 6.0.3 | Keep existing until deliberate upgrade; Next minimum is 5.1. [VERIFIED: `package.json`; npm registry; CITED: Next installation docs] |
| Vitest | Existing and new tests | ✓ | 4.0.8 installed, latest 4.1.5 | Use installed version unless upgrading in package wave. [VERIFIED: `package.json`; npm registry] |
| Playwright package | Responsive QA | ✓ | 1.59.1 | Manual browser QA if `@playwright/test` not added. [VERIFIED: `package.json`; npm registry] |
| OPENAI_COMPAT_* env | Live chat route | Unknown | — | UI can still test with mocked route/service; live chat requires env setup. [VERIFIED: `openai-compatible-provider.ts`] |

**Missing dependencies with no fallback:** none for planning/scaffold. [VERIFIED: shell]

**Missing dependencies with fallback:** provider env unknown; use deterministic mocked services/tests and existing local evaluations until live env is supplied. [VERIFIED: `scripts/chat-smoke-config.ts`; `openai-compatible-provider.ts`]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No SSO/authentication in Phase 5. [VERIFIED: `05-CONTEXT.md`; `.planning/REQUIREMENTS.md`] |
| V3 Session Management | partial | Client-session chat history only; generated session key for preferences; no server-side chat persistence. [VERIFIED: `05-CONTEXT.md`; `preference-contract.ts`] |
| V4 Access Control | no | No authenticated/private pages or admin access in Phase 5. [VERIFIED: `AGENTS.md`; `05-CONTEXT.md`] |
| V5 Input Validation | yes | Zod schemas for chat, recommendation, preference, and route payloads. [VERIFIED: `chat-contract.ts`; `recommendation-contract.ts`; `preference-contract.ts`] |
| V6 Cryptography | partial | Existing query hashing/audit behavior remains service-side; do not add custom crypto in UI. [VERIFIED: `chat-service.ts`; `audit-log.ts`] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS through answer or source title rendering | Tampering / Information Disclosure | Render answer as plain text or sanitized markdown; never use raw HTML from source data. [VERIFIED: source text untrusted decisions in `.planning/STATE.md`; `normalized-record.ts`] |
| Citation spoofing / hidden freshness | Tampering | Validate `ChatResponseSchema`/`RecommendationResponseSchema`; render citation IDs, URL, posted/fetched dates, and deadline badge. [VERIFIED: contracts; `05-UI-SPEC.md`] |
| Sensitive preference persistence by accident | Information Disclosure | Default to session scope; persistent path only with consent, retention, deletion support. [VERIFIED: `preference-store.ts`; `05-CONTEXT.md`] |
| Provider/API errors exposing secrets | Information Disclosure | Existing provider redacts API-key-like text; route handler should avoid returning raw error details. [VERIFIED: `openai-compatible-provider.ts`; `chat-smoke-config.ts`] |
| Official endorsement misrepresentation | Spoofing | Korean copy must say source-grounded/informational and avoid official Hanyang endorsement claims. [VERIFIED: `AGENTS.md`; `05-UI-SPEC.md`] |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next `pages/api` API routes | App Router `app/**/route.ts` route handlers | App Router migration docs identify route handlers as the modern alternative. [CITED: Next Context7 `/vercel/next.js/v16.1.6`] | Use `app/api/*/route.ts`, not `pages/api`. |
| Tailwind config-heavy setup | Tailwind v4 CSS-first `@theme` + `@tailwindcss/postcss` | Tailwind v4 docs. [CITED: Tailwind Context7; https://tailwindcss.com/docs/installation/framework-guides/nextjs] | Put UI-SPEC OKLCH tokens in `app/globals.css`; no required `tailwind.config.js`. |
| `next lint` build coupling | Explicit ESLint scripts | Next 16 docs state `next build` no longer runs linter automatically. [CITED: https://nextjs.org/docs/app/getting-started/installation] | Add explicit `lint` script if linting is introduced. |
| Streaming-first chat UX | Complete-response UX for this phase | Phase 5 locked decision. [VERIFIED: `05-CONTEXT.md`] | Avoid Vercel AI SDK streaming work until later. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `server-only` may be used to guard server factories if added as a dependency. | API Route Wrapper Strategy | Low; can omit package and rely on route-only imports. |

## Open Questions

1. **RESOLVED — Persistent preference opt-in is deferred for Phase 5.**
   - Decision: Phase 5 uses session-first preference storage only by default.
   - Planning constraint: Do not implement persistent preference writes in Phase 5.
   - Future work: Persistent preference UI may appear only with explicit consent timestamp, retention days, and deletion support. [VERIFIED: user resolution 2026-05-04; `05-CONTEXT.md`; `preference-store.ts`]
2. **RESOLVED — shadcn dependencies must be verified during Plan 05-01 execution.**
   - Decision: Confirm exact generated dependencies after initializing official shadcn primitives.
   - Planning constraint: Plans must verify `components.json` and package changes after init.
   - Registry constraint: No third-party registries. [VERIFIED: user resolution 2026-05-04; `05-UI-SPEC.md`]
3. **RESOLVED — live `OPENAI_COMPAT_*` credentials are not required for Phase 5 execution or automated QA.**
   - Decision: Manual QA should use the existing complete-response route with configured env if present, or controlled non-fabricating error/refusal UI if env is absent.
   - Planning constraint: Never read or print `.env` values. [VERIFIED: user resolution 2026-05-04; `openai-compatible-provider.ts`; `05-UI-SPEC.md`]

## Sources

### Primary (HIGH confidence)
- `AGENTS.md` — project constraints and UI rules. [VERIFIED]
- `.planning/phases/05-student-facing-experience/05-CONTEXT.md` — locked Phase 5 decisions and deferred scope. [VERIFIED]
- `.planning/phases/05-student-facing-experience/05-UI-SPEC.md` — approved visual/component/interaction contract. [VERIFIED]
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` — UX-01..UX-05 scope and phase history. [VERIFIED]
- `src/chat/*`, `src/recommendations/*`, `src/personalization/*`, `src/ingestion/normalized-record.ts` — service and data contracts. [VERIFIED]
- npm registry via `npm view` — current versions and publish modification times. [VERIFIED]
- Next.js docs: https://nextjs.org/docs/app/getting-started/installation and Context7 `/vercel/next.js/v16.1.6` route handler/segment config docs. [CITED]
- Tailwind docs: https://tailwindcss.com/docs/installation/framework-guides/nextjs and Context7 `/tailwindlabs/tailwindcss.com`. [CITED]
- shadcn Context7 `/shadcn-ui/ui` installation/component CLI docs. [CITED]
- React Context7 `/reactjs/react.dev` controlled textarea/state docs. [CITED]
- Vitest Context7 `/vitest-dev/vitest/v4.0.7` jsdom environment docs. [CITED]

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` and `.planning/research/ARCHITECTURE.md` — earlier stack/architecture recommendations, superseded where Phase 5 decisions differ. [VERIFIED]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions verified from npm and core setup checked against official docs. [VERIFIED: npm registry; CITED docs]
- Architecture: HIGH — existing service contracts and Phase 5 UI contract directly define the wrappers/components. [VERIFIED: code and planning docs]
- Pitfalls: HIGH — hazards come from observed repo configuration and official framework constraints. [VERIFIED: repo; CITED docs]
- shadcn exact generated dependency graph: MEDIUM — package versions for likely primitives verified, but generated files/deps should be confirmed after `npx shadcn@latest add ...`. [VERIFIED: npm registry; CITED: shadcn docs]

**Research date:** 2026-05-04  
**Valid until:** 2026-05-11 for frontend package versions; 2026-06-03 for project-contract findings.

## RESEARCH COMPLETE

**Phase:** 05 - student-facing-experience  
**Confidence:** HIGH

### Key Findings
- Add Next.js as a thin presentation/API layer, not a rewrite of chat/recommendation/preference services. [VERIFIED: `05-CONTEXT.md`; service contracts]
- Use Node.js App Router route handlers for `/api/chat`, `/api/recommendations`, and `/api/preferences`; preserve complete-response chat and client-session-only answer history. [VERIFIED: `05-CONTEXT.md`; CITED: Next route handler docs]
- Plan a scaffold/config wave before UI components because the repo currently has no JSX/DOM/Next/Tailwind config and uses NodeNext TypeScript. [VERIFIED: `package.json`; `tsconfig.json`]
- Implement UI from the approved UI-SPEC: single dashboard, desktop citation rail, mobile source sheet/drawer, card listings, core pill filters, semantic Korean status badges, Pretendard-first typography. [VERIFIED: `05-UI-SPEC.md`]
- Keep Phase 6 out of scope: no streaming, server chat-history persistence, advanced search, SSO, resume/application tooling, production crawling, or full eval/release suite. [VERIFIED: `05-CONTEXT.md`; `.planning/ROADMAP.md`]

### File Created
`.planning/phases/05-student-facing-experience/05-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Current npm versions verified; official docs checked for Next, Tailwind, shadcn, React, Vitest. |
| Architecture | HIGH | Directly maps approved UI-SPEC and existing TypeScript contracts/services. |
| Pitfalls | HIGH | Derived from concrete repo config and service runtime requirements. |

### Open Questions (RESOLVED)
- Resolved: Persistent preference opt-in UI and persistent writes are deferred; Phase 5 uses session-first preferences only.
- Resolved: Plan 05-01 must verify official shadcn init output, `components.json`, and package changes; no third-party registries.
- Resolved: Live provider credentials are not required for Phase 5 execution or automated QA; manual QA must use configured env if present or controlled non-fabricating error/refusal UI, without reading or printing `.env` values.

### Ready for Planning
Research complete. Planner can now create PLAN.md files for Phase 05.
