# Phase 1: Source Discovery and Governance - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 4 planned new files
**Analogs found:** 4 / 4 documentation/research analogs; 0 / 4 implementation-code analogs

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/phases/01-source-discovery-and-governance/source-registry.schema.ts` | config / model / utility | transform | `.planning/phases/01-source-discovery-and-governance/01-RESEARCH.md` | research-example only; no implementation code exists |
| `.planning/phases/01-source-discovery-and-governance/source-registry.yaml` | config | CRUD / batch | `.planning/phases/01-source-discovery-and-governance/01-RESEARCH.md` + `sources.txt` | research-example + source input; no implementation code exists |
| `.planning/phases/01-source-discovery-and-governance/source-access-review.md` | config / documentation | batch / request-response gate | `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md` + `.planning/research/PITFALLS.md` | planning-doc analog |
| `.planning/phases/01-source-discovery-and-governance/discovery-notes.md` | documentation / utility | file-I/O / batch | `.planning/research/seed-sources.md` | exact documentation role-match |

## Pattern Assignments

### `.planning/phases/01-source-discovery-and-governance/source-registry.schema.ts` (config / model / utility, transform)

**Analog:** `.planning/phases/01-source-discovery-and-governance/01-RESEARCH.md`

**Important limitation:** Repository search found no existing `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, or `.rs` files. Use this research example as the project-local starting point, not as an established codebase convention.

**Imports pattern** (`01-RESEARCH.md` lines 177-180):
```typescript
// Source: Context7 /websites/zod_dev_v4 for z.object, z.enum, safeParse, and metadata patterns.
import * as z from "zod";
```

**Core schema pattern** (`01-RESEARCH.md` lines 181-202):
```typescript
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
```

**Validation / error handling pattern** (`01-RESEARCH.md` lines 277-290):
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

**Security / secret handling pattern** (`01-RESEARCH.md` lines 293-302):
```typescript
// Source: Context7 /microsoft/playwright auth docs; phase context D-05/D-06.
const username = process.env.CDP_USERNAME;
const password = process.env.CDP_PASSWORD;
if (!username || !password) throw new Error("Missing env credentials");

// Do not log username/password. Do not commit playwright/.auth/*.json.
// Use this only for seed URLs and only when registry auth_mode is env_credentials.
```

**Schema requirements to copy from context** (`01-CONTEXT.md` lines 37-40):
```markdown
### Source Registry Contract
- **D-12:** Use a full-audit source registry rather than a minimal registry.
- **D-13:** Required registry fields include at minimum: `source_id`, `canonical_url`, `source_name`, `source_type`, `content_type`, `category`, `approval_scope`, `approval_basis`, `approval_status`, `auth_required`, `auth_mode`, `robots_status`, `tos_status`, `rate_limit_posture`, `refresh_cadence`, `owner_label`, `last_checked_at`, `notes`, and `next_action`.
- **D-14:** Seed records should be created for every source intent in `sources.txt`, including CDP root/category discovery, CDP recruitment/category discovery, the success-story viewer, the CDP student guide PDF, and the `ibus` employment board.
```

---

### `.planning/phases/01-source-discovery-and-governance/source-registry.yaml` (config, CRUD / batch)

**Analog:** `.planning/phases/01-source-discovery-and-governance/01-RESEARCH.md` and `sources.txt`

**YAML record pattern** (`01-RESEARCH.md` lines 210-226):
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

**Seed source input pattern** (`sources.txt` lines 3-16):
```text
https://cdp.hanyang.ac.kr/
한양대 커리어 개발센터

취업정보>하위항목 전체
채용정보>하위항목 전체

https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B
취업성공후기

https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf
커리어개발센터 가이드북

https://ibus.hanyang.ac.kr/front/recruit/r-1
경상대학 취업정보 게시판
```

