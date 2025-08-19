# AI/LLM Overview

- Provider: OpenRouter (multiple models)
- Guardrails: `src/server/ai/guardrails.ts` and `src/server/ai/with-guardrails.ts`
- Usage and quotas: tracked in server; see `docs/api/contracts.md` for `/api/chat`

## Provider configuration

- Config: `src/server/providers/openrouter.provider.ts`
  - `getOpenRouterConfig()` reads env and returns `{ baseUrl, chatModel, embedModel, summaryModel, apiKey? }`
  - `isOpenRouterConfigured()` helper for feature gating
  - `openRouterHeaders()` returns headers with bearer token when configured

### Environment variables

Defined in `src/lib/env.ts` and `.env.example`:

```env
OPENROUTER_API_KEY=
AI_MODEL_CHAT=openrouter/auto
AI_MODEL_EMBED=openai/text-embedding-3-large
AI_MODEL_SUMMARY=openrouter/auto
```

Notes:

- In non‑production, missing `OPENROUTER_API_KEY` logs a warning and effectively disables provider calls.
- Keys are never exposed to client bundles.

## Chat orchestration

- Route: `src/app/api/chat/route.ts` (auth + schema validation only)
- Service: `src/server/services/chat.service.ts`
  - Builds system prompt via `src/server/prompts/chat.prompt.ts`
  - Reads model and base URL from `src/lib/env.ts` via `getOpenRouterConfig()`
  - Executes the provider call inside `withGuardrails()` to enforce monthly quota, RPM, and daily cost caps
  - Parses OpenRouter usage headers (`x-usage-input-tokens`, `x-usage-output-tokens`, `x-usage-cost`) for logging
  - Returns `{ text }` and `creditsLeft` to the route

Fallback behavior:

- If `OPENROUTER_API_KEY` is not set (dev/test), `chat.service` short‑circuits with a safe response (no credits spent, no network call) to allow UI development without provider access.

Key points:

- Server‑side only; no keys in client bundles
- Content safety guardrails wrap model calls
- Background jobs handle embeddings/insights (see `src/server/jobs/processors/*`)

## Prompt stubs

- Chat system prompt: `src/server/prompts/chat.prompt.ts`
- Embedding input builder: `src/server/prompts/embed.prompt.ts`
