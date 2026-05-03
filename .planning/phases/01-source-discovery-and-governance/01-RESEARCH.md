# Phase 1: Source Discovery and Governance - Research

**Researched:** 2026-05-03  
**Domain:** Source governance, public-source access review, registry metadata contracts  
**Confidence:** HIGH for governance/schema and robots evidence; MEDIUM for CDP discovery mechanics because the CDP root failed through markdown fetch and likely needs browser/manual inspection.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Source Approval Scope
- **D-01:** The approved scope is limited to the seed URLs listed in `sources.txt` and expanded in `.planning/research/seed-sources.md`.
- **D-02:** Do not broaden Phase 1 discovery to all Hanyang domains or unrelated ERICA pages unless the user explicitly updates the roadmap/context.
- **D-03:** The user states that a capstone-design exception approval process has already been completed for these seed URLs. Downstream agents may record this as `approval_basis: user_assertion`, but must not represent it as independently verified official Hanyang authorization.

#### Access Method
- **D-04:** For seed URLs that require automated browser access, Playwright-based discovery may be planned only within the user-stated capstone exception scope.
- **D-05:** If login is required for approved seed URLs, credentials must be loaded from `.env` or equivalent local secret storage. Credentials must never be committed, printed to logs, copied into planning docs, or included in test fixtures.
- **D-06:** Any authenticated access must remain limited to the seed URLs and must be represented in the registry as `auth_mode: env_credentials` with no secret values stored.

#### Robots and Terms Handling
- **D-07:** `robots.txt` and Terms of Service status must still be captured as evidence fields in the registry, even when the user-stated capstone exception is used as the approval basis.
- **D-08:** Registry records must clearly distinguish between `robots_status`, `tos_status`, and `approval_basis`; these are not interchangeable.
- **D-09:** The project must not claim general production crawling permission. The approval is scoped to capstone seed-source collection unless stronger documentation is added later.

#### Rate Limit and Load
- **D-10:** Use a moderate collection posture for approved seed URLs: approximately one request every 1-2 seconds, low concurrency, and immediate backoff/stop on errors, throttling, unusual latency, or access-denied signals.
- **D-11:** The planner may choose exact retry/backoff values, but must preserve the moderate posture and include a kill-switch or manual stop path.

#### Source Registry Contract
- **D-12:** Use a full-audit source registry rather than a minimal registry.
- **D-13:** Required registry fields include at minimum: `source_id`, `canonical_url`, `source_name`, `source_type`, `content_type`, `category`, `approval_scope`, `approval_basis`, `approval_status`, `auth_required`, `auth_mode`, `robots_status`, `tos_status`, `rate_limit_posture`, `refresh_cadence`, `owner_label`, `last_checked_at`, `notes`, and `next_action`.
- **D-14:** Seed records should be created for every source intent in `sources.txt`, including CDP root/category discovery, CDP recruitment/category discovery, the success-story viewer, the CDP student guide PDF, and the `ibus` employment board.

### the agent's Discretion
- The agent may decide the exact source registry file format during planning, but should prefer a simple machine-readable format such as JSON or YAML plus a human-readable checklist.
- The agent may decide exact URL enumeration depth, with the conservative default that Phase 1 discovers and records candidate subpages but does not ingest their content.
- The agent may decide failure-state names, but must include states for access denied, login required, blocked by policy, parse unsupported, and pending approval/evidence.
- The agent may decide exact checklist wording, as long as it covers robots, ToS, auth mode, approval basis, rate limit, freshness assumptions, and allowed collection method.

