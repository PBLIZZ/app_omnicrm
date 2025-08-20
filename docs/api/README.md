# API Documentation

- Endpoints reference: docs/api/contracts.md
- Contacts API expectations (frontend ↔ backend): docs/api/contacts.md
- Route authoring guide (near code): src/app/api/README.md

Testing examples:

- Unit/integration route tests under `src/app/**/route.test.ts`
- E2E flows in `e2e/*.spec.ts`

Additional notes:

- CSRF with curl: see `docs/audits/2025-08-18/api-smoke-tests.md` for a working example that uses cookies + `x-csrf-token`.
- Debug routes under `src/app/api/debug/*` are development-only and return 404 in production.

## Security & Crypto Notes

- Encryption/decryption helpers live in:
  - Node: `src/server/lib/crypto.ts`
  - Edge (Web Crypto): `src/server/lib/crypto-edge.ts`
  - Shared encodings: `src/lib/encoding.ts` (UTF-8, hex, base64url)
- AES-256-GCM string format (Node ↔ Edge compatible): `v1:<iv>:<ciphertext>:<tag>` (base64url segments)
- `APP_ENCRYPTION_KEY` accepted formats: base64url (preferred), base64, hex, or strong UTF-8 (≥ 32 bytes). See `README.md` and `SECURITY.md` for guidance.
