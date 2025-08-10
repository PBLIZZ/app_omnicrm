# Security Controls

This document summarizes the key security controls implemented in the app and where to find them.

## Authentication & Authorization

- Strict server auth via Supabase session only. No header overrides.
  - Helper: `src/server/auth/user.ts` (`getServerUserId()`)
  - RLS boundaries enforced for all publishable-key clients; service-role client is isolated for ingestion-only flows.

## OAuth Integrity (Google)

- OAuth `state` protected with HMAC-signed nonce stored in cookie. Callback validates the nonce and signature and ties to the logged-in session.
  - Init: `src/app/api/google/oauth/route.ts`
  - Callback: `src/app/api/google/oauth/callback/route.ts`

## Token Secrecy (At Rest)

- Google `access_token` and `refresh_token` encrypted with AES-256-GCM using `APP_ENCRYPTION_KEY`.
  - Crypto helpers: `src/server/lib/crypto.ts`
  - Write path (encrypt): OAuth callback
  - Read path (decrypt + backfill): `src/server/google/client.ts`

Environment: set `APP_ENCRYPTION_KEY` to a 32-byte key (base64, hex, or strong UTF-8 string).

## Environment Validation

- On boot, a Zod schema validates critical envs. The app fails fast if any are missing/malformed.
  - Module: `src/lib/env.ts` (imported by `middleware.ts` and server modules)
  - Required: Supabase URL + publishable key, `SUPABASE_SECRET_KEY` (prod), Google OAuth creds, `APP_ENCRYPTION_KEY`.

## Rate Limiting & Request Limits

- Global API rate limiting by IP (+ session heuristic) in middleware. Defaults: 60 req/min.
- JSON body size capped at 1 MB.
  - Middleware: `src/middleware.ts`
  - Tunables: `API_RATE_LIMIT_PER_MIN`, `API_MAX_JSON_BYTES`

## CORS & CSRF

- CORS locked to same-origin or `APP_ORIGINS` list. Credentials allowed only for permitted origins.
- CSRF protection for mutating requests using double-submit cookie with HMAC.
  - Middleware: `src/middleware.ts`
  - Client usage example: `src/app/settings/sync/page.tsx` sends `x-csrf-token` header.

## Content Security Policy (CSP)

- Minimal, conservative CSP applied at middleware:
  - `script-src 'self'`
  - `connect-src 'self' https://*.supabase.co https://*.vercel.app https://www.googleapis.com`
  - `frame-ancestors 'none'`
  - File: `src/middleware.ts`

## Method Allow-list

- Middleware rejects unexpected HTTP methods for sync endpoints with 405 and `Allow` header.
  - Paths: `/api/sync/approve/*` and `/api/sync/preview/*` → `POST` only (plus `OPTIONS`).
  - File: `src/middleware.ts`

## Input Validation (Non-chat)

- Small Zod schemas validate request bodies on sync approve/preview endpoints (strict shapes).
  - Files: `src/app/api/sync/approve/gmail/route.ts`, `src/app/api/sync/approve/calendar/route.ts`, `src/app/api/sync/preview/gmail/route.ts`, `src/app/api/sync/preview/calendar/route.ts`, `src/app/api/sync/preview/drive/route.ts`

## Error Sanitization

- Consistent error envelope via `src/server/lib/http.ts` helpers.

## RLS and Service Role Boundaries

- RLS enabled on user tables, including `public.user_integrations`. User-scoped CRUD is restricted to `auth.uid()`.
- The service-role client (`src/server/db/supabase-admin.ts`) is used only for server-side ingestion (raw events, embeddings) where RLS bypass is required. Do not use in request handlers that act on behalf of a user. Guarded helper `supaAdminGuard` enforces a table allow-list for writes.

## Change Management

- No automatic migrations. Any schema changes should be applied via Supabase SQL editor. If a schema change is required, prepare a single SQL snippet and have it reviewed and applied manually.

## Notes

- Keep helpers small and readable. Prefer incremental, auditable changes over large frameworks.
