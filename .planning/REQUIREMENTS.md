# Requirements: ERICA Career Chat

**Defined:** 2026-05-03  
**Core Value:** Students can ask career and recruitment questions in Korean and receive current, source-cited, personally relevant answers from Hanyang ERICA employment information.

## v1 Requirements

Requirements for the initial release. Each maps to roadmap phases.

### Source Ingestion

- [ ] **SRC-01**: Operator can register each approved source with URL, category, source owner label, access notes, and refresh cadence.
- [ ] **SRC-02**: System can fetch and parse public HTML job/career board listings into normalized records with title, source URL, posted date, fetched timestamp, and raw text.
- [ ] **SRC-03**: System can ingest PDF guide/success-story documents with page-level metadata for citation.
- [ ] **SRC-04**: System can mark recruitment listings as active, expired, or unknown based on deadline text when available.
- [ ] **SRC-05**: System preserves original source links so users can verify and continue on the official page.

### Retrieval and Chat

- [ ] **RAG-01**: User can ask a Korean natural-language career or recruitment question in a chat interface.
- [ ] **RAG-02**: System retrieves relevant indexed source chunks using keyword and semantic matching.
- [ ] **RAG-03**: System answers with citations that include source title, URL, and date/page context when available.
- [ ] **RAG-04**: System refuses or labels uncertainty when retrieved evidence is insufficient.
- [ ] **RAG-05**: System logs retrieved source IDs, prompt version, model configuration, and response timestamp for audit and regression debugging.
- [ ] **RAG-06**: System treats retrieved source text as untrusted content and prevents source text from overriding system, safety, citation, or privacy instructions.

### Personalization

- [ ] **PERS-01**: User can set explicit preferences such as major, target job type, industry, region, employment type, and deadline sensitivity.
- [ ] **PERS-02**: System ranks or filters recommendations using explicit preferences and explains the match reasons.
- [ ] **PERS-03**: User can update or clear personalization preferences.
- [ ] **PERS-04**: System can answer without personalization when the user has not provided preferences.

### User Experience

- [ ] **UX-01**: User can view a responsive Korean-first chat page with input, answer history, citations, and recommended source links.
- [ ] **UX-02**: User can inspect cited source cards from an answer without losing chat context.
- [ ] **UX-03**: User can browse latest or recommended employment listings outside the chat flow.
- [ ] **UX-04**: UI labels expired/uncertain job postings visibly.
- [ ] **UX-05**: UI uses the design seed selectively: calm white surfaces, rounded cards, pill filters, clear typography, and trustworthy source presentation.

### Safety, Privacy, and Governance

- [ ] **SAFE-01**: System displays that answers are informational and users should verify important details on official source pages.
- [ ] **SAFE-02**: System does not claim official Hanyang endorsement or guaranteed job outcomes.
- [ ] **SAFE-03**: System stores only the minimum personalization data needed for MVP behavior.
- [ ] **SAFE-04**: System provides a visible way to clear stored preferences and chat history if persistence exists.
- [ ] **SAFE-05**: Scheduled crawling is blocked until source access rules and load expectations are reviewed.
- [ ] **SAFE-06**: Personalization storage requires explicit consent, retention rules, and deletion behavior before user preferences or chat history are persisted.

### Evaluation and Operations

- [ ] **EVAL-01**: Project includes a reference QA set covering CDP usage, job listing discovery, deadlines, success stories, guidebook questions, and no-answer cases.
- [ ] **EVAL-02**: Retrieval evaluation measures whether expected source chunks appear in top results for reference questions.
- [ ] **EVAL-03**: Answer evaluation checks citation accuracy, faithfulness to retrieved evidence, Korean answer quality, and refusal behavior.
- [ ] **EVAL-04**: System exposes ingestion freshness and last successful source update status to operators.
- [ ] **EVAL-05**: Release checks include at least one manual end-to-end flow from source ingestion to cited chat answer.
- [ ] **EVAL-06**: Evaluation includes hostile-source and prompt-injection cases where retrieved content attempts to override assistant instructions or citation requirements.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Career Tools

- **CARE-01**: User can upload a resume and receive skill/job-fit analysis against selected postings.
- **CARE-02**: User can generate interview preparation questions from a selected job posting.
- **CARE-03**: User can draft application checklists or cover-letter outlines in their own voice.
- **CARE-04**: User can save jobs and track application status.

### Integrations

- **INT-01**: Student can authenticate through official university identity if authorization is obtained.
- **INT-02**: System can subscribe users to deadline reminders through email, KakaoTalk, or another approved channel.
- **INT-03**: Career staff can curate or pin authoritative snippets through an admin interface.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Official Hanyang SSO in v1 | Requires institutional authorization and integration work outside current evidence |
| Applying to jobs automatically | High risk and not necessary for source-grounded discovery MVP |
| Crawling authenticated/private pages | Violates source-boundary assumptions unless explicit permission is obtained |
| Guaranteeing job fit or career outcomes | AI recommendations are informational and must remain transparent |
| Full resume/cover-letter automation in v1 | Valuable but distracts from core ERICA source retrieval and citation reliability |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SRC-01 | Phase 1 | Pending |
| SRC-02 | Phase 2 | Pending |
| SRC-03 | Phase 2 | Pending |
| SRC-04 | Phase 2 | Pending |
| SRC-05 | Phase 2 | Pending |
| RAG-01 | Phase 3 | Pending |
| RAG-02 | Phase 3 | Pending |
| RAG-03 | Phase 3 | Pending |
| RAG-04 | Phase 3 | Pending |
| RAG-05 | Phase 3 | Pending |
| RAG-06 | Phase 3 | Pending |
| PERS-01 | Phase 4 | Pending |
| PERS-02 | Phase 4 | Pending |
| PERS-03 | Phase 4 | Pending |
| PERS-04 | Phase 4 | Pending |
| UX-01 | Phase 5 | Pending |
| UX-02 | Phase 5 | Pending |
| UX-03 | Phase 5 | Pending |
| UX-04 | Phase 5 | Pending |
| UX-05 | Phase 5 | Pending |
| SAFE-01 | Phase 6 | Pending |
| SAFE-02 | Phase 6 | Pending |
| SAFE-03 | Phase 4 | Pending |
| SAFE-04 | Phase 4 | Pending |
| SAFE-05 | Phase 1 | Pending |
| SAFE-06 | Phase 4 | Pending |
| EVAL-01 | Phase 6 | Pending |
| EVAL-02 | Phase 6 | Pending |
| EVAL-03 | Phase 6 | Pending |
| EVAL-04 | Phase 6 | Pending |
| EVAL-05 | Phase 6 | Pending |
| EVAL-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-05-03*  
*Last updated: 2026-05-03 after initial definition*
