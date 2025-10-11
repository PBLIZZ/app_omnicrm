# API Route Migration Plan - Type-Safe Boundary Pattern

**Goal**: Convert all API routes to use the new typed handler pattern for consistency, type safety, and code reduction.

## Migration Overview

- **Total Routes**: ~85 API endpoints across the application
- **Estimated Effort**: 2-3 hours per developer (10-15 routes each)
- **No Backward Compatibility**: Complete replacement of existing patterns
- **Timeline**: 1-2 days with 8 developers working in parallel

## Migration Rules

### ✅ **Required Changes**

1. Replace all `NextRequest/NextResponse` with typed handlers
2. Remove manual validation, error handling, and auth logic
3. Use business schema types for input/output validation
4. Convert to pure business logic functions
5. Update imports to use new pattern

### ❌ **Forbidden Patterns**

- Manual `await request.json()`
- Manual `getServerUserId()` calls
- Custom error handling with try/catch
- `NextResponse.json()` responses
- Manual query parameter parsing

### 🎯 **Target Pattern**

```typescript
// Before (30+ lines)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body = await request.json();
    const validated = schema.parse(body);
    // ... manual error handling
    return NextResponse.json(result);
  } catch (error) {
    // ... manual error handling
  }
}

// After (3 lines)
export const POST = handleAuth(InputSchema, OutputSchema, async (data, userId) => {
  return await service.method(userId, data);
});
```

---

## Team Assignments

### **Developer 1: Core Contacts & Client Management**

**Routes**: 12 endpoints
**Files**:

- `src/app/api/omni-clients/route.ts` ✅ **[GET, POST]**
- `src/app/api/omni-clients/[clientId]/route.ts` ✅ **[GET, PUT, DELETE]**
- `src/app/api/omni-clients/[clientId]/notes/route.ts` ✅ **[GET, POST]**
- `src/app/api/omni-clients/[clientId]/avatar/route.ts` ✅ **[POST]**
- `src/app/api/omni-clients/[clientId]/ai-insights/route.ts` ✅ **[GET]**
- `src/app/api/omni-clients/bulk-delete/route.ts` ✅ **[POST]**
- `src/app/api/omni-clients/bulk-enrich/route.ts` ✅ **[POST]**
- `src/app/api/omni-clients/count/route.ts` ✅ **[GET]**

**Schemas to Use**:

- `CreateOmniClientSchema`, `UpdateOmniClientSchema`, `OmniClientSchema`
- `CreateNoteSchema`, `UpdateNoteSchema`, `NoteSchema`
- `BulkDeleteBodySchema`

**Estimated Time**: 3 hours

---

### **Developer 2: Gmail & Email Integration**

**Routes**: 11 endpoints
**Files**:

- `src/app/api/google/gmail/oauth/route.ts` ✅ **[GET]** - Use `handleAuthFlow`
- `src/app/api/google/gmail/callback/route.ts` ✅ **[GET]** - Use `handleAuthFlow`
- `src/app/api/google/gmail/status/route.ts` ✅ **[GET]** - Use `handleGetWithQueryAuth`
- `src/app/api/google/gmail/preview/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/gmail/sync/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/gmail/sync-blocking/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/gmail/sync-direct/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/gmail/labels/route.ts` ✅ **[GET]** - Use `handleGetWithQueryAuth`
- `src/app/api/google/gmail/raw-events/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/gmail/refresh/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/gmail/test/route.ts` ✅ **[POST]** - Use `handleAuth`

**Schemas Needed** (create in business-schema):

```typescript
// New schemas required
export const GmailSyncRequestSchema = z.object({
  daysPast: z.number().int().min(1).max(365).default(30),
  maxResults: z.number().int().min(1).max(1000).default(100),
});

export const GmailPreviewRequestSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(50).default(10),
});
```

**Estimated Time**: 3 hours

---

### **Developer 3: Google Calendar Integration**

**Routes**: 10 endpoints
**Files**:

