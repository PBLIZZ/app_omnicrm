# Security Overview

- High‑level controls: SECURITY.md (root)
- Recent changes: docs/security/changelogs/
- Middleware and headers: see `src/middleware.ts`

## CSRF Protection

- Enforced by `src/middleware.ts` on mutating methods (POST/PUT/PATCH/DELETE).
- Requires double-submit cookie strategy: `csrf` cookie must match `x-csrf-token` header and pass signature validation.
- For local curl testing, see `docs/audits/2025-08-18/api-smoke-tests.md` for a working example.

## Debug Routes

- Debug endpoints under `src/app/api/debug/*` are available only in non-production environments and return 404 in production.
- They avoid sensitive data: env debug returns only whitelisted keys (masked), user debug returns cookie names, not values.
