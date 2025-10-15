# Comprehensive API Routes Testing Plan

**Project**: OmniCRM  
**Date**: October 14, 2025  
**Author**: WARP AI Assistant  
**Goal**: Achieve 80%+ test coverage for all 49 API routes

---

## Executive Summary

This plan outlines a systematic approach to test all API routes in the OmniCRM application with comprehensive unit and integration tests. The plan is structured in 12 phases covering 49 API routes across 18 test files.

**Coverage Goals**:

- **Critical Routes** (Contacts, Notes, Auth): 80%+ coverage
- **High Priority** (OmniMomentum): 80%+ coverage
- **Medium Priority** (Data Intelligence, Google, Admin): 75%+ coverage
- **Low Priority** (Onboarding): 80%+ coverage

**Total Estimated Time**: ~40 hours

---

## Current State Analysis

### Existing Test Coverage

- ✅ `api-routes-validation.test.ts` - Basic validation tests for 3 routes
- ✅ `api-endpoints.test.ts` - Integration tests for 3 routes
- ✅ Testing utilities in `packages/testing/src/`
- ✅ Test helpers in `src/__tests__/helpers/`

### API Routes Inventory (49 Total)

#### Contacts Module (6 routes) - Critical Priority

- `/api/contacts` - GET, POST
- `/api/contacts/[contactId]` - GET, PUT, DELETE
- `/api/contacts/count` - GET
- `/api/contacts/bulk-delete` - POST
- `/api/contacts/suggestions` - GET

#### Notes Module (2 routes) - Critical Priority

- `/api/notes` - GET, POST
- `/api/notes/[noteId]` - GET, PUT, DELETE

#### OmniMomentum Tasks (7 routes) - High Priority

- `/api/omni-momentum/tasks` - GET, POST
- `/api/omni-momentum/tasks/[taskId]` - GET, PUT, DELETE
- `/api/omni-momentum/tasks/[taskId]/approve` - POST
- `/api/omni-momentum/tasks/[taskId]/reject` - POST
- `/api/omni-momentum/tasks/[taskId]/subtasks` - GET, POST
- `/api/omni-momentum/tasks/pending-approval` - GET

#### OmniMomentum Projects (3 routes) - High Priority

- `/api/omni-momentum/projects` - GET, POST
- `/api/omni-momentum/projects/[projectId]` - GET, PUT, DELETE
- `/api/omni-momentum/projects/[projectId]/tasks` - GET

#### OmniMomentum Zones (1 route) - High Priority

- `/api/omni-momentum/zones` - GET, POST, PUT, DELETE

#### OmniMomentum Inbox (3 routes) - High Priority

- `/api/omni-momentum/inbox` - GET, POST
- `/api/omni-momentum/inbox/[itemId]` - GET, PUT, DELETE
- `/api/omni-momentum/inbox/process` - POST

#### Data Intelligence (10 routes) - Medium Priority

- `/api/data-intelligence/ai-insights` - GET, POST
- `/api/data-intelligence/ai-insights/[aiInsightId]` - GET, PUT, DELETE
- `/api/data-intelligence/contact-identities` - GET, POST
- `/api/data-intelligence/contact-identities/[identityId]` - GET, PUT, DELETE
- `/api/data-intelligence/documents` - GET, POST
- `/api/data-intelligence/documents/[documentId]` - GET, PUT, DELETE
- `/api/data-intelligence/embeddings` - GET, POST
- `/api/data-intelligence/embeddings/[embeddingId]` - GET, DELETE
- `/api/data-intelligence/raw-events` - GET, POST
- `/api/data-intelligence/raw-events/[rawEventId]` - GET, DELETE
- `/api/data-intelligence/ignored-identifiers` - GET, POST
- `/api/data-intelligence/ignored-identifiers/[identifierId]` - DELETE

#### Google Integration (5 routes) - Medium Priority

- `/api/google/status` - GET
- `/api/google/gmail/connect` - GET
- `/api/google/gmail/callback` - GET
- `/api/google/calendar/connect` - GET
- `/api/google/calendar/callback` - GET

#### Authentication (3 routes) - Critical Priority

- `/api/auth/signin/google` - GET
- `/api/auth/(console_account)/callback` - GET
- `/api/auth/(test_user)/user` - GET

#### Admin (2 routes) - Medium Priority

- `/api/admin/email-intelligence` - POST
- `/api/admin/replay` - POST

#### User Management (2 routes) - Medium Priority

- `/api/user/delete` - POST
- `/api/user/export` - GET

