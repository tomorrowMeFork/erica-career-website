# Phase 1: Source Discovery and Governance - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase defines the source-governance contract before ingestion work begins. It must establish which seed sources are in scope, how access approval is represented, what fields the source registry requires, and what review gates must pass before downstream ingestion can fetch or parse content.

Phase 1 does **not** implement ingestion, retrieval, chat, UI, or personalization. It prepares the source registry schema, seed source records, and access review checklist that Phase 2 will use.

</domain>

<decisions>
## Implementation Decisions

### Source Approval Scope
- **D-01:** The approved scope is limited to the seed URLs listed in `sources.txt` and expanded in `.planning/research/seed-sources.md`.
- **D-02:** Do not broaden Phase 1 discovery to all Hanyang domains or unrelated ERICA pages unless the user explicitly updates the roadmap/context.
- **D-03:** The user states that a capstone-design exception approval process has already been completed for these seed URLs. Downstream agents may record this as `approval_basis: user_assertion`, but must not represent it as independently verified official Hanyang authorization.

### Access Method
- **D-04:** For seed URLs that require automated browser access, Playwright-based discovery may be planned only within the user-stated capstone exception scope.
- **D-05:** If login is required for approved seed URLs, credentials must be loaded from `.env` or equivalent local secret storage. Credentials must never be committed, printed to logs, copied into planning docs, or included in test fixtures.
- **D-06:** Any authenticated access must remain limited to the seed URLs and must be represented in the registry as `auth_mode: env_credentials` with no secret values stored.

### Robots and Terms Handling
- **D-07:** `robots.txt` and Terms of Service status must still be captured as evidence fields in the registry, even when the user-stated capstone exception is used as the approval basis.
- **D-08:** Registry records must clearly distinguish between `robots_status`, `tos_status`, and `approval_basis`; these are not interchangeable.
- **D-09:** The project must not claim general production crawling permission. The approval is scoped to capstone seed-source collection unless stronger documentation is added later.

### Rate Limit and Load
- **D-10:** Use a moderate collection posture for approved seed URLs: approximately one request every 1-2 seconds, low concurrency, and immediate backoff/stop on errors, throttling, unusual latency, or access-denied signals.
- **D-11:** The planner may choose exact retry/backoff values, but must preserve the moderate posture and include a kill-switch or manual stop path.

### Source Registry Contract
- **D-12:** Use a full-audit source registry rather than a minimal registry.
- **D-13:** Required registry fields include at minimum: `source_id`, `canonical_url`, `source_name`, `source_type`, `content_type`, `category`, `approval_scope`, `approval_basis`, `approval_status`, `auth_required`, `auth_mode`, `robots_status`, `tos_status`, `rate_limit_posture`, `refresh_cadence`, `owner_label`, `last_checked_at`, `notes`, and `next_action`.
- **D-14:** Seed records should be created for every source intent in `sources.txt`, including CDP root/category discovery, CDP recruitment/category discovery, the success-story viewer, the CDP student guide PDF, and the `ibus` employment board.

### the agent's Discretion
- The agent may decide the exact source registry file format during planning, but should prefer a simple machine-readable format such as JSON or YAML plus a human-readable checklist.
- The agent may decide exact URL enumeration depth, with the conservative default that Phase 1 discovers and records candidate subpages but does not ingest their content.
- The agent may decide failure-state names, but must include states for access denied, login required, blocked by policy, parse unsupported, and pending approval/evidence.
- The agent may decide exact checklist wording, as long as it covers robots, ToS, auth mode, approval basis, rate limit, freshness assumptions, and allowed collection method.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 1 goal, deliverables, success criteria, and requirement mapping.
- `.planning/REQUIREMENTS.md` — `SRC-01` and `SAFE-05`, plus out-of-scope boundaries for authenticated/private crawling and official SSO.
- `.planning/PROJECT.md` — project intent, Korean-first/source-grounded constraints, and official-authorization caveats.
- `.planning/STATE.md` — current phase and project assumptions.

### Source Inputs and Governance
- `sources.txt` — raw seed source list provided by the user.
- `.planning/research/seed-sources.md` — expanded seed source inventory, caveats, and direct fetch notes.
- `.planning/research/PITFALLS.md` — Phase 1 risks, especially unapproved crawling and freshness degradation.
- `.planning/research/ARCHITECTURE.md` — source registry and ingestion-boundary architecture.
- `.planning/research/STACK.md` — candidate ingestion approach and source-access review posture.
- `.planning/research/SUMMARY.md` — research summary emphasizing source governance before ingestion.

### Agent Rules
- `AGENTS.md` — repository rules for Korean-first behavior, citations/freshness, source authorization claims, secrets, and UI boundaries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No implementation code exists yet. The repository currently contains planning docs, research docs, `sources.txt`, `DESIGN.md`, and agent guidance.

### Established Patterns
- Planning is phase-based under `.planning/ROADMAP.md`.
- Requirements use IDs such as `SRC-01` and `SAFE-05`, with traceability to roadmap phases.
- Research artifacts are stored under `.planning/research/` and should be cited by future plans.

### Integration Points
- Phase 1 should create files under `.planning/phases/01-source-discovery-and-governance/` and likely add a source registry artifact consumed by Phase 2.
- Any future `.env` handling must be paired with `.env.example` and must not expose real credentials.

</code_context>

<specifics>
## Specific Ideas

- User wants all seed URLs collected under the capstone exception approval and does not want robots.txt to block the project within that approved seed scope.
- User chose `Seed URLs only` as the approval scope.
- User chose `User assertion` as the approval evidence level.
- User chose `.env` credentials for approved seed URLs if login is required.
- User chose `Moderate` rate limit posture.
- User chose `Full audit` registry rigor.

</specifics>

<deferred>
## Deferred Ideas

- Expanding beyond the seed URLs belongs in a later roadmap update or a revised source-governance decision.
- Official Hanyang SSO or production crawling permission remains out of scope unless new evidence is added to planning docs.
- Resume, cover-letter, interview, and application-tracking tools remain v2 scope.

</deferred>

---

*Phase: 1-Source Discovery and Governance*
*Context gathered: 2026-05-03*
