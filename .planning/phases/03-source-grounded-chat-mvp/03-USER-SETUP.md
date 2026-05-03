# Phase 03: User Setup Required

**Generated:** 2026-05-03
**Phase:** 03-source-grounded-chat-mvp
**Status:** Incomplete

Complete these items only if you want to use a live OpenAI-compatible chat provider. The code and tests use injected mocks and do not require live secrets.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `OPENAI_COMPAT_BASE_URL` | OpenAI-compatible provider dashboard or local gateway base URL | local `.env` / deployment secret store |
| [ ] | `OPENAI_COMPAT_API_KEY` | OpenAI-compatible provider API key; never commit or log | local `.env` / deployment secret store |
| [ ] | `OPENAI_COMPAT_MODEL` | OpenAI-compatible provider model name | local `.env` / deployment secret store |

## Account Setup

- [ ] **Prepare an OpenAI-compatible chat provider account or local gateway**
  - Skip if: You will keep using deterministic mocked providers for tests and local development.

## Dashboard Configuration

- [ ] **Create or select a chat-completions model**
  - Location: Provider dashboard or local gateway configuration.
  - Required semantics: `/chat/completions` accepts `model`, `messages`, optional `temperature`, and optional `max_tokens`.

## Verification

After completing setup, verify without printing secret values:

```bash
npm test -- src/chat/prompt.test.ts
npm run typecheck
```

Expected results:
- Provider and prompt tests pass using mocked/injected fetch.
- TypeScript typecheck passes.
- No API key is printed by tests or safe provider configuration.

---

**Once all items complete:** Mark status as "Complete" at top of file.
