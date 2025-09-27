# API Migration Quick Reference

**🎯 Goal**: Convert NextJS API routes to typed handler pattern in 3 simple steps.

## ⚡ **3-Step Migration Process**

### **Step 1: Identify Pattern** (30 seconds)

```typescript
// 🔍 Look at current route - what does it do?
export async function POST(request: NextRequest) {
  const userId = await getServerUserId();        // 🔐 Needs auth?
  const body = await request.json();             // 📥 Has body input?
  const result = await SomeService.method();     // 🏗️ What's the business logic?
  return NextResponse.json(result);              // 📤 What does it return?
}
```

**Choose your handler**:

- `handleAuth` → Most common (authenticated POST/PUT)
- `handleGetWithQueryAuth` → Authenticated GET with query params
- `handle` → Public routes (rare)

### **Step 2: Extract Business Logic** (1 minute)

```typescript
// ❌ BEFORE: 30+ lines of boilerplate
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();
    const validated = SomeSchema.parse(body);
    const result = await SomeService.method(userId, validated);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // ... 20 lines of error handling
  }
}

// ✅ AFTER: 3 lines of pure business logic
export const POST = handleAuth(InputSchema, OutputSchema, async (data, userId) => {
  return await SomeService.method(userId, data);
});
```

### **Step 3: Update Imports** (30 seconds)

```typescript
// ❌ Remove these imports
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";

// ✅ Add these imports
import { handleAuth } from "@/lib/api";
import { InputSchema, OutputSchema } from "@/server/db/business-schema";
```

## 🛠️ **Handler Function Reference**

### **POST/PUT with Authentication**

```typescript
export const POST = handleAuth(InputSchema, OutputSchema, async (data, userId) => {
  return await service.create(userId, data);
});
```

### **GET with Query Parameters + Auth**

```typescript
export const GET = handleGetWithQueryAuth(QuerySchema, OutputSchema, async (query, userId) => {
  return await service.list(userId, query);
});
```

### **Simple GET (No Auth)**

```typescript
export const GET = handleGet(OutputSchema, async () => {
  return await service.getPublicData();
});
```

### **Public POST (No Auth)**

```typescript
export const POST = handle(InputSchema, OutputSchema, async (data) => {
  return await service.publicMethod(data);
});
```

## 🔐 **Edge Case Handler Reference**

### **OAuth/Auth Flow (with redirects)**

```typescript
import { handleAuthFlow } from "@/lib/api-edge-cases";

export const GET = handleAuthFlow(QuerySchema, async (query, request) => {
  const redirectUrl = await processOAuthCallback(query);
  return Response.redirect(redirectUrl, 302);
});
```

### **File Upload (with validation)**

```typescript
import { handleFileUpload } from "@/lib/api-edge-cases";

export const POST = handleFileUpload(
  ResponseSchema,
  async (formData, userId) => {
    const file = formData.get('file') as File;
    return await fileService.upload(userId, file);
  },
  {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png'],
    maxFiles: 5
  }
);
```

### **Public File Upload (onboarding, etc.)**

```typescript
import { handlePublicFileUpload } from "@/lib/api-edge-cases";

export const POST = handlePublicFileUpload(
  ResponseSchema,
  async (formData) => {
    const token = formData.get('token') as string;
    const photo = formData.get('photo') as File;
    return await onboardingService.uploadPhoto(token, photo);
  }
);
```

### **Webhook Endpoint**

```typescript
import { handleWebhook } from "@/lib/api-edge-cases";

export const POST = handleWebhook(
  WebhookPayloadSchema,
  ResponseSchema,
  async (payload, signature, request) => {
    await webhookService.verify(signature, payload);
    return await webhookService.process(payload);
  },
  'x-stripe-signature' // custom signature header
);
```

### **Streaming Response (SSE)**

```typescript
import { handleStream } from "@/lib/api-edge-cases";

export const GET = handleStream(QuerySchema, async (query, userId) => {
  return await streamingService.createStream(userId, query);
});
```

### **CORS Preflight**

