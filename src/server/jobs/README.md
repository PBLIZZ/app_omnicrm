# Jobs – Sync & Processing Pipeline

Purpose: keep ingestion boring and reliable under load.

## Core Principles

- **Caps & backpressure**: Bound runtime and avoid provider rate limits.
  - Gmail: fetch ids then messages in chunks of 50 with ~200ms sleep; cap 2,000 items/run.
  - Calendar: paginate; cap 2,000 items/run; small sleep every ~25 items.
  - Per-job hard cap: ~10 minutes wall time to avoid runaway jobs.

- **Backoff & retries**: Smooth spikes and tolerate transient Google errors.
  - Runner: exponential backoff per job attempt, max attempts 5.
  - Google API: 10s per request, up to 3 retries with jitter.

- **Incremental windows**: Only ingest new data.
  - Use latest `raw_events.occurred_at` per provider (fallback 30d).

- **Idempotency**: Safe re-runs and dedupe.
  - Unique key: `(user_id, source, source_id)` on `interactions`.
  - Uses `drizzleAdminGuard.upsert()` with `onConflictDoNothing()`.

- **Minimal metrics**: Debug without extra infra.
  - Log JSON per run: `itemsFetched`, `itemsInserted`, `itemsSkipped`, `durationMs`, `userId`, `batchId`, `timedOut`.

## Architecture

- **Purpose**: Background processing for sync, normalization, contact extraction, embedding, timeline generation, and insights.
- **Key files**:
  - `types.ts`: job kind and payload types
  - `config.ts`: timing, batch sizes, and processing limits
  - `enqueue.ts`: helper to insert queued jobs
  - `runner.ts`: new job runner (replaces orchestrator)
  - `dispatcher.ts`: job dispatch logic
  - `processors/`: handlers per job kind

## Current Processors

### Data Ingestion

- **`sync.ts`**: Gmail and Calendar data fetching with rate limiting and chunking
- **`normalize.ts`**: Enhanced Gmail/Calendar normalization with rich metadata extraction

### Contact Management

- **`extract-contacts.ts`**: Contact resolution and identity linking from interactions

### Content Processing

- **`embed.ts`**: Vector embeddings generation for semantic search
- **`timeline-writer.ts`**: Timeline event creation from interactions
- **`insight.ts`**: AI-powered insights and analysis

### Utilities

- **`recent-interactions-processor.ts`**: Recent activity processing

## Enhanced Features

### Gmail Normalization

- Rich metadata extraction (from/to emails, thread IDs, labels)
- Proper email parsing from "Name \<email\>" format
- Outbound/inbound message detection
- Base64url body text decoding

### Contact Resolution

- Candidate identity extraction from email headers
- Fuzzy matching and deduplication
- Automatic contact linking to interactions
- Identity storage and management

### Timeline Generation

- Automatic timeline events from interactions
- Type-specific event mapping and formatting
- Rich event data extraction
- Bulk processing capabilities

## Adding a New Processor

1. **Define job type** in `types.ts`:

   ```typescript
   export type JobKind = "google_gmail_sync" | "normalize_google_email" | "extract_contacts" | "your_new_job";
   ```

2. **Create processor** in `processors/your-processor.ts`:

   ```typescript
   export async function runYourProcessor(job: JobRecord): Promise<void> {
     // Implementation
   }
   ```

3. **Register in dispatcher** (`dispatcher.ts`):

   ```typescript
   case "your_new_job":
     return await runYourProcessor(job);
   ```

4. **Add configuration** in `config.ts` if needed for timing/limits.

## Best Practices

- **Idempotency**: All processors handle re-runs safely
- **Batch processing**: Use configurable limits from `config.ts`
- **Error handling**: Log errors with context, continue processing
- **Type safety**: Use proper TypeScript types and guards
- **Database operations**: Use `drizzleAdminGuard` for admin operations
- **Logging**: Structured JSON logs with operation context
