# Phase 2: Ingestion and Knowledge Base - Context

**Gathered:** 2026-05-03T06:22:48Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 converts approved, observable HTML/PDF sources into normalized, citation-ready local records for retrieval experiments. It must not build chat, recommendations, UI, scheduled crawling, or authenticated/private crawling. It must begin with a pre-ingestion source access/structure gate because Phase 1 UAT explicitly deferred CDP live structure and login feasibility validation into Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Pre-Ingestion Access Gate
- **D-01:** Phase 2 must start by proving what can be observed safely before implementing parsers. For each candidate source, record observed URL structure, auth boundary, robots/ToS status, response type, and whether content is public, login-gated, or blocked.
- **D-02:** CDP category ingestion is blocked until public structure or approved login status is observed. The Phase 1 UAT gap is acknowledged, not ignored: CDP collection planning cannot rely only on local schema tests or dry-run output.
- **D-03:** If login is required, Phase 2 must not automate login unless explicit authorization and credentials are provided. Any approved authenticated discovery must use environment-only credentials, ephemeral browser context, no storage-state persistence, and sanitized logs with no cookies/tokens/request bodies.
- **D-04:** Source registry records remain the source of truth. Ingestion code may fetch only records whose review and collection method are explicitly approved for the chosen source-specific implementation path. `scheduled_crawling_enabled` remains false.

### Initial Source Prioritization
- **D-05:** Prioritize sources with public or already-observed structure first: `ibus-employment-board` for HTML listing/detail parsing and `cdp-student-guide-pdf` for PDF page-level parsing.
- **D-06:** Treat CDP category discovery and the book viewer as conditional work: first produce structure/access evidence, then plan parsing only if a safe public or explicitly approved path exists.

### Normalized Record Contract
- **D-07:** Every normalized record must preserve `source_id`, source name, source URL, canonical/detail URL, title, category, fetched timestamp, posted/published date when available, deadline/expired/unknown status when available, raw text, cleaned text, content hash, and citation anchors.
- **D-08:** PDF records must preserve page-level metadata and citation anchors. HTML listing records must preserve official detail links and enough date/deadline text for freshness handling.

### Storage and Retrieval Readiness
- **D-09:** For Phase 2, use a local-first knowledge base suitable for retrieval experiments. Prefer simple deterministic artifacts first (JSONL or SQLite/PostgreSQL-ready records plus metadata) before introducing vector search or chat-facing retrieval.
- **D-10:** Chunking/indexing must preserve citation metadata from the start, but semantic embeddings and chat answer generation belong to later phases unless needed only as a smoke test for record shape.

### the agent's Discretion
- The agent may choose exact parser libraries and local storage format during planning, provided the output is deterministic, testable, citation-ready, and respects the source registry gates.
- The agent may decide whether to implement separate parser modules per source or a shared parser interface, but source-specific behavior must remain explicit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and Requirements
- `.planning/PROJECT.md` — Korean-first, source-cited ERICA career assistant intent and authorization constraints.
- `.planning/REQUIREMENTS.md` — Phase 2 requirements SRC-02, SRC-03, SRC-04, SRC-05 and out-of-scope authenticated/private crawling.
- `.planning/ROADMAP.md` — Phase 2 goal, deliverables, success criteria, and parallelization hints.
- `AGENTS.md` — project rules for Korean-first behavior, citation/freshness metadata, access controls, privacy, and no official endorsement claims.

### Phase 1 Governance Inputs
- `.planning/phases/01-source-discovery-and-governance/01-CONTEXT.md` — locked source-scope, approval-basis, rate-limit, and registry decisions.
- `.planning/phases/01-source-discovery-and-governance/source-registry.yaml` — six seed source records and current review/access statuses.
- `.planning/phases/01-source-discovery-and-governance/source-access-review.md` — source access review checklist and scheduling gate.
- `.planning/phases/01-source-discovery-and-governance/discovery-notes.md` — observed CDP `no_candidates_observed`, CDP open questions, PDF/viewer/ibus discovery notes, and non-ingestion boundary.
- `.planning/phases/01-source-discovery-and-governance/01-UAT.md` — acknowledged Phase 1 UAT gap deferred to Phase 2 pre-ingestion gate.

### Research and Architecture
- `.planning/research/seed-sources.md` — seed-source inventory, CDP caveats, ibus public board notes, and source requirements.
- `.planning/research/STACK.md` — source-specific fetchers first; general crawlers only after access review.
- `.planning/research/ARCHITECTURE.md` — ingestion worker responsibilities, metadata store, retrieval index, and build-order constraints.
- `.planning/research/PITFALLS.md` — stale listings, unapproved crawling, citation drift, and prompt-injection risks.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/source-governance/source-registry.schema.ts` — Zod schema and TypeScript types for source registry records; Phase 2 should import or mirror these types rather than re-define source metadata loosely.
- `src/source-governance/validate-source-registry.ts` — CLI validator for registry files; Phase 2 verification should run this before fetching.
- `scripts/verify-source-governance-artifacts.ts` — safety invariant checker; Phase 2 should keep it passing and add ingestion-specific checks rather than weakening it.
- `scripts/discover-cdp-seed-scope.ts` — bounded CDP helper; useful only for safe public structure probing, not for production crawling or credential reuse.

### Established Patterns
- Strict TypeScript/NodeNext ESM project with `npm test`, `npm run typecheck`, `npm run validate:sources`, and `npm run verify:source-governance` scripts.
- Governance-first source access model: registry and checklist gates precede any fetch/parser work.
- Source records are full-audit records, not flat URLs; downstream ingestion must preserve governance and citation metadata.

### Integration Points
- Phase 2 parsers should read `.planning/phases/01-source-discovery-and-governance/source-registry.yaml` and write normalized ingestion artifacts under a clearly planned source/knowledge-base module.
- Verification should cover at least one public HTML listing source and one PDF source before broader source expansion.

</code_context>

<specifics>
## Specific Ideas

- Start with `ibus-employment-board` and `cdp-student-guide-pdf` because they have the clearest public/observed paths.
- Treat CDP category and book viewer ingestion as gated by structure evidence rather than guaranteed Phase 2 parser work.
- Preserve Korean labels and original official URLs in every record.
- Use deterministic parsing and tests before adding embeddings or LLM-based extraction.

</specifics>

<deferred>
## Deferred Ideas

- Official Hanyang SSO integration remains out of scope unless new authorization evidence is added.
- Scheduled crawling remains out of scope; Phase 2 may perform bounded/manual fetches for approved records but must not create recurring jobs.
- Chat answering, recommendation ranking, and UI are later phases.

</deferred>

---

*Phase: 2-Ingestion and Knowledge Base*
*Context gathered: 2026-05-03T06:22:48Z*