### Deferred Ideas (OUT OF SCOPE)
- Expanding beyond the seed URLs belongs in a later roadmap update or a revised source-governance decision.
- Official Hanyang SSO or production crawling permission remains out of scope unless new evidence is added to planning docs.
- Resume, cover-letter, interview, and application-tracking tools remain v2 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRC-01 | Operator can register each approved source with URL, category, source owner label, access notes, and refresh cadence. | Use a full-audit YAML/JSON registry validated by Zod, with required fields from D-13 plus evidence subfields for robots, ToS, auth, rate limit, freshness, and next action. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; CITED: Context7 `/websites/zod_dev_v4`] |
| SAFE-05 | Scheduled crawling is blocked until source access rules and load expectations are reviewed. | Represent each seed source with `approval_status`, `review_status`, `scheduled_crawling_enabled: false`, `allowed_collection_method`, and checklist evidence before any schedule can be enabled. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Read `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/research/seed-sources.md` before source/ingestion planning. [VERIFIED: `AGENTS.md`]
- Preserve Korean-first behavior for user-facing chat, source labels, and employment information. [VERIFIED: `AGENTS.md`]
- Every answer or recommendation based on source data must keep citations and freshness metadata. [VERIFIED: `AGENTS.md`]
- Do not claim official Hanyang endorsement, SSO access, or production crawling permission unless new evidence is added to planning docs. [VERIFIED: `AGENTS.md`]
- Do not crawl authenticated/private pages or bypass access controls. [VERIFIED: `AGENTS.md`]
- Prefer explicit preference-based personalization before inferred profiling. [VERIFIED: `AGENTS.md`]
- Minimize stored personal data and provide clearing controls when persistence exists. [VERIFIED: `AGENTS.md`]
- Use TDD or verification-first planning for ingestion, retrieval, citation formatting, and safety behavior. [VERIFIED: `AGENTS.md`]
- Add evaluation cases for no-answer/refusal behavior, stale listings, citation accuracy, and Korean answer quality. [VERIFIED: `AGENTS.md`]
- Keep implementation changes scoped to the active phase and requirement IDs. [VERIFIED: `AGENTS.md`]

## Summary

Phase 1 should plan a governance artifact, not an ingestion system. The core output should be a full-audit source registry and checklist that records seed URLs, source intent, owner labels, category labels, access evidence, authorization boundaries, refresh assumptions, and blocking state for scheduled crawling. [VERIFIED: `.planning/ROADMAP.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]

The strongest planning constraint is that `robots_status`, `tos_status`, and `approval_basis` are distinct fields: a user-stated capstone exception can be recorded as approval basis, but it must not erase the robots/terms evidence or become a general production-crawling claim. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] RFC 9309 also states that robots rules are not access authorization, so the planner should treat robots as service-owner crawler preference evidence rather than as a substitute for explicit permission. [CITED: https://datatracker.ietf.org/doc/html/rfc9309]

Direct source checks found that CDP and book domains currently return `Disallow: /` for `User-agent: *`, while the ibus domain returns an empty `Disallow:` line. [VERIFIED: webfetch `https://cdp.hanyang.ac.kr/robots.txt`; VERIFIED: webfetch `https://book.hanyang.ac.kr/robots.txt`; VERIFIED: webfetch `https://ibus.hanyang.ac.kr/robots.txt`] This does not block Phase 1 documentation, but it means the registry must preserve raw robots evidence and keep scheduled crawling disabled until the access review checklist is completed under the user-stated capstone exception scope. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]

**Primary recommendation:** Plan a YAML registry plus TypeScript/Zod validator, with seed records for every `sources.txt` intent, a separate human-readable access checklist, and an explicit `scheduled_crawling_enabled: false` default for every record. [VERIFIED: `sources.txt`; CITED: Context7 `/websites/zod_dev_v4`; CITED: Context7 `/eemeli/yaml`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Source registry contract | Repository/config layer | API / Backend | Phase 1 creates machine-readable governance records that Phase 2 ingestion will read before fetching. [VERIFIED: `.planning/research/ARCHITECTURE.md`] |
| Access review checklist | Operator/governance layer | Repository/config layer | Human review owns authorization judgment; code should only enforce recorded status. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] |
| URL/source discovery notes | Operator/governance layer | Browser / Client automation | Discovery may use browser automation for CDP within scope, but only to enumerate candidates and record evidence. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; CITED: Context7 `/microsoft/playwright`] |
| Scheduled crawling gate | API / Backend | Job scheduler | Backend/job code must refuse schedules until source registry access review is complete. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| Secrets for approved login-only seed URLs | Local runtime environment | API / Backend | Credentials must come from `.env`/secret storage and must not be committed or printed. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; CITED: Context7 `/microsoft/playwright`] |

