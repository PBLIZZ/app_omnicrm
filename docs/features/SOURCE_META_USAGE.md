# Source Metadata (`sourceMeta`) Usage Guide

## Overview

The `sourceMeta` JSONB column appears in both the `raw_events` and `interactions` tables, but serves slightly different purposes in each:

### Table Purposes

- **raw_events**: Stores raw, unprocessed payloads and metadata directly ingested from external sources (Gmail, Google Calendar, etc.). This table acts as the initial landing zone for all incoming data, preserving the exact structure returned by provider APIs. Use `raw_events` for debugging ingestion issues, auditing raw source data, or when you need the complete, unaltered API response (e.g., full Gmail message headers or Calendar attachments details).
- **interactions**: Stores normalized, aggregated interaction records derived from processed `raw_events`. This table contains cleaned, business-ready data with `sourceMeta` limited to essential fields for UI display and querying (e.g., email thread ID, event start/end times). Interactions are the primary table for application logic, reporting, and user-facing features. Use `interactions` for most queries involving contact history, timelines, or analytics.

### Data Flow

Interactions are derived from raw_events through the ingestion pipeline:

1. Raw data is ingested into `raw_events` via sync jobs (e.g., `google_gmail_sync`, `google_calendar_sync`).
2. The `normalize` processor transforms raw payloads: extracts key fields, applies business rules, enriches with contact matching, and populates `interactions` while copying relevant `sourceMeta`.
3. Background jobs like `extract-contacts` may further process interactions for additional features (e.g., embedding generation).

This flow ensures raw_events remains an immutable audit trail, while interactions provides optimized, query-friendly data. Developers should rarely need to query raw_events directly unless investigating sync discrepancies or implementing custom processors.

The `sourceMeta` JSONB column in both tables contains **structured, source-specific metadata** that varies based on the source (Gmail, Google Calendar, etc.).

All schemas are defined in `src/server/db/business-schemas/raw-events-payloads.ts` - the single source of truth for JSONB structures.

---

## Data Structure

### **Gmail Source Metadata**

```typescript
{
  from: "sender@example.com",
  to: ["recipient1@example.com", "recipient2@example.com"],
  cc: ["cc@example.com"],
  bcc: ["bcc@example.com"],
  subject: "Email subject",
  threadId: "thread_abc123",
  messageId: "msg_xyz789",
  labelIds: ["INBOX", "IMPORTANT"],
  fetchedAt: "2025-10-07T12:00:00Z",
  matchedQuery: "newer_than:30d",
  // Optional extended fields
  labels: ["INBOX", "IMPORTANT"],
  queries: ["newer_than:30d"],
  categories: ["primary"],
  importance: "high",
  isRead: true,
  isStarred: false,
  isImportant: true,
  isSpam: false,
  isTrash: false,
  isSent: false,
  isDraft: false,
  date: "2025-10-07T12:00:00Z",
  size: 12345
}
```

### **Calendar Source Metadata**

```typescript
{
  startTime: "2025-10-07T14:00:00Z",
  endTime: "2025-10-07T15:00:00Z",
  isAllDay: false,
  eventStatus: "confirmed",
  location: "Conference Room A",
  timezone: "America/New_York",
  visibility: "default",
  googleUpdated: "2025-10-07T12:00:00Z",
  lastSyncDate: "2025-10-07T12:00:00Z",
  calendarId: "calendar_456",
  eventId: "event_123",
  recurringEventId: "recurring_789",
  attendees: [
    {
      email: "attendee@example.com",
      responseStatus: "accepted"
    }
  ]
}
```

---

## Type-Safe Access Patterns

### **Recommended: Using Zod Schemas**

