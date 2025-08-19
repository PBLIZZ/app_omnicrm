# API Contracts

Short, copy-pasteable reference for current endpoints. Responses use a consistent envelope:

- Success: `{ ok: true, data: <T> }`
- Error: `{ ok: false, error: string, details?: object | null }`

Unless stated, all endpoints require an authenticated Supabase session cookie and CSRF header for mutating requests.

## Health

- Method: GET
- Path: `/api/health`
- Auth: none
- Request: none
- Response: `{ ok: true, data: { ts: string, db?: boolean } }`
- Errors: none

## DB Ping

- Method: GET
- Path: `/api/db-ping`
- Auth: none
- Request: none
- Response: `{ ok: true, data: {} }`
- Errors: `{ ok: false, error: "db_error", details: null }` with 500 on DB error

## Chat

- Method: POST
- Path: `/api/chat`
- Auth: required
- Request: `{ prompt: string }`
- Response: `{ ok: true, data: { text: string, creditsLeft: number } }`
- Errors:
  - 400 `{ ok: false, error: "invalid_body" }`
  - 401 `{ ok: false, error: "unauthorized" }`
  - 402/429 `{ ok: false, error: "rate_limited_*" }`

Notes:

- In dev/test when `OPENROUTER_API_KEY` is not set, the service returns a safe fallback response (no provider call, `creditsLeft = -1`).

## Google OAuth Start

- Method: GET
- Path: `/api/google/oauth?scope=gmail|calendar`
- Auth: required
- Request: query `scope`
- Response: 302 redirect to Google; sets `gauth` cookie (nonce+sig)
- Errors:
  - 400 `{ ok: false, error: "invalid_scope" }`
  - 401 `{ ok: false, error: "Unauthorized" }`

## Google OAuth Callback

- Method: GET
- Path: `/api/google/oauth/callback`
- Auth: required
- Request: query `code`, `state`
- Response: 302 redirect to `/settings/sync?connected=google`; clears `gauth`
- Errors:
  - 400 `{ ok: false, error: "missing_code_or_state" | "invalid_state" }`
  - 401 `{ ok: false, error: "Unauthorized" }`

## Settings: Sync Preferences

- Method: GET
- Path: `/api/settings/sync/prefs`
- Auth: required
- Response: `{ ok: true, data: { gmailQuery: string, gmailLabelIncludes: string[], gmailLabelExcludes: string[], calendarIncludeOrganizerSelf: "true"|"false", calendarIncludePrivate: "true"|"false", calendarTimeWindowDays: number, driveIngestionMode: "none"|"basic", driveFolderIds: string[] } }`
- Errors: 401 `{ ok: false, error: "Unauthorized" }`

- Method: PUT
- Path: `/api/settings/sync/prefs`
- Auth: required, CSRF required
- Request: Partial of the prefs object above
- Response: `{ ok: true, data: {} }`
- Errors: 401 `{ ok: false, error: "Unauthorized" }`

## Settings: Sync Status

- Method: GET
- Path: `/api/settings/sync/status`
- Auth: required
- Response: `{ ok: true, data: { googleConnected: boolean, flags: { gmail: boolean, calendar: boolean }, lastSync: { gmail: string|null, calendar: string|null }, lastBatchId: string|null, grantedScopes: { gmail: string[]|null, calendar: string[]|null }, jobs: { queued: number, done: number, error: number } } }`
- Errors: 401 `{ ok: false, error: "Unauthorized" }`

## Sync: Preview Gmail

- Method: POST
- Path: `/api/sync/preview/gmail`
- Auth: required, CSRF required
- Feature flag: `FEATURE_GOOGLE_GMAIL_RO=1`
- Response: `{ ok: true, data: { countByLabel: Record<string, number>, sampleSubjects: string[] } }`
- Errors:
  - 404 `{ ok: false, error: "not_found" }`
  - 401/500 `{ ok: false, error: "preview_failed" | "Unauthorized" }`

## Sync: Preview Calendar

- Method: POST
- Path: `/api/sync/preview/calendar`
- Auth: required, CSRF required
- Feature flag: `FEATURE_GOOGLE_CALENDAR_RO=1`
- Response: `{ ok: true, data: { count: number, sampleTitles: string[] } }`
- Errors:
  - 404 `{ ok: false, error: "not_found" }`
  - 401/500 `{ ok: false, error: "preview_failed" | "Unauthorized" }`

## Sync: Preview Drive

- Method: POST
- Path: `/api/sync/preview/drive`
- Auth: required, CSRF required
- Feature flag: `FEATURE_GOOGLE_DRIVE=1`
- Response: `{ ok: true, data: { count: number, sampleFilenames: string[] } }` (stub)
- Errors: 404 `{ ok: false, error: "drive_disabled" }`

## Sync: Approve Gmail

- Method: POST
- Path: `/api/sync/approve/gmail`
- Auth: required, CSRF required
- Response: `{ ok: true, data: { batchId: string } }`
- Errors: 404 `{ ok: false, error: "not_found" }`, 401 Unauthorized

## Sync: Approve Calendar

- Method: POST
- Path: `/api/sync/approve/calendar`
- Auth: required, CSRF required
- Response: `{ ok: true, data: { batchId: string } }`
- Errors: 404 `{ ok: false, error: "not_found" }`, 401 Unauthorized

## Sync: Undo Batch

- Method: POST
- Path: `/api/sync/undo`
- Auth: required, CSRF required
- Request: `{ batchId: string }`
- Response: `{ ok: true, data: { undone: string } }`
- Errors: 400 `{ ok: false, error: "missing_batchId" }`, 401 Unauthorized

## Jobs: Runner

- Method: POST
- Path: `/api/jobs/runner`
- Auth: required, CSRF required
- Response: `{ ok: true, data: { processed: number } }`
- Errors: 401 Unauthorized

## Error catalog

Canonical error strings used across the API. Prefer these for consistency:

- unauthorized — authentication required or invalid session
- invalid_body — request body failed validation
- not_found — feature flag disabled or resource missing
- preview_failed — upstream/provider error during preview
- approve_failed — failed to enqueue or validate approval
- rate_limited — too many requests
- payload_too_large — request exceeded size limit
- missing_csrf / invalid_csrf — CSRF token issues
