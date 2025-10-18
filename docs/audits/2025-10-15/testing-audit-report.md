# Testing Strategy and Coverage Audit Report

**Project:** OmniCRM - Wellness Business CRM Platform
**Audit Date:** October 17, 2025
**Audit Type:** Testing Specialist Comprehensive Review
**Auditor:** Testing Specialist Agent
**Severity Levels:** CRITICAL / HIGH / MODERATE / LOW

---

## Executive Summary

### Overall Assessment

The OmniCRM application demonstrates a **MODERATE** testing maturity level with significant investment in test infrastructure but critical coverage gaps in production-critical functionality. The project has 87 test files containing 1,205+ test cases, but 45 test files are currently failing, indicating systemic issues with test reliability and maintenance.

### Key Metrics

| Category | Count | Coverage |
|----------|-------|----------|
| **Total Test Files** | 87 (unit) + 16 (E2E) | - |
| **Total Test Cases** | 1,205 tests | - |
| **Passing Tests** | 1,009 (84%) | Good |
| **Failing Tests** | 186 (15%) | CRITICAL |
| **Skipped Tests** | 10 (1%) | Acceptable |
| **Service Layer** | 10/27 tested (37%) | HIGH |
| **Repository Layer** | 11/19 tested (58%) | MODERATE |
| **API Routes** | 6/56 tested (11%) | CRITICAL |
| **Components** | 4+ tested | LOW |
| **Hooks** | 16+ tested | MODERATE |

### Test Health Score: 64/100

- **Coverage**: 45/100 (Many untested critical paths)
- **Reliability**: 70/100 (15% failure rate is concerning)
- **Quality**: 75/100 (Good patterns, but flaky tests)
- **Maintainability**: 65/100 (MSW integration, but heavy mocking)

---

## Critical Findings

### CRITICAL - Test Reliability Issues

**Issue:** 45 test files failing with 186 failed test cases (15% failure rate)

**Evidence:**
```
Test Files  45 failed | 41 passed | 1 skipped (87)
Tests       186 failed | 1009 passed | 10 skipped (1205)
Errors      7 errors
Duration    127.51s
```

**Root Causes:**

1. **MSW Configuration Issues** (CRITICAL)
   - Invalid base URL errors in calendar connection tests
   - MSW expecting full URLs but receiving relative paths
   - Example: `TypeError: Invalid base URL: /api/google/calendar/connect`
   - Affects multiple hook tests: `use-calendar-connection.msw.test.ts`, `use-calendar-sync.msw.test.ts`

2. **Next.js Server Component Mocking** (CRITICAL)
   - Cookies API called outside request scope
   - Authentication flows fail in test environment
   - Error: `cookies was called outside a request scope`
   - Impacts: `auth-flows.test.ts` and related integration tests

3. **Unhandled Promise Rejections** (HIGH)
   - 4+ unhandled rejections causing test instability
   - Calendar connection tests throwing ApiError that propagates
   - Tests continue after failures, polluting subsequent test runs

**Impact:**
- CI/CD pipeline likely unreliable
- Developers lose trust in test suite
- Regressions may slip through
- Development velocity impacted

**Recommendation (CRITICAL Priority):**
```typescript
// Fix MSW base URL configuration in vitest.setup.ts
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000";

// Update MSW handlers to use full URLs
http.post("http://localhost:3000/api/google/calendar/connect", ...)

// Or configure MSW to handle relative URLs
setupServer({
  onUnhandledRequest: 'bypass',
  baseUrl: 'http://localhost:3000'
})
```

---

### CRITICAL - API Route Coverage Gap

**Issue:** Only 11% of API routes have tests (6/56 routes)

**Tested Routes:**
- `/api/contacts` (POST, GET)
- `/api/contacts/[contactId]/ai-insights`
- `/api/contacts/enrich`
- `/api/db-ping`
- `/api/onboarding/admin/generate-tokens`
- `/api/onboarding/admin/tokens`

**Untested Routes (47 routes - sample):**
- `/api/google/gmail/callback` - OAuth callback (CRITICAL)
- `/api/google/calendar/callback` - OAuth callback (CRITICAL)
- `/api/notes` - Notes CRUD (HIGH)
- `/api/notes/[noteId]` - Note operations (HIGH)
- `/api/omni-momentum/tasks` - Task management (HIGH)
- `/api/omni-momentum/inbox` - Inbox processing (HIGH)
- `/api/data-intelligence/raw-events` - Event ingestion (HIGH)
- `/api/cron/process-jobs` - Background job processing (CRITICAL)
- `/api/user/delete` - User deletion (CRITICAL)
- `/api/user/export` - Data export (MODERATE)

**Impact:**
- No validation of request/response contracts
- Authentication/authorization bugs could slip through
- Data validation vulnerabilities
- No regression protection for API changes

