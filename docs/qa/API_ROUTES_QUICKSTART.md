# API Routes Testing - Quick Start Guide

**Quick reference guide for implementing comprehensive API route tests.**

---

## 🚀 Getting Started (5 minutes)

### Step 1: Create Directory Structure

```bash
# From project root
mkdir -p src/__tests__/unit/api-routes
mkdir -p src/__tests__/integration/api-routes
```

### Step 2: Enhance Route Context Helper

Update `src/__tests__/helpers/routeContext.ts`:

```typescript
/**
 * Helper utility for creating proper RouteContext in API route tests
 *
 * Next.js App Router route handlers require a second parameter with params.
 * This utility creates the proper context structure expected by route handlers.
 */

type RouteParams = Record<string, string>;

/**
 * Creates a proper RouteContext for API route handler tests
 * @param params - Route parameters (e.g., { contactId: "contact-123" })
 * @returns RouteContext with params wrapped in Promise
 */
export const makeRouteContext = <T extends RouteParams = RouteParams>(params?: T) => ({
  params: Promise.resolve(params || ({} as T))
});

/**
 * Creates a mock Request object for testing
 * @param url - Request URL
 * @param options - Request options (method, headers, body)
 * @returns Request object
 */
export const makeRequest = (url: string, options?: RequestInit): Request => {
  return new Request(url, options);
};

/**
 * Helper to parse JSON response from API route
 * @param response - Response object
 * @returns Parsed JSON data
 */
export const parseResponse = <T = unknown>(response: Response): Promise<T> => response.json() as Promise<T>;
```

---

## 📝 Unit Test Template (Copy & Paste)

### Basic Unit Test

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/[module]/route";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";
import { testUtils } from "@packages/testing";

/**
 * API Route Tests: [Module Name]
 *
 * Tests the [Module] API endpoints with:
 * - Input validation
 * - Authentication/authorization
 * - Error handling
 * - Response format consistency
 *
 * Target Coverage: 80%+
 */

// Mock authentication
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue(testUtils.defaultUserId),
}));

// Mock service
vi.mock("@/server/services/[module].service", () => ({
  listService: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  createService: vi.fn().mockResolvedValue({ id: "new-id", name: "Test Item" }),
}));

describe("[Module] API Routes - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/[module]", () => {
    it("should return list of items", async () => {
      const request = new Request("http://localhost:3000/api/[module]");
      const context = makeRouteContext();

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("items");
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("should require authentication", async () => {
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new Request("http://localhost:3000/api/[module]");
      const context = makeRouteContext();

      const response = await GET(request, context);
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/[module]", () => {
    it("should create new item", async () => {
      const itemData = { name: "Test Item" };

      const request = new Request("http://localhost:3000/api/[module]", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(itemData),
      });
      const context = makeRouteContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data.name).toBe("Test Item");
    });

    it("should validate required fields", async () => {
      const invalidData = {}; // Missing required fields

      const request = new Request("http://localhost:3000/api/[module]", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });
      const context = makeRouteContext();

      const response = await POST(request, context);
      expect(response.status).toBe(400);
    });
  });
});
```

### Unit Test with Dynamic Route Params

```typescript
import { describe, it, expect, vi } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/[module]/[id]/route";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";

vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-123"),
}));

vi.mock("@/server/services/[module].service", () => ({
  getItemService: vi.fn().mockResolvedValue({ id: "item-123", name: "Test Item" }),
  updateItemService: vi.fn().mockResolvedValue({ id: "item-123", name: "Updated Item" }),
  deleteItemService: vi.fn().mockResolvedValue(true),
}));

