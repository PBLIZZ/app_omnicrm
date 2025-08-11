# Deployment Guide

Target: Vercel (app) + Supabase (DB)
Cost: near zero. No migrations in CI; manual SQL is source of truth.

## 1) Environment Variables

Create `.env.local` for local dev and set Vercel Project Environment Variables. You can start by copying the root `.env.example` and filling values.

Server-only (never exposed to client):

- `SUPABASE_SECRET_KEY` (server secret; never exposed)
- `APP_ENCRYPTION_KEY` (32-byte, base64 preferred)
- `GOOGLE_CLIENT_SECRET`

Public (safe for client, used by browser):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

Either (server/client as needed):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_REDIRECT_URI`
- `APP_ORIGINS` (comma-separated allowed origins)
- `FEATURE_GOOGLE_GMAIL_RO` ("1" or "0")
- `FEATURE_GOOGLE_CALENDAR_RO` ("1" or "0")
- `API_RATE_LIMIT_PER_MIN` (default 60)
- `API_MAX_JSON_BYTES` (default 1_000_000)

Minimal example (copy into `.env.local` for dev):

```ini
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=publishable-key

# Supabase (server-only)
SUPABASE_SECRET_KEY=service_secret_xxx

# App encryption key (32-byte). Prefer base64.
# Example (do not use in prod): ZGV2LXRlc3QtMzItYnl0ZS1rZXktYmFzZTY0LXN0cmluZw==
APP_ENCRYPTION_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback

# CORS / Security
APP_ORIGINS=http://localhost:3000
API_RATE_LIMIT_PER_MIN=60
API_MAX_JSON_BYTES=1000000

# Feature flags (read-only integrations)
FEATURE_GOOGLE_GMAIL_RO=1
FEATURE_GOOGLE_CALENDAR_RO=1
```

Note:

- In Vercel, mark `SUPABASE_SECRET_KEY`, `APP_ENCRYPTION_KEY`, and `GOOGLE_CLIENT_SECRET` as Server env (do not prefix with `NEXT_PUBLIC_`).
- Keep the secret key out of client bundles.

## 2) Deploy Steps

1. Set Vercel Project Env Vars (Production, Preview, Development).
2. Deploy branch to Vercel.
3. Verify health:
   - Open `/api/health` → should return `{ ts, db }` JSON.
   - Verify CSP headers are present (`content-security-policy`) and rate limit envs are set (`API_RATE_LIMIT_PER_MIN`, `API_MAX_JSON_BYTES`).
4. Tail logs in Vercel. Logs include `x-request-id` header for correlation.
5. Uptime checks:
   - Set GitHub repo secret `HEALTHCHECK_URL=https://<your-domain>/api/health`.
   - The scheduled workflow `.github/workflows/uptime.yml` runs every 10 minutes.

## 3) Rollback Plan

- Revert to previous successful deployment in Vercel (Deployments → Promote previous).
- If env misconfig causes boot failure, fix variables and re-deploy.
- No DB schema migrations run via CI; manual SQL only.

## 4) Logging & Redaction

- Pino logger with redaction of tokens (`authorization`, `access_token`, `refresh_token`).
- Pretty logs automatically enabled in development only.
- Use `x-request-id` from responses to trace a request across logs.

## 5) Production Sanity Warnings

- If `NODE_ENV=production` and Google feature flags are unset, the app logs a warning at runtime.