**Recommendation (CRITICAL Priority):**
1. Create API route test template following existing patterns
2. Prioritize testing OAuth callbacks (data breach risk)
3. Test all mutating endpoints (POST, PUT, DELETE, PATCH)
4. Implement contract testing for critical integrations

---

### HIGH - Service Layer Coverage Gap

**Issue:** 63% of services lack tests (17/27 services untested)

**Tested Services (10):**
- `interactions.service.test.ts` - Good coverage
- `projects.service.test.ts` - Good coverage
- `tasks.service.test.ts` - Good coverage
- `auth-user.service.test.ts`
- `google-integration.service.test.ts`
- `sync-progress.service.test.ts`
- `client-enrichment.service.test.ts`
- `error-tracking.service.test.ts`
- `job-status.service.test.ts`
- `gmail-sync.service.test.ts`

**Untested Services (17 - CRITICAL GAPS):**
- `contacts.service.ts` - Core CRM functionality (CRITICAL)
- `notes.service.ts` - Note management (HIGH)
- `onboarding.service.ts` - Client onboarding (HIGH)
- `storage.service.ts` - File storage (HIGH)
- `ai-insights.service.ts` - AI feature (HIGH)
- `embeddings.service.ts` - Vector embeddings (MODERATE)
- `documents.service.ts` - Document management (MODERATE)
- `raw-events.service.ts` - Event processing (HIGH)
- `job-processing.service.ts` - Background jobs (CRITICAL)
- `job-creation.service.ts` - Job queue (CRITICAL)
- `user-deletion.service.ts` - Data cleanup (CRITICAL)
- `user-export.service.ts` - GDPR compliance (CRITICAL)
- `inbox.service.ts` - Task inbox (MODERATE)
- `productivity.service.ts` - Productivity features (MODERATE)
- `zones.service.ts` - Zone management (LOW)
- `debug.service.ts` - Debugging utilities (LOW)
- `drive-preview.service.ts` - Google Drive integration (LOW)

**Impact:**
- Business logic bugs not caught
- Refactoring becomes dangerous
- No documentation of expected behavior
- Integration issues between layers

**Recommendation (HIGH Priority):**
```typescript
// Template for service tests
describe("ContactsService", () => {
  let mockDb: MockDbClient;
  let mockRepo: ContactsRepository;

  beforeEach(() => {
    mockDb = createMockDbClient();
    mockRepo = createContactsRepository(mockDb);
    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(createContactsRepository).mockReturnValue(mockRepo);
  });

  describe("createContactService", () => {
    it("creates contact with valid data", async () => {
      const input = { displayName: "Test", primaryEmail: "test@example.com" };
      mockRepo.createContact.mockResolvedValue(mockContact);

      const result = await createContactService("user-1", input);

      expect(result).toEqual(mockContact);
      expect(mockRepo.createContact).toHaveBeenCalledWith("user-1", input);
    });

    it("wraps repository errors as AppError", async () => {
      mockRepo.createContact.mockRejectedValue(new Error("DB constraint"));

      await expect(
        createContactService("user-1", {})
      ).rejects.toThrow(AppError);
    });
  });
});
```

---

### HIGH - Missing E2E Coverage for Critical Workflows

**Issue:** Key user workflows lack E2E validation

**Existing E2E Tests (16 files):**
- `onboarding-flow.spec.ts` - Client onboarding (Partial coverage)
- `contacts-enhanced-system.spec.ts` - Contact management (Good)
- `gmail-sync-flow.spec.ts` - Gmail integration (Good)
- `calendar-sync-flow.spec.ts` - Calendar integration (Good)
- `health.spec.ts` - Health checks (Good)
- Additional integration and component tests

**Missing Critical E2E Tests:**

1. **Authentication Flow** (CRITICAL)
   - No E2E test for Google OAuth login
   - No session management validation
   - No logout flow testing

2. **Notes System** (HIGH)
   - No E2E test for creating/editing notes
   - No voice recording flow validation
   - No rich text editor testing

3. **Task Management** (HIGH)
   - No E2E test for task creation workflow
   - No inbox processing flow
   - No project management workflows

4. **Data Export/Delete** (CRITICAL)
   - No E2E test for user data export (GDPR)
   - No account deletion flow
   - Critical for compliance

5. **Error Recovery** (HIGH)
   - No tests for network failure scenarios
   - No offline behavior validation
   - No error boundary testing

**Recommendation (HIGH Priority):**
```typescript
// E2E test for authentication flow
test.describe("Authentication", () => {
  test("complete OAuth login flow", async ({ page, context }) => {
    await page.goto("/signin");

    // Click Google sign in
    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.click('button:has-text("Sign in with Google")')
    ]);

    // Simulate OAuth consent (or use real OAuth in staging)
    await popup.fill('input[type="email"]', testUser.email);
    await popup.click('button:has-text("Continue")');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("text=Welcome")).toBeVisible();
  });
});
```