## Seed Source Discovery Findings

| Source Intent | Evidence Found | Planning Implication |
|---------------|----------------|----------------------|
| CDP root and CDP categories | Generic markdown fetch of `https://cdp.hanyang.ac.kr/` failed with a JavaScript error; earlier project seed notes also report generic markdown fetch failure. [VERIFIED: webfetch `https://cdp.hanyang.ac.kr/`; VERIFIED: `.planning/research/seed-sources.md`] | Plan browser/manual discovery for category URLs, limited to seed scope; do not assume simple static HTML fetching works. |
| CDP student guide PDF | Direct PDF URL returned a PDF header and a page tree count of 52 pages. [VERIFIED: webfetch `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf`] | Registry can mark `content_type: pdf`, `page_citation_required: true`, and Phase 2 can later use page-level PDF parsing. |
| Book success-story viewer | Viewer page exposes the Korean title `[E 커리어개발팀] 2024 EBS 취업성공후기_한양인의 취업지식기부` and includes search/print/download UI labels. [VERIFIED: webfetch `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B`] | Registry should classify as `source_type: document_viewer`, `content_type: viewer_pdf_or_images_unknown`, `next_action: identify downloadable original or page assets`. |
| ibus employment board | Public listing page exposes Korean board title `취업정보`, 12 listings per page, dates, detail links like `/front/recruit/r-1/view?id=6468`, and pagination to page 163. [VERIFIED: webfetch `https://ibus.hanyang.ac.kr/front/recruit/r-1`] | Registry can seed the board list URL plus detail URL pattern; Phase 1 should record pagination/depth assumptions but not ingest all pages. |
| `sources.txt` raw intents | `sources.txt` lists CDP root, CDP 취업정보 하위항목 전체, CDP 채용정보 하위항목 전체, book success-story viewer, CDP student guide PDF, and ibus employment board. [VERIFIED: `sources.txt`] | Create one seed registry record per intent, not only per host, so approval/access notes remain intent-specific. |

## Standard Stack

### Core

| Library / Format | Version | Purpose | Why Standard |
|------------------|---------|---------|--------------|
| YAML registry file | `yaml` npm 2.8.4; modified 2026-05-02 | Human-reviewable source registry and checklist inputs. | `yaml` supports parse/stringify APIs for JavaScript objects, making it suitable for operator-edited config with automated validation. [VERIFIED: npm registry; CITED: Context7 `/eemeli/yaml`] |
| Zod | 4.4.2; modified 2026-05-01 | Validate registry records and derive TypeScript types/JSON Schema from one schema. | Zod provides object schemas, `parse`/`safeParse`, metadata, and JSON Schema conversion patterns. [VERIFIED: npm registry; CITED: Context7 `/websites/zod_dev_v4`] |
| Plain Markdown checklist | N/A | Human access review checklist and discovery notes. | Current project planning artifacts are Markdown under `.planning/`, so a checklist is easy for downstream agents and reviewers to inspect. [VERIFIED: `.planning/STATE.md`] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| Playwright | 1.59.1; modified 2026-05-02 | Browser-based discovery for CDP pages that fail static fetch or require approved login. | Use only within seed scope and `.env` credential rules; do not commit storage-state files. [VERIFIED: npm registry; CITED: Context7 `/microsoft/playwright`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] |
| robots-parser | 3.0.1; modified 2023-02-21 | Parse robots.txt into machine-checkable status evidence. | Use in a validation helper if manually reading raw robots evidence becomes error-prone. [VERIFIED: npm registry] |
| `pdftotext` / Poppler | 26.03.0 installed locally | PDF feasibility checks and page-count/text extraction in later phases. | Phase 1 only records PDF feasibility; Phase 2 can decide parser implementation. [VERIFIED: local environment probe] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| YAML registry | JSON registry | JSON is stricter and easier for tools, but less pleasant for operator notes and comments. [ASSUMED] |
| Zod | JSON Schema only | JSON Schema is language-neutral, but Zod gives TypeScript type inference and parser ergonomics for a likely TypeScript MVP. [CITED: Context7 `/websites/zod_dev_v4`; ASSUMED] |
| Source-specific discovery | General crawler / Firecrawl / Crawl4AI | General crawlers are too broad for Phase 1 because scope is locked to seed URLs and scheduled crawling must remain disabled. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; VERIFIED: `.planning/research/STACK.md`] |

