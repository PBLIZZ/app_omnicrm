# Gmail Integration - Complete Implementation Guide

**Last Updated:** 2025-10-15  
**Status:** ✅ Production Foundation

## Overview

Gmail integration with OAuth, background job processing, and raw event storage. Currently includes OAuth flow, job creation, and basic processing pipeline. Some features are implemented but not all diagnostic endpoints mentioned exist.

## Quick Links

- Architecture: Ingestion → Processing → Embeddings → Insights
- Troubleshooting: Common errors and debug endpoints
- Related: `OAUTH_GUIDE.md` (auth), `FIXES_AND_UPDATES.md` (changelog)

## Implementation Details

### OAuth

- Uses Google OAuth (gmail.readonly scope) via server routes
- Tokens stored per user in `user_integrations` with AES-256-GCM encryption
- Auto-refresh supported via integration status service

### Data Flow

1. Fetch latest Gmail messages via Gmail API
2. Store raw payloads in `raw_events` with `(user_id, provider, source_id)` uniqueness
3. Process raw events into `interactions` (subject, from, to, date, body)
4. Generate embeddings and store in `embeddings` for semantic search

### Key Endpoints

- `GET /api/google/gmail/connect` — OAuth initiation
- `GET /api/google/gmail/callback` — OAuth callback
- `GET /api/google/status` — Integration status (includes Gmail)
- `GET /api/omni-connect/dashboard` — Dashboard with Gmail previews
- `GET /api/data-intelligence/raw-events` — List raw events (including Gmail)

## Database

### Tables

- `raw_events` — raw Gmail payloads; unique `(user_id, provider, source_id)`
- `interactions` — structured messages; metadata for timeline/search
- `embeddings` — 1536-d vector for semantic search; `owner_type='interaction'`
- `user_integrations` — encrypted OAuth tokens for `provider='google'`, `service='gmail'`

### Indexes (performance)

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS raw_events_gmail_source_id_idx
  ON public.raw_events (user_id, source_id)
  WHERE provider = 'gmail';

CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_gmail_source_idx
  ON public.interactions (user_id, source_id, created_at DESC)
  WHERE source = 'gmail';
```

## Processing

### Background Job System

Gmail processing uses a job-based architecture:

1. **Sync Jobs**: `google_gmail_sync` - Fetches emails from Gmail API
2. **Normalize Jobs**: `normalize_google_email` - Processes raw events into interactions
3. **Embed Jobs**: `embed` - Generates vector embeddings
4. **Contact Jobs**: `extract_contacts` - Extracts contacts from emails

### Job Processors

- `src/server/jobs/processors/sync.ts` - Gmail sync with rate limiting
- `src/server/jobs/processors/normalize.ts` - Email normalization
- `src/server/jobs/processors/embed.ts` - Embedding generation
- `src/server/jobs/processors/extract-contacts.ts` - Contact extraction

### Gmail Sync Implementation

```typescript
// Gmail sync with incremental processing
export async function runGmailSync(job: unknown, userId: string): Promise<void> {
  // Find last synced email timestamp
  // Fetch new emails from Gmail API with rate limiting
  // Store in raw_events table
  // Process in chunks with sleep between requests
}
```

## Security

- RLS on user-scoped tables; service role performs writes
- AES-256-GCM encryption for tokens with `APP_ENCRYPTION_KEY`
- CSRF protection on mutating routes; secure cookies and short-lived state

## Troubleshooting

- OAuth redirect mismatch: confirm `NEXT_PUBLIC_APP_URL` matches Google Console
- Job processing failures: check job status via `/api/omni-connect/dashboard`
- Raw events not appearing: verify Gmail sync jobs are running
- Token refresh issues: check `google-integration.service.ts` auto-refresh logic

### Available Endpoints

- `/api/google/status` — Check Gmail connection status
- `/api/data-intelligence/raw-events?provider=gmail` — List Gmail raw events
- `/api/omni-connect/dashboard` — Dashboard with Gmail previews and job status

## Related Files

- `src/server/jobs/processors/sync.ts` — Gmail sync implementation
- `src/server/jobs/processors/normalize.ts` — Email normalization
- `src/server/jobs/processors/embed.ts` — Embedding generation
- `src/server/jobs/processors/extract-contacts.ts` — Contact extraction
- `src/server/services/omni-connect-dashboard.service.ts` — Dashboard data
- `src/app/api/google/gmail/connect/route.ts` — OAuth initiation
- `src/app/api/google/gmail/callback/route.ts` — OAuth callback

## Status & Next Steps

- ✅ OAuth flow implemented and working
- ✅ Background job system implemented
- ✅ Gmail sync processor implemented
- ✅ Raw events storage working
- 🚧 Some diagnostic endpoints mentioned don't exist
- 🚧 UI components may need updates

## Changelog

See `FIXES_AND_UPDATES.md` for dated changes including auto-refresh tracking and pipeline updates.
