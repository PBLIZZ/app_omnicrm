# Layer Architecture Blueprint

```bash

HTTP Request
     ↓
┌────────────────────────────────────────────────────────┐
│ MIDDLEWARE (src/middleware.ts)                         │
│ - CSRF validation                                      │
│ - Rate limiting                                        │
│ - Security headers                                     │
│ - Does NOT catch errors, just validates & forwards     │
└────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────┐
│ ROUTE HANDLERS (src/app/api/contacts/route.ts)         │
│ Uses: handleAuth() or handleGetWithQueryAuth()         │
│ - Validates request body/query with Zod                │
│ - Calls service layer                                  │
│ - Returns Response                                     │
│ - Does NOT catch errors (handlers do that)             │
└────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────┐
│ AUTH HANDLERS (src/lib/api.ts)                         │
│ handleAuth(schema, responseSchema, businessLogic)      │
│ - Extracts userId from auth                            │
│ - Validates input with Zod schema                      │
│ - Calls your business logic function                   │
│ - CATCHES errors and converts to HTTP responses        │
│ - Returns Response with proper status codes            │
└────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────┐
│ SERVICE LAYER (src/server/services/contacts.service)   │
│ - Business logic & orchestration                       │
│ - Data transforms (Contact → ContactWithLastNote)      │
│ - Calls multiple repos if needed                       │
│ - THROWS errors (ApiError, AppError)                   │
│ - Returns: Promise<T>                                  │
└────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────┐
│ REPOSITORY LAYER (packages/repo/src/contacts.repo)     │
│ - Pure database operations (CRUD)                      │
│ - NO business logic, NO transforms                     │
│ - Uses Drizzle ORM                                     │
│ - Accepts DbClient from service layer                  │
│ - Throws on failure; no DbResult wrapper               │
└────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────┐
│ DATABASE SCHEMA (src/server/db/schema.ts)              │
│ - Drizzle table definitions                            │
│ - Generated from Supabase types                        │
│ - Export: Contact, CreateContact (inferred types)      │
│ - NO Zod, NO validation, NO transforms                 │
└────────────────────────────────────────────────────────┘
```

## Type/Schema Layers

```bash
┌─────────────────────────────────────────────────────────┐
│ DATABASE TYPES (src/server/db/schema.ts)                │
│ Purpose: Single source of truth for domain entities     │
│                                                         │
│ export type Contact = typeof contacts.$inferSelect      │
│ export type CreateContact = typeof contacts.$inferInsert│
│                                                         │
│ Used by: Repos, Services                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ BUSINESS SCHEMAS (src/server/db/business-schemas/)      │
│ Purpose: API request/response validation ONLY           │
│                                                         │
│ CreateContactBodySchema = omit userId from CreateContact│
│ GetContactsQuerySchema = query params (page, search)    │
│ ContactListResponseSchema = { items, pagination }       │
│                                                         │
│ Used by: Route handlers via handleAuth()                │
│ NO TRANSFORMS - just Zod validation                     │
└─────────────────────────────────────────────────────────┘
```

## Error Flow

```bash
Service acquires DbClient (getDb or transaction)
         ↓
Repository executes query and may throw
         ↓
Service wraps database error with AppError
    ↓
Handler (handleAuth) catches
    → converts to HTTP response
         ↓
Client receives { error: "message", status: 400 }
```

## Files & Their Purpose

### Core Architecture

| File                         | Purpose        | Returns                | Errors            |
| ---------------------------- | -------------- | ---------------------- | ----------------- |
| schema.ts                    | Drizzle tables | Contact, CreateContact | N/A               |
| business-schemas/contacts.ts | API validation | Zod schemas            | N/A               |
| contacts.repo.ts             | DB queries     | `Promise<T>`           | Throws on failure |
| contacts.service.ts          | Business logic | `Promise<T>`           | Throws AppError   |
| api/contacts/route.ts        | HTTP endpoint  | Response               | Caught by handler |

### Error Handling Files

| File                           | Purpose                 | Status                              |
| ------------------------------ | ----------------------- | ----------------------------------- |
| lib/utils/result.ts            | Legacy Result wrapper   | LEGACY - remove after full migration |
| lib/errors/app-error.ts        | AppError class          | KEEP - Services throw this          |
| lib/api/errors.ts              | ApiError class          | KEEP - HTTP error responses         |

