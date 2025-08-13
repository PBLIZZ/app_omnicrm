# OmniCRM Critical Security & Infrastructure Sprint Plan

## August 13 - August 27, 2025

### Executive Summary

Based on the comprehensive security and performance audit completed on August 13, 2025, this sprint addresses **CRITICAL security vulnerabilities** and **infrastructure bottlenecks** that must be resolved before production deployment. The audit identified **2 critical security vulnerabilities**, **1 critical build failure**, and **multiple high-priority performance and testing issues** requiring immediate attention.

**Sprint Priority Level:** CRITICAL  
**Total Estimated Effort:** 63 hours  
**Key Focus Areas:** Security, Performance, Testing Reliability  
**Success Criteria:** Zero critical vulnerabilities, restored deployment capability, 10x performance improvement

---

## Sprint Objectives & Success Criteria

### Primary Objectives (MUST ACHIEVE)

1. **SECURITY FIRST**: Eliminate all critical security vulnerabilities
   - ✅ Success: OpenRouter proxy secured with authentication and guardrails
   - ✅ Success: Database error sanitization implemented across all contact APIs
   - ✅ Success: No unauthorized access to AI models or sensitive data disclosure

2. **DEPLOYMENT CAPABILITY**: Restore production deployment reliability
   - ✅ Success: TypeScript compilation error resolved
   - ✅ Success: Build pipeline 100% successful
   - ✅ Success: Production deployments unblocked

3. **SCALABILITY FOUNDATION**: Implement critical performance infrastructure
   - ✅ Success: Database connection pooling supporting 500+ concurrent users
   - ✅ Success: AI rate limiting race conditions eliminated
   - ✅ Success: System handles 10x current user load

### Secondary Objectives (SHOULD ACHIEVE)

1. **TESTING RELIABILITY**: Achieve >90% E2E test pass rate
2. **SEARCH SECURITY**: Implement proper query escaping and validation
3. **PERFORMANCE OPTIMIZATION**: Cache implementation and batch operations

### Sprint Metrics

- **Security Vulnerabilities:** 2 Critical → 0 Critical
- **Build Success Rate:** 0% → 100%
- **Concurrent User Capacity:** 50-100 → 500-1000 users
- **E2E Test Pass Rate:** 69% → >90%
- **Component Test Coverage:** 13% → 80% (stretch goal)

---

## Task Breakdown by Priority

### 🔴 CRITICAL PRIORITY (P0) - Week 1, Days 1-3

#### SECURITY-001: Secure OpenRouter AI Proxy Endpoint

- **Severity:** CRITICAL
- **Effort:** 6 hours
- **Assignee:** Backend Security Developer
- **Risk:** HIGH - Financial exploitation, unauthorized AI access

**Implementation Plan:**

```typescript
// Current vulnerability: /api/openrouter has NO authentication
export async function POST(req: Request) {
  // CRITICAL FIX NEEDED:
  // 1. Add authentication requirement
  const userId = await getServerUserId();

  // 2. Validate input with Zod schemas
  const requestSchema = z.object({
    model: z
      .string()
      .max(100)
      .regex(/^[a-zA-Z0-9\/\-_:]+$/),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string().max(4000),
        }),
      )
      .max(50),
    max_tokens: z.number().int().min(1).max(4000).optional(),
  });

  // 3. Apply AI guardrails
  const result = await withGuardrails(userId, async () => {
    // Make API call with proper validation
  });
}
```

**Acceptance Criteria:**

- [ ] User authentication required for all OpenRouter proxy requests
- [ ] Comprehensive input validation with Zod schemas implemented
- [ ] AI guardrails applied to prevent quota bypass
- [ ] Rate limiting specific to external AI model access
- [ ] Security testing completed with actual AI model requests

#### SECURITY-002: Implement Database Error Sanitization

- **Severity:** CRITICAL
- **Effort:** 4 hours
- **Assignee:** Backend Security Developer
- **Risk:** HIGH - Information disclosure, attack surface enumeration

**Implementation Plan:**

```typescript
// Create error sanitization wrapper
async function safeDbOperation<T>(operation: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Log full error for debugging
      console.error("[DB_ERROR]", error.message, error.stack);

      // Return sanitized error to client
      if (error.message.includes("duplicate key")) {
        return { error: "resource_already_exists" };
      }
      // Map other database errors to safe responses
    }
    return { error: "database_operation_failed" };
  }
}
```

**Acceptance Criteria:**

