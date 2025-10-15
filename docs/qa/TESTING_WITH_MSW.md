# Testing with MSW (Mock Service Worker)

This guide explains how to test React hooks and components that make HTTP requests using Mock Service Worker (MSW).

## Why MSW?

MSW intercepts HTTP requests at the network level, providing several advantages over traditional mocking approaches:

1. **No brittle module mocks** - No need to mock `apiClient` or `fetch` directly
2. **Realistic testing** - Tests the actual data flow including serialization/deserialization
3. **Works with React Query** - No issues with async timing or query state
4. **Easy to debug** - Clear request/response flow
5. **Reusable handlers** - Define mock endpoints once, use everywhere

## Setup

### 1. MSW Installation

MSW is already installed as a dev dependency:

**Note:** MSW is pre-installed in this project (`pnpm add -D msw` has already been run). The command below is for reference if setting up in a new project.

```bash
pnpm add -D msw
```

### 2. Project Structure

```bash
test/
├── msw/
│   ├── server.ts      # MSW server setup
│   └── handlers.ts    # Default request handlers
vitest.setup.ts        # Vitest configuration with MSW
```

### 3. MSW Server Configuration

The MSW server is automatically started for all tests in `vitest.setup.ts`:

```typescript
import { setupMswServer, resetMswServer, closeMswServer } from "./test/msw/server";

beforeAll(() => {
  setupMswServer();  // Start MSW before all tests
});

afterEach(() => {
  resetMswServer();  // Reset handlers after each test
});

afterAll(() => {
  closeMswServer();  // Stop MSW after all tests
});
```

## Writing Tests

### Basic Hook Test

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { useContacts } from "../use-contacts";

describe("useContacts", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches contacts successfully", async () => {
    const { result } = renderHook(() => useContacts("", 1, 25), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.items[0].displayName).toBe("John Doe");
  });
});
```

### Overriding Handlers for Specific Tests

You can override the default handlers for specific test scenarios:

```typescript
import { server } from "../../../test/msw/server";
import { http, HttpResponse } from "msw";

it("handles API errors gracefully", async () => {
  // Override the default handler for this test only
  server.use(
    http.get("/api/contacts", () => {
      return HttpResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    })
  );

  const { result } = renderHook(() => useContacts("", 1, 25), { wrapper });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeDefined();
});
```

### Testing Mutations

```typescript
it("creates a contact successfully", async () => {
  const { result } = renderHook(() => useCreateContact(), { wrapper });

  result.current.mutate({
    displayName: "New Contact",
    primaryEmail: "new@example.com",
    source: "manual",
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data?.displayName).toBe("New Contact");
});
```

**Note:** For POST handlers in MSW (used for mutations like create/update), define them with `http.post('/api/contacts', async ({ request }) => { const body = await request.json(); return HttpResponse.json({ ... }); })`. This intercepts the request body and allows mocking the server response.

## Adding New Handlers

To add handlers for new endpoints, update `test/msw/handlers.ts`:

```typescript
export const handlers = [
  // ... existing handlers

  // GET /api/your-endpoint
  http.get("/api/your-endpoint", ({ request }) => {
    const url = new URL(request.url);
    const param = url.searchParams.get("param");

    return HttpResponse.json({
      data: "your response",
      param,
    });
  }),

  // POST /api/your-endpoint
  http.post("/api/your-endpoint", async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      id: "generated-id",
      ...(body as Record<string, unknown>),
    }, { status: 201 });
  }),
];
```

## Best Practices

### 1. Use Default Handlers for Happy Paths

Define default success responses in `handlers.ts` for the most common scenarios. This reduces test boilerplate.

### 2. Override Handlers for Edge Cases

Use `server.use()` in individual tests to test error conditions and edge cases:

```typescript
it("handles network errors", async () => {
  server.use(
    http.get("/api/contacts", () => {
      return HttpResponse.error();  // Network error
    })
  );
  
  // ... test error handling
});
```

### 3. Reset State Between Tests

The `afterEach` hook automatically resets MSW handlers, but you should also create a fresh QueryClient wrapper for each test:

```typescript
beforeEach(() => {
  wrapper = createQueryClientWrapper();  // Fresh client for each test
});
```

### 4. Wait for Query State Changes

Always use `waitFor` to wait for async state changes:

```typescript
await waitFor(() => expect(result.current.isSuccess).toBe(true));
// or
await waitFor(() => expect(result.current.isError).toBe(true));
```

### 5. Debug with MSW Logs

Enable MSW request logging by setting the `DEBUG_MSW` environment variable:

```bash
DEBUG_MSW=1 pnpm test src/hooks/__tests__/your-test.test.ts
```

## Troubleshooting

### Tests Timeout

If tests timeout waiting for queries:

1. **Check the URL** - Ensure MSW handlers match the actual API URLs
2. **Check window.location** - MSW needs `window.location.origin` to be set (already configured)
3. **Disable fake timers** - Fake timers interfere with MSW (already disabled)

### Handlers Not Working

1. **Check handler order** - More specific handlers should come before generic ones
2. **Check HTTP method** - Ensure `http.get`, `http.post`, etc. match your requests
3. **Check path matching** - Use exact paths or proper path patterns

### React Query Not Updating

1. **Create fresh QueryClient** - Always create a new wrapper in `beforeEach`
2. **Use waitFor** - Don't check state immediately after triggering queries/mutations
3. **Check query keys** - Ensure query keys match between hooks and cache invalidation

## Examples

See `src/hooks/__tests__/use-contacts.msw.test.ts` for comprehensive examples of:

- Testing query hooks
- Testing mutation hooks
- Overriding handlers for error scenarios
- Testing with search parameters
- Testing enabled/disabled queries

## Migration from Old Tests

If you have existing tests using module mocks (`vi.mock`), migrate them to MSW:

### Before (Module Mocking)

```typescript
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

it("fetches data", async () => {
  vi.mocked(apiClientModule.apiClient.get).mockResolvedValue(mockData);
  // ... test
});
```

### After (MSW)

```typescript
// No module mocks needed!

it("fetches data", async () => {
  // MSW automatically intercepts requests
  // Default handlers in handlers.ts provide responses
  const { result } = renderHook(() => useYourHook(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## Resources

- [MSW Documentation](https://mswjs.io/)
- [MSW with Vitest](https://mswjs.io/docs/integrations/node)
- [Testing React Query](https://tanstack.com/query/latest/docs/react/guides/testing)
