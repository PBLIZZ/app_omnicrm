# Test Strategy - OmniCRM

## Model Tier Allocation

### Tier C (Complex Reasoning) - 20% of work

**Models**: Claude 3.5 Opus, GPT-4
**Use for**:

- Handler wrapper type inference and generic constraints
- Auth/RLS edge cases and security boundaries
- Property-based test design for adapters
- Cross-module integration test architecture
- Response vs NextResponse architectural decisions

### Tier B (Standard Testing) - 50% of work

**Models**: Claude 3.5 Sonnet, GPT-4-turbo
**Use for**:

- Integration test implementation
- MSW mock handlers
- Playwright test flows
- Adapter contract tests
- Repository query validation

### Tier A (Bulk Generation) - 30% of work

**Models**: Claude Haiku, GPT-3.5, Mistral
**Use for**:

- Unit test scaffolding
- Test data factories
- Snapshot updates
- Coverage gap filling

## Critical Test Suites

### 1. Handler System (`src/server/api/handler.ts`)

```typescript
// Priority: HIGH (Tier C design, Tier B implementation)
- Auth wrapper with getServerUserId mocking
- Rate limiting with operation-based limits
- Validation wrapper with Zod schemas
- Cache wrapper behavior
- createRouteHandler composition
```

### 2. Adapters (`src/server/adapters/`)

```typescript
// Priority: HIGH (Tier C for property tests)
- toOmniClient/fromOmniClient round-trip
- Schema drift detection (slug, stage, tags, confidenceScore)
- Null/undefined handling
- Date serialization
```

### 3. Repository Layer (`src/server/repositories/`)

```typescript
// Priority: HIGH (Tier B)
- SELECT includes all required fields
- RLS context propagation
- Transaction boundaries
- Error handling
```

### 4. API Routes

```typescript
// Priority: MEDIUM (Tier B)
- /api/omni-clients/[clientId] CRUD operations
- Auth guards (401/403)
- Rate limiting (429)
- Validation errors (400)
- Server errors (500)
```

### 5. E2E Critical Paths

```typescript
// Priority: HIGH (Tier B/C)
- Login → Create Client → Verify slug in response
- List clients with filters
- Update client preserving slug
- Delete client cascade
```

## Schema Canary Tests

```typescript
// src/server/repositories/__tests__/schema-canaries.test.ts
describe("Schema Drift Detection", () => {
  it("SELECT must include slug field", async () => {
    const query = clientRepository.buildSelectQuery();
    expect(query.selectedFields).toContain("slug");
  });

  it("OmniClient type must have nullable confidenceScore", () => {
    type Check = OmniClient["confidenceScore"] extends string | null ? true : false;
    const typeCheck: Check = true;
    expect(typeCheck).toBe(true);
  });
});
```

## Test Infrastructure

### Mocking Strategy

```typescript
// Database: In-memory with test transactions
vi.mock("@/server/db/client", () => ({
  getDb: () => testDb.transaction(),
}));

// Auth: Controlled user context
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

// HTTP: MSW for external services
const server = setupServer(
  rest.get("/api/*", (req, res, ctx) => {
    return res(ctx.json({ ok: true }));
  }),
);
```

### Test Data Factories

```typescript
// src/test/factories/omni-client.factory.ts
export const omniClientFactory = {
  build: (overrides?: Partial<OmniClient>): OmniClient => ({
    id: faker.uuid(),
    slug: faker.helpers.slugify(faker.company.name()),
    stage: "prospect",
    tags: [],
    confidenceScore: null,
    ...overrides,
  }),

  buildCreateInput: (overrides?: Partial<CreateOmniClientInput>) => ({
    displayName: faker.company.name(),
    primaryEmail: faker.internet.email(),
    ...overrides,
  }),
};
```

## CI/CD Gates

### Coverage Requirements

```yaml
# .github/workflows/test.yml
- name: Coverage Check
  run: |
    pnpm test:coverage
    # Critical paths must maintain 80%+ coverage
    npx nyc check-coverage \
      --include "src/server/api/handler.ts" --statements 80 \
      --include "src/server/adapters/**" --statements 85 \
      --include "src/app/api/omni-clients/**" --branches 75
```

### ESLint Rules

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "next/server",
            importNames: ["NextResponse"],
            message: "Use Response from handler.ts instead",
          },
        ],
      },
    ],
  },
};
```

## Regression Test Examples

### Adapter Contract Test

```typescript
describe("toOmniClient adapter", () => {
  it.each([
    { input: { slug: "test-slug" }, expected: "test-slug" },
    { input: { slug: null }, expected: null },
    { input: {}, expected: undefined }, // MUST FAIL - slug required
  ])("preserves slug field: $input", ({ input, expected }) => {
    const result = toOmniClient(input as any);
    expect(result.slug).toBe(expected);
  });
});
```

### Handler Auth Test

```typescript
describe("createRouteHandler auth", () => {
  it("returns 401 with proper error structure", async () => {
    vi.mocked(getServerUserId).mockRejectedValue(new Error("No session"));

    const handler = createRouteHandler({ auth: true })(async ({ userId }) => apiOk({ userId }));

    const req = new NextRequest("http://localhost/test");
    const res = await handler(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: false,
      code: "UNAUTHORIZED",
      error: expect.any(String),
      requestId: expect.any(String),
    });
  });
});
```

## Property-Based Tests

```typescript
import fc from "fast-check";

describe("OmniClient validation", () => {
  it("round-trips through adapter layers", () => {
    fc.assert(
      fc.property(
        fc.record({
          displayName: fc.string({ minLength: 1 }),
          primaryEmail: fc.emailAddress(),
          stage: fc.constantFrom("prospect", "active", "churned"),
          tags: fc.array(fc.string()),
          confidenceScore: fc.option(fc.float({ min: 0, max: 1 })),
        }),
        (input) => {
          const dbRow = fromOmniClient(input);
          const result = toOmniClient(dbRow);

          expect(result.displayName).toBe(input.displayName);
          expect(result.slug).toBeDefined();
          expect(result.stage).toBe(input.stage);
        },
      ),
    );
  });
});
```

## Test Execution Strategy

### Local Development

```bash
# Fast feedback loop
pnpm test:unit --watch

# Pre-commit
pnpm test:integration

# Pre-push
pnpm test:e2e
```

### CI Pipeline

```bash
# Parallel execution
pnpm test:unit & pnpm test:integration
wait
pnpm test:e2e
pnpm test:coverage
```

## Monthly Audit Checklist

- [ ] Schema drift tests still catching changes
- [ ] Auth tests cover new endpoints
- [ ] Rate limit tests match config
- [ ] E2E covers critical user journeys
- [ ] Coverage metrics above thresholds
- [ ] No NextResponse imports in routes
- [ ] Property tests finding edge cases
