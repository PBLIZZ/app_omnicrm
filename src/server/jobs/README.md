# Jobs – Sync & Normalization

Purpose: keep ingestion boring and reliable under load.

- Caps & backpressure (why): Bound runtime and avoid provider rate limits.
  - Gmail: fetch ids then messages in chunks of 25 with ~200ms sleep; cap 2,000 items/run.
  - Calendar: paginate; cap 2,000 items/run; small sleep every ~100 items.
  - Per-job hard cap: ~3 minutes wall time to avoid runaway jobs.

- Backoff & retries (why): Smooth spikes and tolerate transient Google errors.
  - Runner: exponential backoff per job attempt, max attempts 5.
  - Google API: 10s per request, up to 3 retries with jitter.

- Incremental windows (why): Only ingest new data.
  - Use latest `raw_events.occurred_at` per provider (fallback 30d).

- Idempotency (why): Safe re-runs and dedupe.
  - Unique key: `(user_id, source, source_id)` on `interactions`.
  - Normalization: skip if an interaction exists for same triple.
  - After index is live, use `ON CONFLICT (user_id, source, source_id) DO NOTHING`.

- Minimal metrics (why): Debug without extra infra.
  - Log JSON per run: `itemsFetched`, `itemsInserted`, `itemsSkipped`, `durationMs`, `userId`, `batchId`, `timedOut`.

## Jobs

- Purpose: Background processing for sync, normalization, embedding, and insights.
- Key files:
  - `types.ts`: job kind and payload types
  - `enqueue.ts`: helper to insert queued jobs
  - `processors/`: handlers per job kind (gmail/calendar/normalize/embed/insight)
- Runner: `/api/jobs/runner` pulls queued jobs for the authenticated user and executes handlers.

Add a new processor:

- Define a new `JobKind` in `types.ts`
- Implement handler in `processors/<name>.ts` with `export async function run<Name>(job, userId): Promise<void>`
- Register handler in `jobs/runner/route.ts`

Notes:

- Keep handlers idempotent; prefer small batches and backoff for external APIs.
- Tag data with `batchId` when applicable for undo.