- `src/app/api/google/calendar/oauth/route.ts` ✅ **[GET]** - Use `handleAuthFlow`
- `src/app/api/google/calendar/callback/route.ts` ✅ **[GET]** - Use `handleAuthFlow`
- `src/app/api/google/calendar/status/route.ts` ✅ **[GET]** - Use `handleGetWithQueryAuth`
- `src/app/api/google/calendar/sync/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/calendar/sync-blocking/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/calendar/events/route.ts` ✅ **[GET]** - Use `handleGetWithQueryAuth`
- `src/app/api/google/calendar/list/route.ts` ✅ **[GET]** - Use `handleGetWithQueryAuth`
- `src/app/api/google/calendar/import/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/google/status/route.ts` ✅ **[GET]** - Use `handleGetWithQueryAuth`
- `src/app/api/google/prefs/route.ts` ✅ **[GET, PUT]** - Use `handleGetWithQueryAuth` + `handleAuth`

**Schemas Needed**:

```typescript
export const CalendarSyncRequestSchema = z.object({
  daysPast: z.number().int().min(1).max(365).default(60),
  daysFuture: z.number().int().min(1).max(365).default(90),
  maxResults: z.number().int().min(1).max(1000).default(100),
});

export const GooglePrefsSchema = z.object({
  gmailQuery: z.string().optional(),
  calendarTimeWindowDays: z.number().int().min(1).max(365).optional(),
  // ... other prefs
});
```

**Estimated Time**: 3 hours

---

### **Developer 4: OmniMomentum Task Management**

**Routes**: 10 endpoints
**Files**:

- `src/app/api/omni-momentum/projects/route.ts` ✅ **[GET, POST]**
- `src/app/api/omni-momentum/projects/[projectId]/route.ts` ✅ **[GET, PUT, DELETE]**
- `src/app/api/omni-momentum/projects/[projectId]/tasks/route.ts` ✅ **[GET]**
- `src/app/api/omni-momentum/tasks/route.ts` ✅ **[GET, POST]**
- `src/app/api/omni-momentum/tasks/[taskId]/route.ts` ✅ **[GET, PUT, DELETE]**
- `src/app/api/omni-momentum/tasks/[taskId]/subtasks/route.ts` ✅ **[GET, POST]**
- `src/app/api/omni-momentum/tasks/pending-approval/route.ts` ✅ **[GET]**
- `src/app/api/omni-momentum/stats/route.ts` ✅ **[GET]**

**Schemas Available** (already exist):

- `ProjectSchema`, `CreateProjectSchema`, `UpdateProjectSchema`
- `TaskSchema`, `CreateTaskSchema`, `UpdateTaskSchema`
- `GetProjectsQuerySchema`, `GetTasksQuerySchema`

**Estimated Time**: 2.5 hours

---

### **Developer 5: Job Processing & Background Tasks**

**Routes**: 9 endpoints
**Files**:

- `src/app/api/jobs/status/route.ts` ✅ **[GET]**
- `src/app/api/jobs/process/route.ts` ✅ **[POST]**
- `src/app/api/jobs/process-manual/route.ts` ✅ **[POST]**
- `src/app/api/jobs/runner/route.ts` ✅ **[POST]**
- `src/app/api/jobs/process/calendar-events/route.ts` ✅ **[POST]**
- `src/app/api/jobs/process/normalize/route.ts` ✅ **[POST]**
- `src/app/api/jobs/process/raw-events/route.ts` ✅ **[POST]**
- `src/app/api/cron/process-jobs/route.ts` ✅ **[POST]**
- `src/app/api/sync-progress/[sessionId]/route.ts` ✅ **[GET, DELETE]**

**Schemas Needed**:

```typescript
export const JobProcessRequestSchema = z.object({
  jobType: z.enum(["normalize", "embed", "insight", "sync_gmail", "sync_calendar"]),
  batchId: z.string().uuid().optional(),
  maxJobs: z.number().int().min(1).max(100).default(10),
});

export const SyncProgressResponseSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["started", "importing", "processing", "completed", "failed"]),
  progress: z.object({
    percentage: z.number().min(0).max(100),
    currentStep: z.string(),
    totalItems: z.number().int().min(0),
    processedItems: z.number().int().min(0),
  }),
});
```

**Estimated Time**: 3 hours

---

