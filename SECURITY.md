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

- Enforced in `src/middleware.ts` via the `Content-Security-Policy` response header.
- Environment-aware:
  - Production: strict, minimal surface
  - Development: relaxed for HMR and local websockets

### Directives in use

| Directive         | Purpose                                 | Production value                                                               | Development value                                                                                   | Example header fragment                      |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `script-src`      | Restrict where scripts can load from    | `'self'`                                                                       | `'self' 'unsafe-inline' 'unsafe-eval' blob:`                                                        | `script-src 'self'`                          |
| `connect-src`     | Allow XHR/fetch/websocket endpoints     | `'self' https://*.supabase.co https://*.vercel.app https://www.googleapis.com` | `'self' http://localhost:3000 ws://localhost:3000 https://*.supabase.co https://www.googleapis.com` | `connect-src 'self' https://*.supabase.co …` |
| `frame-ancestors` | Clickjacking defense (who can embed us) | `'none'`                                                                       | `'none'`                                                                                            | `frame-ancestors 'none'`                     |

Notes:

- We intentionally do not set `style-src`, `img-src`, or `default-src` at this time to avoid over-constraining Next.js dev tooling. We may lock these down further post-hardening.
- `X-Frame-Options: DENY` is also sent for legacy UA defense, alongside `frame-ancestors 'none'`.

### Effective header

- Production:

```bash
Content-Security-Policy: script-src 'self'; connect-src 'self' https://*.supabase.co https://*.vercel.app https://www.googleapis.com; frame-ancestors 'none';
```

- Development:

```bash
Content-Security-Policy: script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; connect-src 'self' http://localhost:3000 ws://localhost:3000 https://*.supabase.co https://www.googleapis.com; frame-ancestors 'none';
```

### Validation

- Curl (replace URL as needed):

```sh
curl -sI http://localhost:3000 | grep -i "^content-security-policy" || true
```

- Playwright (example assertion):

```ts
const csp = (await page.request.fetch("/", { method: "GET" }))
  .headers()
  .get("content-security-policy");
expect(csp).toContain("script-src");
expect(csp).toContain("frame-ancestors 'none'");
```

File of record: `src/middleware.ts`.

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

Prompt 2 — Routes, CTA gate, Supabase Auth (Google), public marketing/blog, protected area

Goal
Add routes using App Router with co-located components inside each route folder.

Public: /, /home, /join, /blog, /blog/[slug], /privacy, /terms, /cookies, /login.

Protected (example): /dashboard (redirects to /login if not signed in).
Wire Supabase Auth (Google OAuth) against my existing app Supabase project (shared auth schema).
Implement CTA gate logic at / that routes to /home after “Join” or “Skip”.

Important

Blog posts are MDX (Contentlayer). Do not create DB tables for posts.

Create Supabase tables only for waitlist (and optional profiles for user metadata).

1. Routes & co-location structure

Create this tree (co-locate \_components inside each route):

app
/(marketing)
page.tsx # /
\_components/CTA.tsx
\_components/useCtaRedirect.ts
home/
page.tsx # /home
\_components/Hero.tsx
\_components/Benefits.tsx
\_components/HowItWorks.tsx
join/
page.tsx # /join
\_components/WaitlistForm.tsx
\_components/actions.ts # server action
privacy/page.tsx
terms/page.tsx
cookies/page.tsx
/(content)
blog/
page.tsx # /blog
\_components/PostCard.tsx
[slug]/
page.tsx # /blog/[slug]
\_components/MDXContent.tsx
\_components/AudioPlayer.tsx
\_components/VideoEmbed.tsx
/(auth)
login/page.tsx # /login
logout/route.ts # /logout
auth/callback/route.ts # /auth/callback
/(protected)
dashboard/
page.tsx
\_components/DashboardShell.tsx

Update app/layout.tsx to wrap pages with the ThemeProvider from Prompt 1 and include a shared SiteHeader/SiteFooter if already created (or add minimal ones under app/\_components).

2. CTA gate logic (at /)
   / shows a single-CTA page (Join Waitlist).

Buttons:

Join → navigates to /join. On successful submit, set localStorage.omni_joined = "1" and redirect to /home.

Skip → sets localStorage.omni_skipped = "1" and goes to /home.

Implement a small client component on / that, on mount, checks:
// app/(marketing)/\_components/useCtaRedirect.ts
Call useCtaRedirect() inside the CTA page.

3. Supabase setup (shared app project)
   Project Name: app_omnicrm
   Pro
   Replit Secrets / .env

# Supabase (public)

SUPABASE_URL=<https://etdhqniblvwgueykywqd.supabase.co>
SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_6pVTVHbpXrCZd2ErNaK1YQ_5gJVBsd0
SUPABASE_CONNECTION_STRING="postgresql://postgres.etdhqniblvwgueykywqd:f-7.dK6i%40Uu3ky%<21@aws-0-eu-west-3.pooler.supabase.com>:6543/postgres"
import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
id: serial('id').primaryKey(),
fullName: text('full_name'),
phone: varchar('phone', { length: 256 }),
});

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

# Supabase (server-only)

# Server-only; DO NOT expose to client bundles

# Server secret key (server-only)

SUPABASE_SECRET_KEY=service_secret_xxx

lib helpers:
Server helper (lib/supabase/server.ts) using @supabase/ssr
Browser helper (lib/supabase/client.ts):

Auth routes

/login/page.tsx → Google sign-in button
/auth/callback/route.ts → exchange code for a session:
/logout/route.ts
Protected route guard: in app/(protected)/dashboard/page.tsx:
Supabase Console setup
Enable Google provider.

Use the same project that backs OmniCRM so auth is unified.

4. Waitlist form (Supabase first, Formspree fallback)

SQL — create table waitlist:

create table if not exists public.waitlist (
id uuid primary key default gen_random_uuid(),
email text not null unique,
name text,
role text,
source text,
created_at timestamptz default now()
);

Server action
app/(marketing)/join/\_components/actions.ts
Form component calls the action; on success:
localStorage.setItem("omni_joined","1")
router.push("/home")

5. Blog (public) — MDX via Contentlayer
   Keep file-based MDX (no DB tables).

contentlayer.config.ts mapping /content/posts/\*.mdx
MDX components (code blocks, callouts, etc.) in app/(content)/blog/[slug]/\_components/MDXContent.tsx

Seed posts will come in Prompt 3.
/blog/page.tsx: lists posts via Contentlayer allPosts, renders PostCard.
/blog/[slug]/page.tsx: renders MDX; if type === "podcast", show AudioPlayer; if video, VideoEmbed.

6. Additional pages (public)

Create simple GDPR-aware placeholders with last-updated date:
app/(marketing)/privacy/page.tsx
app/(marketing)/terms/page.tsx
app/(marketing)/cookies/page.tsx

Lint/typecheck pass.

Additionally add comments to all the theme colours in global.css that shows the equivalent tailwind colour and make sure all the different component stylings are commented ie this is the styling that applies to alerts, badges and xyz
