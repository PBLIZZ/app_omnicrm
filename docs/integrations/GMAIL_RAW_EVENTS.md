# Gmail Raw Events API — Status Update (2025-08-24 18:38 CEST)

## Current Status

### Feature implemented

- GET /api/google/gmail/raw-events
- Route: src/app/api/google/gmail/raw-events/route.ts
- Service: src/server/services/raw-events.service.ts
- Repository: packages/repo/src/raw-events.repo.ts
- Schemas/validation: src/server/schemas/raw-events.ts
- HTTP helpers: src/server/lib/http.ts (sanitized errors, ok/err envelopes)

### Capabilities

- auth, strict Zod query validation, filtering, pagination, sorting, total count, typed responses.

### DB

Drizzle ORM; queries optimized with existing indexes on raw_events.

### Security & Isolation

- RLS: Confirmed active on raw_events with user_id = auth.uid() for SELECTs.
- Writes: Done with service role outside this endpoint; no public insert/update/delete policies.
- Auth: API uses getServerUserId() and user-scoped queries + RLS double lock.

### Design Decisions

- No backwards-compat is required:Investigate the use of src/server/db/enhanced-client.ts for this feature as I would prefer not to undo the hard work already completed. What does this mean for the existing simpler version of the file? Are we duplicating logic? Can we deprecate the simpler version?

## Testing Status

Full suite: 22 passing, 9 failing (failures not due to this feature) Report on the failing tests so i can get a better idea of what needs to be fixed.

### Known issues

Env validation failures (missing Google redirect URIs) in
src/lib/env.ts Is this a bug in the test suite? The redirect uri for gmail was set up and working, can we use that?

DB connection attempts in tests; requires mocking pg/drizzle for unit tests.
Some API route tests expect specific envelopes/status.

### Environment Variables

Must be set (including tests):
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
SUPABASE_SECRET_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_GMAIL_REDIRECT_URI (valid URL)
GOOGLE_CALENDAR_REDIRECT_URI (valid URL) This key should not be necessary for the gmail Raw Event API feature. We are trying to get the gmial connection to ingest emails, process them, filter them, process the filtered ones, structure them, embed them and then have an llm query the embedded data and return a value for insights or timeline or interactions.

.env.local.example
lists required keys;
src/lib/env.ts
enforces strict URL validation.

## Performance

- Indexes verified for raw_events on: user_id, provider, occurred_at, batch_id, source_id (supabase/sql/15_critical_performance_indexes.sql).

### Outstanding Tasks (when ready)

Tests:

- Unit tests for listRawEvents filtering/sorting/pagination/total.
- Integration tests for the API route (auth, validation, success).
- Fix env setup in
  vitest.setup.ts
  (add valid redirect URIs).
  Mock pg/drizzle for DB-dependent tests to avoid real connections.

### Docs

Brief API docs for query parameters and response envelope.

### Risks/Notes

- Missing envs in CI will cause Zod validation failures.
- Real DB connections in tests will intermittently fail without proper mocking.

### Handover Readiness

- Implementation complete and consistent with existing patterns (contacts API).
- Security posture confirmed (RLS + sanitized error responses).
- Ready for test hardening and documentation.