#### Storage (1 route) - Medium Priority

- `/api/storage/file-url` - GET

#### Jobs/Cron (2 routes) - Medium Priority

- `/api/jobs/runner` - POST
- `/api/cron/process-jobs` - POST

#### Onboarding (5 routes) - Low Priority

- `/api/onboarding/admin/generate-tokens` - POST
- `/api/onboarding/admin/tokens` - GET
- `/api/onboarding/admin/tokens/[tokenId]` - DELETE
- `/api/onboarding/public/submit` - POST

#### Health/Ping (2 routes) - Critical Priority

- `/api/health` - GET (already tested)
- `/api/db-ping` - GET

---

## Testing Architecture

### Unit Tests vs Integration Tests

#### Unit Tests (`src/__tests__/unit/api-routes/`)

**Purpose**: Test individual API route handlers in isolation with mocked dependencies

**Characteristics**:

- Fast execution (< 1s per test)
- Mocked services, auth, and external dependencies
- Focus on validation, error handling, edge cases
- Test request/response formats
- Test authentication/authorization logic

**Mock Strategy**:

```typescript
// Mock auth
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-123"),
}));

// Mock services
vi.mock("@/server/services/contacts.service", () => ({
  listContactsService: vi.fn(),
  createContactService: vi.fn(),
}));
```

#### Integration Tests (`src/__tests__/integration/api-routes/`)

**Purpose**: Test complete workflows with real database and minimal mocking

**Characteristics**:

- Slower execution (1-10s per test)
- Real database connections (test environment)
- Real business logic and repository layers
- Mock only external APIs (Google, OpenAI, etc.)
- Test complete user workflows

**Integration Strategy**:

```typescript
// Real database
const db = await getDb();

// Real services and repositories
// Only mock external APIs
vi.mock("@/server/ai/openai-client", () => ({
  generateInsight: vi.fn(),
}));
```

### Test Organization Structure

```bash
src/__tests__/
├── unit/
│   └── api-routes/
│       ├── contacts-api.test.ts
│       ├── notes-api.test.ts
│       ├── momentum-tasks-api.test.ts
│       ├── momentum-projects-api.test.ts
│       ├── momentum-zones-api.test.ts
│       ├── momentum-inbox-api.test.ts
│       ├── data-intelligence-insights-api.test.ts
│       ├── data-intelligence-identities-api.test.ts
│       ├── data-intelligence-documents-api.test.ts
│       ├── data-intelligence-embeddings-api.test.ts
│       ├── data-intelligence-events-api.test.ts
│       ├── google-integration-api.test.ts
│       ├── auth-api.test.ts
│       ├── admin-api.test.ts
│       ├── user-api.test.ts
│       ├── storage-api.test.ts
│       ├── jobs-api.test.ts
│       ├── onboarding-api.test.ts
│       └── db-ping-api.test.ts
│
└── integration/
    └── api-routes/
        ├── contacts-workflow.test.ts
        ├── notes-workflow.test.ts
        ├── momentum-tasks-workflow.test.ts
        ├── momentum-projects-workflow.test.ts
        ├── momentum-zones-workflow.test.ts
        ├── momentum-inbox-workflow.test.ts
        ├── data-intelligence-insights-workflow.test.ts
        ├── data-intelligence-identities-workflow.test.ts
        ├── data-intelligence-documents-workflow.test.ts
        ├── data-intelligence-embeddings-workflow.test.ts
        ├── data-intelligence-events-workflow.test.ts
        ├── google-integration-workflow.test.ts
        ├── auth-workflow.test.ts
        ├── admin-workflow.test.ts
        ├── user-workflow.test.ts
        ├── storage-workflow.test.ts
        ├── jobs-workflow.test.ts
        ├── onboarding-workflow.test.ts
        └── db-ping-workflow.test.ts
```

---

## Common Test Patterns

### Pattern 1: Testing GET Routes

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/contacts/route";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";

// Mock auth
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-123"),
}));

// Mock service
vi.mock("@/server/services/contacts.service", () => ({
  listContactsService: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    nextCursor: null,
  }),
}));

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return list of contacts", async () => {
    const request = new Request("http://localhost:3000/api/contacts?page=1&pageSize=10");
    const context = makeRouteContext();

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("total");
  });

  it("should require authentication", async () => {
    const { getServerUserId } = await import("@/server/auth/user");
    vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

    const request = new Request("http://localhost:3000/api/contacts");
    const context = makeRouteContext();

    const response = await GET(request, context);

    expect(response.status).toBe(401);
  });
});
```

### Pattern 2: Testing POST Routes

```typescript
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/contacts/route";
import { makeContactDTO } from "@packages/testing";

vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-123"),
}));

vi.mock("@/server/services/contacts.service", () => ({
  createContactService: vi.fn().mockImplementation(async (userId, data) => ({
    id: "new-contact-id",
    ...data,
    userId,
  })),
}));

describe("POST /api/contacts", () => {
  it("should create new contact", async () => {
    const contactData = {
      displayName: "John Doe",
      primaryEmail: "john@example.com",
    };

    const request = new Request("http://localhost:3000/api/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(contactData),
    });
    const context = makeRouteContext();

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty("id");
    expect(data.displayName).toBe("John Doe");
  });

  it("should validate required fields", async () => {
    const invalidData = { primaryEmail: "test@example.com" }; // Missing displayName

    const request = new Request("http://localhost:3000/api/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(invalidData),
    });
    const context = makeRouteContext();

    const response = await POST(request, context);

    expect(response.status).toBe(400);
  });
});
```

### Pattern 3: Testing Routes with Dynamic Params

```typescript
import { describe, it, expect, vi } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/contacts/[contactId]/route";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";

vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-123"),
}));

describe("GET /api/contacts/[contactId]", () => {
  it("should get contact by id", async () => {
    const request = new Request("http://localhost:3000/api/contacts/contact-123");
    const context = makeRouteContext({ contactId: "contact-123" });

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("id", "contact-123");
  });

  it("should return 404 for non-existent contact", async () => {
    const request = new Request("http://localhost:3000/api/contacts/non-existent");
    const context = makeRouteContext({ contactId: "non-existent" });

    const response = await GET(request, context);

    expect(response.status).toBe(404);
  });
});
```

### Pattern 4: Integration Test Workflow

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET, POST } from "@/app/api/contacts/route";
import { GET as GET_BY_ID, PUT, DELETE } from "@/app/api/contacts/[contactId]/route";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

describe("Contacts CRUD Workflow", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testUserId = "test-user-workflow";
  let createdContactId: string;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(contacts).where(eq(contacts.userId, testUserId));
  });

  it("should complete full CRUD workflow", async () => {
    // 1. Create contact
    const createRequest = new Request("http://localhost:3000/api/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Workflow Test User",
        primaryEmail: "workflow@test.com",
      }),
    });

    const createResponse = await POST(createRequest, makeRouteContext());
    const createData = await createResponse.json();
    expect(createResponse.status).toBe(201);
    createdContactId = createData.id;

    // 2. Read contact
    const getRequest = new Request(`http://localhost:3000/api/contacts/${createdContactId}`);
    const getResponse = await GET_BY_ID(getRequest, makeRouteContext({ contactId: createdContactId }));
    const getData = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getData.displayName).toBe("Workflow Test User");

    // 3. Update contact
    const updateRequest = new Request(`http://localhost:3000/api/contacts/${createdContactId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Updated Workflow User",
      }),
    });
    const updateResponse = await PUT(updateRequest, makeRouteContext({ contactId: createdContactId }));
    expect(updateResponse.status).toBe(200);

    // 4. Delete contact
    const deleteRequest = new Request(`http://localhost:3000/api/contacts/${createdContactId}`, {
      method: "DELETE",
    });
    const deleteResponse = await DELETE(deleteRequest, makeRouteContext({ contactId: createdContactId }));
    expect(deleteResponse.status).toBe(200);

    // 5. Verify deletion
    const verifyRequest = new Request(`http://localhost:3000/api/contacts/${createdContactId}`);
    const verifyResponse = await GET_BY_ID(verifyRequest, makeRouteContext({ contactId: createdContactId }));
    expect(verifyResponse.status).toBe(404);
  });
});
```

---

## Implementation Phases

### Phase 1: Setup and Planning (2 hours)

**Status**: Not Started  
**Priority**: Critical

**Tasks**:

1. Create directory structure
2. Extend test helpers
3. Document patterns
4. Setup mock factories

**Deliverables**:

- `src/__tests__/unit/api-routes/` directory
- `src/__tests__/integration/api-routes/` directory
- Enhanced `routeContext.ts` helper
- Mock service patterns in helpers

---

### Phase 2-12: [See detailed breakdown in todo list]

Each phase covers specific modules with:

- Unit test files
- Integration test files
- Mock strategies
- Success criteria
- Coverage goals

---

## Coverage Goals by Module

| Module | Routes | Priority | Target Coverage |
|--------|--------|----------|----------------|
| Contacts | 6 | Critical | 80%+ |
| Notes | 2 | Critical | 80%+ |
| Authentication | 3 | Critical | 80%+ |
| Health/Ping | 2 | Critical | 80%+ |
| OmniMomentum Tasks | 7 | High | 80%+ |
| OmniMomentum Projects | 3 | High | 80%+ |
| OmniMomentum Zones | 1 | High | 80%+ |
| OmniMomentum Inbox | 3 | High | 80%+ |
| Data Intelligence | 10 | Medium | 75%+ |
| Google Integration | 5 | Medium | 70%+ |
| Admin | 2 | Medium | 75%+ |
| User Management | 2 | Medium | 75%+ |
| Storage | 1 | Medium | 75%+ |
| Jobs/Cron | 2 | Medium | 75%+ |
| Onboarding | 5 | Low | 80%+ |

**Overall Target**: 80% code coverage across all API routes

---

## Testing Standards

### Test Naming Convention

```typescript
// Unit tests
describe("POST /api/contacts", () => {
  describe("validation", () => {
    it("should validate required fields", async () => {});
    it("should validate email format", async () => {});
  });

  describe("authentication", () => {
    it("should require authentication", async () => {});
    it("should reject invalid tokens", async () => {});
  });

  describe("error handling", () => {
    it("should return 400 for invalid data", async () => {});
    it("should return 500 for server errors", async () => {});
  });
});