```typescript
import { handleCORS } from "@/lib/api-edge-cases";

export const OPTIONS = handleCORS(
  ['https://app.example.com'], // allowed origins
  ['GET', 'POST', 'PUT'],      // allowed methods
  ['Content-Type', 'Authorization'] // allowed headers
);
```

## 📋 **Schema Patterns**

### **Most Common Schemas** (already exist)

```typescript
// Contacts/Clients
import { CreateOmniClientSchema, OmniClientSchema } from "@/server/db/business-schema/omniClients";

// Tasks/Projects
import { CreateTaskSchema, TaskSchema } from "@/server/db/business-schema";

// Inbox
import { CreateInboxItemSchema, InboxItemSchema } from "@/server/db/business-schema";
```

### **Need to Create Schema?** Add to `business-schema.ts`

```typescript
export const YourRequestSchema = z.object({
  field1: z.string(),
  field2: z.number().optional(),
  // ... other fields
});

export const YourResponseSchema = z.object({
  id: z.string().uuid(),
  result: z.string(),
  // ... response fields
});
```

## 🚫 **What NOT to Include**

### **❌ Remove All This Code**

```typescript
// Authentication
const userId = await getServerUserId();

// Manual JSON parsing
const body = await request.json();

// Manual validation
const validated = schema.parse(body);

// Manual error handling
try { } catch (error) { }

// Manual response creation
return NextResponse.json(result, { status: 201 });

// Query parameter parsing
const { searchParams } = new URL(request.url);
const queryParams = Object.fromEntries(searchParams.entries());

// Manual FormData handling
const formData = await request.formData();
const file = formData.get('file') as File;

// Manual OAuth state/code parsing
const url = new URL(request.url);
const code = url.searchParams.get('code');
const state = url.searchParams.get('state');

// Manual CORS headers
response.headers.set('Access-Control-Allow-Origin', '*');

// Manual signature validation
const signature = request.headers.get('x-signature');
```

## ✅ **Migration Checklist**

For each route:

- [ ] Identified correct handler type (auth, public, file upload, webhook, etc.)
- [ ] Extracted pure business logic (service call)
- [ ] Removed all HTTP/auth/validation boilerplate
- [ ] Updated imports (add edge-cases import if needed)
- [ ] Schemas exist in business-schema
- [ ] Route compiles without errors
- [ ] Tested API endpoint works
- [ ] Special handling for edge cases (file uploads, OAuth flows, webhooks)

## 🆘 **Common Issues & Solutions**

### **Issue**: `Cannot find module business-schema`

**Solution**: Create missing schema or import from correct path

### **Issue**: `Type error on handler function`

**Solution**: Check input/output types match your schemas

### **Issue**: `Auth errors in handler`

**Solution**: Use `handleAuth` instead of `handle` for protected routes

### **Issue**: `Query params not working`

**Solution**: Use `handleGetWithQueryAuth` for GET routes with query parameters

### **Issue**: `File upload fails with multipart/form-data`

**Solution**: Use `handleFileUpload` or `handlePublicFileUpload` instead of standard handlers

### **Issue**: `OAuth callback redirects not working`

**Solution**: Use `handleAuthFlow` for OAuth routes that need to return redirects

### **Issue**: `Webhook signature validation fails`

**Solution**: Use `handleWebhook` with proper signature header configuration

## 📞 **Need Help?**

1. **Check examples**:
   - `docs/api-boundary-pattern-example.md` - Standard patterns
   - `docs/api-edge-cases-examples.md` - Edge case patterns (OAuth, files, webhooks)
2. **Slack**: `#api-migration`
3. **Tag**: @tech-lead for urgent blockers
4. **Reference**: Look at completed routes in other PRs

## 🎯 **Success Criteria**

Your route is ready when:

- ✅ 3 lines of code (business logic only)
- ✅ Uses typed handler from `@/lib/api`
- ✅ No manual auth/validation/error handling
- ✅ Compiles with TypeScript
- ✅ API endpoint works the same as before

**Average time per route**: 2-3 minutes
