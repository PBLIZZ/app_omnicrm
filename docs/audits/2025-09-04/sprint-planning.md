# OmniCRM Emergency Sprint Planning - September 4, 2025

**Document Type:** Emergency Recovery and Development Sprint Plan  
**Audit Date:** September 4, 2025  
**Planning Date:** September 4, 2025  
**Status:** EMERGENCY INTERVENTION REQUIRED  
**Overall Health:** CRITICAL - Multiple system failures requiring immediate action

---

## Executive Summary

Based on comprehensive audits across 8 critical areas, the OmniCRM application has experienced **CATASTROPHIC REGRESSIONS** in testing infrastructure and type safety that require immediate emergency intervention to prevent complete development paralysis.

### Critical Status Overview

| Area                       | Status              | Previous     | Change | Priority  |
| -------------------------- | ------------------- | ------------ | ------ | --------- |
| **Testing Infrastructure** | ❌ CRITICAL FAILURE | ✅ GOOD      | -100%  | EMERGENCY |
| **TypeScript Safety**      | ❌ CRITICAL FAILURE | ✅ EXCELLENT | -95%   | EMERGENCY |
| **Security Posture**       | ✅ EXCELLENT        | ✅ GOOD      | +21%   | MAINTAIN  |
| **Code Quality**           | ✅ EXCEPTIONAL      | ✅ HIGH      | +40%   | MAINTAIN  |
| **Architecture**           | ✅ STRONG           | ✅ MODERATE  | +25%   | MAINTAIN  |
| **Performance**            | ✅ GOOD             | ⚠️ MODERATE  | +200%  | OPTIMIZE  |
| **UX Quality**             | ✅ HIGH             | ⚠️ MODERATE  | +15%   | ENHANCE   |
| **API Coverage**           | ❌ MASSIVE GAPS     | ⚠️ MODERATE  | -66%   | CRITICAL  |

### Immediate Emergency Actions Required

1. **EMERGENCY (24-48 hours):** Restore testing infrastructure (0% E2E pass rate → 90%+)
2. **EMERGENCY (24-48 hours):** Fix TypeScript violations (1,590 violations → <50)
3. **CRITICAL (Week 1):** Address security vulnerabilities (calendar authorization bypass)
4. **CRITICAL (Week 1):** Implement functional search (non-functional → production-ready)

---

## EMERGENCY SPRINT (24-48 Hours) - Code Red Status

### **Priority Level: EMERGENCY** 🚨

**Sprint Goal:** Restore basic development capability and prevent complete development paralysis

### Emergency Task 1: Testing Infrastructure Recovery

**Issue:** Complete testing infrastructure collapse

- Unit tests: 53.7% pass rate (76/164 tests failing)
- E2E tests: 0% pass rate (77/98 tests failing)
- Mock strategies completely broken

**Timeline:** 24 hours  
**Assigned:** Senior Developer + DevOps  
**Blockers:** Development cannot proceed without working tests

**Immediate Actions:**

1. **Environment Configuration Emergency Fix (2-4 hours)**

   ```bash
   # Create comprehensive .env.test file with all required variables
   cp .env.local .env.test
   # Add missing test-specific variables:
   # - DATABASE_URL (test database)
   # - All Google OAuth credentials
   # - Service keys and feature flags
   ```

2. **Database Test Configuration Emergency Setup (2-4 hours)**

   ```bash
   # Set up dedicated test database
   # Configure test-specific connection strings
   # Verify database connectivity from test environment
   # Set up test data seeding
   ```

3. **Mock Strategy Emergency Rebuild (4-6 hours)**
   - Rebuild core mocking utilities
   - Fix fetch mocking across all tests
   - Repair database mocking strategies
   - Fix external API mocking (Google, OpenAI)

4. **Basic Test Restoration (4-6 hours)**
   - Fix vitest setup configuration
   - Repair database connection mocks
   - Restore basic test utilities
   - Focus on critical endpoints: health, db-ping, auth

**Success Criteria:**

- At least 80% of unit tests passing
- Critical API endpoints (health, db-ping, auth) working
- Database connections functional in test environment
- Basic mock strategies restored

### Emergency Task 2: Critical TypeScript Safety Recovery

**Issue:** Massive TypeScript regression

- 1,590 total linting problems (1,226 errors + 364 warnings)
- 148+ explicit `any` usages across 48 files
- 200+ missing return type annotations

**Timeline:** 24 hours  
**Assigned:** TypeScript Expert + Senior Developer

**Immediate Actions:**

1. **Fix Top 10 Most Problematic Files (8-12 hours)**
   - `/src/server/services/omni-connect-api.service.ts` (4 `any` violations)
   - `/src/types/openai-agents-realtime.d.ts` (3 explicit any violations)
   - `/src/app/(authorisedRoute)/contacts/_components/contacts-columns-new.tsx`
   - Critical service layer files

