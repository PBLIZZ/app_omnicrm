# OmniCRM API Smoke Test — 2025-08-18

Environment: development (local)
Time: 2025-08-18

## Summary

- Most GET routes respond as expected.
- POST routes protected by CSRF rejected curl requests without a token (`{"error":"missing_csrf"}`), which is expected.
- Misused HTTP methods return 405 as expected.
- Invalid path parameter for `/api/contacts/[id]` surfaced a DB UUID parse error (should be handled as 400 — see Next Steps).
- Debug routes are available in dev only and return non-sensitive metadata.

## Results

- Health `GET /api/health` → 200 OK
- DB Ping `GET /api/db-ping` → 200 OK
- Chat `GET /api/chat` → 405 Method Not Allowed (expected; use POST)
- Chat `POST /api/chat` (curl without CSRF) → `{ "error": "missing_csrf" }` (expected)
- Contacts `GET /api/contacts?page=1&pageSize=10` → 200 OK with items
- Contacts `POST /api/contacts` (curl without CSRF) → `{ "error": "missing_csrf" }` (expected)
- Contact by ID `GET /api/contacts/{id}` with literal `{id}` → 500 invalid UUID (expected given bad input; should return 400)
- Contacts bulk delete `GET /api/contacts/bulk-delete` → 405 (expected; should be POST)
- Storage upload URL `GET /api/storage/upload-url` → 405 (expected; should be POST)
- Storage file URL `GET /api/storage/file-url?filePath=...` → 500 object not found (expected if file doesn’t exist)
- Debug env `GET /api/debug/env` → 200 OK (dev-only; returns non-sensitive subset)
- Debug user `GET /api/debug/user` → 200 OK (dev-only; returns cookie names, not values)

## Notes and Guidance

- CSRF: POSTing from curl requires sending the `csrf` token header and cookies. Browser-based requests already include these. For curl testing, copy `csrf` and `csrf_sig` cookies from DevTools and send:

  ```bash
  curl -s http://localhost:3000/api/contacts \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: <csrf-cookie-value>" \
    -H "Cookie: csrf=<csrf-cookie-value>; csrf_sig=<csrf-sig-cookie-value>" \
    -d '{"displayName":"Test","primaryEmail":"t@example.com","source":"manual"}'
  ```

- Contacts by ID: Replace `{id}` with a valid UUID from the list endpoint.
- Storage: To obtain a file URL, first request a signed upload URL via `POST /api/storage/upload-url`, upload the file, then call `GET /api/storage/file-url` with the resulting path.

## Security Review

- Debug routes (dev-only) returned:
  - `env`: public/publishable configuration values only.
  - `user`: cookie names and counts only; no cookie values or tokens.
- Server logs may include a user UUID in error traces (e.g. invalid UUID on `{id}`); acceptable in dev logs but should not leak to clients in production builds.

## Next Steps

- Validate `id` param on `/api/contacts/[id]` and return 400 on invalid UUID before DB query.
- Add a short “How to send CSRF in curl” snippet to testing docs (or a dev bypass flag) to simplify local API testing.
- Re-verify that debug routes are disabled in production and continue to avoid returning any secret values.