// Integration tests
describe("Contacts CRUD Workflow", () => {
  describe("create and read", () => {
    it("should create contact and retrieve it", async () => {});
  });

  describe("update and delete", () => {
    it("should update contact and verify changes", async () => {});
  });
});
```

### Code Quality Standards

- ✅ Zero TypeScript errors (`pnpm typecheck`)
- ✅ Zero ESLint warnings (`pnpm lint`)
- ✅ Proper type inference (no `any` types)
- ✅ Consistent formatting (`pnpm format`)
- ✅ All tests passing (`pnpm test`)
- ✅ CI pipeline green (`pnpm ci:full`)

### Documentation Requirements

Every test file must include:

```typescript
/**
 * API Route Tests: [Route Name]
 *
 * Tests the [Route Name] API endpoints with:
 * - Input validation
 * - Authentication/authorization
 * - Error handling
 * - Business logic validation
 * - Response format consistency
 *
 * Coverage: [80%+/75%+/70%+]
 */
```

---

## Running Tests

### Development Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test src/__tests__/unit/api-routes/contacts-api.test.ts

# Run with coverage
pnpm test -- --coverage

# Run only unit tests
pnpm test src/__tests__/unit

# Run only integration tests
pnpm test src/__tests__/integration
```

### CI/CD Integration

```bash
# Full CI validation (includes all tests)
pnpm ci:full

# Individual CI steps
pnpm ci:typecheck
pnpm typecheck
pnpm lint
pnpm test
pnpm ci:architecture
```

---

## Success Metrics

### Quantitative Metrics

- ✅ 80% code coverage for API routes
- ✅ All 49 routes tested (unit + integration)
- ✅ Zero failing tests
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ < 30s total test execution time

### Qualitative Metrics

- ✅ Tests are maintainable and well-documented
- ✅ Tests follow consistent patterns
- ✅ Tests provide clear failure messages
- ✅ Tests are isolated and independent
- ✅ Tests cover realistic user scenarios
- ✅ Tests validate business requirements

---

## Risk Mitigation

### Potential Challenges

1. **External API Dependencies**
   - **Risk**: Tests fail due to external API unavailability
   - **Mitigation**: Mock all external APIs (Google, OpenAI, Anthropic)
   - **Strategy**: Use MSW or vitest mocks for consistent behavior

2. **Database State Management**
   - **Risk**: Tests interfere with each other
   - **Mitigation**: Proper cleanup in `afterEach`/`afterAll` hooks
   - **Strategy**: Use isolated test users and unique IDs

3. **Authentication Complexity**
   - **Risk**: Auth flow tests are fragile
   - **Mitigation**: Mock auth at service level, not at HTTP level
   - **Strategy**: Use test user accounts for integration tests

4. **Async Operations**
   - **Risk**: Race conditions in tests
   - **Mitigation**: Proper `await` usage and `waitFor` helpers
   - **Strategy**: Use explicit timeouts and retry logic