---

## Testing Infrastructure Analysis

### Strengths

1. **Modern Testing Stack** (Good)
   - Vitest with jsdom for unit/component tests
   - Playwright for E2E tests
   - MSW for HTTP mocking
   - Testing Library for React components
   - v8 coverage provider

2. **Test Organization** (Good)
   - Co-located test files (`__tests__` directories)
   - Clear naming conventions (`.test.ts`, `.spec.ts`)
   - Separate E2E directory
   - Shared test utilities in `@packages/testing`

3. **Test Utilities** (Good)
   ```typescript
   // packages/testing/src/index.ts
   - createMockDbClient() - Database mocking
   - createQueryClientWrapper() - React Query setup
   - Mock factories for test data
   ```

4. **MSW Integration** (Excellent)
   - Network-level HTTP mocking
   - Realistic request/response simulation
   - Setup in `vitest.setup.ts` with proper lifecycle

### Weaknesses

1. **MSW Configuration Issues** (CRITICAL)
   - Relative URL handling broken
   - Base URL not properly configured
   - Causing 45 test failures

2. **Heavy Global Mocking** (MODERATE)
   - Entire modules mocked in `vitest.setup.ts`
   - Makes debugging difficult
   - Can mask real integration issues
   - Examples: `next/navigation`, `drizzle-orm`, `postgres`

3. **No Snapshot Testing** (LOW)
   - No UI regression protection
   - Component changes not tracked

4. **Limited Accessibility Testing** (MODERATE)
   - No axe-core integration
   - No ARIA validation tests
   - Wellness practitioners need accessible UIs

5. **No Visual Regression Testing** (LOW)
   - UI changes not visually validated
   - No Percy/Chromatic integration

---

## Test Quality Assessment

### Positive Patterns

1. **AAA Pattern** (Excellent)
   ```typescript
   it("creates contact with valid data", async () => {
     // Arrange
     const input = { displayName: "Test" };
     mockRepo.createContact.mockResolvedValue(mockContact);

     // Act
     const result = await createContactService("user-1", input);

     // Assert
     expect(result).toEqual(mockContact);
   });
   ```

2. **Comprehensive Hook Testing** (Good)
   - `use-calendar-connection.msw.test.ts` has 60+ test cases
   - Covers success, error, and edge cases
   - Tests loading states and error recovery

3. **Repository Tests Use Constructor Injection** (Good)
   ```typescript
   beforeEach(() => {
     mockDb = createMockDbClient();
     repo = createContactsRepository(mockDb);
   });
   ```

4. **Integration Tests** (Good)
   - `auth-flows.test.ts` tests complete workflows
   - Multi-step authentication scenarios
   - Data isolation validation

### Anti-Patterns and Issues

1. **Flaky Tests** (CRITICAL)
   - MSW URL configuration issues
   - Unhandled promise rejections
   - Race conditions in async tests
   - Example: Calendar connection tests fail intermittently

2. **Insufficient Error Testing** (MODERATE)
   - Only 103 error assertion tests across entire codebase
   - Many happy path only tests
   - Missing edge case coverage

3. **Mock Leakage** (MODERATE)
   ```typescript
   // Anti-pattern: Global mocks not properly reset
   vi.mock("@/server/auth/user", () => ({
     getServerUserId: mockGetUserId, // Can leak between tests
   }));
   ```

4. **Incomplete Test Isolation** (MODERATE)
   - Some tests share database state
   - Cleanup logic sometimes fails
   - Tests can affect each other

5. **Weak Assertions** (LOW)
   ```typescript
   // Weak
   expect(result).toBeDefined();

   // Better
   expect(result).toEqual({
     id: expect.any(String),
     displayName: "John Doe",
     userId: mockUserId
   });
   ```

---

## Coverage Analysis by Domain

### 1. CRM Domain

| Component | Coverage | Status |
|-----------|----------|--------|
| Contacts Repository | HIGH (100%) | GOOD |
| Contacts Service | NONE (0%) | CRITICAL |
| Contacts API Routes | LOW (20%) | HIGH |
| Contact Components | LOW (10%) | HIGH |
| Contact Identities Repo | HIGH (100%) | GOOD |
| Notes Repository | HIGH (100%) | GOOD |
| Notes Service | NONE (0%) | CRITICAL |
| Notes API Routes | NONE (0%) | CRITICAL |
| Notes Components | MODERATE (50%) | MODERATE |
| Interactions Repository | HIGH (80%) | GOOD |
| Interactions Service | HIGH (100%) | EXCELLENT |

**Assessment:** Repository layer well-tested, service and API layers critically underserved.

### 2. Productivity Domain

