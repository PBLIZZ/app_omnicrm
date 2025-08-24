# Schema Documentation

This document provides comprehensive documentation for the centralized schema system located in `src/server/schemas/`. All schemas are built with Zod v4 and derive their data types from the canonical database schema in `server/db/schema.ts`.

## Philosophy

- **Single Source of Truth**: All data types are sourced from `server/db/schema.ts`
- **No Manual Types**: All TypeScript types are inferred from Zod schemas using `z.infer<>`
- **Runtime Validation**: Every API endpoint validates input/output at runtime
- **Type Safety**: Discriminated unions and strict validation eliminate `unknown` and `any` usage

## Schema Files

### `http.ts` - HTTP Envelopes & Helpers

Standard response envelopes using discriminated unions for type-safe API responses.

```typescript
import { Envelope, ErrorEnvelope, PaginatedResponseSchema } from "@/server/schemas";

// Success response
const response = Envelope(ContactDTOSchema);

// Error response
const error: ErrorEnvelope = { ok: false, error: "Not found" };
```

### `contacts.ts` - Contact Management

Complete CRUD operations for contacts including query filtering and bulk operations.

```typescript
import {
  GetContactsQuerySchema,
  CreateContactBodySchema,
  UpdateContactBodySchema,
  BulkDeleteBodySchema,
} from "@/server/schemas";
```

### `chat.ts` - Chat & Messaging

OpenRouter-style chat requests and simple prompt-based chat.

```typescript
import { ChatRequestSchema, ChatResponseSchema, SimpleChatRequestSchema } from "@/server/schemas";
```

### `sync.ts` - Sync Settings & Status

User synchronization preferences and provider status management.

```typescript
import {
  UserSyncPrefsUpdateSchema,
  SyncStatusRequestSchema,
  SyncStatusResponseSchema,
} from "@/server/schemas";
```

### `calendar.ts` - Calendar Integration

Google Calendar preview, approve, and undo operations.

```typescript
import { CalendarPreviewSchema, CalendarApproveSchema, CalendarUndoSchema } from "@/server/schemas";
```

### `drive.ts` - Drive Integration

Google Drive file preview and metadata schemas.

```typescript
import { DrivePreviewSchema, DrivePreviewResponseSchema } from "@/server/schemas";
```

## API Routes Directory

### Core Routes

- **GET/POST** `/api/contacts` - Contact list and creation
- **GET/PUT/DELETE** `/api/contacts/[id]` - Individual contact operations
- **POST** `/api/contacts/bulk-delete` - Bulk contact deletion
- **POST** `/api/chat` - Simple chat endpoint
- **POST** `/api/openrouter` - OpenRouter-style chat

### Authentication & OAuth

- **GET** `/api/auth/signin/google` - Google sign-in endpoint
- **GET** `/api/auth/callback` - OAuth callback handler
- **GET** `/api/google/oauth` - Initiate Google OAuth
- **GET** `/api/google/oauth/callback` - OAuth callback handler

### Sync Operations

- **POST** `/api/sync/preview/gmail` - Preview Gmail sync
- **POST** `/api/sync/preview/calendar` - Preview Calendar sync
- **POST** `/api/sync/preview/drive` - Preview Drive sync
- **POST** `/api/sync/approve/gmail` - Approve Gmail sync
- **POST** `/api/sync/approve/calendar` - Approve Calendar sync
- **POST** `/api/sync/undo` - Undo sync operations

### Settings & Configuration

- **GET/PUT** `/api/settings/sync/prefs` - User sync preferences
- **GET** `/api/settings/sync/status` - Sync status by provider
- **GET/POST** `/api/settings/consent` - GDPR consent management

### Storage & Files

- **POST** `/api/storage/upload-url` - Generate upload URLs
- **GET** `/api/storage/file-url` - Get file URLs

### System & Utilities

- **GET** `/api/health` - Health check endpoint
- **GET** `/api/db-ping` - Database connectivity check
- **POST** `/api/jobs/runner` - Background job runner
- **GET** `/api/debug/env` - Environment debug info
- **GET** `/api/debug/user` - User debug info

## Usage Examples

### Route Implementation

```typescript
// src/app/api/contacts/route.ts
import { GetContactsQuerySchema, CreateContactBodySchema, Envelope } from "@/server/schemas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = GetContactsQuerySchema.parse(Object.fromEntries(searchParams));

  // ... fetch contacts logic

  return Response.json({ ok: true, data: contacts });
}

export async function POST(request: Request) {
  const body = CreateContactBodySchema.parse(await request.json());

  // ... create contact logic

  return Response.json({ ok: true, data: newContact });
}
```

### Client-Side Usage

```typescript
// Safe to import in client components (no Node APIs)
import type { ContactDTO, GetContactsQuery } from "@/server/schemas";

const contacts: ContactDTO[] = await fetchContacts();
```

### Error Handling

```typescript
import { ErrorEnvelope } from "@/server/schemas";

try {
  const body = CreateContactBodySchema.parse(await request.json());
  // ... logic
} catch (error) {
  const errorResponse: ErrorEnvelope = {
    ok: false,
    error: "Invalid request body",
    details: error,
  };
  return Response.json(errorResponse, { status: 400 });
}
```

## Migration Strategy

1. **Identify Route**: Find API route that needs schema validation
2. **Import Schema**: Import appropriate schema from `@/server/schemas`
3. **Add Validation**: Use `schema.parse()` for request validation
4. **Type Response**: Use discriminated union envelope for responses
5. **Remove Any/Unknown**: Replace all `any` and `unknown` with proper types

## Best Practices

- Always use `.strict()` on input schemas to prevent unexpected fields
- Use discriminated unions (`Envelope`) for consistent API responses
- Leverage zod transforms for complex parsing (dates, JSON strings)
- Keep schemas aligned with database tables in `server/db/schema.ts`
- Add runtime validation at API boundaries, not internal functions