**Installation:**
```bash
npm install zod yaml robots-parser
npm install -D playwright
```

**Version verification:** `npm view zod version time.modified`, `npm view yaml version time.modified`, `npm view playwright version time.modified`, and `npm view robots-parser version time.modified` were run on 2026-05-03. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
sources.txt + seed-sources.md
        |
        v
Seed Intent Normalization
        |
        v
Source Registry Draft (YAML/JSON) -----> Zod Validator -----> valid registry contract
        |                                      |
        v                                      v
Access Evidence Capture                 validation failures
(robots raw text, ToS status,           -> fix schema/record before Phase 2
 auth mode, approval basis)
        |
        v
Human Access Review Checklist
        |
        +--> approved_for_manual_discovery only
        +--> scheduled_crawling_enabled remains false until checklist complete
        |
        v
Phase 2 Ingestion Planner reads registry, but fetches only records with explicit allowed method
```

### Recommended Project Structure

```text
.planning/phases/01-source-discovery-and-governance/
├── 01-RESEARCH.md                  # this research artifact
├── source-registry.schema.ts        # Zod source registry schema (planned)
├── source-registry.yaml             # seed source records (planned)
├── source-access-review.md          # human checklist and evidence log (planned)
└── discovery-notes.md               # CDP/book/PDF/ibus notes (planned)
```

### Pattern 1: Full-Audit Registry Record
**What:** Store source intent, URL, owner label, category, content type, access evidence, approval basis, collection method, refresh assumptions, and next action in one validated record. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]  
**When to use:** Every seed intent from `sources.txt`, including category-discovery intents that share a host. [VERIFIED: `sources.txt`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]  
**Example:**
```typescript
// Source: Context7 /websites/zod_dev_v4 for z.object, z.enum, safeParse, and metadata patterns.
import * as z from "zod";

const SourceRecord = z.object({
  source_id: z.string().min(1),
  canonical_url: z.string().url(),
  source_name: z.string().min(1),
  source_type: z.enum(["root", "category_discovery", "board", "pdf", "document_viewer"]),
  content_type: z.enum(["html", "pdf", "viewer", "unknown"]),
  category: z.string().min(1),
  approval_scope: z.literal("seed_urls_only"),
  approval_basis: z.enum(["user_assertion", "official_document", "pending"]),
  approval_status: z.enum(["pending_review", "approved_for_manual_discovery", "blocked"]),
  auth_required: z.boolean(),
  auth_mode: z.enum(["none", "env_credentials", "unknown"]),
  robots_status: z.string(),
  tos_status: z.string(),
  rate_limit_posture: z.literal("moderate_1_2s_low_concurrency"),
  refresh_cadence: z.string(),
  owner_label: z.string(),
  last_checked_at: z.string().datetime(),
  scheduled_crawling_enabled: z.literal(false),
  notes: z.string(),
  next_action: z.string(),
});

