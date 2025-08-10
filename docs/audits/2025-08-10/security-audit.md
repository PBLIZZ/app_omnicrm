# Security Audit Report - OmniCRM Application

**Date:** August 10, 2025  
**Auditor:** Claude Code Security Analysis  
**Scope:** Full application security audit focusing on authentication, API security, data access controls, and input validation

---

## Executive Summary

The OmniCRM application demonstrates a **moderate security posture** with several strong foundational security controls in place, but also contains **critical vulnerabilities** that require immediate attention. The application properly implements Row-Level Security (RLS), uses Supabase for authentication, and has basic input validation. However, critical issues include insecure credential storage, missing CSRF protection, and authentication bypass vulnerabilities that could lead to unauthorized access and data breaches.

**Key Security Metrics:**

- **Critical Issues:** 3
- **High Priority Issues:** 4
- **Medium Priority Issues:** 5
- **Low Priority Issues:** 2

**Risk Level:** HIGH - Immediate action required for critical vulnerabilities before production deployment.

---

## Critical Vulnerabilities (Immediate Action Required)

### 1. **Plaintext Google OAuth Token Storage** - CRITICAL

**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/server/db/schema.ts:175`  
**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/app/api/google/oauth/callback/route.ts:38-48`

**Issue:** Google OAuth access tokens and refresh tokens are stored in plaintext in the `user_integrations` table.

```typescript
export const userIntegrations = pgTable("user_integrations", {
  // ...
  accessToken: text("access_token").notNull(), // ❌ PLAINTEXT STORAGE
  refreshToken: text("refresh_token"), // ❌ PLAINTEXT STORAGE
  // ...
});
```

**Impact:** If the database is compromised, attackers gain full access to users' Google accounts including Gmail, Calendar, and potentially Drive data.

**Remediation:**

- Implement application-level encryption for OAuth tokens using AES-256-GCM
- Use a dedicated encryption key stored in environment variables
- Consider using envelope encryption for additional security

### 2. **Authentication Bypass in Development Mode** - CRITICAL

**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/server/auth/user.ts:29-30`  
**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/app/api/chat/route.ts:10`

**Issue:** The authentication system falls back to accepting `x-user-id` header in non-production environments.

```typescript
const devHeader = hdrs.get?.("x-user-id");
if (process.env.NODE_ENV !== "production" && devHeader) return devHeader; // ❌ BYPASS
```

**Impact:** In staging/development environments, attackers can impersonate any user by simply setting an HTTP header.

**Remediation:**

- Remove or strictly limit the dev header fallback
- Use proper test authentication even in development
- Implement environment-specific authentication strategies

### 3. **Unvalidated OAuth State Parameter** - CRITICAL

**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/app/api/google/oauth/callback/route.ts:13-14`

**Issue:** The OAuth callback accepts and parses the state parameter without validation, allowing potential JSON injection.

```typescript
const stateRaw = req.nextUrl.searchParams.get("state");
if (!code || !stateRaw) return err(400, "missing_code_or_state");
const state = JSON.parse(stateRaw); // ❌ NO VALIDATION
const userId: string = state.userId;
```

**Impact:** Attackers can craft malicious state parameters to potentially inject data or cause application errors. State parameter should be validated against a server-side stored value to prevent CSRF attacks.

**Remediation:**

- Store OAuth state server-side with expiration
- Validate state parameter against stored values
- Add additional CSRF protection mechanisms

---

## High Priority Issues (Address Soon)

### 4. **Missing CSRF Protection on State-Changing API Endpoints** - HIGH

**Files:** Various API routes including sync approve/preview endpoints

**Issue:** API endpoints that modify data lack CSRF protection, relying solely on authentication.

**Impact:** Users could be tricked into performing unwanted actions through malicious websites.

**Remediation:**

- Implement CSRF tokens for all state-changing operations
- Use SameSite cookie attributes
- Consider implementing custom headers as CSRF protection

### 5. **Insufficient Input Validation on Job Processing** - HIGH

**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/app/api/jobs/runner/route.ts:41-49`

**Issue:** Job handler selection relies on user-controlled job.kind field without proper validation.

```typescript
const handler = handlers[job.kind as JobKind]; // ❌ INSUFFICIENT VALIDATION
if (!handler) {
  // ...continue processing
}
```

**Impact:** Potential for processing malicious or unexpected job types.

**Remediation:**

- Validate job.kind against known enum values
- Implement job payload schema validation
- Add additional authorization checks for sensitive job types

### 6. **Database Connection String Exposure Risk** - HIGH

**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/server/db/client.ts:24-26`

**Issue:** Direct usage of DATABASE_URL without validation or sanitization.

**Impact:** Potential for connection string injection if environment is compromised.

**Remediation:**

- Validate DATABASE_URL format before use
- Use connection pooling with proper limits
- Implement connection health monitoring

### 7. **Overprivileged Supabase Admin Client Usage** - HIGH

**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/server/supabase.ts:9-11`

**Issue:** Supabase admin client (bypasses RLS) is accessible throughout the application.

```typescript
export const supabaseServerAdmin = secret
  ? createClient(url, secret) // ❌ BYPASSES RLS
  : null;
```

**Impact:** Risk of accidental RLS bypass in business logic.

**Remediation:**

- Restrict admin client to specific system operations
- Create wrapper functions for admin operations
- Add explicit approval workflows for RLS bypass operations

---

## Medium Priority Issues (Security Improvements)

### 8. **Weak Error Handling in Authentication** - MEDIUM

