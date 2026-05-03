# Roadmap: ERICA Career Chat

**Created:** 2026-05-03  
**Granularity:** Coarse  
**Execution:** Parallel where phase dependencies allow

## Summary

| # | Phase | Goal | Requirements | UI Hint |
|---|-------|------|--------------|---------|
| 1 | Source Discovery and Governance | Confirm source boundaries, enumerate target pages, and define ingestion contracts | SRC-01, SAFE-05 | no |
| 2 | Ingestion and Knowledge Base | Build normalized HTML/PDF ingestion with metadata, freshness, and citations | SRC-02, SRC-03, SRC-04, SRC-05 | no |
| 3 | Source-Grounded Chat MVP | Deliver Korean RAG chat with citations, refusal behavior, prompt-injection resistance, and audit logs | RAG-01, RAG-02, RAG-03, RAG-04, RAG-05, RAG-06 | yes |
| 4 | Personalization and Recommendations | Add explicit profile preferences, privacy gates, and explainable matching | PERS-01, PERS-02, PERS-03, PERS-04, SAFE-03, SAFE-04, SAFE-06 | yes |
| 5 | Student-Facing Experience | Polish responsive chat, listing browsing, citation cards, and visual system adaptation | UX-01, UX-02, UX-03, UX-04, UX-05 | yes |
| 6 | Safety, Evaluation, and Release Readiness | Add disclaimers, eval suite, freshness status, hostile-source tests, and end-to-end checks | SAFE-01, SAFE-02, EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06 | yes |

## Phase Details

### Phase 1: Source Discovery and Governance

**Goal:** Establish which public Hanyang/ERICA sources can be used, how they should be accessed, and what metadata every source must provide.

**Requirements:** SRC-01, SAFE-05

**Deliverables:**
- Source registry schema and seed records from `sources.txt`.
- Discovery notes for CDP categories, CDP recruitment/career subpages, PDF documents, and the College of Business and Economics board.
- Source access review checklist covering robots.txt, terms, rate limits, and authorization boundaries.

**Success criteria:**
1. Every seed source has a registry entry with access notes and refresh assumptions.
2. Scheduled crawling remains disabled until access review is complete.
3. Downstream ingestion can rely on a stable source metadata contract.

**Parallelization:** CDP discovery, PDF feasibility checks, and ibus board analysis can run independently.

**Plans:** 3 plans

Plans:

**Wave 1**
- [x] 01-01-PLAN.md — Create the TypeScript/Zod source registry contract, validator CLI, tests, and automated source-governance invariant checks.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Create validated seed registry records and machine-traceable source access review checklist.
- [x] 01-03-PLAN.md — Create bounded seed-scope CDP discovery helper and discovery notes for CDP, PDF/viewer, and ibus sources.

### Phase 2: Ingestion and Knowledge Base

**Goal:** Convert approved HTML and PDF sources into normalized, citation-ready records for retrieval.

**Requirements:** SRC-02, SRC-03, SRC-04, SRC-05

**Deliverables:**
- HTML listing parser for public board pages.
- PDF ingestion path with page-level metadata.
- Normalized document/listing schema with source URL, source name, posted date, fetched timestamp, deadline status, raw text, and chunk IDs.
- Initial local knowledge base or database suitable for retrieval experiments.

**Success criteria:**
1. At least one HTML source and one PDF source can be ingested into normalized records.
2. Retrieved records link back to official source URLs or page references.
3. Deadline/expired status is captured where source text supports it.

**Parallelization:** HTML parser, PDF parser, schema design, and freshness/status extraction can be developed in separate plans after schema agreement.

**Plans:** 5 plans

Plans:

**Wave 1**
- [x] 02-01-PLAN.md — Create the mandatory pre-ingestion access/structure gate, evidence artifact, and explicit approval checkpoint before parser/live collection.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md — Define normalized citation-ready record, chunk, and manifest schemas with deterministic chunk IDs.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02-03-PLAN.md — Implement fixture-first ibus HTML board parsing and deterministic Korean deadline status extraction, with live/sample ingestion gated by approval record.
- [x] 02-04-PLAN.md — Implement fixture-first CDP student guide PDF page parsing with page-level citation anchors, with live/manual ingestion gated by approval record.

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 02-05-PLAN.md — Wire approval-gated sample ingestion commands and deterministic JSONL knowledge-base verification.

**Wave 5** *(reopened after `sources.txt` coverage correction)*
- [x] 02-06-PLAN.md — Complete authenticated/bounded collection coverage for every `sources.txt` source intent or record evidence-backed blockers.

### Phase 3: Source-Grounded Chat MVP

**Goal:** Ship the first usable Korean chat flow that answers from indexed sources with citations and transparent uncertainty.