const result = SourceRecord.safeParse(candidateRecord);
```

### Pattern 2: Separate Evidence from Authorization
**What:** Record raw robots/ToS evidence and approval basis as separate fields. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]  
**When to use:** Every source record, especially CDP/book where robots currently disallow `/` for `*`. [VERIFIED: webfetch robots checks]  
**Example registry fragment:**
```yaml
# Source: Context7 /eemeli/yaml for YAML parse/stringify suitability; phase context for required fields.
source_id: cdp-root
canonical_url: https://cdp.hanyang.ac.kr/
approval_basis: user_assertion
approval_status: pending_review
robots_status: disallow_all_raw_evidence
robots_evidence:
  checked_at: "2026-05-03T00:00:00Z"
  url: https://cdp.hanyang.ac.kr/robots.txt
  raw: |
    User-agent: *
    Disallow: /
tos_status: not_found_or_not_reviewed
scheduled_crawling_enabled: false
```

### Pattern 3: Discovery-Only Before Ingestion
**What:** Phase 1 may enumerate candidate CDP categories/subpages and detail URL patterns, but must not build scheduled fetch jobs or parse all content. [VERIFIED: `.planning/ROADMAP.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]  
**When to use:** CDP categories, CDP recruitment/career subpages, and ibus pagination. [VERIFIED: `.planning/ROADMAP.md`]

### Anti-Patterns to Avoid
- **Treating user assertion as official authorization:** This contradicts D-03 and AGENTS.md. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; VERIFIED: `AGENTS.md`]
- **Using robots status as approval status:** D-08 explicitly requires these to be separate. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]
- **Creating a general crawler:** Phase scope is seed URLs only, and scheduled crawling is blocked until review. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]
- **Committing credentials or Playwright auth state:** Playwright docs warn authenticated storage state may contain sensitive cookies/headers and should not be checked into repositories. [CITED: Context7 `/microsoft/playwright`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Ad hoc field checks in scripts | Zod schema with `safeParse` | Zod provides typed object schemas and parser results. [CITED: Context7 `/websites/zod_dev_v4`] |
| YAML parsing/writing | Regex or string concatenation | `yaml` parse/stringify | The library provides parse/stringify APIs for JavaScript values. [CITED: Context7 `/eemeli/yaml`] |
| Robots interpretation | Manual substring-only logic | Store raw evidence and optionally use `robots-parser`; interpret with RFC 9309 rules | RFC 9309 includes matching, redirects, unavailable/unreachable status, and caching behavior. [CITED: https://datatracker.ietf.org/doc/html/rfc9309; VERIFIED: npm registry] |
| Authenticated browser state | Custom cookie files in repo | Playwright storage state in ignored temp path, or no persisted state for Phase 1 | Playwright docs recommend `.gitignore` for auth state and warn it can impersonate the account. [CITED: Context7 `/microsoft/playwright`] |

**Key insight:** Source governance is deceptively complex because authorization, robots preferences, terms review, authentication, rate limits, freshness, and citation metadata are different concerns that must remain queryable separately. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; VERIFIED: `AGENTS.md`]

## Common Pitfalls

### Pitfall 1: Robots Evidence Collapses Into Approval
**What goes wrong:** A record marks a source as approved because a user asserted capstone permission, then loses the robots evidence. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]  
**Why it happens:** Teams treat authorization as a single boolean. [ASSUMED]  
**How to avoid:** Require separate `approval_basis`, `approval_status`, `robots_status`, `tos_status`, and `scheduled_crawling_enabled` fields. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]  
**Warning signs:** Registry has only `approved: true` or `can_crawl: true`. [ASSUMED]

