# Integration Tests

This directory contains integration tests that verify complete workflows and interactions between API routes, services, repositories, and the database.

## Overview

Integration tests differ from unit tests in that they:

- Test complete end-to-end workflows (e.g., full CRUD operations)
- Use real database connections (when configured)
- Verify interactions between multiple layers of the application
- Test actual HTTP request/response cycles through API routes

## Running Integration Tests

### Without Database (Default)

By default, integration tests will **skip** if no test database is configured:

```bash
pnpm test src/__tests__/integration
```

You'll see tests marked as "skipped" with a warning message.

### With Database

To run integration tests against a real database:

1. **Set up a test database:**

   ```sql
   CREATE DATABASE test_omnicrm;
   CREATE USER test_user WITH PASSWORD 'test_password';
   GRANT ALL PRIVILEGES ON DATABASE test_omnicrm TO test_user;
   ```

2. **Configure `.env.test`:**

   ```bash
   DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_omnicrm
   ```

3. **Run migrations on the test database:**

   ```bash
   DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_omnicrm pnpm supabase db push
   ```

4. **Run tests:**

   ```bash
   pnpm test src/__tests__/integration
   ```

## Test Structure

### API Route Tests

Located in `api-routes/`, these tests:

- Import actual API route handlers
- Make HTTP requests using the Request/Response API
- Verify complete request → validation → service → repository → database → response cycles
- Test error handling, validation, authentication, and authorization

Example:

```typescript
import { POST as createContact } from "@/app/api/contacts/route";

const request = new Request("http://localhost:3000/api/contacts", {
  method: "POST",
  body: JSON.stringify({ displayName: "Test User" }),
});

const response = await createContact(request, makeRouteContext());
expect(response.status).toBe(200);
```

## Writing Integration Tests

### Key Patterns

1. **Unmock database and API layers:**

   ```typescript
   vi.unmock("@/lib/api");
   vi.unmock("drizzle-orm/postgres-js");
   vi.unmock("postgres");
   ```

2. **Mock only authentication:**

   ```typescript
   vi.mock("@/server/auth/user", () => ({
     getServerUserId: vi.fn().mockResolvedValue("test-user-id"),
   }));
   ```

3. **Skip tests if database unavailable:**

   ```typescript
   let dbAvailable = false;
   
   beforeAll(async () => {
     try {
       db = await getDb();
       dbAvailable = true;
     } catch {
       dbAvailable = false;
     }
   });
   
   it.skipIf(!dbAvailable)("should create contact", async () => {
     // test implementation
   });
   ```

4. **Clean up test data:**

   ```typescript
   afterEach(async () => {
     // Delete test records
   });
   
   afterAll(async () => {
     // Final cleanup
   });
   ```

### Test Coverage Goals

Integration tests should cover:

- ✅ Complete CRUD workflows
- ✅ Complex multi-step operations
- ✅ User isolation and security
- ✅ Error handling and validation
- ✅ Edge cases that span multiple layers

Unit tests (in `src/**/*.test.ts`) remain responsible for:

- Individual function logic
- Edge cases in isolated units
- Fast feedback during development

## CI/CD Considerations

- Integration tests **skip** by default in CI unless a test database is configured
- Unit tests provide fast feedback without database dependencies
- Consider running integration tests:
  - On merge to main
  - Nightly builds
  - Before production deployments
  - Locally before submitting PRs (optional)

## Troubleshooting

### "Database not available" warnings

This is normal if you haven't set up a test database. Integration tests will skip automatically.

### "role does not exist" errors

Ensure the database user specified in `DATABASE_URL` exists:

```sql
CREATE USER test_user WITH PASSWORD 'test_password';
```

### Connection timeout errors

Check that PostgreSQL is running and accessible:

```bash
psql -U test_user -d test_omnicrm -h localhost
```

### Tests interfering with each other

Ensure proper cleanup in `afterEach` and `afterAll` hooks, and use unique test data identifiers.

## Best Practices

1. **Keep integration tests focused:** Test complete workflows, not every edge case
2. **Use unique test data:** Avoid conflicts between parallel test runs
3. **Clean up after tests:** Always remove test data to avoid pollution
4. **Document database setup:** Update this README if requirements change
5. **Balance with unit tests:** Integration tests are slower; use them strategically