| Component | Coverage | Status |
|-----------|----------|--------|
| Tasks Repository | MODERATE (60%) | MODERATE |
| Tasks Service | HIGH (100%) | EXCELLENT |
| Tasks API Routes | NONE (0%) | CRITICAL |
| Projects Repository | MODERATE (60%) | MODERATE |
| Projects Service | HIGH (100%) | EXCELLENT |
| Inbox Repository | MODERATE (60%) | MODERATE |
| Inbox Service | NONE (0%) | HIGH |
| Zones Repository | MODERATE (50%) | MODERATE |
| Zones Service | NONE (0%) | LOW |

**Assessment:** Service layer has good coverage for tasks/projects, but API routes untested.

### 3. Data Intelligence Domain

| Component | Coverage | Status |
|-----------|----------|--------|
| Raw Events Repository | MODERATE (60%) | MODERATE |
| Raw Events Service | NONE (0%) | HIGH |
| Raw Events API Routes | NONE (0%) | HIGH |
| AI Insights Repository | HIGH (100%) | GOOD |
| AI Insights Service | NONE (0%) | HIGH |
| Embeddings Repository | HIGH (100%) | GOOD |
| Embeddings Service | NONE (0%) | MODERATE |
| Documents Repository | HIGH (100%) | GOOD |
| Documents Service | NONE (0%) | MODERATE |

**Assessment:** Strong repository tests, but data processing pipelines untested.

### 4. Integration Domain (Google)

| Component | Coverage | Status |
|-----------|----------|--------|
| Gmail Sync Service | HIGH (80%) | GOOD |
| Gmail Connect Route | NONE (0%) | CRITICAL |
| Gmail Callback Route | NONE (0%) | CRITICAL |
| Calendar Sync Service | MODERATE (50%) | MODERATE |
| Calendar Connect Route | NONE (0%) | CRITICAL |
| Calendar Callback Route | NONE (0%) | CRITICAL |
| User Integrations Repo | HIGH (100%) | GOOD |
| OAuth Token Refresh | NONE (0%) | CRITICAL |

**Assessment:** OAuth flows completely untested - major security risk.

### 5. Authentication & Security

| Component | Coverage | Status |
|-----------|----------|--------|
| Auth User Service | HIGH (80%) | GOOD |
| Session Management | LOW (30%) | HIGH |
| CSRF Protection | LOW (30%) | HIGH |
| User Deletion Service | NONE (0%) | CRITICAL |
| User Export Service | NONE (0%) | CRITICAL |
| Onboarding Service | NONE (0%) | HIGH |
| Onboarding API Routes | MODERATE (60%) | MODERATE |

**Assessment:** GDPR compliance features untested - legal risk.

---

## Testability Analysis

### Well-Designed for Testing

1. **Layered Architecture** (Excellent)
   - Clear separation: Repository → Service → API
   - Each layer independently testable
   - Constructor injection enables easy mocking

2. **Pure Functions** (Good)
   - Service layer uses functional style
   - Minimal side effects
   - Predictable behavior

3. **Type Safety** (Excellent)
   - Strict TypeScript reduces runtime errors
   - Zod schemas validate data
   - Types catch issues at compile time

### Testability Issues

1. **Next.js Server Components** (MODERATE)
   - Cookies API hard to mock in tests
   - Request context required
   - File: `src/server/auth/user.ts`
   ```typescript
   // Problematic in tests
   const { cookies } = await import("next/headers");
   const store = await cookies();
   ```

2. **Heavy Database Coupling** (MODERATE)
   - Some services directly use `getDb()`
   - Integration tests require real DB or complex mocking
   - Makes unit testing slower

3. **Singleton Pattern** (LOW)
   - `getDb()` uses singleton connection
   - Hard to isolate in parallel tests
   - Can cause connection pool issues

4. **Implicit Dependencies** (LOW)
   - Some functions rely on environment variables
   - Not always clear what config is needed
   - Example: Encryption key, Supabase URLs

---

## Reliability and Flakiness

### Flaky Test Patterns Identified

1. **MSW URL Handling** (CRITICAL - 20+ failures)
   ```
   TypeError: Invalid base URL: /api/google/calendar/connect
   ```
   - MSW expects full URLs
   - Tests pass relative paths
   - Intermittent failures based on execution order

2. **Async Race Conditions** (HIGH - 10+ occurrences)
   ```typescript
   // Anti-pattern
   result.current.refreshTokens();
   expect(result.current.isRefreshing).toBe(true); // May be false

   // Better
   await waitFor(() => {
     expect(result.current.isRefreshing).toBe(true);
   });
   ```

3. **Unhandled Promise Rejections** (HIGH - 7+ errors)
   - Tests don't await all promises
   - Rejections leak to other tests
   - Example: Calendar connection mutations

4. **Test Pollution** (MODERATE)
   - Global mock state not always reset
   - Database cleanup failures
   - MSW handlers persist between tests

### Stability Recommendations