- [ ] Database error handling wrapper implemented for all contact endpoints
- [ ] Internal database errors mapped to safe, generic client messages
- [ ] Structured error logging for debugging while protecting production
- [ ] Testing with various database constraint violations
- [ ] No sensitive database schema information exposed in responses

#### BUILD-001: Fix TypeScript Compilation Build Failure

- **Severity:** CRITICAL
- **Effort:** 2 hours
- **Assignee:** Frontend Developer
- **Risk:** MEDIUM - Blocks all production deployments

**Implementation Plan:**

```typescript
// Current error in crypto-edge.ts:
// Type error: Argument of type 'Uint8Array<ArrayBufferLike>' is not assignable to parameter of type 'BufferSource'

// Fix approach:
const digest = await crypto.subtle.digest("SHA-256", keyBytes as BufferSource);
// or
const digest = await crypto.subtle.digest("SHA-256", keyBytes.buffer);
```

**Acceptance Criteria:**

- [ ] BufferSource type casting issue resolved in crypto-edge.ts
- [ ] Build pipeline successful in development and CI
- [ ] Production deployment capability restored
- [ ] No regression in cryptographic functionality
- [ ] Type definitions updated if necessary

### 🟡 HIGH PRIORITY (P1) - Week 1, Days 4-7

#### PERF-001: Implement Database Connection Pooling

- **Severity:** HIGH
- **Effort:** 6 hours
- **Assignee:** Backend Performance Developer
- **Risk:** MEDIUM - Load testing required

**Implementation Plan:**

```typescript
// Replace single connection with connection pool
import { Pool } from "pg";

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10, // maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function getDb(): Promise<NodePgDatabase> {
  const client = await pool.connect();
  return drizzle(client);
}
```

**Acceptance Criteria:**

- [ ] pg.Pool implementation with 10-15 connections per instance
- [ ] Support for 500-1000 concurrent users vs current 50-100 limit
- [ ] Connection monitoring and health checks implemented
- [ ] Load testing with multiple concurrent requests
- [ ] Graceful connection handling and cleanup

#### SECURITY-003: Fix AI Rate Limiting Race Conditions

- **Severity:** HIGH
- **Effort:** 6 hours
- **Assignee:** Backend Security Developer
- **Risk:** MEDIUM - Concurrency testing required

**Implementation Plan:**

```typescript
// Implement atomic rate limiting
export async function checkAndIncrementRateLimit(
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const dbo = await getDb();

  // Use atomic operation with FOR UPDATE locks
  const { rows } = await dbo.execute(sql`
    WITH current_count AS (
      SELECT count(*) as count
      FROM ai_rate_limit_tokens 
      WHERE user_id = ${userId}::uuid
      FOR UPDATE
    ),
    try_insert AS (
      INSERT INTO ai_rate_limit_tokens (user_id, created_at)
      SELECT ${userId}::uuid, now()
      WHERE (SELECT count FROM current_count) < ${RPM}
      RETURNING 1
    )
    SELECT count(*) > 0 as allowed FROM try_insert
  `);

  return { allowed: Boolean(rows[0]?.["allowed"]), remaining: RPM - 1 };
}
```

**Acceptance Criteria:**

- [ ] Atomic rate limiting with Redis or database locks implemented
- [ ] Proper concurrency handling for quota checks across all AI endpoints
- [ ] Race condition scenarios tested with concurrent request simulation
- [ ] Rate limits cannot be bypassed through concurrent exploitation
- [ ] Monitoring and alerting on rate limiting effectiveness

#### SECURITY-004: Add PostgreSQL LIKE Pattern Escaping

- **Severity:** HIGH
- **Effort:** 4 hours
- **Assignee:** Backend Security Developer
- **Risk:** MEDIUM - Query performance testing needed

#### SECURITY-005: Complete Gmail Query Validation

- **Severity:** HIGH
- **Effort:** 4 hours
- **Assignee:** Backend Security Developer
- **Risk:** MEDIUM - Persistent issue from previous audit

#### TEST-001: Fix E2E Test Reliability Issues

- **Severity:** HIGH
- **Effort:** 8 hours
- **Assignee:** QA Developer
- **Risk:** LOW - Improves development confidence

#### TEST-002: Add Comprehensive Health Endpoint Testing

- **Severity:** HIGH
- **Effort:** 3 hours
- **Assignee:** QA Developer
- **Risk:** LOW - Critical for production monitoring

