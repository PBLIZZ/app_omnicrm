# API Security Audit Report

**Date:** 2025-08-10  
**Scope:** All API endpoints in `/src/app/api/`  
**Auditor:** Claude Code Security Analysis  
**Application:** OmniCRM

## Executive Summary

This comprehensive security audit evaluated 14 API endpoints across authentication, sync operations, job processing, and settings management. The audit identified **15 security findings** ranging from Critical to Low severity, with particular concerns around authentication bypass vulnerabilities, input validation gaps, and information disclosure.

**Key Risk Areas:**

- Development authentication bypass mechanisms in production
- Missing input validation and rate limiting on multiple endpoints
- OAuth state parameter manipulation vulnerabilities
- Potential information disclosure through error messages
- Missing CORS configuration and security headers on specific routes

## Methodology

The analysis examined:

1. **Authentication & Authorization:** Session handling, user context validation, privilege escalation
2. **Input Validation:** Request body parsing, parameter sanitization, schema validation
3. **Rate Limiting:** DoS protection, brute force prevention, resource throttling
4. **Information Disclosure:** Error handling, sensitive data exposure, debug information
5. **Integration Security:** OAuth flows, external API interaction, token handling
6. **Infrastructure:** CORS policies, security headers, middleware configuration

---

## Critical Findings

### 1. Development Authentication Bypass in Production

**Severity:** CRITICAL  
**File:** `/src/server/auth/user.ts` (lines 29-30)  
**Vulnerability Type:** Authentication Bypass

**Description:**
The authentication function allows bypassing Supabase authentication using the `x-user-id` header in non-production environments. However, the `NODE_ENV` check is insufficient as this environment variable may not be properly set or could be manipulated.

**Code:**

```typescript
const devHeader = hdrs.get?.("x-user-id");
if (process.env.NODE_ENV !== "production" && devHeader) return devHeader;
```

**Risk:** Complete authentication bypass allowing any user to impersonate any other user by setting the `x-user-id` header.

**Remediation:**

1. Remove the development bypass entirely for production deployments
2. Use a more robust environment detection mechanism
3. Implement proper development-only authentication helpers
4. Add request source validation for development environments

---

### 2. OAuth State Parameter JSON Injection

**Severity:** CRITICAL  
**File:** `/src/app/api/google/oauth/callback/route.ts` (line 13)  
**Vulnerability Type:** Code Injection / Authentication Bypass

**Description:**
The OAuth callback directly parses the `state` parameter as JSON without validation, allowing potential code injection or authentication bypass.

**Code:**

```typescript
const state = JSON.parse(stateRaw);
const userId: string = state.userId;
```

**Risk:** Malicious state parameters could lead to authentication bypass, privilege escalation, or code execution.

**Remediation:**

```typescript
let state: any;
try {
  state = JSON.parse(stateRaw);
  if (typeof state?.userId !== "string" || !state.userId.match(/^[0-9a-f-]{36}$/)) {
    return err(400, "invalid_state");
  }
} catch {
  return err(400, "invalid_state");
}
```

---

## High Findings

### 3. Missing Input Validation on Sync Preferences

**Severity:** HIGH  
**File:** `/src/app/api/settings/sync/prefs/route.ts` (lines 32-67)  
**Vulnerability Type:** Input Validation Gap

**Description:**
The PUT endpoint accepts arbitrary JSON input without schema validation, potentially allowing injection of malicious data into the database.

**Risk:** Data corruption, potential SQL injection through JSON fields, storage of malicious content.

**Remediation:**
Implement Zod schema validation:

```typescript
const syncPrefsSchema = z.object({
  gmailQuery: z.string().max(500).optional(),
  gmailLabelIncludes: z.array(z.string().max(100)).max(50).optional(),
  gmailLabelExcludes: z.array(z.string().max(100)).max(50).optional(),
  calendarIncludeOrganizerSelf: z.enum(["true", "false"]).optional(),
  calendarIncludePrivate: z.enum(["true", "false"]).optional(),
  calendarTimeWindowDays: z.number().int().min(1).max(365).optional(),
  driveIngestionMode: z.enum(["none", "picker", "folders"]).optional(),
  driveFolderIds: z.array(z.string().max(100)).max(100).optional(),
});
```

### 4. Job Runner Lacks Authorization Controls

**Severity:** HIGH  
**File:** `/src/app/api/jobs/runner/route.ts` (lines 12-64)  
**Vulnerability Type:** Missing Authorization