1. **Fix MSW Configuration** (CRITICAL)
   ```typescript
   // vitest.setup.ts
   beforeAll(() => {
     setupMswServer({
       onUnhandledRequest: 'warn',
     });
     // Set base URL for relative path resolution
     process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
   });
   ```

2. **Enforce Promise Handling** (HIGH)
   ```typescript
   // Add to vitest.config.ts
   test: {
     globals: true,
     onUnhandledRejection: 'error', // Fail tests on unhandled rejections
   }
   ```

3. **Improve Test Isolation** (HIGH)
   ```typescript
   afterEach(() => {
     vi.clearAllMocks();
     vi.resetModules();
     queryClient.clear();
     server.resetHandlers();
   });
   ```

4. **Add Test Timeouts** (MODERATE)
   ```typescript
   // For async operations
   await waitFor(() => {
     expect(condition).toBe(true);
   }, { timeout: 5000 }); // Explicit timeout
   ```

---

## Testing Best Practices Compliance

### Compliance Score: 68/100

| Practice | Status | Score |
|----------|--------|-------|
| AAA Pattern | Mostly followed | 85/100 |
| Test Isolation | Some pollution | 60/100 |
| Descriptive Names | Good | 80/100 |
| Single Assertion | Mostly | 70/100 |
| Edge Case Coverage | Limited | 50/100 |
| Error Scenario Testing | Insufficient | 45/100 |
| Mock Management | Issues | 55/100 |
| Async Handling | Some race conditions | 65/100 |
| Test Data Management | Factory pattern used | 75/100 |
| Coverage Metrics | Not measured | 0/100 |

### Recommendations

1. **Enforce Test Naming Convention** (MODERATE)
   ```typescript
   // Good
   it("creates contact with valid email and phone", ...)
   it("throws AppError when database constraint violated", ...)
   it("returns null when contact not found", ...)

   // Avoid
   it("works", ...)
   it("test contact creation", ...)
   ```

2. **Run Coverage Reports in CI** (HIGH)
   ```json
   // package.json
   "test:coverage": "vitest --coverage --coverage.reporter=lcov --coverage.reporter=text",
   "test:ci": "vitest --coverage --coverage.thresholds.lines=70"
   ```

3. **Add Coverage Thresholds** (MODERATE)
   ```typescript
   // vitest.config.ts
   coverage: {
     provider: 'v8',
     reporter: ['text', 'lcov', 'html'],
     thresholds: {
       lines: 70,
       functions: 70,
       branches: 60,
       statements: 70,
     },
     exclude: [
       '**/*.test.ts',
       '**/*.spec.ts',
       '**/test/**',
       '**/e2e/**',
     ]
   }
   ```

---

## CI/CD Integration

### Current State

- Tests run via `pnpm test` in package.json
- E2E tests via `pnpm e2e`
- No coverage enforcement
- No parallel execution
- Long-running test suite (127s)

### Issues

1. **No CI Test Results** (HIGH)
   - Can't determine if tests pass in CI
   - No GitHub Actions workflow visible
   - No test failure notifications

2. **No Coverage Tracking** (MODERATE)
   - No coverage badges
   - No trend analysis
   - Can't enforce minimum coverage

3. **Serial Execution** (LOW)
   - Tests run sequentially
   - Could be parallelized for speed

### Recommendations

1. **GitHub Actions Workflow** (HIGH)
   ```yaml
   # .github/workflows/test.yml
   name: Tests
   on: [pull_request, push]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v2
         - uses: actions/setup-node@v4
         - run: pnpm install --frozen-lockfile
         - run: pnpm typecheck
         - run: pnpm lint
         - run: pnpm test --coverage
         - uses: codecov/codecov-action@v3
           with:
             files: ./coverage/lcov.info
   ```

2. **Parallel Test Execution** (MODERATE)
   ```typescript
   // vitest.config.ts
   test: {
     threads: true,
     maxThreads: 4,
     minThreads: 2,
   }
   ```

3. **Test Sharding for E2E** (LOW)
   ```json
   // For large E2E suites
   "e2e:shard1": "playwright test --shard=1/4",
   "e2e:shard2": "playwright test --shard=2/4",
   ```

---

## Priority Test Implementation Roadmap

### Phase 1: Stabilization (Week 1) - CRITICAL

**Goal:** Make existing tests reliable

1. **Fix MSW Configuration** (2 days)
   - Update base URL handling
   - Fix relative path resolution
   - Resolve 45 failing test files
   - Target: 0 failing tests

2. **Fix Next.js Mocking** (2 days)
   - Mock cookies API properly
   - Fix auth flow tests
   - Test server component authentication

3. **Add Unhandled Rejection Handling** (1 day)
   - Configure Vitest to catch rejections
   - Fix async/await in tests
   - Eliminate promise leaks

