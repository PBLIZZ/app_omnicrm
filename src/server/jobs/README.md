# Jobs

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