**Description:**
The job runner processes jobs based solely on user ID without validating job ownership or permissions, and lacks rate limiting for resource-intensive operations.

**Risk:** Users could potentially process jobs belonging to other users, resource exhaustion through job flooding.

**Remediation:**

1. Add explicit job ownership validation
2. Implement per-user job processing rate limits
3. Add job type authorization checks
4. Validate job payload schemas before processing

---

### 5. Gmail Query Injection Vulnerability

**Severity:** HIGH  
**File:** `/src/app/api/sync/preview/gmail/route.ts` (lines 28-32)  
**Vulnerability Type:** Query Injection

**Description:**
User-supplied Gmail query strings are passed directly to Google's Gmail API without validation, potentially allowing query injection attacks.

**Risk:** Unauthorized data access, potential bypass of Gmail security filters.

**Remediation:**

```typescript
const gmailQuerySchema = z
  .string()
  .max(200)
  .refine((query) => !query.includes(".."), "Invalid query syntax")
  .refine((query) => !/[<>{}]/.test(query), "Invalid characters");
```

---

## Moderate Findings

### 6. Missing Rate Limiting on Authentication Endpoints

**Severity:** MODERATE  
**Files:** Multiple OAuth and authentication endpoints  
**Vulnerability Type:** Rate Limiting Gap

**Description:**
OAuth initialization and callback endpoints lack rate limiting, enabling brute force attacks and OAuth flow abuse.

**Risk:** Account enumeration, OAuth flow abuse, denial of service.

**Remediation:**
Implement per-IP and per-user rate limiting with escalating delays.

### 7. Information Disclosure in Error Messages

**Severity:** MODERATE  
**Files:** Multiple endpoints using generic error handling  
**Vulnerability Type:** Information Disclosure

**Description:**
Several endpoints expose detailed error information that could aid attackers in reconnaissance.

**Risk:** Information leakage about internal systems, database structure, and authentication mechanisms.

**Remediation:**
Sanitize error messages for client responses while maintaining detailed server-side logging.

### 8. Batch Operation Race Condition

**Severity:** MODERATE  
**File:** `/src/app/api/sync/undo/route.ts` (lines 21-28)  
**Vulnerability Type:** Race Condition

**Description:**
The undo operation performs multiple database operations without transaction safety, potentially leading to inconsistent state.

**Risk:** Data corruption, partial rollback scenarios, inconsistent application state.

**Remediation:**
Wrap database operations in a transaction to ensure atomicity.

### 9. Missing CSRF Protection

**Severity:** MODERATE  
**Files:** All POST/PUT endpoints  
**Vulnerability Type:** CSRF

**Description:**
API endpoints lack CSRF token validation for state-changing operations.

**Risk:** Cross-site request forgery attacks leading to unauthorized actions.

**Remediation:**
Implement CSRF token validation or ensure proper CORS configuration with credentials handling.

---

## Low Findings

### 10. Hardcoded Default Values

**Severity:** LOW  
**Files:** Multiple settings endpoints  
**Vulnerability Type:** Configuration Issue

**Description:**
Default values for sync preferences are hardcoded rather than configurable, reducing flexibility and maintainability.

### 11. Excessive Database Query Exposure

**Severity:** LOW  
**File:** `/src/app/api/settings/sync/status/route.ts`  
**Vulnerability Type:** Information Disclosure

**Description:**
The status endpoint exposes detailed internal database query patterns and counts.

### 12. Missing Request Size Limits

**Severity:** LOW  
**Files:** Endpoints accepting JSON payloads  
**Vulnerability Type:** DoS

**Description:**
No explicit request size limits on JSON payloads could allow large payload attacks.

### 13. Feature Flag Information Disclosure

**Severity:** LOW  
**File:** `/src/app/api/settings/sync/status/route.ts` (lines 77-80)  
**Vulnerability Type:** Information Disclosure

**Description:**
Feature flags are exposed to clients, revealing internal application configuration.

### 14. Weak Error Handling in safeJson

**Severity:** LOW  
**File:** `/src/server/lib/http.ts` (line 36)  
**Vulnerability Type:** Error Handling

**Description:**
The `safeJson` function silently fails on malformed JSON without logging or proper error handling.

### 15. Database Connection Information Disclosure

**Severity:** LOW  
**File:** `/src/app/api/health/route.ts` (lines 10-20)  
**Vulnerability Type:** Information Disclosure

**Description:**
The health endpoint exposes database connectivity status which could aid in reconnaissance.

---

## Security Architecture Analysis

### Positive Security Controls

