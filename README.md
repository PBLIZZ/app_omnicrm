# Deploy & Secrets

This app targets Vercel with Supabase-managed Postgres. Manual SQL is source of truth; no migrations run in CI.

Required environment variables (server fails fast if missing):

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
- SUPABASE_SECRET_KEY (production only, server-side only)
- APP_ENCRYPTION_KEY (32-byte; accepts base64url [preferred], base64, hex, or strong UTF-8 ≥ 32 bytes)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

Recommendations:

- Scope secrets: do not expose service role to any client bundle. Only set as Server env in Vercel.
- Prefer a base64url-encoded 32-byte value for `APP_ENCRYPTION_KEY`. Base64, hex, and strong UTF-8 (≥ 32 bytes) are also supported.
- Configure `APP_ORIGINS` for allowed CORS origins.
- Healthcheck: set `HEALTHCHECK_URL` GitHub secret to your `/api/health` URL to enable scheduled uptime checks.
- Example environment files: use the root `.env.example` (synced from `docs/ops/env.example`) for local setup. The `docs/ops/env.example` remains the source template.

Cryptography helpers:

- Shared encoding utilities: `src/lib/encoding.ts` (UTF-8, hex, base64url)
- Node helpers: `src/server/lib/crypto.ts`
- Edge helpers (Web Crypto API): `src/server/lib/crypto-edge.ts`
- AES-256-GCM string format is compatible across Node/Edge: `v1:<iv>:<ciphertext>:<tag>` (all segments base64url)

Where to look for logs:

- Vercel function logs (includes request id via `x-request-id`).
- Application logs use structured JSON via Pino with token redaction.
