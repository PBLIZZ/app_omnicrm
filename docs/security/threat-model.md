# Threat Model (Skeleton)

Assets:

- User data (contacts, interactions)
- OAuth tokens (Google)
- AI outputs and metadata

Trust boundaries:

- Browser ↔ Next.js server
- Next.js ↔ Supabase (RLS)
- Next.js ↔ Google APIs

Key risks and mitigations:

- Token leakage → AES‑GCM encryption at rest, redaction in logs
- CSRF on mutating routes → double‑submit cookie + HMAC
- CORS abuse → allow‑list origins via `APP_ORIGINS`
- XSS → strict CSP with per‑request nonce

Follow‑ups:

- Inventory inline styles/scripts; remove and tighten CSP further
- Add Playwright assertions for CSP headers