**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/server/auth/user.ts:12-14`

**Issue:** Generic error handling may leak information about authentication state.

**Remediation:**

- Implement consistent error responses
- Avoid exposing internal error details
- Add proper error logging for security monitoring

### 9. **Missing Rate Limiting on OAuth Endpoints** - MEDIUM

**Files:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/app/api/google/oauth/route.ts`

**Issue:** OAuth initiation endpoint lacks rate limiting.

**Remediation:**

- Implement per-user rate limiting
- Add OAuth flow state tracking
- Monitor for abuse patterns

### 10. **Insufficient Logging for Security Events** - MEDIUM

**Issue:** Limited security event logging across authentication and authorization flows.

**Remediation:**

- Log all authentication attempts
- Track authorization failures
- Implement alerting for suspicious patterns

### 11. **Missing Content Security Policy** - MEDIUM

**File:** `/Users/peterjamesblizzard/projects/app_omnicrm/src/middleware.ts:10-14`

**Issue:** While basic security headers are present, CSP is missing.

**Remediation:**

- Implement strict Content Security Policy
- Add nonce-based script execution
- Monitor CSP violations

### 12. **Weak Session Security** - MEDIUM

**Issue:** Relying entirely on Supabase session management without additional controls.

**Remediation:**

- Implement session timeout controls
- Add concurrent session limits
- Track session activity for anomaly detection

---

## Low Priority Issues (Best Practices)

### 13. **Environment Variable Naming Inconsistency** - LOW

**Issue:** Mixed usage of bracket vs dot notation for environment variables.

**Remediation:**

- Standardize on bracket notation: `process.env["VAR_NAME"]`
- Create environment variable validation schema

### 14. **Missing API Versioning** - LOW

**Issue:** API endpoints lack versioning strategy.

**Remediation:**

- Implement API versioning (e.g., /api/v1/)
- Plan deprecation strategy for API changes

---

## Database Security Assessment

### Row-Level Security (RLS) Analysis - STRONG ✅

The RLS implementation in `/Users/peterjamesblizzard/projects/app_omnicrm/supabase/sql/03_rls_policies.sql` is comprehensive and well-designed:

**Strengths:**

- All tables properly enable RLS
- Consistent user_id = auth.uid() pattern
- Proper separation of read-only vs full CRUD tables
- Service role bypass for system operations

**Areas for Improvement:**

- Add policy validation tests
- Consider implementing audit trails for policy violations
- Monitor for RLS performance impact

### SQL Injection Protection - STRONG ✅

**Analysis:** The application uses Drizzle ORM with parameterized queries, providing strong protection against SQL injection. Raw SQL usage is limited to the guardrails module with proper parameterization.

---

## API Security Assessment

### Authentication Flow Security

- **Supabase Integration:** Well implemented with proper session handling
- **OAuth Implementation:** Critical vulnerabilities in state validation and token storage
- **Authorization:** RLS provides good data access control

### Input Validation

- **Chat API:** Good Zod schema validation
- **OAuth Endpoints:** Insufficient validation, particularly for state parameter
- **Job Processing:** Needs stronger payload validation

---

## Environment Security

### Secret Management

**Current State:** Environment variables stored in `.env` files with examples provided.

**Recommendations:**

- Rotate Google OAuth credentials immediately after audit
- Implement proper secret rotation procedures
- Use dedicated secret management service for production
- Add environment variable validation on startup

---

## Compliance Considerations

### GDPR Implications

- **Right to Erasure:** Ensure complete data deletion capabilities
- **Data Processing Consent:** Verify OAuth consent covers intended usage
- **Data Retention:** Implement data retention policies

### OWASP Top 10 2021 Alignment

- **A01 Broken Access Control:** ✅ Mitigated by RLS
- **A02 Cryptographic Failures:** ❌ Critical issue with token storage
- **A03 Injection:** ✅ Well protected via ORM usage
- **A07 Identification/Authentication Failures:** ❌ Dev bypass vulnerability

---

## Recommendations Summary

### Immediate Actions (Next 48 Hours)

1. **Encrypt OAuth tokens in database**
2. **Fix authentication bypass vulnerability**
3. **Implement proper OAuth state validation**
4. **Add CSRF protection to API endpoints**

### Short-term (Next 2 Weeks)

1. Implement comprehensive input validation
2. Add security event logging
3. Strengthen job processing security
4. Implement rate limiting

### Long-term (Next Month)

1. Add security monitoring and alerting
2. Implement API versioning
3. Enhance session security controls
4. Complete GDPR compliance review

---

## Security Testing Recommendations

### Penetration Testing Priorities

1. OAuth flow security testing
2. Authentication bypass attempts
3. CSRF protection validation
4. SQL injection testing (verification)
5. Authorization boundary testing

### Ongoing Security Practices

1. Regular dependency vulnerability scanning
2. Security code review processes
3. Automated security testing in CI/CD
4. Regular security audit schedule

---

## Conclusion

The OmniCRM application has a solid security foundation with proper database access controls and framework-level protections. However, critical vulnerabilities in authentication handling and credential storage pose significant risks that must be addressed before production deployment. With immediate fixes to the critical issues and systematic implementation of the recommended improvements, the application can achieve a strong security posture suitable for production use.

**Next Steps:**

1. Address all critical vulnerabilities immediately
2. Implement security testing in development workflow
3. Schedule quarterly security reviews
4. Establish incident response procedures

---

_This audit was conducted using static code analysis techniques. Dynamic testing and penetration testing are recommended to validate these findings and identify additional runtime vulnerabilities._