**Requirements:** RAG-01, RAG-02, RAG-03, RAG-04, RAG-05, RAG-06

**Deliverables:**
- Chat API with Korean query handling.
- Hybrid retrieval baseline combining lexical and semantic search if stack supports it.
- Citation-aware answer prompt and response format.
- Refusal/uncertainty behavior for weak evidence.
- Retrieved-content isolation so source text cannot override assistant, safety, citation, or privacy instructions.
- Audit logging for retrieved source IDs, prompt version, model configuration, and response timestamp.

**Success criteria:**
1. A student can ask a Korean employment-information question and receive a cited answer.
2. Answers include source links and date/page context where available.
3. No-answer test cases produce transparent uncertainty instead of fabricated guidance.
4. Hostile-source test cases cannot override system behavior or suppress citations.
5. Audit logs can reproduce which sources supported an answer.

**Parallelization:** Retrieval evaluation, prompt formatting, citation rendering, and audit logging can progress independently once the chat contract is defined.

**Plans:** 6 plans

Plans:

**Wave 1**
- [x] 03-01-PLAN.md — Create chat response contracts and fail-closed Phase 2 JSONL chunk loader.

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 03-02-PLAN.md — Implement BM25-style Korean retrieval with synonym expansion, boilerplate exclusion, and freshness/deadline ranking.

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 03-03-PLAN.md — Implement evidence-tier policy and fail-closed citation/output validation.
- [ ] 03-04-PLAN.md — Implement OpenAI-compatible provider boundary and untrusted retrieved-context prompt builder.

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 03-05-PLAN.md — Wire ChatService orchestration and append-only audit logging for every query cycle.

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 03-06-PLAN.md — Add deterministic Phase 3 RAG evaluation gate and local Korean chat smoke command.

### Phase 4: Personalization and Recommendations

**Goal:** Make recommendations personally relevant using explicit student preferences while preserving privacy and explainability.

**Requirements:** PERS-01, PERS-02, PERS-03, PERS-04, SAFE-03, SAFE-04, SAFE-06

**Deliverables:**
- Preference model for major, industry, job type, region, employment type, and deadline sensitivity.
- Recommendation ranking/filtering pipeline.
- Match-reason generation tied to source evidence and user preferences.
- Preference clear/update flow.
- Consent, retention, and deletion rules before persisting preferences or chat history.
- Minimum-data storage design for personalization.

**Success criteria:**
1. User can set, update, and clear preferences.
2. Recommendations change in explainable ways based on preferences.
3. System still works for anonymous or preference-free users.
4. No preference or chat-history persistence ships without consent, retention, and deletion behavior.

**Parallelization:** Preference UI, ranking logic, and match-reason templates can be implemented independently after the preference schema is stable.

### Phase 5: Student-Facing Experience

**Goal:** Turn the functional assistant into a polished Korean-first student product with trustworthy source presentation.

**Requirements:** UX-01, UX-02, UX-03, UX-04, UX-05

**Deliverables:**
- Responsive chat page with answer history, input, citations, and source cards.
- Latest/recommended listing browse surface.
- Visual adaptation of the design seed into an academic career-service style.
- Expired/uncertain posting labels.

**Success criteria:**
1. Mobile and desktop flows are usable without losing citation context.
2. Source cards make it easy to verify answers on official pages.
3. Visual language uses rounded cards, pill filters, Korean-first typography, and calm surfaces without copying Meta branding.

**Parallelization:** This phase should start with `/gsd-ui-phase 5`; after the UI contract, chat layout, listing browse, citation cards, and responsive polish can be split.

### Phase 6: Safety, Evaluation, and Release Readiness

**Goal:** Verify the assistant is safe, source-faithful, fresh enough, privacy-conscious, and ready for a first user test.

**Requirements:** SAFE-01, SAFE-02, EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06

**Deliverables:**
- Informational-use disclaimer and official-source verification language.
- Reference QA dataset and no-answer cases.
- Hostile-source and prompt-injection evaluation cases.
- Retrieval and answer evaluation scripts or checklists.
- Ingestion freshness/operator status view.
- Manual end-to-end release checklist.

**Success criteria:**
1. Evaluation catches missing citations, unsupported answers, stale data, prompt-injection failures, and weak refusal behavior.
2. Users can see privacy and verification guidance before relying on answers.
3. At least one end-to-end flow from ingestion to cited answer passes manually.

**Parallelization:** Evaluation dataset, safety copy, privacy controls, and freshness status can be developed in parallel after core flows exist.

## Requirement Coverage

All 32 v1 requirements in `.planning/REQUIREMENTS.md` map to exactly one phase.

## Next Step

Run `/gsd-discuss-phase 1` to clarify source-access policy and source registry design before implementation planning.