### 🟠 MODERATE PRIORITY (P2) - Week 2

#### PERF-002: Implement User Preferences Caching

- **Effort:** 4 hours
- **Expected Impact:** 80% reduction in database queries

#### PERF-003: Implement Batch Database Operations

- **Effort:** 6 hours
- **Expected Impact:** 70% reduction in database round-trips

#### TEST-003: Expand Component Testing Coverage

- **Effort:** 16 hours
- **Expected Impact:** 80% component coverage (stretch goal)

---

## Sprint Timeline & Milestones

### Week 1: Critical Infrastructure & Security (Aug 13-19)

**Monday-Tuesday (Aug 13-14): CRITICAL SECURITY**

- [ ] Day 1 AM: Fix TypeScript build failure (2h)
- [ ] Day 1 PM: Begin OpenRouter security implementation (4h)
- [ ] Day 2 AM: Complete OpenRouter security (2h)
- [ ] Day 2 PM: Implement database error sanitization (4h)

**Wednesday-Thursday (Aug 15-16): PERFORMANCE FOUNDATION**

- [ ] Day 3: Database connection pooling implementation (6h)
- [ ] Day 4: AI rate limiting race condition fixes (6h)

**Friday (Aug 17): SECURITY HARDENING**

- [ ] Day 5 AM: PostgreSQL LIKE pattern escaping (4h)
- [ ] Day 5 PM: Gmail query validation completion (4h)

**Weekend (Aug 18-19): TESTING RECOVERY**

- [ ] E2E test reliability fixes (8h)
- [ ] Health endpoint testing implementation (3h)

### Week 2: Performance & Quality (Aug 20-26)

**Monday-Tuesday (Aug 20-21): OPTIMIZATION**

- [ ] User preferences caching implementation (4h)
- [ ] Batch database operations (6h)

**Wednesday-Friday (Aug 22-24): COMPONENT TESTING**

- [ ] Critical component testing expansion (16h)
- [ ] Testing infrastructure improvements

**Weekend (Aug 25-26): VALIDATION & PREPARATION**

- [ ] Load testing and validation
- [ ] Documentation and handoff preparation

### Tuesday (Aug 27): SPRINT REVIEW & RETROSPECTIVE

---

## Resource Allocation & Dependencies

### Development Team Assignment

**Backend Security Developer (24 hours)**

- OpenRouter proxy security (6h)
- Database error sanitization (4h)
- AI rate limiting fixes (6h)
- PostgreSQL pattern escaping (4h)
- Gmail query validation (4h)

**Backend Performance Developer (16 hours)**

- Database connection pooling (6h)
- User preferences caching (4h)
- Batch database operations (6h)

**Frontend Developer (18 hours)**

- TypeScript build fix (2h)
- Component testing expansion (16h)

**QA Developer (11 hours)**

- E2E test reliability (8h)
- Health endpoint testing (3h)

### External Dependencies

**NONE** - All tasks can be completed with current team and infrastructure

### Risk Mitigation Strategies

#### High-Risk Items

1. **Database Connection Pooling** - Thorough load testing required
   - Mitigation: Gradual rollout with monitoring
   - Rollback: Feature flag with fallback to single connection

2. **OpenRouter Security Changes** - Potential AI functionality disruption
   - Mitigation: Comprehensive testing with actual AI models
   - Rollback: Temporary disable endpoint until fixed

3. **E2E Test Fixes** - Complex race conditions and timing issues
   - Mitigation: Incremental fixes with individual test validation
   - Rollback: Skip flaky tests temporarily with monitoring

---

## Success Metrics & Monitoring

### Sprint Success Criteria

#### ✅ Critical Success Metrics (MUST ACHIEVE)

- [ ] **Security Score:** 6.5/10 → 9.5/10 (audit score improvement)
- [ ] **Build Success Rate:** 0% → 100% (TypeScript compilation)
- [ ] **Concurrent User Capacity:** 50-100 → 500-1000 users
- [ ] **Critical Vulnerabilities:** 2 → 0 (complete elimination)

#### ✅ High Priority Success Metrics (SHOULD ACHIEVE)

- [ ] **E2E Test Pass Rate:** 69% → >90%
- [ ] **API Response Time P95:** <2 seconds for contact operations
- [ ] **Database Query Performance:** 60% improvement with connection pooling
- [ ] **AI Rate Limiting Bypass:** 0 successful bypass attempts

#### ✅ Moderate Priority Success Metrics (COULD ACHIEVE)