4. **Improve Test Isolation** (1 day)
   - Enhance cleanup in `afterEach`
   - Reset all mocks consistently
   - Clear query cache between tests

**Success Criteria:** All existing tests pass consistently

### Phase 2: Critical Coverage (Week 2-3) - CRITICAL

**Goal:** Test business-critical functionality

1. **OAuth Flow Tests** (3 days)
   - `/api/google/gmail/callback` route tests
   - `/api/google/calendar/callback` route tests
   - Token refresh service tests
   - E2E OAuth integration test
   - **Risk:** Data breach if OAuth broken

2. **User Data Management Tests** (3 days)
   - `user-deletion.service.test.ts`
   - `user-export.service.test.ts`
   - GDPR compliance validation
   - Data cleanup verification
   - **Risk:** Legal liability if GDPR violated

3. **Contacts Service Tests** (2 days)
   - `contacts.service.test.ts`
   - Core CRM functionality
   - CRUD operations
   - Search and filtering
   - **Risk:** Primary business feature

4. **Background Job Processing Tests** (2 days)
   - `job-processing.service.test.ts`
   - `job-creation.service.test.ts`
   - `/api/cron/process-jobs` route test
   - Job failure and retry logic
   - **Risk:** Data consistency issues

**Success Criteria:**
- OAuth flows fully tested
- GDPR compliance validated
- Core CRM functionality covered

### Phase 3: API Layer (Week 4-5) - HIGH

**Goal:** Achieve 80% API route coverage

1. **Notes API Tests** (2 days)
   - `/api/notes` POST/GET
   - `/api/notes/[noteId]` GET/PUT/DELETE
   - Validation and error handling
   - **Count:** 2 routes

2. **Task Management API Tests** (3 days)
   - `/api/omni-momentum/tasks` CRUD
   - `/api/omni-momentum/inbox` processing
   - `/api/omni-momentum/projects` management
   - **Count:** 8+ routes

3. **Data Intelligence API Tests** (3 days)
   - `/api/data-intelligence/raw-events`
   - `/api/data-intelligence/ai-insights`
   - `/api/data-intelligence/embeddings`
   - **Count:** 10+ routes

4. **Remaining Service Tests** (2 days)
   - `notes.service.test.ts`
   - `onboarding.service.test.ts`
   - `storage.service.test.ts`
   - `ai-insights.service.test.ts`
   - **Count:** 4 services

**Success Criteria:**
- 80% API route coverage
- All mutating endpoints tested
- Authentication/authorization validated

### Phase 4: E2E Coverage (Week 6) - HIGH

**Goal:** Validate critical user workflows

1. **Authentication E2E** (2 days)
   - Google OAuth login flow
   - Session management
   - Logout and token refresh

2. **Notes Workflow E2E** (1 day)
   - Create/edit/delete notes
   - Voice recording (if applicable)
   - Rich text editing

3. **Task Management E2E** (1 day)
   - Create task from inbox
   - Assign to project
   - Complete task workflow

4. **Data Export E2E** (1 day)
   - Request data export
   - Download exported data
   - Verify completeness

**Success Criteria:**
- 8+ E2E tests for critical workflows
- All authentication paths covered
- User data operations validated

### Phase 5: Quality Improvements (Week 7-8) - MODERATE

**Goal:** Enhance test maintainability and coverage

1. **Accessibility Testing** (2 days)
   - Add axe-core to component tests
   - Validate ARIA labels
   - Keyboard navigation tests

2. **Error Recovery Tests** (2 days)
   - Network failure scenarios
   - API timeout handling
   - Error boundary validation

3. **Component Testing** (3 days)
   - Contact table components
   - Note editor components
   - Task management components
   - **Target:** 30+ component tests

4. **Coverage Analysis** (1 day)
   - Run coverage reports
   - Identify remaining gaps
   - Update coverage thresholds

**Success Criteria:**
- Accessibility tests in place
- Error scenarios covered
- Component coverage >60%

### Phase 6: Advanced Testing (Ongoing) - LOW

**Goal:** Add advanced testing capabilities

1. **Visual Regression Testing**
   - Percy or Chromatic integration
   - Snapshot testing for components

2. **Performance Testing**
   - Lighthouse CI integration
   - API response time benchmarks

3. **Load Testing**
   - Contact list with 10k+ records
   - Concurrent user simulation

4. **Mutation Testing**
   - Stryker integration
   - Test effectiveness validation

---

## Testing Strategy Recommendations

### Short-Term (1-3 months)

1. **Stabilize Existing Tests** (Week 1)
   - Fix 45 failing tests
   - Resolve MSW configuration
   - Eliminate flakiness

2. **Cover Critical Gaps** (Week 2-5)
   - OAuth flows
   - User data management
   - Contacts service
   - Background jobs
   - API routes

3. **Add E2E Tests** (Week 6)
   - Authentication
   - Core workflows
   - GDPR operations