### **Developer 6: Inbox & Search**

**Routes**: 8 endpoints
**Files**:

- `src/app/api/inbox/route.ts` ✅ **[GET, POST]**
- `src/app/api/inbox/[itemId]/route.ts` ✅ **[GET, PUT, DELETE]**
- `src/app/api/inbox/process/route.ts` ✅ **[POST]**
- `src/app/api/search/route.ts` ✅ **[GET]**
- `src/app/api/chat/route.ts` ✅ **[POST]**
- `src/app/api/gmail/search/route.ts` ✅ **[POST]**
- `src/app/api/gmail/insights/route.ts` ✅ **[POST]**
- `src/app/api/zones/route.ts` ✅ **[GET]**

**Schemas Available/Needed**:

- `InboxItemSchema`, `CreateInboxItemSchema`, `UpdateInboxItemSchema`
- Need: `SearchQuerySchema`, `ChatMessageSchema`, `GmailSearchSchema`

**Estimated Time**: 2.5 hours

---

### **Developer 7: User Management & Admin**

**Routes**: 11 endpoints
**Files**:

- `src/app/api/user/export/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/user/delete/route.ts` ✅ **[DELETE]** - Use `handleAuth`
- `src/app/api/onboarding/admin/generate-tokens/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/onboarding/admin/tokens/route.ts` ✅ **[GET]** - Use `handleGetWithQueryAuth`
- `src/app/api/onboarding/admin/tokens/[tokenId]/route.ts` ✅ **[GET, DELETE]** - Use `handleGetWithQueryAuth` + `handleAuth`
- `src/app/api/onboarding/public/submit/route.ts` ✅ **[POST]** - Use `handlePublicFileUpload`
- `src/app/api/onboarding/public/track-access/route.ts` ✅ **[POST]** - Use `handlePublic`
- `src/app/api/onboarding/public/signed-upload/route.ts` ✅ **[POST]** - Use `handlePublic`
- `src/app/api/storage/upload-url/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/storage/file-url/route.ts` ✅ **[POST]** - Use `handleAuth`
- `src/app/api/auth/signin/google/route.ts` ✅ **[GET]** - Use `handleAuthFlow`

**Schemas Needed**:

```typescript
export const GenerateTokensRequestSchema = z.object({
  count: z.number().int().min(1).max(100),
  expiryDays: z.number().int().min(1).max(365).default(30),
});

export const OnboardingSubmissionSchema = z.object({
  tokenId: z.string().uuid(),
  personalInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  // ... other fields
});
```

**Estimated Time**: 3 hours

---

### **Developer 8: Error Handling & Utils**

**Routes**: 12 endpoints
**Files**:

- `src/app/api/errors/retry/route.ts` ✅ **[POST]**
- `src/app/api/errors/summary/route.ts` ✅ **[GET]**
- `src/app/api/health/route.ts` ✅ **[GET]**
- `src/app/api/db-ping/route.ts` ✅ **[GET]**
- `src/app/api/admin/email-intelligence/route.ts` ✅ **[POST]**
- `src/app/api/admin/replay/route.ts` ✅ **[POST]**
- `src/app/api/test/gmail-ingest/route.ts` ✅ **[POST]**
- `src/app/api/omni-connect/dashboard/route.ts` ✅ **[GET]**
- Cleanup any remaining routes

**Schemas Needed**:

```typescript
export const HealthCheckResponseSchema = z.object({
  status: z.literal("healthy"),
  timestamp: z.coerce.date(),
  uptime: z.number(),
});

export const ErrorSummaryResponseSchema = z.object({
  totalErrors: z.number().int().min(0),
  recentErrors: z.array(
    z.object({
      id: z.string(),
      message: z.string(),
      timestamp: z.coerce.date(),
      service: z.string(),
    }),
  ),
});
```

**Estimated Time**: 3 hours

---

## Step-by-Step Migration Process

### **Phase 1: Setup (30 mins each developer)**

