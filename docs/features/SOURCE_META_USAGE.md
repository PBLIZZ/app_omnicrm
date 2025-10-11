# Source Metadata (`sourceMeta`) Usage Guide

## Overview

The `sourceMeta` JSONB column in the `interactions` table contains **structured, source-specific metadata** that varies based on the interaction source (Gmail, Google Calendar, etc.).

---

## Data Structure

### **Gmail Interactions**

```typescript
{
  from: "sender@example.com",
  to: ["recipient1@example.com", "recipient2@example.com"],
  cc: ["cc@example.com"],
  bcc: ["bcc@example.com"],
  subject: "Email subject",
  threadId: "thread_abc123",        // Gmail thread grouping
  messageId: "msg_xyz789",          // Unique message ID
  labelIds: ["INBOX", "IMPORTANT"], // Gmail labels
  fetchedAt: "2025-10-07T12:00:00Z",
  matchedQuery: "newer_than:30d"
}
```

### **Calendar Interactions**

```typescript
{
  attendees: [
    {
      email: "attendee@example.com",
      name: "John Doe",
      responseStatus: "accepted"
    }
  ],
  organizer: {
    email: "organizer@example.com",
    name: "Jane Smith"
  },
  eventId: "event_123",
  calendarId: "calendar_456",
  summary: "Team Meeting",
  description: "Quarterly review",
  location: "Conference Room A",
  startTime: "2025-10-07T14:00:00Z",  // Event start
  endTime: "2025-10-07T15:00:00Z",    // Event end
  isAllDay: false,
  recurring: false,
  status: "confirmed",
  fetchedAt: "2025-10-07T12:00:00Z"
}
```

---

## Type-Safe Access Patterns

### **Option 1: Using Zod Schemas (Recommended)**

```typescript
import { 
  GmailSourceMetaSchema, 
  CalendarSourceMetaSchema,
  type GmailSourceMeta,
  type CalendarSourceMeta 
} from "@/server/db/business-schemas/interactions";

// Validate and parse Gmail metadata
const interaction = await db.query.interactions.findFirst({
  where: eq(interactions.id, interactionId)
});

if (interaction.source === "gmail") {
  const result = GmailSourceMetaSchema.safeParse(interaction.sourceMeta);
  
  if (result.success) {
    const meta: GmailSourceMeta = result.data;
    console.log("Thread ID:", meta.threadId);
    console.log("From:", meta.from);
    console.log("Recipients:", meta.to);
  }
}

// Validate and parse Calendar metadata
if (interaction.source === "google_calendar") {
  const result = CalendarSourceMetaSchema.safeParse(interaction.sourceMeta);
  
  if (result.success) {
    const meta: CalendarSourceMeta = result.data;
    console.log("Event:", meta.summary);
    console.log("Start:", meta.startTime);
    console.log("End:", meta.endTime);
    console.log("Location:", meta.location);
    console.log("Attendees:", meta.attendees?.map(a => a.email));
  }
}
```

### **Option 2: Type Assertions (Current Pattern)**

```typescript
// Gmail
const gmailMeta = interaction.source_meta as GmailSourceMeta;
const threadId = gmailMeta.threadId;
const from = gmailMeta.from;

// Calendar
const calendarMeta = interaction.source_meta as CalendarSourceMeta;
const startTime = calendarMeta.startTime;
const attendees = calendarMeta.attendees;
```

### **Option 3: Safe Property Access**

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
const threadId = getMetaProperty<string>(interaction.sourceMeta, "threadId");
const startTime = getMetaProperty<string>(interaction.sourceMeta, "startTime");
const attendees = getMetaProperty<Array<{email: string}>>(
  interaction.sourceMeta, 
  "attendees"
);
```

---

## Common Use Cases

### **1. Extracting Contact Identities**

```typescript
// From Gmail
if (interaction.source === "gmail") {
  const meta = interaction.source_meta as GmailSourceMeta;
  
  const identities = [];
  if (meta.from) identities.push({ kind: "email", value: meta.from });
  if (meta.to) meta.to.forEach(email => identities.push({ kind: "email", value: email }));
  if (meta.cc) meta.cc.forEach(email => identities.push({ kind: "email", value: email }));
}