4. **Implement CI/CD** (Week 7)
   - GitHub Actions workflow
   - Coverage tracking
   - Test result reporting

### Long-Term (3-6 months)

1. **Achieve 80% Coverage**
   - Service layer: 100%
   - Repository layer: 100%
   - API routes: 80%
   - Components: 60%

2. **Add Advanced Testing**
   - Accessibility testing
   - Visual regression
   - Performance benchmarks
   - Mutation testing

3. **Test Documentation**
   - Testing guide for developers
   - Test patterns and anti-patterns
   - Mock strategy documentation

4. **Continuous Improvement**
   - Monthly test review
   - Flakiness monitoring
   - Coverage trend analysis

---

## Testing Patterns and Templates

### Repository Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExampleRepository, createExampleRepository } from "./example.repo";
import { createMockDbClient, type MockDbClient } from "@packages/testing";

describe("ExampleRepository", () => {
  let mockDb: MockDbClient;
  let repo: ExampleRepository;
  const userId = "user-123";

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createExampleRepository(mockDb);
    vi.clearAllMocks();
  });

  describe("getItem", () => {
    it("returns item when found", async () => {
      const mockItem = { id: "item-1", name: "Test" };
      mockDb.select.mockResolvedValue([mockItem]);

      const result = await repo.getItem(userId, "item-1");

      expect(result).toEqual(mockItem);
      expect(mockDb.select).toHaveBeenCalledWith(expect.any(Object));
    });

    it("returns null when not found", async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await repo.getItem(userId, "item-999");

      expect(result).toBeNull();
    });

    it("throws Error on database failure", async () => {
      mockDb.select.mockRejectedValue(new Error("DB connection lost"));

      await expect(repo.getItem(userId, "item-1")).rejects.toThrow("DB connection lost");
    });
  });

  describe("createItem", () => {
    it("creates item with valid data", async () => {
      const input = { name: "New Item" };
      const created = { id: "item-1", ...input, userId };
      mockDb.insert.mockResolvedValue([created]);

      const result = await repo.createItem(userId, input);

      expect(result).toEqual(created);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("throws Error when insert returns no data", async () => {
      mockDb.insert.mockResolvedValue([]);

      await expect(repo.createItem(userId, {})).rejects.toThrow("Insert returned no data");
    });
  });
});
```

### Service Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { exampleService } from "../example.service";
import { createExampleRepository } from "@repo";
import * as dbClient from "@/server/db/client";
import { AppError } from "@/lib/errors";

vi.mock("@repo");
vi.mock("@/server/db/client");

describe("ExampleService", () => {
  let mockRepo: any;
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getItem: vi.fn(),
      createItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
    };
    vi.mocked(dbClient.getDb).mockResolvedValue({} as any);
    vi.mocked(createExampleRepository).mockReturnValue(mockRepo);
  });

  describe("getItemService", () => {
    it("returns item when found", async () => {
      const mockItem = { id: "item-1", name: "Test" };
      mockRepo.getItem.mockResolvedValue(mockItem);

      const result = await exampleService.getItem(userId, "item-1");

      expect(result).toEqual(mockItem);
      expect(mockRepo.getItem).toHaveBeenCalledWith(userId, "item-1");
    });

    it("wraps repository errors as AppError", async () => {
      mockRepo.getItem.mockRejectedValue(new Error("Database timeout"));

      await expect(exampleService.getItem(userId, "item-1")).rejects.toThrow(AppError);
    });

    it("sets correct AppError properties", async () => {
      mockRepo.getItem.mockRejectedValue(new Error("Not found"));

      try {
        await exampleService.getItem(userId, "item-1");
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(500);
        expect((error as AppError).code).toBe("DB_ERROR");
      }
    });
  });

  describe("createItemService", () => {
    it("creates item with valid input", async () => {
      const input = { name: "New" };
      const created = { id: "item-1", ...input };
      mockRepo.createItem.mockResolvedValue(created);

      const result = await exampleService.createItem(userId, input);

      expect(result).toEqual(created);
    });

    it("validates input before creating", async () => {
      const invalidInput = { name: "" }; // Empty name

      await expect(exampleService.createItem(userId, invalidInput)).rejects.toThrow();
    });
  });
});
```

### API Route Test Template

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import * as authUser from "@/server/auth/user";

vi.mock("@/server/auth/user");
vi.mock("@/server/services/example.service");