2. **Implement Emergency Pre-commit Hooks (2-4 hours)**

   ```bash
   # Add to package.json scripts
   "pre-commit": "pnpm typecheck && pnpm lint:strict"

   # Install husky for git hooks
   pnpm add --save-dev husky
   npx husky init
   echo "pnpm pre-commit" > .husky/pre-commit
   ```

3. **Establish Type Safety CI Gates (2-4 hours)**

   ```yaml
   # Add to GitHub Actions
   - name: TypeScript Type Check
     run: pnpm typecheck

   - name: Strict Linting Check
     run: pnpm lint:strict
   ```

**Success Criteria:**

- Reduce total problems from 1,590 to <100
- Zero ESLint errors in CI pipeline
- Pre-commit hooks preventing further regressions
- Top 10 files completely type-safe

---

## SPRINT 1 (Week 1) - Critical Recovery

### **Priority Level: CRITICAL** 🔴

**Sprint Goal:** Restore production readiness and address security vulnerabilities

### Task 1.1: Complete Testing Infrastructure Restoration

**Timeline:** 3-5 days  
**Effort:** High  
**Dependencies:** Emergency Sprint completion

**Objectives:**

1. **E2E Test Environment Complete Restoration**
   - Achieve 90%+ E2E test pass rate from current 0%
   - Fix development server reliability issues
   - Restore authentication system for tests
   - Ensure database accessibility from E2E environment

2. **API Testing Coverage Recovery**
   - Increase from 13.9% (10/72) to 50% (36/72) API endpoint coverage
   - Priority endpoints:
     - Authentication: `/api/auth/signin/google`
     - Contact Management: `/api/contacts/[id]/*` (5 endpoints)
     - AI Features: `/api/chat/*` (4 endpoints)
     - Google Integration: `/api/google/*` (6 endpoints)

3. **Component Test Foundation Rebuild**
   - Fix React Testing Library configuration issues
   - Restore component rendering tests
   - Fix mock prop strategies

**Success Criteria:**

- 95%+ unit test pass rate
- 90%+ E2E test pass rate
- 36+ API endpoints tested
- Component tests functional

### Task 1.2: Security Vulnerability Remediation

**Timeline:** 2-3 days  
**Effort:** Medium-High  
**Priority:** CRITICAL (Calendar Authorization Bypass)

**Critical Security Fixes:**

1. **Calendar Event Authorization Bypass (NEW CRITICAL)**

   ```typescript
   // Fix calendar endpoints with proper user validation
   export async function GET(req: NextRequest): Promise<Response> {
     let userId: string;
     try {
       userId = await getServerUserId();
     } catch (e: unknown) {
       const error = e as { message?: string; status?: number };
       return err(error?.status ?? 401, error?.message ?? "unauthorized");
     }

     // Ensure all calendar queries are user-scoped
     const events = await getCalendarEvents({ userId });
     return ok(events);
   }
   ```

2. **Gmail Query Injection (PERSISTENT HIGH)**

   ```typescript
   const GmailQuerySchema = z
     .string()
     .trim()
     .min(1)
     .max(200)
     .regex(/^[a-zA-Z0-9\s\-_:()."'@+]+$/, "Invalid characters")
     .refine((query) => {
       // Implement allowlist and validation
     });
   ```

3. **Bulk Operation Rate Limiting**
   - Implement bulk-operation-specific rate limits
   - Add comprehensive validation for bulk operations
   - Enhance audit logging for bulk modifications

**Success Criteria:**

- Calendar authorization bypass resolved
- Gmail query injection eliminated
- Bulk operations properly rate-limited
- Security audit score maintained at 8.7/10

### Task 1.3: Functional Search Implementation

**Timeline:** 2-3 days  
**Effort:** Medium  
**Priority:** HIGH (Major UX gap)

**Implementation:**

```typescript
// Backend search endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  // Search across contacts, notes, interactions
  const results = await searchService.performSearch(query);
  return NextResponse.json(results);
}

// Frontend search hook
export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchGet(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: query.length > 2,
  });
}
```

**Features:**

- Cross-entity search (contacts, notes, interactions)
- Real-time search with debouncing
- Keyboard shortcut (⌘K) integration
- Mobile-responsive search interface

**Success Criteria:**

- Functional search modal replacing placeholder
- Search across all major entities
- Response time <500ms for typical queries
- Mobile-optimized interface

---

## SPRINT 2 (Week 2-3) - TypeScript Recovery & Performance

### **Priority Level: HIGH** 🟠

**Sprint Goal:** Complete type safety restoration and performance optimization

### Task 2.1: Complete TypeScript Safety Restoration

**Timeline:** 5-7 days  
**Effort:** High  
**Dependencies:** Emergency Sprint type safety fixes