**One-record-per-intent pattern** (`01-RESEARCH.md` lines 92-98):
```markdown
| Source Intent | Evidence Found | Planning Implication |
|---------------|----------------|----------------------|
| CDP root and CDP categories | Generic markdown fetch of `https://cdp.hanyang.ac.kr/` failed with a JavaScript error; earlier project seed notes also report generic markdown fetch failure. [VERIFIED: webfetch `https://cdp.hanyang.ac.kr/`; VERIFIED: `.planning/research/seed-sources.md`] | Plan browser/manual discovery for category URLs, limited to seed scope; do not assume simple static HTML fetching works. |
| CDP student guide PDF | Direct PDF URL returned a PDF header and a page tree count of 52 pages. [VERIFIED: webfetch `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf`] | Registry can mark `content_type: pdf`, `page_citation_required: true`, and Phase 2 can later use page-level PDF parsing. |
| Book success-story viewer | Viewer page exposes the Korean title `[E 커리어개발팀] 2024 EBS 취업성공후기_한양인의 취업지식기부` and includes search/print/download UI labels. [VERIFIED: webfetch `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B`] | Registry should classify as `source_type: document_viewer`, `content_type: viewer_pdf_or_images_unknown`, `next_action: identify downloadable original or page assets`. |
| ibus employment board | Public listing page exposes Korean board title `취업정보`, 12 listings per page, dates, detail links like `/front/recruit/r-1/view?id=6468`, and pagination to page 163. [VERIFIED: webfetch `https://ibus.hanyang.ac.kr/front/recruit/r-1`] | Registry can seed the board list URL plus detail URL pattern; Phase 1 should record pagination/depth assumptions but not ingest all pages. |
```

**Approval/auth field pattern** (`01-CONTEXT.md` lines 18-31):
```markdown
- **D-01:** The approved scope is limited to the seed URLs listed in `sources.txt` and expanded in `.planning/research/seed-sources.md`.
- **D-03:** The user states that a capstone-design exception approval process has already been completed for these seed URLs. Downstream agents may record this as `approval_basis: user_assertion`, but must not represent it as independently verified official Hanyang authorization.
- **D-06:** Any authenticated access must remain limited to the seed URLs and must be represented in the registry as `auth_mode: env_credentials` with no secret values stored.
- **D-08:** Registry records must clearly distinguish between `robots_status`, `tos_status`, and `approval_basis`; these are not interchangeable.
- **D-09:** The project must not claim general production crawling permission. The approval is scoped to capstone seed-source collection unless stronger documentation is added later.
```

---

### `.planning/phases/01-source-discovery-and-governance/source-access-review.md` (config / documentation, batch / request-response gate)

**Analog:** `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md` and `.planning/research/PITFALLS.md`

**Checklist coverage pattern** (`01-CONTEXT.md` lines 42-46):
```markdown
### the agent's Discretion
- The agent may decide the exact source registry file format during planning, but should prefer a simple machine-readable format such as JSON or YAML plus a human-readable checklist.
- The agent may decide exact URL enumeration depth, with the conservative default that Phase 1 discovers and records candidate subpages but does not ingest their content.
- The agent may decide failure-state names, but must include states for access denied, login required, blocked by policy, parse unsupported, and pending approval/evidence.
- The agent may decide exact checklist wording, as long as it covers robots, ToS, auth mode, approval basis, rate limit, freshness assumptions, and allowed collection method.
```

**Roadmap success gate pattern** (`.planning/ROADMAP.md` lines 26-34):
```markdown
**Deliverables:**
- Source registry schema and seed records from `sources.txt`.
- Discovery notes for CDP categories, CDP recruitment/career subpages, PDF documents, and the College of Business and Economics board.
- Source access review checklist covering robots.txt, terms, rate limits, and authorization boundaries.

**Success criteria:**
1. Every seed source has a registry entry with access notes and refresh assumptions.
2. Scheduled crawling remains disabled until access review is complete.
3. Downstream ingestion can rely on a stable source metadata contract.
```

**Pitfall table pattern** (`.planning/research/PITFALLS.md` lines 5-10):
```markdown
## Critical Pitfalls

| Pitfall | Warning Signs | Prevention Strategy | Phase |
|---|---|---|---|
| Unapproved crawling | Scheduled jobs run before source review, no robots/access notes | Require source registry access review before scheduled crawling | Phase 1 |
```

**Rate/load gate pattern** (`01-CONTEXT.md` lines 33-35):
```markdown
### Rate Limit and Load
- **D-10:** Use a moderate collection posture for approved seed URLs: approximately one request every 1-2 seconds, low concurrency, and immediate backoff/stop on errors, throttling, unusual latency, or access-denied signals.
- **D-11:** The planner may choose exact retry/backoff values, but must preserve the moderate posture and include a kill-switch or manual stop path.
```

---

### `.planning/phases/01-source-discovery-and-governance/discovery-notes.md` (documentation / utility, file-I/O / batch)

**Analog:** `.planning/research/seed-sources.md`

**Source inventory table pattern** (`.planning/research/seed-sources.md` lines 8-17):
```markdown
## Sources