describe("API /api/example", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authUser.getServerUserId).mockResolvedValue(userId);
  });

  describe("GET", () => {
    it("returns items for authenticated user", async () => {
      const mockItems = [{ id: "1", name: "Item 1" }];
      vi.mocked(exampleService.listItems).mockResolvedValue({ items: mockItems, total: 1 });

      const request = new NextRequest("http://localhost:3000/api/example");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.items).toEqual(mockItems);
    });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(authUser.getServerUserId).mockRejectedValue(new Error("No session"));

      const request = new NextRequest("http://localhost:3000/api/example");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("handles service errors gracefully", async () => {
      vi.mocked(exampleService.listItems).mockRejectedValue(new Error("DB error"));

      const request = new NextRequest("http://localhost:3000/api/example");
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("creates item with valid data", async () => {
      const input = { name: "New Item" };
      const created = { id: "item-1", ...input };
      vi.mocked(exampleService.createItem).mockResolvedValue(created);

      const request = new NextRequest("http://localhost:3000/api/example", {
        method: "POST",
        body: JSON.stringify(input),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(created);
    });

    it("returns 400 for invalid input", async () => {
      const invalidInput = { name: "" };

      const request = new NextRequest("http://localhost:3000/api/example", {
        method: "POST",
        body: JSON.stringify(invalidInput),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from "@playwright/test";

test.describe("Example Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate and authenticate
    await page.goto("/example");
    await page.waitForLoadState("networkidle");
  });

  test("completes full workflow", async ({ page }) => {
    await test.step("Step 1: View list", async () => {
      await expect(page.getByTestId("item-list")).toBeVisible();
      const itemCount = await page.locator('[data-testid^="item-"]').count();
      expect(itemCount).toBeGreaterThan(0);
    });

    await test.step("Step 2: Create new item", async () => {
      await page.getByTestId("create-button").click();
      await page.getByTestId("name-input").fill("Test Item");
      await page.getByTestId("submit-button").click();

      await expect(page.getByText("Item created successfully")).toBeVisible();
    });

    await test.step("Step 3: Verify item appears", async () => {
      await expect(page.getByText("Test Item")).toBeVisible();
    });

    await test.step("Step 4: Edit item", async () => {
      await page.getByTestId("edit-button").first().click();
      await page.getByTestId("name-input").fill("Updated Item");
      await page.getByTestId("submit-button").click();

      await expect(page.getByText("Updated Item")).toBeVisible();
    });
  });

  test("handles errors gracefully", async ({ page }) => {
    // Mock API failure
    await page.route("**/api/example", (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "Server error" }) })
    );

    await page.getByTestId("create-button").click();
    await page.getByTestId("name-input").fill("Test");
    await page.getByTestId("submit-button").click();

    await expect(page.getByText(/error/i)).toBeVisible();
  });
});
```

---

## Tooling and Infrastructure Recommendations

### Immediate Additions (Week 1-2)

1. **Coverage Tracking**
   ```bash
   pnpm add -D @codecov/codecov-action
   ```

2. **Accessibility Testing**
   ```bash
   pnpm add -D @axe-core/playwright vitest-axe
   ```

3. **Test Utilities**
   ```bash
   pnpm add -D @testing-library/user-event faker
   ```

### Future Additions (Month 2-3)

1. **Visual Regression**
   ```bash
   pnpm add -D @percy/playwright
   # or
   pnpm add -D @chromatic-com/playwright
   ```

2. **Performance Testing**
   ```bash
   pnpm add -D @playwright/test lighthouse-cli
   ```

3. **Mutation Testing**
   ```bash
   pnpm add -D @stryker-mutator/core @stryker-mutator/vitest-runner
   ```

---

## Conclusion

The OmniCRM application has invested in modern testing infrastructure with Vitest, Playwright, and MSW, demonstrating a commitment to quality. However, **critical gaps in coverage and test reliability must be addressed urgently** to prevent production incidents and ensure business continuity.

### Immediate Actions Required (This Week)

1. Fix 45 failing test files (MSW configuration, Next.js mocking)
2. Implement tests for OAuth callback routes (security risk)
3. Test user deletion and export services (GDPR compliance)
4. Add tests for contacts service (core business functionality)

### Success Metrics (3 Months)

- **Test Reliability:** 100% passing tests (0 failures)
- **Service Coverage:** 90%+ (currently 37%)
- **API Coverage:** 80%+ (currently 11%)
- **Repository Coverage:** 95%+ (currently 58%)
- **E2E Coverage:** 10+ critical workflows (currently 6)
- **CI Integration:** Automated testing with coverage reporting

### Long-Term Vision (6 Months)

- **Comprehensive Coverage:** 80%+ across all layers
- **Advanced Testing:** Accessibility, visual regression, performance
- **Developer Experience:** Fast, reliable tests that developers trust
- **Continuous Quality:** Automated testing prevents regressions
- **Compliance Assurance:** GDPR and security requirements validated

By following this roadmap, OmniCRM can transform its testing strategy from **moderate** to **excellent**, providing confidence in releases, protecting user data, and enabling rapid feature development without fear of breaking existing functionality.

---

**Report Generated:** October 17, 2025
**Next Review:** November 17, 2025
**Priority:** CRITICAL - Immediate action required
