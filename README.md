## Deploy & Secrets

This app targets Vercel with Supabase-managed Postgres. Manual SQL is source of truth; no migrations run in CI.

Required environment variables (server fails fast if missing):

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
- SUPABASE_SECRET_KEY (production only, server-side only)
- APP_ENCRYPTION_KEY (32-byte; base64 preferred)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

Recommendations:

- Scope secrets: do not expose service role to any client bundle. Only set as Server env in Vercel.
- Use base64 32-byte value for `APP_ENCRYPTION_KEY`.
- Configure `APP_ORIGINS` for allowed CORS origins.
- Healthcheck: set `HEALTHCHECK_URL` GitHub secret to your `/api/health` URL to enable scheduled uptime checks.

Where to look for logs:

- Vercel function logs (includes request id via `x-request-id`).
- Application logs use structured JSON via Pino with token redaction.