### Handler Files

| File                      | Purpose                                | Status                     |
| ------------------------- | -------------------------------------- | -------------------------- |
| lib/api.ts                | handleAuth(), handleGetWithQueryAuth() | KEEP - Core routing        |
| lib/api-edge-cases.ts     | handleStream() for SSE                 | KEEP - Streaming endpoints |

### Type Guards

| File                              | Purpose                           | Status                   |
| --------------------------------- | --------------------------------- | ------------------------ |
| lib/utils/type-guards/contacts.ts | Legacy DbResult helpers           | LEGACY - delete when unused |

### Client-Side API

| File                              | Purpose                       | Status                      |
| --------------------------------- | ----------------------------- | --------------------------- |
| lib/api/client.ts                 | HTTP client (fetch wrapper)   | KEEP - Frontend uses        |

### Utilities

| File                            | Purpose                                        | Status              |
| ------------------------------- | ---------------------------------------------- | ------------------- |
| lib/utils/validation-helpers.ts | isValidSource(), normalizeTags()               | KEEP - Repos use    |
| lib/utils/zod-helpers.ts        | safeParse(), validateApiBody()                 | KEEP - Handlers use |
| lib/utils/contact-helpers.ts    | normalizeDisplayName(), sanitizeContactInput() | KEEP - Services use |

## ARCHITECTURE OCTOBER 2025

### DATABASE SCHEMA

```typescript
// ============================================================================
// 1. DATABASE SCHEMA (schema.ts)
// ============================================================================
export const contacts = pgTable("contacts", { ... });
export type Contact = typeof contacts.$inferSelect;
export type CreateContact = typeof contacts.$inferInsert;

```

### BUSINESS SCHEMAS

```typescript
// ============================================================================
// 2. BUSINESS SCHEMAS (business-schemas/contacts.ts)
// ============================================================================
import { type Contact } from "@/server/db/schema";

// API request (excludes userId)
export const CreateContactBodySchema = z.object({
  displayName: z.string(),
  // ... no userId
});

// API response (adds pagination)
export const ContactListResponseSchema = z.object({
  items: z.array(z.custom<Contact>()),
  pagination: z.object({ page: z.number(), total: z.number() }),
});

```

### REPOSITORY

```typescript
// ============================================================================
// 3. REPOSITORY (contacts.repo.ts)
// ============================================================================
static async createContact(
  db: DbClient,
  data: CreateContact,
): Promise<Contact> {
  const [contact] = await db.insert(contacts).values(data).returning();

  if (!contact) {
    throw new Error("Insert returned no data");
  }

  return contact;
}

```

### SERVICE

```typescript
// ============================================================================
// 4. SERVICE (contacts.service.ts)
// ============================================================================
export async function createContactService(
  userId: string,
  input: Omit<CreateContact, 'userId'>
): Promise<Contact> {
  // Business logic: sanitize input
  const sanitized = sanitizeContactInput(input);

  const db = await getDb();

  try {
    return await ContactsRepository.createContact(db, { ...sanitized, userId });
  } catch (error) {
    throw toDatabaseError("Failed to create contact", error);
  }
}

```

### ROUTE HANDLER

```typescript
// ============================================================================
// 5. ROUTE HANDLER (api/contacts/route.ts)
// ============================================================================
export const POST = handleAuth(
  CreateContactBodySchema,
  ContactSchema,
  async (data, userId) => {
    return await createContactService(userId, data);
  }
);

```

### AUTH HANDLER

```typescript
// ============================================================================
// 6. AUTH HANDLER (lib/api.ts)
// ============================================================================
export function handleAuth(bodySchema, responseSchema, businessLogic) {
  return async (req: Request) => {
    try {
      const userId = await getAuthUserId();
      const body = await req.json();
      const validated = bodySchema.parse(body);
      const result = await businessLogic(validated, userId);
      return Response.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

```

### FRONTEND HOOK

```typescript
// ============================================================================
// 7. FRONTEND HOOK (use-contacts.ts)
// ============================================================================
export function useCreateContact() {
  return useMutation({
    mutationFn: async (data: CreateContactBody) => {
      const response = await fetch("/api/contacts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed");
      return response.json() as Promise<Contact>;
    },
  });
}
```
