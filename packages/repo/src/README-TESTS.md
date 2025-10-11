# Repository Layer Tests

This directory contains comprehensive unit tests for all repository classes in the data access layer.

## Test Coverage

### New Repositories (Full Coverage)

- ✅ `ai-insights.repo.test.ts` - AI insights data access
- ✅ `contact-identities.repo.test.ts` - Contact identity management
- ✅ `documents.repo.test.ts` - Document storage and retrieval
- ✅ `embeddings.repo.test.ts` - Vector embeddings management
- ✅ `ignored-identifiers.repo.test.ts` - Ignored identifier tracking

### Modified Repositories (Updated Coverage)

Tests have been added/updated for recently refactored repositories to ensure they work correctly after the pure-repository refactoring.

## Testing Approach

All repository tests follow these patterns:

1. Mocked Database Client: Tests use a mock `DbClient` to avoid actual database connections  
2. Comprehensive Coverage: Tests cover:  
   - Happy path scenarios  
   - Edge cases (empty results, not found, etc.)  
   - Pagination and filtering  
   - User isolation (ensuring data security)  
   - Error conditions  
3. Consistent Naming: Test names clearly describe what they test  
4. Descriptive Assertions: Each test validates specific behavior  

## Running Tests

```bash
# Run all repository tests
npm test packages/repo

# Run specific test file
npm test packages/repo/src/ai-insights.repo.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Structure

Each test file follows this structure:

```typescript
describe("RepositoryName", () => {
  let mockDb: DbClient;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("methodName", () => {
    it("should handle happy path", async () => { ... });
    it("should handle edge case", async () => { ... });
    it("should enforce constraints", async () => { ... });
  });
});
```

## Key Testing Patterns

### Pagination Tests

All list methods test:
- Default pagination
- Custom page size
- Page size limits (min/max enforcement)
- Offset calculation

### Filtering Tests

List methods with filters test:
- Each filter individually
- Combined filters
- Empty filter results

### CRUD Operations

Create/Update/Delete methods test:
- Successful operations
- Not found scenarios
- Validation errors
- Return value correctness

### User Isolation

All methods test that data is properly scoped to the requesting user ID.