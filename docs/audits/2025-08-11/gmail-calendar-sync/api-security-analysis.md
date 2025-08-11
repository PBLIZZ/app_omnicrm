# API Security Analysis Report

**Date:** August 11, 2025  
**Focus:** Gmail/Calendar Sync Endpoints & Job Processing System  
**Scope:** Production-ready security assessment

## Executive Summary

The API security analysis reveals a **generally well-architected system** with several strong security foundations, but identifies **7 critical and high-severity vulnerabilities** that require immediate remediation before production deployment.

### Overall Security Posture: **MODERATE RISK**

- **Authentication:** Strong (Supabase-based)
- **Authorization:** Good with minor gaps
- **Input Validation:** Inconsistent implementation
- **Rate Limiting:** Basic implementation present
- **Error Handling:** Generally secure with some leakage
- **CSRF Protection:** Robust implementation

---

## Security Findings by Severity

### CRITICAL SEVERITY

#### 1. **Debug Information Leakage in Production**

**File:** `/src/server/auth/user.ts:31-36`  
**Risk:** Sensitive authentication data exposed in production logs

```typescript
// VULNERABLE CODE
console.warn(`[DEBUG] getServerUserId - User data:`, {
  hasUser: !!data?.user,
  userId: data?.user?.id,
  error: error?.message,
  cookies: cookieStore.getAll().map((c) => c.name),
});
```

**Impact:** User IDs, error messages, and cookie information logged to console in production
**Remediation:**

```typescript
if (process.env.NODE_ENV === "development") {
  console.warn(`[DEBUG] getServerUserId - User data:`, {
    hasUser: !!data?.user,
    userId: data?.user?.id?.slice(0, 8) + "...",
    error: error?.message,
    cookies: cookieStore.getAll().map((c) => c.name),
  });
}
```

#### 2. **Unvalidated JSON Input in Settings Preferences**

**File:** `/src/app/api/settings/sync/prefs/route.ts:40`  
**Risk:** Potential JSON injection and memory exhaustion

```typescript
// VULNERABLE CODE
const body = await req.json(); // No validation or size limits
```

**Impact:** Attackers can submit malformed JSON or extremely large payloads
**Remediation:**

```typescript
import { z } from "zod";
const prefsSchema = z
  .object({
    gmailQuery: z.string().max(500).optional(),
    gmailLabelIncludes: z.array(z.string()).max(50).optional(),
    // ... other validated fields
  })
  .strict();

const body = await safeJson<Record<string, unknown>>(req);
const validatedData = prefsSchema.parse(body ?? {});
```

### HIGH SEVERITY

#### 3. **SQL Injection Risk in Dynamic Queries**

**File:** `/src/server/jobs/processors/normalize.ts:25`  
**Risk:** Potential SQL injection through batch ID filtering

```typescript
// POTENTIALLY VULNERABLE
batchId ? eq(rawEvents.batchId, batchId) : eq(rawEvents.batchId, rawEvents.batchId),
```

**Impact:** While using Drizzle ORM provides protection, the dynamic query construction is suspicious
**Remediation:** Add explicit batchId validation:

```typescript
const validBatchId = z.string().uuid().safeParse(batchId);
if (batchId && !validBatchId.success) {
  throw new Error("Invalid batch ID format");
}
```

#### 4. **Authorization Bypass in Job Processor**

**File:** `/src/app/api/jobs/runner/route.ts:52-59`  
**Risk:** Jobs could be processed for wrong users under race conditions

```typescript
// DEFENSIVE CHECK - BUT INSUFFICIENT
if (job.userId !== userId) {
  await dbo.update(jobs).set({ status: "error" }).where(eq(jobs.id, job.id));
  continue;
}
```

**Impact:** Race condition could allow job processing before ownership verification
**Remediation:** Add database-level constraint and strengthen verification:

```typescript
// Use atomic update with WHERE clause
const updateResult = await dbo
  .update(jobs)
  .set({ status: "processing", updatedAt: new Date() })
  .where(and(eq(jobs.id, job.id), eq(jobs.userId, userId)))
  .returning();

if (updateResult.length === 0) {
  // Job doesn't exist or doesn't belong to user
  continue;
}
```

#### 5. **Resource Exhaustion in Gmail Sync**

**File:** `/src/server/jobs/processors/sync.ts:49-64`  
**Risk:** Memory exhaustion from processing large Gmail result sets

```typescript
// VULNERABLE TO MEMORY EXHAUSTION
const results = await Promise.allSettled(
  slice.map((id) => gmail.users.messages.get({ userId: "me", id, format: "full" })),
);
```

**Impact:** Processing large Gmail message sets could consume excessive memory
**Remediation:**

```typescript
// Process messages sequentially with memory limits
for (const id of slice) {
  try {
    const result = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "metadata", // Reduce payload size
    });
    // Process immediately instead of accumulating
  } catch (error) {
    // Handle individual failures
  }
}
```

### MODERATE SEVERITY

#### 6. **Feature Flag Information Disclosure**

**File:** `/src/app/api/settings/sync/status/route.ts:107-110`  
**Risk:** Internal feature flag states exposed to clients