describe("[Module]/[id] API Routes - Unit Tests", () => {
  describe("GET /api/[module]/[id]", () => {
    it("should return item by id", async () => {
      const request = new Request("http://localhost:3000/api/[module]/item-123");
      const context = makeRouteContext({ id: "item-123" });

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("item-123");
    });

    it("should return 404 for non-existent item", async () => {
      const { getItemService } = await import("@/server/services/[module].service");
      vi.mocked(getItemService).mockResolvedValueOnce(null);

      const request = new Request("http://localhost:3000/api/[module]/non-existent");
      const context = makeRouteContext({ id: "non-existent" });

      const response = await GET(request, context);
      expect(response.status).toBe(404);
    });
  });
});
```

---

## 🔄 Integration Test Template (Copy & Paste)

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { GET, POST } from "@/app/api/[module]/route";
import { getDb } from "@/server/db/client";
import { [table] } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";

/**
 * [Module] Integration Tests
 *
 * Tests complete workflows with real database:
 * - Full CRUD operations
 * - User isolation
 * - Data consistency
 *
 * Target Coverage: 80%+
 */

describe("[Module] Workflow - Integration Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testUserId = "test-user-integration";
  const cleanupIds: string[] = [];

  beforeAll(async () => {
    db = await getDb();
  });

  afterEach(async () => {
    // Cleanup test data after each test
    for (const id of cleanupIds) {
      await db.delete(table).where(eq(table.id, id)).execute();
    }
    cleanupIds.length = 0;
  });

  afterAll(async () => {
    // Final cleanup - remove all test user data
    await db.delete(table).where(eq(table.userId, testUserId)).execute();
  });

  describe("CRUD workflow", () => {
    it("should create, read, update, and delete item", async () => {
      // 1. Create
      const createRequest = new Request("http://localhost:3000/api/[module]", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Test Item", userId: testUserId }),
      });
      
      const createResponse = await POST(createRequest, makeRouteContext());
      const createData = await createResponse.json();
      
      expect(createResponse.status).toBe(201);
      expect(createData).toHaveProperty("id");
      cleanupIds.push(createData.id);

      // 2. Read
      const getRequest = new Request(`http://localhost:3000/api/[module]/${createData.id}`);
      const getResponse = await GET(getRequest, makeRouteContext({ id: createData.id }));
      const getData = await getResponse.json();
      
      expect(getResponse.status).toBe(200);
      expect(getData.name).toBe("Test Item");

      // Add update and delete steps as needed
    });
  });
});
```

---

## 🎯 Testing Checklist

For each API route, ensure you test:

### ✅ Happy Path

- [ ] Returns correct status code (200, 201, etc.)
- [ ] Returns correct response structure
- [ ] Response includes all required fields
- [ ] Data types are correct

### ✅ Authentication

- [ ] Requires authentication (if protected)
- [ ] Rejects unauthenticated requests (401)
- [ ] Rejects unauthorized access (403)

### ✅ Validation

- [ ] Validates required fields (400)
- [ ] Validates field formats (email, UUID, etc.)
- [ ] Validates field constraints (min/max length)
- [ ] Rejects extra/unknown fields (strict schema)

### ✅ Error Handling

- [ ] Returns 404 for non-existent resources
- [ ] Returns 400 for invalid input
- [ ] Returns 500 for server errors
- [ ] Error responses include meaningful messages

### ✅ Edge Cases

- [ ] Handles empty request body
- [ ] Handles malformed JSON
- [ ] Handles null/undefined values
- [ ] Handles very long strings
- [ ] Handles concurrent requests

### ✅ Business Logic

- [ ] Validates business rules
- [ ] Enforces data constraints
- [ ] Maintains data integrity
- [ ] Handles race conditions

---

## 🔧 Common Mock Patterns

### Mock Authentication

```typescript
// Always authenticated
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-123"),
}));

// Conditionally authenticated
const mockGetServerUserId = vi.fn().mockResolvedValue("test-user-123");
vi.mock("@/server/auth/user", () => ({
  getServerUserId: mockGetServerUserId,
}));

// In test: mock unauthenticated
mockGetServerUserId.mockRejectedValueOnce(new Error("Unauthorized"));
```

### Mock Services

```typescript
// Mock entire service module
vi.mock("@/server/services/contacts.service", () => ({
  listContactsService: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  createContactService: vi.fn().mockImplementation(async (userId, data) => ({
    id: "new-id",
    ...data,
    userId,
  })),
}));

// Access and modify mocks in tests
const { createContactService } = await import("@/server/services/contacts.service");
vi.mocked(createContactService).mockResolvedValueOnce(mockContact);
```

### Mock External APIs

```typescript
// Mock OpenAI
vi.mock("@/server/ai/openai-client", () => ({
  generateInsight: vi.fn().mockResolvedValue({ insight: "Test insight" }),
}));

// Mock Google APIs
vi.mock("@/server/google/gmail-client", () => ({
  fetchEmails: vi.fn().mockResolvedValue([]),
}));
```

---

## 🏃 Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/__tests__/unit/api-routes/contacts-api.test.ts

# Run with coverage
pnpm test -- --coverage

# Watch mode (useful during development)
pnpm test:watch

# Run only unit tests
pnpm test src/__tests__/unit

# Run only integration tests
pnpm test src/__tests__/integration
```

---

## 📊 Coverage Tips

### Check Current Coverage

```bash
pnpm test -- --coverage
```

### Target Uncovered Lines

1. Look at coverage report (opens in browser)
2. Identify uncovered branches
3. Add specific tests for those branches

### Common Coverage Gaps

- Error handling branches
- Edge case validations
- Async error paths
- Null/undefined checks
- Empty result handling

---

## 🐛 Debugging Test Failures

### Common Issues

**Issue**: Test fails with "Cannot read property of undefined"  
**Fix**: Check that mocks are properly initialized before test runs

**Issue**: Test timeout  
**Fix**: Ensure all async operations use `await` and mocks resolve

**Issue**: Mock not being called  
**Fix**: Verify mock path matches exact import path in code

**Issue**: Tests pass individually but fail together  
**Fix**: Add `beforeEach(() => vi.clearAllMocks())` to reset mocks

### Debugging Commands

```typescript
// Log mock calls
console.log(vi.mocked(someFunction).mock.calls);

// Check mock implementation
console.log(vi.mocked(someFunction).getMockImplementation());

// Log response for inspection
const response = await GET(request, context);
console.log(await response.json());
```

---

## 📚 Resources

- [Full Testing Plan](./API_ROUTES_TESTING_PLAN.md)
- [Testing Strategy Guide](../../src/__tests__/README.md)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)

---

## 🎉 Ready to Start

1. **Pick a module** from the testing plan (start with Contacts)
2. **Copy the template** above
3. **Customize for your route**
4. **Run the test**: `pnpm test:watch`
5. **Iterate until 80%+ coverage**
6. **Move to next module**

**Questions?** Check the full [API Routes Testing Plan](./API_ROUTES_TESTING_PLAN.md) for detailed guidance.
