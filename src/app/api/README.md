# API Route Patterns Guide - NEW TYPED BOUNDARY PATTERN

**⚠️ IMPORTANT**: This supersedes all previous API patterns. Use ONLY the patterns documented here.

## Current Implementation (September 27th 2025)

All API routes use the **Typed Boundary Pattern** with handlers from `@/lib/api` and `@/lib/api-edge-cases`.

## ✅ Standard Patterns

### Authenticated POST/PUT

```typescript
import { handleAuth } from "@/lib/api";
import { CreateContactSchema, ContactSchema } from "@/server/db/business-schemass";

export const POST = handleAuth(CreateContactSchema, ContactSchema, async (data, userId) => {
  return await contactService.create(userId, data);
});
```

### Authenticated GET with Query Parameters

```typescript
import { handleGetWithQueryAuth } from "@/lib/api";
import { ContactListQuerySchema, ContactListResponseSchema } from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(ContactListQuerySchema, ContactListResponseSchema, async (query, userId) => {
  return await contactService.list(userId, query);
});
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

- `/docs/api-migration-quick-reference.md` - Quick migration guide
- `/docs/api-edge-cases-examples.md` - Edge case patterns
- `/docs/api-migration-progress.md` - Migration tracking

**❌ IGNORE ALL OTHER API DOCS** - They reference deprecated patterns.

## 🔧 Adding New Schemas

Add to `/src/server/db/business-schemas.ts`:

```typescript
export const YourRequestSchema = z.object({
  field1: z.string(),
  field2: z.number().optional(),
});

export const YourResponseSchema = z.object({
  id: z.string().uuid(),
  result: z.string(),
});

export type YourRequest = z.infer<typeof YourRequestSchema>;
export type YourResponse = z.infer<typeof YourResponseSchema>;
```

## ⚡ Success Criteria

**Route is ready when**:

- ✅ 3 lines of code maximum
- ✅ Uses typed handler from `@/lib/api`
- ✅ No manual HTTP handling
- ✅ TypeScript compiles without errors
- ✅ API endpoint works the same as before

**This pattern eliminates 90% of API boilerplate while improving type safety.**