| Source | Purpose | MVP Use | Caveats |
|---|---|---|---|
| `https://cdp.hanyang.ac.kr/` | Hanyang Career Development Center | Primary employment-information source; discover job/career categories and canonical links | Need source access review before automated crawling; site structure and robots policy must be verified |
| `https://cdp.hanyang.ac.kr/` > 취업정보 하위항목 전체 | Career information subpages | Index career announcements, programs, guidance, and related posts | Category URLs must be enumerated during source-discovery phase |
| `https://cdp.hanyang.ac.kr/` > 채용정보 하위항목 전체 | Recruitment information subpages | Index job postings and recruitment notices | Freshness is critical; stale listings must be detected and excluded or marked |
| `https://book.hanyang.ac.kr/Viewer/YKCF2I67RO4B` | 취업성공후기 | Retrieve success stories as qualitative advice and examples | Viewer/PDF extraction may require document parsing; cite exact source title/page when possible |
| `https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf` | Career Development Center student guidebook | Ground answers about CDP usage, student processes, and official guidance | PDF parsing needs page-level citations and refresh checks |
| `https://ibus.hanyang.ac.kr/front/recruit/r-1` | Hanyang ERICA College of Business and Economics employment board | Supplementary college-level job board; visible public listing includes titles, dates, detail links, and pagination | Faculty-specific scope; do not treat as campus-wide unless validated |
```

**Discovery caveat pattern** (`.planning/research/seed-sources.md` lines 19-23):
```markdown
## Direct Fetch Notes

`ibus.hanyang.ac.kr/front/recruit/r-1` was reachable and exposes a paginated Korean employment board with job-post titles, dates, hit counts, and detail links. Example current page entries include public-sector and institution recruitment notices with deadline text embedded in the title.

The root CDP page failed through the generic markdown fetcher during initialization, so source discovery must use browser automation, targeted HTTP inspection, or manual sitemap exploration in Phase 1.
```

**Source requirements pattern** (`.planning/research/seed-sources.md` lines 25-31):
```markdown
## Source Requirements

- Every indexed item must keep source URL, source name, fetched timestamp, published/posted date if available, and source category.
- Every chat answer using indexed data must cite the source URL and date context.
- Recruitment listings must expose deadline and stale/expired status when available.
- The system must decline to answer or label uncertainty when source evidence is missing.
- Automated collection must be reviewed against robots.txt, terms, and expected load before scheduled crawling.
```

## Shared Patterns

### Greenfield / No Implementation-Code Analog

**Source:** `.planning/STATE.md` lines 46-52 and repository glob search for implementation files
**Apply to:** All Phase 1 implementation planning
```markdown
## Active Assumptions

- The project is greenfield.
- Hanyang/ERICA source URLs are planning inputs, not proof of production crawling permission.
- Korean-first chat and citation reliability are more important than advanced resume/interview tooling in v1.
- Personalization should start with explicit user preferences and data minimization.
- `DESIGN.md` is a design inspiration seed, not the final project brand.
```

### Source Governance Before Ingestion

**Source:** `.planning/research/ARCHITECTURE.md` lines 31-38
**Apply to:** Registry schema, registry YAML, checklist, discovery notes
```markdown
## Build Order Implications

- Source governance must precede automated ingestion.
- Ingestion metadata must precede citation-aware RAG.
- RAG audit logs should be built with the first chat MVP, not added after launch.
- Personalization should come after reliable non-personalized answers.
- UI polish should follow a dedicated UI contract because citations and freshness are core trust surfaces.
- Safety/evaluation must be continuous, but the full release gate comes after the main flows exist.
```

### Scheduled Crawling Disabled Gate

**Source:** `.planning/phases/01-source-discovery-and-governance/01-RESEARCH.md` lines 51-54
**Apply to:** `source-registry.schema.ts`, `source-registry.yaml`, `source-access-review.md`
```markdown
| SRC-01 | Operator can register each approved source with URL, category, source owner label, access notes, and refresh cadence. | Use a full-audit YAML/JSON registry validated by Zod, with required fields from D-13 plus evidence subfields for robots, ToS, auth, rate limit, freshness, and next action. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`; CITED: Context7 `/websites/zod_dev_v4`] |
| SAFE-05 | Scheduled crawling is blocked until source access rules and load expectations are reviewed. | Represent each seed source with `approval_status`, `review_status`, `scheduled_crawling_enabled: false`, `allowed_collection_method`, and checklist evidence before any schedule can be enabled. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] |
```

