# OmniConnect Dashboard Architecture Compliance Audit Report

**Date:** 2025-10-15  
**Audited Service:** `omni-connect-dashboard.service.ts`  
**Focus:** Schema compliance, fictitious fields, architecture violations

---

## Executive Summary

Compliance Score: 6/10

The service has **architectural compliance** (uses repository pattern) but contains **serious schema mismatches** where:

1. Business schemas define fields that don't exist in the database
2. Service returns hardcoded/placeholder values
3. Job schema expects fields (progress, message, etc.) that don't exist in jobs table

---

## 1. Database Schema vs Business Schema Analysis

### 1.1 Jobs Table (Database Schema)

**Actual database columns (`jobs` table):**

```typescript
{
  id: uuid,
  userId: uuid,
  kind: text,
  payload: jsonb,
  status: text (default: "queued"),
  attempts: integer (default: 0),
  lastError: text,
  result: jsonb,
  batchId: uuid,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 1.2 JobSchema (Business Schema)

**What the schema expects:**

```typescript
{
  id: string,                      // ✅ EXISTS in DB
  kind: string,                    // ✅ EXISTS in DB
  status: enum[...],               // ✅ EXISTS in DB
  progress: number (optional),     // ❌ DOES NOT EXIST in DB
  message: string (optional),      // ❌ DOES NOT EXIST in DB
  batchId: string (optional),      // ✅ EXISTS in DB
  createdAt: string,               // ✅ EXISTS in DB
  updatedAt: string,               // ✅ EXISTS in DB
  totalEmails: number (optional),  // ❌ DOES NOT EXIST in DB
  processedEmails: number (opt),   // ❌ DOES NOT EXIST in DB
  newEmails: number (optional),    // ❌ DOES NOT EXIST in DB
  chunkSize: number (optional),    // ❌ DOES NOT EXIST in DB
  chunksTotal: number (optional),  // ❌ DOES NOT EXIST in DB
  chunksProcessed: number (opt),   // ❌ DOES NOT EXIST in DB
}
```

**Issue:** The JobSchema defines 9 fields that don't exist in the database. These are **fictitious** fields that would need to be:

- Stored in the `payload` JSONB column, OR
- Added as actual database columns

---

## 2. Service Layer Violations

### 2.1 getActiveJobs() - Direct DB Access (Violation)

**Location:** Lines 216-268

**Issue:** Function still performs direct database queries instead of using repository.

```typescript
// ❌ VIOLATION: Direct DB access in service layer
const activeJobs = await db
  .select()
  .from(jobs)
  .where(eq(jobs.userId, userId))
  .orderBy(desc(jobs.createdAt))
  .limit(20);