- [ ] **Component Test Coverage:** 13% → 80%
- [ ] **User Preference Query Reduction:** 80% fewer database calls
- [ ] **Sync Performance:** 70% faster batch operations

### Monitoring & Alerting Plan

#### Security Monitoring

- [ ] OpenRouter endpoint authentication failures → immediate alert
- [ ] Database error pattern monitoring → daily digest
- [ ] AI rate limiting bypass attempts → immediate alert
- [ ] Search query injection attempts → daily digest

#### Performance Monitoring

- [ ] Database connection pool utilization → alert at >90%
- [ ] API response time P95 → alert if >3 seconds
- [ ] Concurrent user capacity → alert at bottleneck threshold
- [ ] Build pipeline failures → immediate alert

#### Quality Monitoring

- [ ] E2E test failure rate → alert if >10%
- [ ] Component test coverage regression → weekly report
- [ ] Health endpoint availability → alert if down >1 minute

---

## Risk Assessment & Contingency Planning

### Overall Risk Level: MEDIUM-HIGH

**High-Risk Areas:**

1. **Database connection pooling** - Potential connection leaks or performance regression
2. **OpenRouter security changes** - Risk of breaking AI functionality
3. **E2E test timing issues** - Complex race conditions may persist

### Contingency Plans

#### If Critical Tasks Are Blocked

**Scenario:** Database connection pooling causes production issues

- **Action:** Immediate rollback to single connection pattern
- **Timeline:** <1 hour rollback capability
- **Impact:** Temporary scale limitation, but system stable

**Scenario:** OpenRouter security breaks AI functionality

- **Action:** Temporarily disable endpoint with proper error handling
- **Timeline:** <30 minutes to disable
- **Impact:** AI features temporarily unavailable but system secure

**Scenario:** TypeScript build fix causes new compilation errors

- **Action:** Revert to previous working state, investigate alternative fix
- **Timeline:** <15 minutes to revert
- **Impact:** Deployment still blocked, requires alternative approach

#### Sprint Scope Adjustment

**If 50% sprint velocity is achieved:**

- **Keep:** All P0 critical tasks (security + build fix)
- **Defer:** P2 moderate tasks (component testing expansion)
- **Focus:** P1 high tasks (performance + core testing)

**If 75% sprint velocity is achieved:**

- **Keep:** All P0 and P1 tasks
- **Defer:** Component testing expansion to next sprint
- **Add:** Performance monitoring and alerting

---

## Definition of Done

### Task-Level Definition of Done

- [ ] **Code Review:** All code changes reviewed by senior developer
- [ ] **Security Review:** Security-related changes reviewed by security specialist
- [ ] **Testing:** Unit tests passing, integration tests for new functionality
- [ ] **Documentation:** Updated documentation for configuration and deployment changes
- [ ] **Monitoring:** Appropriate monitoring and alerting implemented
- [ ] **Rollback Plan:** Clear rollback strategy documented and tested

### Sprint-Level Definition of Done

- [ ] **Security Audit:** All critical and high-priority security issues resolved
- [ ] **Performance Validation:** Load testing confirms performance improvements
- [ ] **Build Pipeline:** 100% success rate in CI/CD pipeline
- [ ] **Production Readiness:** All changes tested in staging environment
- [ ] **Monitoring Active:** Full monitoring and alerting operational
- [ ] **Documentation Complete:** Updated operational runbooks and security procedures

---

## Communication Plan

### Daily Standup Focus Areas

- **Monday:** Sprint kickoff, critical task prioritization
- **Tuesday-Thursday:** Progress on critical security and build issues
- **Friday:** Week 1 completion status, Week 2 planning
- **Week 2:** Performance optimization progress and quality improvements

### Stakeholder Updates

- **Daily:** Security and build status updates to leadership
- **Weekly:** Sprint progress report with metrics and risk assessment
- **End of Sprint:** Comprehensive audit remediation report

### Escalation Path

- **Immediate (P0 issues blocked):** Direct escalation to CTO
- **Daily (P1 issues at risk):** Sprint master and lead developer
- **Weekly (P2 scope changes):** Product owner and development team

---

This sprint plan addresses the critical findings from the August 13, 2025 security and performance audit, prioritizing immediate security vulnerabilities and infrastructure bottlenecks that prevent production deployment. Success will be measured by complete elimination of critical vulnerabilities, restored deployment capability, and significant performance improvements to support business growth.