### Robots / ToS / Approval Must Stay Separate

**Source:** `.planning/phases/01-source-discovery-and-governance/01-RESEARCH.md` lines 72-78
**Apply to:** `source-registry.schema.ts`, `source-registry.yaml`, `source-access-review.md`
```markdown
The strongest planning constraint is that `robots_status`, `tos_status`, and `approval_basis` are distinct fields: a user-stated capstone exception can be recorded as approval basis, but it must not erase the robots/terms evidence or become a general production-crawling claim. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`] RFC 9309 also states that robots rules are not access authorization, so the planner should treat robots as service-owner crawler preference evidence rather than as a substitute for explicit permission. [CITED: https://datatracker.ietf.org/doc/html/rfc9309]

Direct source checks found that CDP and book domains currently return `Disallow: /` for `User-agent: *`, while the ibus domain returns an empty `Disallow:` line. [VERIFIED: webfetch `https://cdp.hanyang.ac.kr/robots.txt`; VERIFIED: webfetch `https://book.hanyang.ac.kr/robots.txt`; VERIFIED: webfetch `https://ibus.hanyang.ac.kr/robots.txt`] This does not block Phase 1 documentation, but it means the registry must preserve raw robots evidence and keep scheduled crawling disabled until the access review checklist is completed under the user-stated capstone exception scope. [VERIFIED: `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md`]

**Primary recommendation:** Plan a YAML registry plus TypeScript/Zod validator, with seed records for every `sources.txt` intent, a separate human-readable access checklist, and an explicit `scheduled_crawling_enabled: false` default for every record. [VERIFIED: `sources.txt`; CITED: Context7 `/websites/zod_dev_v4`; CITED: Context7 `/eemeli/yaml`]
```

### Secrets and Ignored Environment Files

**Source:** `.gitignore` lines 1-4 and `01-CONTEXT.md` lines 23-27
**Apply to:** Any planned `.env.example`, Playwright discovery, schema auth fields
```gitignore
.env
.env.*
!.env.example
node_modules/
```

```markdown
### Access Method
- **D-04:** For seed URLs that require automated browser access, Playwright-based discovery may be planned only within the user-stated capstone exception scope.
- **D-05:** If login is required for approved seed URLs, credentials must be loaded from `.env` or equivalent local secret storage. Credentials must never be committed, printed to logs, copied into planning docs, or included in test fixtures.
- **D-06:** Any authenticated access must remain limited to the seed URLs and must be represented in the registry as `auth_mode: env_credentials` with no secret values stored.
```

## No Analog Found

Files with no close implementation-code match in the codebase. Planner should use the research/documentation patterns above and external library docs where needed.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.planning/phases/01-source-discovery-and-governance/source-registry.schema.ts` | config / model / utility | transform | No existing implementation code or TypeScript project files exist. |
| `.planning/phases/01-source-discovery-and-governance/source-registry.yaml` | config | CRUD / batch | No existing machine-readable source registry exists; closest analog is the YAML fragment in research. |
| `.planning/phases/01-source-discovery-and-governance/source-access-review.md` | config / documentation | batch / request-response gate | No existing checklist file exists; closest analogs are phase context, roadmap success criteria, and pitfalls table. |
| `.planning/phases/01-source-discovery-and-governance/discovery-notes.md` | documentation / utility | file-I/O / batch | No phase discovery notes exist yet; closest analog is `.planning/research/seed-sources.md`. |

## Metadata

**Analog search scope:** `/Users/wantap/workspace/Capstone/New` excluding generated interpretation; implementation globs `**/*.{ts,tsx,js,jsx,py,go,rs}` plus planning docs.
**Files scanned/read for patterns:** 12 (`AGENTS.md`, phase context/research, `sources.txt`, seed sources, roadmap, requirements, architecture, stack, pitfalls, state, `.gitignore`); implementation glob found 0 source files.
**Pattern extraction date:** 2026-05-03