```typescript
import { 
  GmailSourceMetaSchema, 
  CalendarSourceMetaSchema,
  type GmailSourceMeta,
  type CalendarSourceMeta 
} from "@/server/db/business-schemas";

// Validate and parse Gmail metadata
const rawEvent = await db.query.rawEvents.findFirst({
  where: eq(rawEvents.id, eventId)
});

if (rawEvent.provider === "gmail") {
  const result = GmailSourceMetaSchema.safeParse(rawEvent.sourceMeta);
  
  if (result.success) {
    const meta: GmailSourceMeta = result.data;
    console.log("Thread ID:", meta.threadId);
    console.log("From:", meta.from);
    console.log("Recipients:", meta.to);
  }
}

// Validate and parse Calendar metadata
if (rawEvent.provider === "calendar") {
  const result = CalendarSourceMetaSchema.safeParse(rawEvent.sourceMeta);
  
  if (result.success) {
    const meta: CalendarSourceMeta = result.data;
    console.log("Start:", meta.startTime);
    console.log("End:", meta.endTime);
    console.log("Location:", meta.location);
    console.log("Attendees:", meta.attendees?.map(a => a.email));
  }
}
```

### **Safe Property Access**

```typescript
// Helper function for safe access
function getMetaProperty<T = unknown>(
  sourceMeta: unknown, 
  key: string
): T | undefined {
  if (
    sourceMeta &&
    typeof sourceMeta === "object" &&
    sourceMeta !== null
  ) {
    return (sourceMeta as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

// Usage
const threadId = getMetaProperty<string>(rawEvent.sourceMeta, "threadId");
const startTime = getMetaProperty<string>(rawEvent.sourceMeta, "startTime");
const attendees = getMetaProperty<Array<{email: string}>>(
  rawEvent.sourceMeta, 
  "attendees"
);
```

---

## Common Use Cases

### **1. Extracting Contact Identities**

```typescript
// From Gmail
if (rawEvent.provider === "gmail") {
  const result = GmailSourceMetaSchema.safeParse(rawEvent.sourceMeta);
  
  if (result.success) {
    const meta = result.data;
    const identities = [];
    if (meta.from) identities.push({ kind: "email", value: meta.from });
    if (meta.to) meta.to.forEach(email => identities.push({ kind: "email", value: email }));
    if (meta.cc) meta.cc.forEach(email => identities.push({ kind: "email", value: email }));
  }
}

// From Calendar
if (rawEvent.provider === "calendar") {
  const result = CalendarSourceMetaSchema.safeParse(rawEvent.sourceMeta);
  
  if (result.success) {
    const meta = result.data;
    const identities = [];
    if (meta.attendees) {
      meta.attendees.forEach(attendee => {
        identities.push({ kind: "email", value: attendee.email });
      });
    }
  }
}
```

### **2. Grouping Email Threads**

```typescript
// Group raw events by Gmail thread
const result = GmailSourceMetaSchema.safeParse(rawEvent.sourceMeta);
if (result.success && result.data.threadId) {
  const threadId = result.data.threadId;

  const threadEvents = await db.query.rawEvents.findMany({
    where: and(
      eq(rawEvents.userId, userId),
      eq(rawEvents.provider, "gmail"),
      sql`${rawEvents.sourceMeta}->>'threadId' = ${threadId}`
    )
  });
}
```

### **3. Filtering by Event Time**

```typescript
// Find calendar events in a date range
const eventsInRange = await db.query.rawEvents.findMany({
  where: and(
    eq(rawEvents.userId, userId),
    eq(rawEvents.provider, "calendar"),
    sql`(${rawEvents.sourceMeta}->>'startTime')::timestamptz >= ${startDate}`,
    sql`(${rawEvents.sourceMeta}->>'endTime')::timestamptz <= ${endDate}`
  )
});
```

**Performance Note**: JSONB date-range queries like the above can be slow on large datasets because they require scanning and casting JSONB values at query time. To optimize:

- **Functional B-tree Indexes**: Create indexes on casted JSONB fields for frequent queries, e.g.:

  ```sql
  CREATE INDEX CONCURRENTLY idx_raw_events_start_time 
  ON raw_events ((sourceMeta->>'startTime')::timestamptz)
  WHERE provider = 'calendar';
  ```

  This indexes only calendar events' startTime as timestamp.