1. **Security Headers:** Middleware implements proper security headers (X-Frame-Options, X-Content-Type-Options, etc.)
2. **Request ID Tracking:** All requests include tracking headers for audit purposes
3. **Structured Error Handling:** Consistent error response format with proper logging
4. **Feature Toggles:** Environment-based feature control for production safety
5. **AI Guardrails:** Comprehensive rate limiting and quota management for AI features

### Missing Security Controls

1. **API Rate Limiting:** No global or endpoint-specific rate limiting
2. **Request Validation Middleware:** Inconsistent input validation across endpoints
3. **CORS Configuration:** Missing CORS policy definitions
4. **Request Size Limits:** No protection against large payload attacks
5. **CSRF Protection:** Missing cross-site request forgery protection
6. **API Versioning:** No versioning strategy for backward compatibility

---

## Recommended Security Enhancements

### Immediate Actions (Critical/High)

1. **Remove Development Auth Bypass:** Eliminate the `x-user-id` header bypass mechanism
2. **Implement OAuth State Validation:** Add proper JSON parsing and validation for OAuth state
3. **Add Input Schema Validation:** Implement Zod schemas for all endpoints accepting user input
4. **Secure Job Processing:** Add authorization checks and rate limiting to job runner
5. **Validate Gmail Queries:** Sanitize and validate Gmail query parameters

### Short-term Improvements (Moderate)

1. **Rate Limiting Infrastructure:** Implement Redis-based rate limiting across all endpoints
2. **Transaction Safety:** Wrap multi-step database operations in transactions
3. **Error Message Sanitization:** Create standardized error responses that don't leak information
4. **CSRF Protection:** Implement CSRF token validation or proper CORS configuration

### Long-term Security Strategy (Low)

1. **Security Middleware Layer:** Create centralized security middleware for validation, rate limiting, and logging
2. **API Gateway:** Consider implementing an API gateway for centralized security controls
3. **Security Monitoring:** Add security event monitoring and alerting
4. **Regular Security Testing:** Implement automated security scanning and penetration testing

---

## Risk Assessment Summary

**Total Findings:** 15  
**Critical:** 2 (13%)  
**High:** 3 (20%)  
**Moderate:** 4 (27%)  
**Low:** 6 (40%)

**Overall Risk Level:** HIGH

The application has several critical security vulnerabilities that require immediate attention, particularly around authentication bypass mechanisms and OAuth security. While the foundational security architecture shows good practices in some areas, inconsistent implementation across endpoints creates significant security gaps.

**Recommended Timeline:**

- **Week 1:** Address Critical findings (authentication bypass, OAuth security)
- **Week 2-3:** Resolve High severity issues (input validation, authorization)
- **Month 1:** Complete Moderate severity improvements
- **Ongoing:** Implement long-term security enhancements

---

## Appendix A: Endpoint Security Summary

| Endpoint                     | Auth         | Validation   | Rate Limit    | CORS    | Risk Level |
| ---------------------------- | ------------ | ------------ | ------------- | ------- | ---------- |
| `/api/health`                | None         | None         | None          | Missing | Low        |
| `/api/db-ping`               | None         | None         | None          | Missing | Low        |
| `/api/chat`                  | Header-based | Zod Schema   | AI Guardrails | Missing | Moderate   |
| `/api/google/oauth`          | Supabase     | Query Params | None          | Missing | High       |
| `/api/google/oauth/callback` | State-based  | None         | None          | Missing | Critical   |
| `/api/jobs/runner`           | Supabase     | None         | None          | Missing | High       |
| `/api/sync/preview/gmail`    | Supabase     | None         | None          | Missing | High       |
| `/api/sync/preview/calendar` | Supabase     | None         | None          | Missing | Moderate   |
| `/api/sync/approve/gmail`    | Supabase     | None         | None          | Missing | Moderate   |
| `/api/sync/approve/calendar` | Supabase     | None         | None          | Missing | Moderate   |
| `/api/settings/sync/prefs`   | Supabase     | None         | None          | Missing | High       |
| `/api/settings/sync/status`  | Supabase     | None         | None          | Missing | Low        |
| `/api/sync/undo`             | Supabase     | JSON Body    | None          | Missing | Moderate   |
| `/api/sync/preview/drive`    | Supabase     | None         | None          | Missing | Low        |

**Legend:**

- ✅ Implemented
- ❌ Missing
- ⚠️ Partial/Weak

---

_This audit was conducted using static code analysis techniques and best practices for API security. Dynamic testing and penetration testing are recommended for complete security validation._
