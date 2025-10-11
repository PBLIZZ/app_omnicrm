# API Route Patterns Guide

**⚠️ IMPORTANT**: Use ONLY the patterns documented here.

## Current Implementation (October 2025)

All API routes use standardized handlers from `@/lib/api` and `@/lib/api-edge-cases`.

**Complete Architecture Reference**: See `docs/REFACTORING_PATTERNS_OCT_2025.md` for the full layered architecture pattern (Repository → Service → Route).

## ✅ Standard Patterns

### Authenticated POST/PUT

```typescript
import { handleAuth } from "@/lib/api";
import { CreateContactBodySchema, ContactSchema } from "@/server/db/business-schemas";

export const POST = handleAuth(
  CreateContactBodySchema,
  ContactSchema,
  async (data, userId) => {
    return await createContactService(userId, data);
  }
);
```

### Authenticated GET with Query Parameters

```typescript
import { handleGetWithQueryAuth } from "@/lib/api";
import { ContactListQuerySchema, ContactListResponseSchema } from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(
  ContactListQuerySchema,
  ContactListResponseSchema,
  async (query, userId) => {
    return await listContactsService(userId, query);
  }
);
```

### Simple GET (No Auth)

```typescript
import { handleGet } from "@/lib/api";
import { HealthCheckSchema } from "@/server/db/business-schemas";

export const GET = handleGet(HealthCheckSchema, async () => {
  return { status: 'healthy', timestamp: new Date() };
});
```

## 🔐 Edge Case Patterns

### OAuth Flow Handlers

```typescript
import { handleAuthFlow } from "@/lib/api-edge-cases";
import { OAuthCallbackSchema } from "@/server/db/business-schemas";

export const GET = handleAuthFlow(OAuthCallbackSchema, async (query, request) => {
  const result = await oauthService.handleCallback(query.code, query.state);
  return Response.redirect(result.returnUrl, 302);
});
```

### File Upload Handlers

```typescript
import { handleFileUpload } from "@/lib/api-edge-cases";
import { AvatarUploadResponseSchema } from "@/server/db/business-schemas";

export const POST = handleFileUpload(AvatarUploadResponseSchema, async (formData, userId) => {
  const file = formData.get('avatar') as File;
  return await fileService.upload(userId, file);
});
```

### Public File Upload

```typescript
import { handlePublicFileUpload } from "@/lib/api-edge-cases";
import { OnboardingResponseSchema } from "@/server/db/business-schemas";

export const POST = handlePublicFileUpload(OnboardingResponseSchema, async (formData) => {
  const token = formData.get('token') as string;
  const photo = formData.get('photo') as File;
  return await onboardingService.submit(token, photo);
});
```

### Webhook Handlers

```typescript
import { handleWebhook } from "@/lib/api-edge-cases";
import { WebhookPayloadSchema, WebhookResponseSchema } from "@/server/db/business-schemas";

export const POST = handleWebhook(
  WebhookPayloadSchema,
  WebhookResponseSchema,
  async (payload, signature, request) => {
    await webhookService.verify(signature, payload);
    return await webhookService.process(payload);
  },
  'x-stripe-signature'
);
```

### Streaming Responses

```typescript
import { handleStream } from "@/lib/api-edge-cases";
import { StreamQuerySchema } from "@/server/db/business-schemas";

export const GET = handleStream(StreamQuerySchema, async (query, userId) => {
  return await streamingService.createStream(userId, query);
});
```

## 📋 What You Get Automatically

**All handlers provide**:

- ✅ Authentication (when required)
- ✅ Input validation with Zod schemas
- ✅ Output validation with Zod schemas
- ✅ Error handling with proper HTTP status codes
- ✅ CSRF protection (for mutating operations)
- ✅ Type safety throughout

## 🚫 What NOT to Use

**❌ DEPRECATED PATTERNS**:

- `createRouteHandler` - DOESN'T EXIST
- `ApiResponseBuilder` - DOESN'T EXIST
- Manual `NextRequest`/`NextResponse` - OLD PATTERN
- Manual `getServerUserId()` calls - HANDLED AUTOMATICALLY
- Manual `await req.json()` - HANDLED AUTOMATICALLY
- Manual try/catch blocks - HANDLED AUTOMATICALLY

