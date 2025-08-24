# Gmail Sync: Manual Ingestion Flow

This guide documents the Gmail manual ingestion flow used by the `GmailSyncStatusPanel` and the background job processors.

## Feature flags

- `FEATURE_GOOGLE_GMAIL_RO=1` must be enabled to use Gmail ingestion.

## Prerequisites

- User must complete Google OAuth and have a valid token in `user_integrations` under either `service = "unified"` (preferred) or `service = "gmail"`.

## Endpoints

1) Start Gmail sync

- Method: POST
- Path: `/api/sync/approve/gmail`
- Auth: required, CSRF required
- Response: `{ ok: true, data: { batchId: string } }`
- Errors: 404 `{ ok: false, error: "not_found" }`, 401 Unauthorized

2) Trigger the job runner

- Method: POST
- Path: `/api/jobs/runner`
- Auth: required, CSRF required
- Response: `{ ok: true, data: { message: string, runner: "simple" } }`
- Errors: 401 Unauthorized, 429 Rate Limited (includes `Retry-After` header)

3) Check aggregated sync status

- Method: GET
- Path: `/api/settings/sync/status`
- Auth: required
- Response:
```json
{
  "ok": true,
  "data": {
    "googleConnected": true,
    "serviceTokens": {
      "google": true,
      "gmail": true,
      "calendar": false,
      "unified": true
    },
    "flags": { "gmail": true, "calendar": true },
    "lastSync": { "gmail": "2025-08-23T12:34:56.000Z", "calendar": null },
    "lastBatchId": "<uuid>|null",
    "grantedScopes": { "gmail": ["…"], "calendar": null },
    "jobs": { "queued": 0, "done": 12, "error": 0 },
    "embedJobs": { "queued": 0, "done": 2, "error": 0 }
  }
}
```

## Jobs involved

- `google_gmail_sync` — fetches Gmail messages into `raw_events` (capped per run)
- `normalize_google_email` — transforms raw Gmail to internal interactions
- `extract_contacts` — derives contacts from normalized interactions
- `embed` — embeds content for AI analysis

Jobs are processed by the simple job runner and scheduled sequentially per batch.

## Frontend polling model

`GmailSyncStatusPanel` polls for job updates and infers phases based on job kinds and statuses:

- syncing_gmail: `google_gmail_sync` running (may report `totalEmails`/`processedEmails`)
- processing_data: `google_gmail_sync` done and `normalize_google_email` running
- structuring_data: `normalize_google_email` done and `extract_contacts` running
- embedding_data: `extract_contacts` done and `embed` running
- completed: `embed` completed
- error: any job above errored

## Notes

- The status endpoint reports `serviceTokens.unified` for the unified Google token.
- Gmail and Calendar availability are gated by `flags.gmail` and `flags.calendar`.