### Pitfall 2: Scheduled Crawling Sneaks In During Discovery
**What goes wrong:** Discovery scripts become reusable crawl jobs before checklist review is complete. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/research/PITFALLS.md`]  
**Why it happens:** It is convenient to turn URL enumeration into repeated fetching. [ASSUMED]  
**How to avoid:** Store `scheduled_crawling_enabled: false` as a literal/required field for Phase 1 records and gate Phase 2 schedules on review status. [VERIFIED: `.planning/REQUIREMENTS.md`]  
**Warning signs:** Cron, interval, queue, or CI schedule appears before source-access review is signed off. [ASSUMED]

### Pitfall 3: CDP Static Fetch Assumption
**What goes wrong:** Planner assumes CDP category pages are plain static HTML and underestimates browser discovery needs. [VERIFIED: webfetch `https://cdp.hanyang.ac.kr/`; VERIFIED: `.planning/research/seed-sources.md`]  
**Why it happens:** Other sources such as ibus are readable through generic fetch. [VERIFIED: webfetch `https://ibus.hanyang.ac.kr/front/recruit/r-1`]  
**How to avoid:** Split CDP discovery from ibus/PDF work and budget a browser/manual inspection task. [VERIFIED: `.planning/ROADMAP.md`]  
**Warning signs:** Plan contains one generic HTTP scraper task for all sources. [ASSUMED]

### Pitfall 4: Source Intent Deduplicated Too Aggressively
**What goes wrong:** CDP root, CDP 취업정보 categories, CDP 채용정보 categories, and CDP PDF collapse into one host record. [VERIFIED: `sources.txt`]  
**Why it happens:** URLs share the same host. [VERIFIED: `sources.txt`]  
**How to avoid:** Use one registry record per source intent; shared host evidence can be copied or referenced. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]  
**Warning signs:** Fewer registry records than source intents listed in D-14. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]

## Code Examples

### YAML Registry Parse and Validate
```typescript
// Source: Context7 /eemeli/yaml for parse API; Context7 /websites/zod_dev_v4 for safeParse.
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import * as z from "zod";

const Registry = z.object({ sources: z.array(SourceRecord) });
const data = parse(readFileSync("source-registry.yaml", "utf8"));
const parsed = Registry.safeParse(data);

if (!parsed.success) {
  throw new Error("Source registry failed validation");
}
```

### Safe Playwright Secret Pattern for Approved Login-Only Discovery
```typescript
// Source: Context7 /microsoft/playwright auth docs; phase context D-05/D-06.
const username = process.env.CDP_USERNAME;
const password = process.env.CDP_PASSWORD;
if (!username || !password) throw new Error("Missing env credentials");

// Do not log username/password. Do not commit playwright/.auth/*.json.
// Use this only for seed URLs and only when registry auth_mode is env_credentials.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Treat robots.txt as informal convention only | RFC 9309 standardizes Robots Exclusion Protocol syntax, access results, caching, and security considerations | RFC 9309 published September 2022 | Planner should cite RFC 9309 and record raw robots evidence with checked timestamp. [CITED: https://datatracker.ietf.org/doc/html/rfc9309] |
| Store source URLs as a flat list | Store source registry records with approval, auth, robots, ToS, cadence, and owner metadata | Project decision D-12/D-13 on 2026-05-03 | Phase 2 ingestion can gate fetching and preserve citation/freshness metadata. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] |
| Crawl first, govern later | Govern first, block scheduled crawling until review | Requirement SAFE-05 in current roadmap | Prevents unapproved crawling and protects downstream safety claims. [VERIFIED: `.planning/REQUIREMENTS.md`] |

**Deprecated/outdated:**
- A single `approved: true` field is inadequate for this project because D-08 requires separate robots, ToS, and approval-basis evidence. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]
- General web crawling is out of scope for Phase 1 because D-01/D-02 limit discovery to seed URLs and expanded seed-source notes. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | YAML is more operator-friendly than JSON for notes/comments. | Standard Stack / Alternatives Considered | Planner might choose YAML when JSON would be simpler for tooling. |
| A2 | A likely MVP implementation will use TypeScript, making Zod ergonomic. | Standard Stack / Alternatives Considered | If the implementation becomes Python-first, Pydantic or JSON Schema may be more appropriate. |
| A3 | Teams often collapse authorization into a single boolean. | Common Pitfalls | Pitfall prevention language may be less relevant, but the separate fields remain required by context. |
| A4 | Discovery scripts may accidentally become schedules. | Common Pitfalls | The schedule gate might seem overly cautious, but it directly supports SAFE-05. |

## Open Questions (RESOLVED FOR PLANNING)

1. **RESOLVED FOR PLANNING: Where are the CDP category URLs for 취업정보 and 채용정보?**
   - What we know: `sources.txt` and context require CDP category discovery, but markdown fetch of CDP root failed. [VERIFIED: `sources.txt`; VERIFIED: webfetch `https://cdp.hanyang.ac.kr/`]
   - What's unclear: Exact category URL paths and whether they require login/session state. [VERIFIED: `.planning/research/seed-sources.md`]
    - Planning resolution: Plan 03 must run bounded seed-scope browser/manual discovery during execution and record observed category URLs, `login_required_env_credentials`, or `no_candidates_observed` evidence in `discovery-notes.md`; unresolved exact URLs are execution evidence to collect, not a planning blocker. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]