```typescript
// INFORMATION LEAKAGE
flags: {
  gmail: process.env["FEATURE_GOOGLE_GMAIL_RO"] === "1",
  calendar: process.env["FEATURE_GOOGLE_CALENDAR_RO"] === "1",
},
```

**Impact:** Reveals internal feature rollout strategy
**Remediation:** Only return flags relevant to user's access level

#### 7. **Inconsistent Input Validation Patterns**

**Files:** Multiple route handlers  
**Risk:** Some endpoints use `req.json().catch()` while others use `safeJson()`

**Impact:** Inconsistent error handling could lead to unexpected failures
**Remediation:** Standardize on `safeJson()` with Zod validation across all endpoints

---

## Input Validation Assessment

### ✅ **Well-Validated Endpoints**

- `/api/sync/approve/gmail` - Uses safeJson + Zod schema
- `/api/sync/approve/calendar` - Uses safeJson + Zod schema
- `/api/sync/preview/gmail` - Basic Zod validation
- `/api/sync/preview/calendar` - Basic Zod validation

### ❌ **Poorly Validated Endpoints**

- `/api/settings/sync/prefs` - **CRITICAL**: No input validation
- `/api/jobs/runner` - No body validation (POST with no body expected)
- `/api/settings/sync/status` - GET endpoint (no body validation needed)

---

## Authorization Analysis

### ✅ **Strong Authorization Patterns**

- **Consistent `getServerUserId()` usage** across all endpoints
- **Supabase session-based authentication** with proper error handling
- **User-scoped database queries** using userId in WHERE clauses
- **Feature flag gating** for Gmail/Calendar access

### ⚠️ **Authorization Gaps**

- **Job processor ownership verification** could be strengthened
- **No rate limiting per user** (only per IP+session combination)

---

## Rate Limiting & DoS Protection

### ✅ **Implemented Protections**

- **Global rate limiting:** 60 requests/minute per IP+session
- **Payload size limits:** 1MB JSON payload cap
- **Job processing limits:** 25 jobs per run, 3-minute timeout
- **API processing caps:** 2000 items per sync run

### ⚠️ **Missing Protections**

- **No per-user rate limiting** for resource-intensive operations
- **No protection against rapid job enqueueing**
- **Gmail API rate limiting** relies on Google's built-in limits

---

## CORS & Request Security

### ✅ **Strong CORS Implementation**

```typescript
// Secure CORS configuration
const allowOrigin = !origin || origin === url.origin || appOrigins.includes(origin);
res.headers.set("Access-Control-Allow-Credentials", "true");
```

### ✅ **Comprehensive Security Headers**

- Content Security Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: no-referrer

---

## Error Response Security

### ✅ **Generally Secure Error Handling**

- Minimal error messages exposed to clients
- Structured error responses with consistent format
- Proper HTTP status codes

### ⚠️ **Minor Information Leakage**

```typescript
// In gmail preview route - could expose Google API error details
log.warn({ op: "sync.preview.gmail", status, code: error?.code, msg: error?.message });
```

---

## SQL Injection Prevention

### ✅ **Strong Protection**

- **Drizzle ORM** used throughout (prevents raw SQL injection)
- **Parameterized queries** with proper escaping
- **Type-safe database operations**

### ⚠️ **Areas for Verification**

- Dynamic query building in job processors needs validation
- Ensure all user inputs are properly sanitized through Drizzle

---

## Remediation Priority Roadmap

### **Phase 1: Critical Fixes (Immediate - 1-2 days)**

1. Remove debug logging from production authentication
2. Add input validation to settings preferences endpoint
3. Implement proper JSON schema validation

### **Phase 2: High Priority (Week 1)**

1. Strengthen job processor authorization checks
2. Implement sequential processing for Gmail sync
3. Add batch ID validation

### **Phase 3: Moderate Priority (Week 2-3)**

1. Standardize input validation patterns
2. Implement per-user rate limiting
3. Review feature flag exposure

### **Phase 4: Enhancements (Ongoing)**

1. Add comprehensive request logging
2. Implement advanced DoS protections
3. Regular security audits

---

## Security Best Practices Compliance

### ✅ **Well Implemented**

- HTTPS enforcement through CSP
- CSRF protection with double-submit pattern
- Secure session management via Supabase
- Type-safe database operations
- Resource usage timeouts and caps

### ⚠️ **Needs Improvement**

- Input validation consistency
- Error message standardization
- Security logging practices
- Per-user resource quotas

---

## Conclusion

The Gmail/Calendar sync API demonstrates **solid security fundamentals** with robust authentication, CSRF protection, and SQL injection prevention. However, **critical vulnerabilities in input validation and information leakage** must be addressed immediately before production deployment.

The system shows evidence of **security-conscious development** with good use of middleware, proper HTTP headers, and defensive programming patterns. With the identified fixes implemented, this API would achieve a **HIGH security rating** suitable for production use.

**Recommended Action:** Address all CRITICAL and HIGH severity findings before production deployment. MODERATE severity findings should be resolved within the first maintenance cycle.