## 🎯 Three-Line Migration

**Before** (30+ lines):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body = await request.json();
    const validated = schema.parse(body);
    const result = await service.method(userId, validated);
    return NextResponse.json(result);
  } catch (error) {
    // ... error handling
  }
}
```

**After** (3 lines):

```typescript
import { handleAuth } from "@/lib/api";
import { InputSchema, OutputSchema } from "@/server/db/business-schemas";

export const POST = handleAuth(InputSchema, OutputSchema, async (data, userId) => {
  return await service.method(userId, data);
});
```

## 📚 Documentation References

**✅ CURRENT DOCS**:

- `docs/REFACTORING_PATTERNS_OCT_2025.md` - **Complete architecture patterns (Repository → Service → Route)**
- `LAYER_ARCHITECTURE_BLUEPRINT_2025.md` - Architecture blueprint
- `src/app/api/README.md` - This file (API handler patterns)
- `CLAUDE.md` - AI assistant guidance
- `AGENTS.md` - Quick reference for agents

## 🔧 Adding New Routes

### 1. Define Business Schemas

Add to `src/server/db/business-schemas/[domain].ts`:

```typescript
import { z } from "zod";
import type { YourEntity } from "@/server/db/schema";

// Request schema (excludes userId - added by handler)
export const CreateYourEntityBodySchema = z.object({
  field1: z.string(),
  field2: z.number().optional(),
});

// Response schema (uses database type)
export const YourEntitySchema = z.custom<YourEntity>();

export type CreateYourEntityBody = z.infer<typeof CreateYourEntityBodySchema>;
```

### 2. Create Service Function

Add to `src/server/services/your-entity.service.ts`:

```typescript
import { getDb } from "@/server/db/client";
import { createYourEntityRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import type { YourEntity } from "@/server/db/schema";
import type { CreateYourEntityBody } from "@/server/db/business-schemas";

export async function createYourEntityService(
  userId: string,
  data: CreateYourEntityBody
): Promise<YourEntity> {
  const db = await getDb();
  const repo = createYourEntityRepository(db);

  try {
    return await repo.createYourEntity(userId, data);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create entity",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
}
```

### 3. Create API Route

Add to `src/app/api/your-entities/route.ts`:

```typescript
import { handleAuth } from "@/lib/api";
import { createYourEntityService } from "@/server/services/your-entity.service";
import { CreateYourEntityBodySchema, YourEntitySchema } from "@/server/db/business-schemas";

export const POST = handleAuth(
  CreateYourEntityBodySchema,
  YourEntitySchema,
  async (data, userId) => {
    return await createYourEntityService(userId, data);
  }
);
```

## ⚡ Success Criteria

**Route is ready when**:

- ✅ Uses standardized handler from `@/lib/api` or `@/lib/api-edge-cases`
- ✅ Business logic in service layer (not in route)
- ✅ Business schemas in `src/server/db/business-schemas/`
- ✅ No manual `Response.json()` or `NextRequest`/`NextResponse`
- ✅ TypeScript compiles without errors
- ✅ Service throws `AppError` with status codes

## 🎯 Layer Responsibilities

**Route Layer** (`src/app/api/`):

- ✅ Use handlers from `@/lib/api`
- ✅ Call service functions
- ✅ Check for null when service returns `T | null`
- ❌ NO business logic
- ❌ NO database access
- ❌ NO manual error handling (handlers do this)

**Service Layer** (`src/server/services/`):

- ✅ Acquire `DbClient` via `getDb()`
- ✅ Use repository factory functions
- ✅ Wrap errors as `AppError` with status codes
- ✅ Business logic and data transformation
- ❌ NO direct database queries (use repositories)

**Repository Layer** (`packages/repo/src/`):

- ✅ Constructor injection with `DbClient`
- ✅ Pure database operations
- ✅ Throw generic `Error` on failures
- ✅ Return `null` for "not found"
- ❌ NO business logic
- ❌ NO `AppError` (use generic `Error`)
- ❌ NO `DbResult` wrapper

**This pattern provides type safety, consistency, and maintainability across all API routes.**