- **GIN Indexes**: For broader JSONB lookups (e.g., existence of keys or array contains), use GIN:

  ```sql
  CREATE INDEX CONCURRENTLY idx_raw_events_source_meta_gin 
  ON raw_events USING GIN (sourceMeta);
  ```

- **Denormalization**: For high-frequency queries, consider copying critical fields (e.g., startTime, endTime) to dedicated TIMESTAMP columns in raw_events or interactions to avoid JSONB overhead entirely.

See PostgreSQL JSON/JSONB documentation for more details: <https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING>

---

## API Validation

When creating raw events via API, validate `sourceMeta` based on provider type:

```typescript
// In your API route
import { 
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema 
} from "@/server/db/business-schemas";

// Validate Gmail metadata
if (provider === "gmail" && sourceMeta) {
  const validatedMeta = GmailSourceMetaSchema.parse(sourceMeta);
  // Use validatedMeta
}

// Validate Calendar metadata
if (provider === "calendar" && sourceMeta) {
  const validatedMeta = CalendarSourceMetaSchema.parse(sourceMeta);
  // Use validatedMeta
}
```

---

## Database Queries

### **PostgreSQL JSONB Operators**

```sql
-- Access nested field
SELECT source_meta->>'threadId' as thread_id FROM raw_events;

-- Filter by nested field
SELECT * FROM raw_events 
WHERE source_meta->>'threadId' = 'thread_123';

-- Check if field exists
SELECT * FROM raw_events 
WHERE source_meta ? 'startTime';

-- Array contains
SELECT * FROM raw_events 
WHERE source_meta->'labelIds' ? 'IMPORTANT';
```

### **Drizzle ORM**

```typescript
import { sql } from "drizzle-orm";

// Access nested field
const results = await db
  .select({
    id: rawEvents.id,
    threadId: sql<string>`${rawEvents.sourceMeta}->>'threadId'`
  })
  .from(rawEvents);

// Filter by nested field
const filtered = await db
  .select()
  .from(rawEvents)
  .where(sql`${rawEvents.sourceMeta}->>'threadId' = 'thread_123'`);
```

---

## Best Practices

1. **Always validate provider type before accessing metadata**

   ```typescript
   if (rawEvent.provider === "gmail") {
     const result = GmailSourceMetaSchema.safeParse(rawEvent.sourceMeta);
     if (result.success) {
       // Safe to access Gmail-specific fields
     }
   }
   ```

2. **Use optional chaining for nested access**

   ```typescript
   const email = meta.attendees?.[0]?.email;
   ```

3. **Provide defaults for optional fields**

   ```typescript
   const isAllDay = meta.isAllDay ?? false;
   const attendees = meta.attendees ?? [];
   ```

4. **Use Zod schemas for validation in API routes**

   ```typescript
   const result = GmailSourceMetaSchema.safeParse(sourceMeta);
   if (!result.success) {
     throw new Error("Invalid source metadata");
   }
   ```

5. **Document expected structure in comments**

   ```typescript
   // sourceMeta structure for gmail:
   // { threadId, from, to, cc, subject, messageId, labelIds }
   ```

---

## Schema Updates

If you need to add new fields to `sourceMeta`:

1. Update the schema in `src/server/db/business-schemas/raw-events-payloads.ts`
2. No database migration needed (JSONB is schemaless)
3. Update this documentation
4. Update any validation or type guards that use the schema

---

## Related Files

- **Schema Definition**: `src/server/db/business-schemas/raw-events-payloads.ts`
- **Interactions Schema**: `src/server/db/business-schemas/interactions.ts`
- **Usage Examples**:
  - `src/server/jobs/processors/normalize.ts`
  - `src/server/jobs/processors/sync.ts`
  - `src/server/jobs/processors/extract-contacts.ts`