**Objectives:**

1. **Service Layer Type Safety**
   - Fix all `/src/server/services/` files with explicit `any` usage
   - Implement proper interfaces for external API responses
   - Add comprehensive error type definitions

2. **Component Return Types**
   - Add explicit return types to all React components
   - Implement proper Props interfaces for all components
   - Fix all hook usage violations

3. **Database Type Integration**
   - Ensure all database operations use proper Drizzle types
   - Fix unsafe member access in repository patterns
   - Add runtime validation where needed

**Success Criteria:**

- Total TypeScript problems <10 (down from 1,590)
- Zero explicit `any` types (except documented exceptions)
- All components have proper return types
- 98%+ TypeScript coverage maintained

### Task 2.2: Performance Optimization Implementation

**Timeline:** 3-4 days  
**Effort:** Medium  
**Priority:** HIGH (User experience impact)

**Critical Optimizations:**

1. **Frontend Bundle Optimization**

   ```typescript
   // next.config.ts enhancements
   const nextConfig: NextConfig = {
     experimental: {
       optimizePackageImports: ["@tanstack/react-table", "lucide-react"],
     },
     webpack: (config) => {
       config.optimization.splitChunks = {
         chunks: "all",
         cacheGroups: {
           vendor: {
             test: /[\\/]node_modules[\\/]/,
             name: "vendors",
             chunks: "all",
           },
         },
       };
     },
   };
   ```

2. **LLM Cost Optimization**

   ```typescript
   // Model selection optimization
   const optimizedModelConfig = {
     simple_insights: "gpt-4o-mini", // $0.150/1K vs $15/1K
     complex_analysis: "gpt-4o", // Only when needed
     embeddings: "text-embedding-3-small", // $0.020/1K vs $0.100/1K
   };
   ```

3. **Core Web Vitals Monitoring**
   - Implement Next.js performance monitoring integration
   - Add performance regression detection
   - Optimize component loading patterns

**Expected Impact:**

- 60% reduction in initial bundle size
- 30-40% cost reduction in LLM usage
- <2.5s Largest Contentful Paint
- Proactive performance monitoring

### Task 2.3: Job Management Dashboard (Baseline Issue)

**Timeline:** 4-6 days  
**Effort:** High  
**Priority:** HIGH (Operational visibility)

**Implementation:**

- Complete job management UI as specified in August audit
- Real-time job status monitoring
- User-friendly job history and controls
- Error reporting and retry mechanisms

**Success Criteria:**

- Complete operational visibility into background processes
- User can monitor sync operations
- Clear error reporting and resolution guidance
- Production-ready job management interface

---

## SPRINT 3 (Week 4-5) - UX Enhancement & API Coverage

### **Priority Level: MODERATE** 🟡

**Sprint Goal:** Complete user experience and expand API coverage

### Task 3.1: UX Placeholder Resolution

**Timeline:** 3-4 days  
**Effort:** Medium  
**Priority:** HIGH (User trust)

**Placeholder Features to Resolve:**

1. **AI Assistant Button** - Either implement basic functionality or change to "Beta"
2. **Coming Soon Pages** - Add basic functionality or remove from navigation
3. **Non-functional Buttons** - Remove or implement core functionality

**Mobile Optimization:**

```tsx
// Mobile-optimized button sizing
<Button
  size="sm"
  className="h-11 w-11 p-0 md:h-7 md:w-7 touch-manipulation"
  style={{ minHeight: '44px', minWidth: '44px' }}
>
```

### Task 3.2: API Coverage Expansion

**Timeline:** 4-5 days  
**Effort:** High  
**Priority:** MODERATE (Quality assurance)

**Target Coverage:** 50+ API endpoints (up from 10/72)

**Priority Endpoints:**

- Contact Management: `/api/contacts/*` (remaining 8 endpoints)
- Task Management: `/api/omni-momentum/*` (5 endpoints)
- Calendar Features: `/api/calendar/*` (6 endpoints)
- Job Processing: `/api/jobs/*` (3 endpoints)

### Task 3.3: Enhanced Accessibility Features

**Timeline:** 2-3 days  
**Effort:** Medium  
**Priority:** MODERATE (Compliance)

**Enhancements:**

- Live region announcements for dynamic content
- Enhanced screen reader support for complex components
- Focus trap improvements for modal dialogs
- Complete WCAG 2.1 AA compliance

---

## SPRINT 4 (Week 6+) - Advanced Features & Monitoring

### **Priority Level: LOW** 🟢

**Sprint Goal:** Advanced features and comprehensive monitoring

### Task 4.1: Performance Monitoring & Analytics

**Timeline:** 3-5 days  
**Effort:** Medium-High

**Implementation:**

- Comprehensive APM integration
- Real-time performance metrics
- User experience analytics
- Cost optimization monitoring