5. **Coverage Gaps**
   - **Risk**: Hard-to-reach edge cases
   - **Mitigation**: Identify gaps early with coverage reports
   - **Strategy**: Add targeted tests for specific branches

---

## Timeline and Milestones

| Phase | Estimated Time | Cumulative Time |
|-------|---------------|-----------------|
| Phase 1: Setup | 2 hours | 2 hours |
| Phase 2: Contacts | 4 hours | 6 hours |
| Phase 3: Notes | 3 hours | 9 hours |
| Phase 4: Tasks | 5 hours | 14 hours |
| Phase 5: Projects/Zones/Inbox | 4 hours | 18 hours |
| Phase 6: Data Intelligence | 6 hours | 24 hours |
| Phase 7: Google Integration | 3 hours | 27 hours |
| Phase 8: Authentication | 3 hours | 30 hours |
| Phase 9: Admin/User/Storage/Jobs | 4 hours | 34 hours |
| Phase 10: Onboarding | 3 hours | 37 hours |
| Phase 11: Coverage Check | 1 hour | 38 hours |
| Phase 12: Documentation | 2 hours | 40 hours |

**Total Estimated Time**: 40 hours (~1 week for 1 developer, or 2-3 days for 2 developers)

---

## Next Steps

1. **Review and Approve Plan**: Stakeholder review of testing approach
2. **Start Phase 1**: Setup infrastructure and helpers
3. **Implement Critical Routes First**: Contacts, Notes, Auth
4. **Incremental Progress**: Complete phases sequentially
5. **Continuous Integration**: Run tests on every commit
6. **Documentation**: Update docs as tests are completed

---

## References

- [Testing Strategy Guide](../src/__tests__/README.md)
- [WARP.md Project Guide](../WARP.md)
- [Refactoring Patterns](../docs/REFACTORING_PATTERNS_OCT_2025.md)
- [API Route Patterns](../src/app/api/README.md)
- [Testing Package](../packages/testing/src/index.ts)

---

## Appendix: Test Template

### Unit Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PUT, DELETE } from "@/app/api/[module]/route";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";
import { testUtils } from "@packages/testing";

/**
 * API Route Tests: [Module Name]
 *
 * Tests the [Module] API endpoints with comprehensive coverage of:
 * - Request validation and sanitization
 * - Authentication and authorization
 * - Error handling and edge cases
 * - Response format consistency
 * - Business logic validation
 *
 * Target Coverage: 80%+
 */

// Mock authentication
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue(testUtils.defaultUserId),
}));

// Mock service layer
vi.mock("@/server/services/[module].service", () => ({
  listService: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
}));

describe("[Module] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/[module]", () => {
    it("should return list of items", async () => {
      // Test implementation
    });

    it("should require authentication", async () => {
      // Test implementation
    });

    it("should validate query parameters", async () => {
      // Test implementation
    });

    it("should handle empty results", async () => {
      // Test implementation
    });
  });

  describe("POST /api/[module]", () => {
    it("should create new item", async () => {
      // Test implementation
    });

    it("should validate required fields", async () => {
      // Test implementation
    });

    it("should handle duplicate entries", async () => {
      // Test implementation
    });
  });

  // Add PUT and DELETE tests as needed
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { getDb } from "@/server/db/client";
import { [table] } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { testUtils } from "@packages/testing";

/**
 * [Module] Integration Tests
 *
 * Tests complete workflows with real database and business logic:
 * - Full CRUD operations
 * - Complex multi-step workflows
 * - Data consistency and integrity
 * - User isolation and security
 * - Real-world scenarios
 *
 * Target Coverage: 80%+
 */

describe("[Module] Workflow Integration", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testUserId = testUtils.defaultUserId;
  const cleanupIds: string[] = [];

  beforeAll(async () => {
    db = await getDb();
  });

  afterEach(async () => {
    // Cleanup test data
    for (const id of cleanupIds) {
      await db.delete([table]).where(eq([table].id, id));
    }
    cleanupIds.length = 0;
  });

  afterAll(async () => {
    // Final cleanup
    await db.delete([table]).where(eq([table].userId, testUserId));
  });

  describe("CRUD workflow", () => {
    it("should complete full lifecycle", async () => {
      // Test implementation
    });
  });

  describe("user isolation", () => {
    it("should isolate data between users", async () => {
      // Test implementation
    });
  });

  describe("business logic", () => {
    it("should validate business rules", async () => {
      // Test implementation
    });
  });
});
```

---

**Document Version**: 1.0  
**Last Updated**: October 14, 2025  
**Status**: Ready for Implementation
