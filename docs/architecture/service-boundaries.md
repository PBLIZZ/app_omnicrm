# Service Boundaries & Data Flow

This page explains where service-role is used, how RLS works, and the end-to-end data flow.

## RLS and Clients

- Publishable/Anon client: honors RLS; used for user-facing operations.
- Service-role client: `src/server/db/supabase-admin.ts` and `src/server/supabase.ts` (`supabaseServerAdmin`). Use only for system backfills and ingestion tasks where RLS must be bypassed. Never in user-request handlers.
- Drizzle (DATABASE_URL): used for app’s own Postgres access with row ownership columns. RLS is enforced at Supabase edge; application enforces `user_id` scoping in queries.

## Which routes use service-role (and why)

- None of the Next.js API routes directly use the service-role client for user requests. Service-role is reserved for:
  - Background ingestion and backfills (raw events, embeddings, insights)
  - Admin utilities (not exposed via public routes)

Reference files:

- `src/server/db/supabase-admin.ts` — service-role client definition
- `src/server/supabase.ts` — guarded admin client export for rare cases

## How RLS works here

- Supabase RLS policies isolate rows by `user_id = auth.uid()` for user-owned tables.
- App code always filters by authenticated user id when querying via Drizzle.
- OAuth tokens are encrypted at rest; decryption occurs server-side only for the authenticated user.

## One-page data flow

1. OAuth (Google)
   - `/api/google/oauth` creates signed `state` and redirects to Google.
   - `/api/google/oauth/callback` validates `state`, exchanges code for tokens, stores encrypted tokens in `user_integrations`.

2. Preview
   - `/api/sync/preview/gmail` and `/api/sync/preview/calendar` use Google APIs with the user’s tokens to compute a non-destructive preview. Results are logged to `sync_audit`.

3. Approve
   - `/api/sync/approve/gmail` and `/api/sync/approve/calendar` enqueue a sync job with a `batchId` and log `approve` to `sync_audit`.

4. Jobs
   - `/api/jobs/runner` pulls `jobs` for the user and dispatches to processors (gmail/calendar). Processors fetch external data and insert into `raw_events` (scoped by `user_id`, tagged with `batch_id`).

5. raw_events → interactions
   - Normalization jobs convert `raw_events` into `interactions` for querying and UI.

6. Undo
   - `/api/sync/undo` deletes `raw_events` and `interactions` by `batchId` and marks jobs done.

Security notes:

- CSRF protection is enforced for mutating endpoints via middleware.
- Rate limiting and basic security headers are applied globally in `src/middleware.ts`.
