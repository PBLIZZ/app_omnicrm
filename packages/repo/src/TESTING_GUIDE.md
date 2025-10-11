# Repository Testing Quick Reference

## Adding Tests for New Repositories

When creating a new repository class, follow this checklist:

### 1. Create Test File

```bash
touch packages/repo/src/your-repo-name.repo.test.ts
```

### 2. Basic Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { YourRepository } from "./your-repo-name.repo";
import type { DbClient } from "@/server/db/client";
import { yourTable } from "@/server/db/schema";

const createMockDb = () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return mockDb as unknown as DbClient;
};

describe("YourRepository", () => {
  let mockDb: DbClient;
  const testUserId = "test-user-123";

  beforeEach(() => {
    mockDb = createMockDb();
  });

  // Add test suites here
});
```

### 3. Test Each Method

For LIST methods:

```typescript
describe("listItems", () => {
  it("should list with default pagination", async () => { ... });
  it("should filter by X", async () => { ... });
  it("should search by Y", async () => { ... });
  it("should handle custom pagination", async () => { ... });
  it("should enforce max page size", async () => { ... });
  it("should sort ascending/descending", async () => { ... });
});
```

For GET methods:

```typescript
describe("getItemById", () => {
  it("should return item when found", async () => { ... });
  it("should return null when not found", async () => { ... });
  it("should respect user isolation", async () => { ... });
});
```

For CREATE methods:

```typescript
describe("createItem", () => {
  it("should create new item", async () => { ... });
  it("should throw error when insert fails", async () => { ... });
});
```

For UPDATE methods:

```typescript
describe("updateItem", () => {
  it("should update existing item", async () => { ... });
  it("should return null when not found", async () => { ... });
  it("should throw error on empty updates", async () => { ... });
});
```

For DELETE methods:

```typescript
describe("deleteItem", () => {
  it("should delete and return count", async () => { ... });
  it("should return 0 when not found", async () => { ... });
});
```

### 4. Mock Responses

Setup mock returns:

```typescript
// For successful queries
vi.mocked(mockDb.select().from(table).where).mockResolvedValueOnce([mockItem]);

// For counts
vi.mocked(mockDb.select().from(table).where).mockResolvedValueOnce([{ value: 1 }]);

// For inserts/updates
vi.mocked(mockDb.insert(table).values(data).returning).mockResolvedValueOnce([created]);

// For deletes
vi.mocked(mockDb.delete(table).where).mockResolvedValueOnce([{ id: "deleted-id" }]);
```

### 5. Common Assertions

```typescript
// Check return values
expect(result).toEqual(expected);
expect(result).toBeNull();
expect(result.items).toHaveLength(5);
expect(result.total).toBe(10);

// Check function calls
expect(mockDb.select).toHaveBeenCalled();
expect(mockDb.limit).toHaveBeenCalledWith(50);
expect(mockDb.offset).toHaveBeenCalledWith(100);

// Check errors
await expect(fn()).rejects.toThrow("Error message");
```

## Running Tests

```bash
# Single file
npm test packages/repo/src/your-repo.test.ts

# All repo tests
npm test packages/repo

# Watch mode
npm test:watch packages/repo

# With coverage
npm test -- --coverage packages/repo
```

## Debugging Tests

```bash
# Run with verbose output
npm test -- --reporter=verbose packages/repo/src/your-repo.test.ts

# Run specific test
npm test -- --grep "should list with default pagination"
```