2. **RESOLVED FOR PLANNING: What ToS or site-use policy applies to each host?**
   - What we know: Context requires `tos_status` evidence, but this research did not locate ToS pages for the seed hosts. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]
   - What's unclear: Whether a public terms page exists and whether user capstone approval includes separate written terms exceptions. [ASSUMED]
    - Planning resolution: Plan 02 must record `tos_status` as an explicit enum value per source and keep checklist rows pending/manual-review until evidence is found; ToS uncertainty blocks scheduling but not registry creation. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]
3. **RESOLVED FOR PLANNING: What refresh cadence should be assigned to each source?**
   - What we know: SRC-01 requires refresh cadence; recruitment listings are freshness-critical. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/research/seed-sources.md`]
   - What's unclear: Source owners' actual update frequency. [ASSUMED]
    - Planning resolution: Plan 02 must record assumed cadences (`daily_when_approved` for freshness-critical listing/category sources, `weekly_when_approved` for CDP root, and `monthly_or_on_manual_change_when_approved` for PDF/viewer documents) and require later adjustment from observed update history. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | TypeScript/Zod/YAML validator | ✓ | v25.2.1 | Use Python validator if stack changes. [VERIFIED: local environment probe] |
| npm | Package installation/version checks | ✓ | 11.6.2 | Use checked-in schema docs only. [VERIFIED: local environment probe] |
| Python 3 | Optional scripting/PDF checks | ✓ | 3.9.6 | Node scripts. [VERIFIED: local environment probe] |
| pdftotext / Poppler | PDF feasibility checks | ✓ | 26.03.0 | Browser/manual PDF inspection, or later PDF parser package. [VERIFIED: local environment probe] |
| curl | HTTP header/robots checks | ✓ | 8.7.1 | WebFetch/manual browser. [VERIFIED: local environment probe] |
| Playwright package | Browser discovery | ✗ | Not installed in repo | Install as dev dependency only if CDP discovery needs browser automation. [VERIFIED: no package.json; VERIFIED: npm registry] |

**Missing dependencies with no fallback:**
- None for Phase 1 research/planning, because browser discovery can be planned before installing Playwright. [VERIFIED: local environment probe]

**Missing dependencies with fallback:**
- Playwright is not installed in this greenfield repo; install only if the plan includes browser-based CDP discovery. [VERIFIED: no package.json; VERIFIED: npm registry]

## Validation Architecture

Skipped because `.planning/config.json` sets `workflow.nyquist_validation` to `false`. [VERIFIED: `.planning/config.json`]

## Security Domain

Security enforcement is enabled by default because `.planning/config.json` does not explicitly set `security_enforcement: false`. [VERIFIED: `.planning/config.json`]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes, only if approved seed URLs require login | `.env` credentials only; no committed credentials or auth state. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; CITED: Context7 `/microsoft/playwright`] |
| V3 Session Management | Yes, only for Playwright/browser state | Keep `playwright/.auth` ignored or avoid persisted state; Playwright docs warn state files may contain sensitive cookies/headers. [CITED: Context7 `/microsoft/playwright`] |
| V4 Access Control | Yes | Enforce seed-URL allowlist and do not bypass access controls. [VERIFIED: `AGENTS.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] |
| V5 Input Validation | Yes | Validate registry with Zod and require enumerated statuses. [CITED: Context7 `/websites/zod_dev_v4`] |
| V6 Cryptography | No direct cryptography in Phase 1 | Do not hand-roll secret handling; rely on local environment/secret storage. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] |