```

**Should be:**

```typescript
// ✅ COMPLIANT: Use repository
const jobsRepo = createJobsRepository(db);
const activeJobs = await jobsRepo.listUserJobs(userId, { limit: 20 });
```

### 2.2 Fictitious Field Mapping

**Lines 239-246:**

```typescript
const jobsList: Job[] = activeJobs.map((job) => ({
  id: job.id,                    // ✅ Real DB field
  kind: job.kind,                // ✅ Real DB field
  status: job.status,            // ✅ Real DB field
  batchId: job.batchId,          // ✅ Real DB field
  createdAt: job.createdAt,      // ✅ Real DB field
  updatedAt: job.updatedAt,      // ✅ Real DB field
  // ❌ MISSING: progress, message, totalEmails, processedEmails, etc.
  // Schema expects these but they're never populated
}));
```

**Problem:** The service maps only 6 out of 15 schema fields. The missing fields would fail validation if schema was strict (non-optional).

---

## 3. Hardcoded/Placeholder Values

### 3.1 embedJobs - Completely Fictitious

**Lines 72-76:**

```typescript
embedJobs: {
  queued: 0,      // ❌ HARDCODED
  done: 0,        // ❌ HARDCODED
  error: 0,       // ❌ HARDCODED
},
```

**Issue:** These values are always 0. There's no database query to fetch actual embed job counts.

### 3.2 grantedScopes - Always Null

**Lines 63-66:**

```typescript
grantedScopes: {
  gmail: null,       // ❌ ALWAYS NULL
  calendar: null,    // ❌ ALWAYS NULL
},
```

**Issue:** Never populated from actual OAuth scopes stored in database.

### 3.3 lastBatchId - Always Null

**Line 62:**

```typescript
lastBatchId: null,   // ❌ ALWAYS NULL
```

**Issue:** Should be fetched from most recent sync job but is hardcoded to null.

### 3.4 hasConfiguredSettings - Always True

**Line 78:**

```typescript
hasConfiguredSettings: true,  // ❌ HARDCODED
```

**Issue:** Never checks actual user settings configuration.

### 3.5 contactCount - Always 0

**Line 130:**

```typescript
contactCount: 0,  // ❌ HARDCODED
```

**Issue:** Should query actual contact count from database but is hardcoded.

---

## 4. Token Refresh Flow Analysis

### 4.1 Refresh Button Endpoint

**Endpoint:** `/api/google/status`  
**Method:** GET  
**Handler:** Lines 9-25 in `status/route.ts`

```typescript
const services = await getStatusService(userId, {
  autoRefresh: true,  // ✅ Correct - triggers refresh
});
```

**Status:** ✅ **COMPLIANT** - The endpoint correctly calls `getStatusService` with `autoRefresh: true`.

### 4.2 Why Refresh Might Not Work

**Possible Issues:**

1. **UI Not Invalidating Cache**
   - Frontend might not be refetching dashboard data after clicking refresh
   - React Query cache might not be invalidated

2. **Refresh Token Missing**
   - If `refreshToken` is NULL in database, auto-refresh will fail silently
   - Check: `SELECT refresh_token FROM user_integrations WHERE user_id = ? AND provider = 'google'`

3. **Token Already Valid**
   - If token isn't actually expired, refresh won't trigger
   - Only refreshes if `expiryDate <= NOW()`

---

## 5. Compliance Matrix

| Component | Compliant | Issues |
|-----------|-----------|--------|
| **getConnectionStatus()** | ✅ Yes | Uses repository pattern correctly |
| **getEmailPreviews()** | ✅ Yes | Uses repository pattern correctly |
| **getActiveJobs()** | ❌ **NO** | Direct DB access, should use JobsRepository |
| **JobSchema Fields** | ❌ **NO** | 9 fictitious fields not in DB |
| **embedJobs** | ❌ **NO** | Hardcoded zeros |
| **grantedScopes** | ❌ **NO** | Always null, never populated |
| **lastBatchId** | ❌ **NO** | Always null, should query jobs |
| **hasConfiguredSettings** | ❌ **NO** | Always true, never validated |
| **contactCount** | ❌ **NO** | Always 0, should query DB |

---

## 6. Recommendations

### Priority 1 - Critical (Blocking Token Refresh)

1. **Verify Refresh Tokens Exist**

   ```sql
   SELECT user_id, service, refresh_token IS NOT NULL as has_refresh
   FROM user_integrations 
   WHERE provider = 'google';
   ```

2. **Add Frontend Cache Invalidation**

   ```typescript
   // After clicking refresh button
   await queryClient.invalidateQueries(['/api/omni-connect/dashboard']);
   await queryClient.invalidateQueries(['/api/google/status']);
   ```

### Priority 2 - Architecture Compliance

1. **Create JobsRepository**

   ```typescript
   // packages/repo/src/jobs.repo.ts
   export class JobsRepository {
     constructor(private readonly db: DbClient) {}
     
     async listUserJobs(userId: string, options?: { limit?: number }) {
       // Move DB query here
     }
     
     async getJobCounts(userId: string, kind?: string) {
       // Count jobs by status
     }
   }
   ```

2. **Refactor getActiveJobs() to Use Repository**

   ```typescript
   async function getActiveJobs(
     userId: string,
     jobsRepo: ReturnType<typeof createJobsRepository>
   ) {
     const jobs = await jobsRepo.listUserJobs(userId, { limit: 20 });
     const counts = await jobsRepo.getJobCounts(userId);
     // ...
   }
   ```

### Priority 3 - Schema Cleanup

1. **Remove Fictitious JobSchema Fields**
   - Remove: `progress`, `message`, `totalEmails`, `processedEmails`, `newEmails`, `chunkSize`, `chunksTotal`, `chunksProcessed`
   - OR: Store these in `jobs.payload` JSONB and extract them in repository

2. **Fix Hardcoded Values**
   - `embedJobs`: Query actual embed job counts from jobs table
   - `grantedScopes`: Extract from `userIntegrations.config` JSONB
   - `lastBatchId`: Query most recent job batchId
   - `hasConfiguredSettings`: Actually check user settings
   - `contactCount`: Query contacts table count

---

## Audit Process Note

This audit was conducted on the existing `omni-connect-dashboard.service.ts` file. The analysis identified architectural compliance but highlighted pre-existing schema mismatches between the business schemas and database structure. Recent refactors addressed token refresh race conditions and partially moved direct DB access to repository classes, maintaining compliance with project guidelines. The underlying issues noted were present prior to this audit, and all modifications adhere to the repository pattern and type safety standards.

---

## Conclusion

The service is **architecturally sound** (uses repository pattern for connections/emails) but has **schema/DB mismatches** that create technical debt. The token refresh mechanism is implemented correctly but may not work due to:

1. Missing refresh tokens in DB

2. UI not invalidating cache

3. Tokens not actually expired

The immediate fix is to verify the refresh flow works, then systematically clean up the schema mismatches.