1. **Pull latest code** with new API boundary pattern and edge case handlers
2. **Review examples** in `docs/api-boundary-pattern-example.md` and `docs/api-migration-quick-reference.md`
3. **Check assigned schemas** - create missing ones in `business-schema.ts`
4. **Understand edge cases** - Review OAuth flows, file uploads, public routes, webhooks
5. **Create feature branch**: `feature/api-migration-[developer-name]`

### **Phase 2: Migration (2-3 hours each developer)**

For each assigned route:

1. **Identify handler type needed**:
   - `handleAuth` - Most common (authenticated routes)
   - `handleGetWithQueryAuth` - GET with query params
   - `handle` - Public routes (rare)
   - `handleAuthFlow` - OAuth callbacks with redirects
   - `handleFileUpload` - Authenticated file uploads
   - `handlePublicFileUpload` - Public file uploads (onboarding)
   - `handleWebhook` - External webhook endpoints
   - `handleStream` - Streaming responses (SSE)
   - `handleCORS` - CORS preflight handling

2. **Extract business logic**:

   ```typescript
   // Find the core logic
   const result = await SomeService.method(userId, data);

   // Remove all HTTP/auth boilerplate
   export const POST = handleAuth(InputSchema, OutputSchema, async (data, userId) => {
     return await SomeService.method(userId, data);
   });
   ```

3. **Update imports**:

   ```typescript
   // Remove
   import { NextRequest, NextResponse } from "next/server";
   import { getServerUserId } from "@/server/auth/user";

   // Add (standard handlers)
   import { handleAuth } from "@/lib/api";
   import { InputSchema, OutputSchema } from "@/server/db/business-schema";

   // Add (edge case handlers)
   import { handleAuthFlow, handleFileUpload, handleWebhook } from "@/lib/api-edge-cases";
   ```

4. **Test locally**: Verify route still works

### **Phase 3: Validation (30 mins each developer)**

1. **Run type check**: `pnpm typecheck`
2. **Test API endpoints** with Postman/curl
3. **Commit changes** with descriptive message
4. **Create PR** against main branch

---

## Completion Tracking

| Developer | Assignment           | Routes | Status         | PR Link | Completion Date |
| --------- | -------------------- | ------ | -------------- | ------- | --------------- |
| Dev 1     | Core Contacts        | 12     | 🟢 Completed   |         |                 |
| Dev 2     | Gmail Integration    | 11     | 🟢 Completed   |         |                 |
| Dev 3     | Calendar Integration | 10     | 🟢 Completed   |         |                 |
| Dev 4     | OmniMomentum         | 10     | 🟢 Completed   |         |                 |
| Dev 5     | Job Processing       | 9      | 🟢 Completed   |         |                 |
| Dev 6     | Inbox & Search       | 8      | 🟢 Completed   |         |                 |
| Dev 7     | User Management      | 11     | 🟢 Completed   |         |                 |
| Dev 8     | Error Handling       | 12     | 🟡 8% Complete |         |                 |

**Total Progress**: 78/83 routes migrated (94%)

---

## Quality Checklist

### ✅ **Before Submitting PR**

- [ ] All routes use typed handlers (no NextRequest/NextResponse)
- [ ] No manual auth logic (use handleAuth)
- [ ] No try/catch blocks (handlers manage errors)
- [ ] All schemas defined in business-schema
- [ ] TypeScript compiles without errors
- [ ] Routes tested and functional

### ✅ **PR Requirements**

- [ ] Descriptive title: "API Migration: [Area] - Convert X routes to typed handlers"
- [ ] List all modified files
- [ ] Include before/after code examples
- [ ] Confirm no breaking changes to existing clients

---

## Success Metrics

- **Code Reduction**: ~80% reduction in API route code
- **Type Safety**: 100% of routes have input/output validation
- **Consistency**: Single pattern across entire API surface
- **Developer Experience**: Faster API development with less boilerplate
- **Error Handling**: Standardized error responses

---

## Communication

- **Daily Standups**: Report progress using completion tracking table
- **Slack Channel**: `#api-migration` for questions and coordination
- **Blockers**: Tag @tech-lead immediately if blocked
- **Code Reviews**: Assign PRs to tech lead + one peer reviewer

**Target Completion**: End of Week 1
**Fallback**: Tech lead handles any incomplete assignments
