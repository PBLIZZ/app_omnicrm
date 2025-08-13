# AI/LLM Overview

- Provider: OpenRouter (multiple models)
- Guardrails: `src/server/ai/guardrails.ts` and `src/server/ai/with-guardrails.ts`
- Usage and quotas: tracked in server; see `docs/api/contracts.md` for `/api/chat`

Key points:

- Server‑side only; no keys in client bundles
- Content safety guardrails wrap model calls
- Background jobs handle embeddings/insights (see `src/server/jobs/processors/*`)