### Known Threat Patterns for Source Governance

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential leakage in logs/planning docs | Information Disclosure | Load from `.env`, never print or commit values, and exclude auth state files. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; CITED: Context7 `/microsoft/playwright`] |
| Out-of-scope crawling | Elevation of Privilege / Tampering | Seed URL allowlist, `scheduled_crawling_enabled: false`, checklist gate. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] |
| Misrepresenting authorization | Spoofing / Repudiation | Store `approval_basis: user_assertion` and avoid official endorsement claims. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; VERIFIED: `AGENTS.md`] |
| Untrusted robots/source content | Tampering | Treat fetched evidence as untrusted text; RFC 9309 includes security considerations for robots parsing. [CITED: https://datatracker.ietf.org/doc/html/rfc9309] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md` — locked user decisions for source scope, approval basis, access methods, rate limits, and registry fields. [VERIFIED]
- `.planning/REQUIREMENTS.md` — SRC-01 and SAFE-05 requirement text. [VERIFIED]
- `.planning/ROADMAP.md` — Phase 1 goal, deliverables, success criteria, and parallelization. [VERIFIED]
- `AGENTS.md` — project constraints for Korean-first behavior, citations/freshness, authorization claims, private crawling, and secrets. [VERIFIED]
- `sources.txt` and `.planning/research/seed-sources.md` — seed source intents and caveats. [VERIFIED]
- RFC 9309, Robots Exclusion Protocol — robots syntax, access result handling, caching, and security considerations. [CITED: https://datatracker.ietf.org/doc/html/rfc9309]
- Context7 `/websites/zod_dev_v4` — Zod parse/safeParse, object schemas, metadata/JSON Schema examples. [CITED]
- Context7 `/eemeli/yaml` — YAML parse/stringify APIs. [CITED]
- Context7 `/microsoft/playwright` — auth storage-state guidance and secret risks. [CITED]
- npm registry version checks for `zod`, `yaml`, `playwright`, and `robots-parser`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- WebFetch checks of seed URLs and robots files on 2026-05-03. [VERIFIED: webfetch]
- `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`, `.planning/research/SUMMARY.md` — existing project research context. [VERIFIED]

### Tertiary (LOW confidence)
- Assumptions about operator-friendliness of YAML and likely accidental scheduling behavior. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for package versions and APIs; MEDIUM for choosing YAML over JSON because that is partly operator-preference. [VERIFIED: npm registry; CITED: Context7; ASSUMED]
- Architecture: HIGH because phase scope and source-governance boundaries are locked in context/roadmap. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; VERIFIED: `.planning/ROADMAP.md`]
- Pitfalls: HIGH for authorization/robots/scheduled crawling pitfalls; MEDIUM for human-process pitfalls. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/research/PITFALLS.md`; ASSUMED]

**Research date:** 2026-05-03  
**Valid until:** 2026-06-02 for governance patterns; re-check robots/source URL evidence within 7 days before implementation because site policies and pages can change.
