# Phase 2: Ingestion and Knowledge Base - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03T06:22:48Z
**Phase:** 02-ingestion-and-knowledge-base
**Areas discussed:** pre-ingestion access gate, initial source prioritization, normalized record contract, storage/retrieval readiness

---

## Pre-Ingestion Access Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Gate first | Begin Phase 2 by proving observable source structure and auth boundaries before parser work | ✓ |
| Parse first | Start parsers from known URLs and fill gaps later | |
| Auth-first | Automate login immediately to inspect CDP | |

**User's choice:** Complete Phase 1 and move to Phase 2, carrying the CDP structure/login concern into Phase 2.
**Notes:** The user explicitly challenged that local tests do not prove live site structure or login feasibility. This was recorded as a Phase 1 UAT acknowledged gap and promoted to the first Phase 2 gate.

---

## Initial Source Prioritization

| Option | Description | Selected |
|--------|-------------|----------|
| Public/observed first | Start with ibus HTML board and CDP PDF because they have clearer public evidence | ✓ |
| CDP categories first | Try to solve CDP category discovery before any parser work | |
| All sources together | Build a generic pipeline for all seed sources at once | |

**User's choice:** Auto-selected recommended option.
**Notes:** This avoids blocking all ingestion on unresolved CDP category structure while still preserving the CDP gate.

---

## Normalized Record Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Citation-first contract | Preserve source IDs, URLs, dates, raw/clean text, hashes, and page/section anchors | ✓ |
| Minimal text dump | Store only text and source URL initially | |
| Retrieval-first chunks | Start directly with embeddings/chunks | |

**User's choice:** Auto-selected recommended option.
**Notes:** Phase 2 must support later cited RAG behavior, so metadata cannot be an afterthought.

---

## Storage and Retrieval Readiness

| Option | Description | Selected |
|--------|-------------|----------|
| Local deterministic KB first | Write normalized records to testable local artifacts before vector/chat integration | ✓ |
| Full vector index now | Add vector storage and semantic search immediately | |
| Database-only | Require Postgres/Qdrant setup before parser work | |

**User's choice:** Auto-selected recommended option.
**Notes:** Keeps Phase 2 focused on ingestion correctness; retrieval and chat are later phases.

---

## the agent's Discretion

- Parser libraries, exact local storage format, and module boundaries may be chosen during planning if they remain deterministic and testable.
- Source-specific parser design is preferred over a generic crawler unless research proves a safe shared abstraction.

## Deferred Ideas

- Official SSO integration and authenticated/private crawling remain out of scope without explicit authorization evidence.
- Scheduled crawling remains deferred.
- Chat, recommendations, and UI remain later phases.