// From Calendar
if (interaction.source === "google_calendar") {
  const meta = interaction.source_meta as CalendarSourceMeta;
  
  const identities = [];
  if (meta.organizer) {
    identities.push({ kind: "email", value: meta.organizer.email });
  }
  if (meta.attendees) {
    meta.attendees.forEach(attendee => {
      identities.push({ kind: "email", value: attendee.email });
    });
  }
}
```

### **2. Creating Timeline Entries**

```typescript
const meta = interaction.source_meta as CalendarSourceMeta;

const timelineEntry = {
  eventType: "appointment_scheduled",
  title: meta.summary ?? "Untitled Event",
  description: meta.description,
  location: meta.location,
  startTime: meta.startTime,
  endTime: meta.endTime,
  duration: calculateDuration(meta.startTime, meta.endTime),
  isAllDay: meta.isAllDay ?? false,
  attendees: meta.attendees ?? [],
};
```

### **3. Grouping Email Threads**

```typescript
// Group interactions by Gmail thread
const meta = interaction.source_meta as GmailSourceMeta;
const threadId = meta.threadId;

const threadInteractions = await db.query.interactions.findMany({
  where: and(
    eq(interactions.userId, userId),
    eq(interactions.source, "gmail"),
    sql`${interactions.sourceMeta}->>'threadId' = ${threadId}`
  )
});
```

### **4. Filtering by Event Time**

```typescript
// Find calendar events in a date range
const eventsInRange = await db.query.interactions.findMany({
  where: and(
    eq(interactions.userId, userId),
    eq(interactions.source, "google_calendar"),
    sql`(${interactions.sourceMeta}->>'startTime')::timestamptz >= ${startDate}`,
    sql`(${interactions.sourceMeta}->>'endTime')::timestamptz <= ${endDate}`
  )
});
```

---

## API Validation

When creating interactions via API, validate `sourceMeta` based on source type:

```typescript
// In your API route
import { 
  CreateInteractionBodySchema,
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema 
} from "@/server/db/business-schemas/interactions";

// Validate base interaction
const body = CreateInteractionBodySchema.parse(request.body);

// Validate source-specific metadata
if (body.source === "gmail" && body.sourceMeta) {
  const validatedMeta = GmailSourceMetaSchema.parse(body.sourceMeta);
  // Use validatedMeta
}

if (body.source === "google_calendar" && body.sourceMeta) {
  const validatedMeta = CalendarSourceMetaSchema.parse(body.sourceMeta);
  // Use validatedMeta
}
```

---

## Database Queries

### **PostgreSQL JSONB Operators**

```sql
-- Access nested field
SELECT source_meta->>'threadId' as thread_id FROM interactions;

-- Filter by nested field
SELECT * FROM interactions 
WHERE source_meta->>'threadId' = 'thread_123';

-- Check if field exists
SELECT * FROM interactions 
WHERE source_meta ? 'startTime';

-- Array contains
SELECT * FROM interactions 
WHERE source_meta->'labelIds' ? 'IMPORTANT';
```

### **Drizzle ORM**

```typescript
import { sql } from "drizzle-orm";

// Access nested field
const results = await db
  .select({
    id: interactions.id,
    threadId: sql<string>`${interactions.sourceMeta}->>'threadId'`
  })
  .from(interactions);

// Filter by nested field
const filtered = await db
  .select()
  .from(interactions)
  .where(sql`${interactions.sourceMeta}->>'threadId' = 'thread_123'`);
```

---

## Best Practices

1. **Always validate source type before accessing metadata**
   ```typescript
   if (interaction.source === "gmail") {
     // Safe to access Gmail-specific fields
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
     return err(400, "Invalid source metadata");
   }
   ```

5. **Document expected structure in comments**
   ```typescript
   // sourceMeta structure for gmail:
   // { threadId, from, to, cc, subject, messageId }
   ```

---

## Migration Notes

If you need to add new fields to `sourceMeta`:

1. Update the Zod schema in `business-schemas/interactions.ts`
2. Update the TypeScript interface in `extract-contacts.ts`
3. Update this documentation
4. No database migration needed (JSONB is schemaless)

---

## Related Files

- **Schema Definition**: `src/server/db/business-schemas/interactions.ts`
- **Type Definitions**: `src/server/jobs/processors/extract-contacts.ts`
- **Usage Examples**: 
  - `src/server/jobs/processors/normalize.ts`
  - `src/server/jobs/processors/extract-contacts.ts`
  - `src/server/jobs/processors/timeline-writer.ts`
