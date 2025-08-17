### Security Changelog — 2025-08-13

This document summarizes the security hardening completed on 2025-08-13 across CSP, CSRF, Supabase clients, logging, and CI/build behavior. The goal was to eliminate build-time secret requirements, enforce a strict Content Security Policy with nonces, and keep CSRF protections intact while maintaining app stability.

#### Content Security Policy (CSP)

- Enforced nonce-based CSP in production for scripts and styles:
  - script-src: 'self' 'nonce-<nonce>'
  - script-src-elem: 'self' 'nonce-<nonce>'
  - style-src: 'self'
  - style-src-elem: 'self' 'nonce-<nonce>'
  - style-src-attr: 'unsafe-inline' (temporary compatibility; see Follow-ups)
- Removed 'strict-dynamic' and 'unsafe-inline' for scripts in production; no inline script execution without a nonce.
- Middleware now generates a per-request nonce and forwards it via headers ('x-csp-nonce', 'x-nextjs-nonce').
- Root layout reads the nonce and:
  - Sets window.**webpack_nonce** for Webpack chunk loading.
  - Nonces any existing <style> tags and auto-nonces future style elements (client-side), preventing style CSP violations from libraries that inject styles at runtime.
- Development-mode allowances (do not apply to prod):
  - Scripts: 'unsafe-eval' allowed for Next.js HMR/react-refresh.
  - Styles: no nonce requirement for style elements to avoid HMR/style injection conflicts.

Files impacted:

- src/middleware.ts
- src/app/layout.tsx

Risk/Impact:

- Inline scripts remain blocked unless they carry the nonce. Host-based allowlisting is kept minimal.
- style-src-attr 'unsafe-inline' is permitted in production to avoid breaking framework and library style attributes. This does not allow script execution and can be revisited after an audit of inline style usage.

Follow-ups:

- Audit components for inline style attributes and remove where possible; once complete, change style-src-attr to 'none'.
- Add Playwright checks asserting CSP headers and successful page hydration.

#### CSRF Protections

- Existing protections retained; no relaxation:
  - Double-submit cookie issuance for safe requests (csrf + csrf_sig) in middleware.
  - Enforcement for unsafe methods (POST/PUT/PATCH/DELETE) with HMAC verification on the signed token.
  - CORS and rate-limit logic unaffected by CSP changes.

Files referenced:

- src/middleware.ts

#### Supabase Clients (Least-Privilege and Build Safety)

- Service-role (admin) client hardening:
  - Initialize only when both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are present and NODE_ENV !== 'test'.
  - Guarded allow-list of tables for writes: raw_events, interactions, ai_insights, embeddings.
  - In tests, admin helpers no-op and return empty results.
  - If admin client unavailable at runtime, guarded helpers warn and throw 'admin_client_unavailable' instead of failing at import time.

  File: src/server/db/supabase-admin.ts

- RLS (publishable) server client usage:
  - Switched server-side auth flows to use the publishable (anon) key instead of the service-role secret.
  - Avoided importing env validation at module load; read process.env lazily in request handlers.

  Files:
  - src/server/auth/user.ts
  - src/app/auth/signin/google/route.ts
  - src/server/supabase.ts

#### Logging and Build-Time Behavior

- Logging initialization no longer imports full env validation at module load; uses process.env['NODE_ENV'] to set levels/streams.

  File: src/server/log.ts

- Eliminated build-time secret requirements that previously broke Next.js “collect page data”:
  - Deferring admin client and Supabase SSR client initialization until runtime.
  - This ensures CI builds do not require SUPABASE_SECRET_KEY or other secrets present at compile time.

#### Test/CI Status

- Unit tests, integration tests, and Playwright E2E all pass locally and in CI after the changes.
- Verified that production and preview deployments load with the new CSP and perform OAuth redirects correctly.

#### Summary of Security Posture Changes

- Strict, nonce-based CSP in production for scripts and styles.
- Service-role usage reduced to controlled, allow-listed writes and deferred initialization.
- RLS-aware clients use publishable key paths; no exposure of service-role to user-facing flows.
- CSRF protections preserved; CORS and rate limits unchanged.
- Build pipeline decoupled from secrets; fewer opportunities for secret leakage and build failures.
