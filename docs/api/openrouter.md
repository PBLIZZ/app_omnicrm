# OpenRouter Provider Configuration & Usage

This document explains how the OpenRouter provider is configured and used in the layered architecture.

## Components

- Provider: `src/server/providers/openrouter.provider.ts`
- Prompts: `src/server/prompts/chat.prompt.ts`, `src/server/prompts/embed.prompt.ts`
- Environment: `src/lib/env.ts` (validated) and `.env.example`

## Environment variables

```env
OPENROUTER_API_KEY=
AI_MODEL_CHAT=openrouter/auto
AI_MODEL_EMBED=openai/text-embedding-3-large
AI_MODEL_SUMMARY=openrouter/auto
```

Notes:

- Keys are server-side only; never expose to the client.
- In non-production, if `OPENROUTER_API_KEY` is missing, a warning is logged and calls should be gated via `isOpenRouterConfigured()`.

## Provider helpers

From `src/server/providers/openrouter.provider.ts`:

- `getOpenRouterConfig()` → `{ baseUrl, chatModel, embedModel, summaryModel, apiKey? }`
- `isOpenRouterConfigured()` → boolean
- `openRouterHeaders()` → returns `{ Authorization: 'Bearer ...', 'content-type': 'application/json' }` when configured (current implementation)

These helpers centralize configuration and header construction and are used by services that call OpenRouter.

Planned enhancement: include `HTTP-Referer` and `X-Title` headers for improved observability, set from app configuration. See new GitHub issue "Enhance OpenRouter headers (HTTP-Referer, X-Title)".

## Layered usage

- Controllers (routes) do not call OpenRouter directly.
- Services orchestrate prompts and provider calls.
- Prompts build consistent system/user messages or embedding inputs.

Example flow (chat):

1. Route validates input and delegates to `src/server/services/chat.service.ts`.
2. Service builds messages via `src/server/prompts/chat.prompt.ts` and calls provider using env-selected model from `src/lib/env.ts`.
3. Service executes the call inside `withGuardrails(...)` to enforce quotas/rate-limits and logs usage; returns normalized `{ text }` plus credits left to the route.

## Security & observability

- Server-side only. No client bundle access to env or provider.
- Usage tracking and guardrails wrap model calls via `src/server/ai/with-guardrails.ts`.
- In dev/test without `OPENROUTER_API_KEY`, `chat.service` short-circuits with a safe fallback response (no credits spent).

## Troubleshooting

- Missing API key: ensure `OPENROUTER_API_KEY` is set. In dev/test you can proceed with feature-gated fallbacks.
- Model names: override via env; defaults are provided in `src/lib/env.ts`.