### Task 4.2: Advanced Testing Features

**Timeline:** 2-4 days  
**Effort:** Medium

**Features:**

- Visual regression testing
- Cross-browser E2E testing
- Mobile responsive testing
- Performance regression detection

---

## Risk Assessment & Mitigation

### Critical Risks

| Risk                                  | Likelihood | Impact   | Mitigation                                 |
| ------------------------------------- | ---------- | -------- | ------------------------------------------ |
| **Complete Development Paralysis**    | HIGH       | CRITICAL | Emergency Sprint execution within 48 hours |
| **Security Breach via Calendar Bug**  | MEDIUM     | HIGH     | Immediate security fix in Sprint 1         |
| **TypeScript Debt Accumulation**      | HIGH       | HIGH     | Strict CI gates and pre-commit hooks       |
| **User Trust Loss from Placeholders** | MEDIUM     | MEDIUM   | UX placeholder resolution in Sprint 3      |

### Mitigation Strategies

1. **Emergency Response Protocol**
   - Immediate resource allocation to Emergency Sprint
   - Daily standups during emergency recovery
   - Escalation path for blockers

2. **Quality Gates**
   - No new features until testing reaches 90% pass rate
   - TypeScript violations block all PRs
   - Security fixes take priority over feature development

3. **Communication Plan**
   - Daily status updates during emergency phase
   - Stakeholder notifications of critical issues
   - User communication about temporary limitations

---

## Resource Allocation

### Emergency Sprint (24-48 hours)

- **Senior Developer (Full-time):** Testing infrastructure
- **TypeScript Expert (Full-time):** Type safety recovery
- **DevOps Engineer (50%):** Environment and CI fixes
- **Security Specialist (25%):** Critical vulnerability assessment

### Sprint 1 (Week 1)

- **Senior Developer (Full-time):** Testing completion and security fixes
- **Frontend Developer (75%):** Search implementation and UX fixes
- **Backend Developer (50%):** API security remediation

### Sprint 2-3 (Week 2-4)

- **Frontend Developer (Full-time):** TypeScript restoration and UX
- **Backend Developer (75%):** Performance optimization and job management
- **QA Engineer (50%):** Testing expansion and validation

### Sprint 4+ (Week 5+)

- **Full Team (Normal allocation):** Advanced features and optimization

---

## Success Metrics & Validation

### Emergency Sprint Success Criteria

- [ ] 80%+ unit test pass rate
- [ ] Critical API endpoints functional
- [ ] TypeScript violations <100
- [ ] Pre-commit hooks preventing regressions

### Sprint 1 Success Criteria

- [ ] 95%+ unit test reliability
- [ ] 90%+ E2E test pass rate
- [ ] Security vulnerabilities resolved
- [ ] Functional search implementation

### Sprint 2 Success Criteria

- [ ] TypeScript violations <10
- [ ] 60% improvement in frontend performance
- [ ] 30% reduction in LLM costs
- [ ] Job management dashboard operational

### Sprint 3 Success Criteria

- [ ] All placeholder features resolved
- [ ] 50+ API endpoints tested
- [ ] WCAG 2.1 AA compliance achieved
- [ ] Mobile optimization complete

### Overall Success Metrics

- [ ] 98%+ overall test reliability
- [ ] Zero critical security vulnerabilities
- [ ] <2.5s page load times
- [ ] > 90% user satisfaction in testing

---

## Communication Plan

### Daily Standups (Emergency Phase)

- **Time:** 9:00 AM daily
- **Duration:** 15 minutes
- **Focus:** Blockers and progress on critical issues

### Weekly Sprint Reviews

- **Stakeholder Updates:** Progress against sprint goals
- **Risk Assessment:** Emerging issues and mitigation plans
- **Resource Planning:** Allocation adjustments as needed

### Emergency Escalation

- **Critical Blockers:** Immediate escalation to project lead
- **Security Issues:** Direct communication with security team
- **Resource Conflicts:** Project manager intervention within 2 hours

---

## Conclusion

This sprint plan addresses the most critical failures identified in the comprehensive audit while maintaining the excellent progress achieved in security, architecture, and code quality. The emergency intervention approach is necessary to prevent complete development paralysis while establishing sustainable practices for continued improvement.

**Key Focus Areas:**

1. **Emergency Recovery:** Testing and TypeScript safety
2. **Security Hardening:** Critical vulnerability remediation
3. **User Experience:** Functional features and mobile optimization
4. **Quality Assurance:** Comprehensive testing and monitoring

The plan provides a clear path from the current critical state to a production-ready, enterprise-grade CRM platform that leverages the strong architectural foundation already established.

---

_This sprint plan provides the roadmap for recovering from critical regressions while building upon the substantial achievements documented in the September 4, 2025 audit cycle._
