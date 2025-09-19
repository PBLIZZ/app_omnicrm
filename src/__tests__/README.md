# Testing Strategy Guide

**Date:** 2025-09-19

**Author:** Peter James Blizzard

## Purpose & Architecture

This guide outlines the comprehensive testing strategy for OmniCRM, covering unit tests, integration tests, and end-to-end testing patterns. The testing architecture emphasizes reliable, maintainable tests that provide confidence in code quality and business functionality.

**Key Benefits:**

- **Confidence**: Comprehensive test coverage ensures reliable deployments
- **Maintainability**: Consistent testing patterns reduce maintenance overhead
- **Fast Feedback**: Layered testing strategy provides quick feedback at different levels
- **Business Validation**: Tests validate business requirements and user workflows
- **Regression Prevention**: Automated testing prevents regressions during refactoring

**Testing Pyramid Architecture:**

```bash
                E2E Tests (Slow, High Confidence)
                     ↑
              Integration Tests (Medium Speed, Real Components)
                     ↑
            Unit Tests (Fast, Isolated Components)
```

## Testing Layers

### Unit Tests (`src/__tests__/unit/`)

**Purpose**: Test individual components, functions, and classes in isolation

**Characteristics:**

- Fast execution (< 1s per test)
- Isolated dependencies (mocked)
- High code coverage
- Focused on single responsibility

**What to Test:**

- Component rendering and props handling
- Utility function logic
- Business logic in services
- Error handling and edge cases
- State management hooks

```typescript
// Example: Component unit test
import { render, screen } from '@testing-library/react';
import { expect, describe, it, vi } from 'vitest';
import { ContactCard } from '@/components/contacts/ContactCard';
import { makeOmniClient } from '@packages/testing';

describe('ContactCard Component', () => {
  it('should render contact information correctly', () => {
    const contact = makeOmniClient({
      displayName: 'John Doe',
      primaryEmail: 'john@example.com',
      stage: 'Core Client'
    });

    render(<ContactCard contact={contact} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Core Client')).toBeInTheDocument();
  });

  it('should handle missing email gracefully', () => {
    const contact = makeOmniClient({
      displayName: 'Jane Smith',
      primaryEmail: null
    });

    render(<ContactCard contact={contact} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('No email provided')).toBeInTheDocument();
  });
});
```

### Integration Tests (`src/__tests__/integration/`)

**Purpose**: Test interactions between multiple components, services, and repositories

**Characteristics:**

- Medium execution speed (1-10s per test)
- Real component collaboration
- Database/API integration (with test data)
- End-to-end business workflows

**What to Test:**

- API route functionality
- Service layer integration with repositories
- Database operations with real queries
- Authentication and authorization flows
- Complex business workflows

```typescript
// Example: API integration test
import { describe, it, expect, beforeEach } from "vitest";
import { createMocks } from "node-mocks-http";
import { POST } from "@/app/api/omni-clients/route";
import { setupRepoMocks, makeCreateOmniClientInput, testUtils } from "@packages/testing";
import { RouteContext } from "@/__tests__/helpers/route-context";

describe("POST /api/omni-clients Integration", () => {
  const fakes = setupRepoMocks();

  beforeEach(() => {
    resetRepoMocks(fakes);
  });

  it("should create a new contact successfully", async () => {
    const input = makeCreateOmniClientInput({
      displayName: "Sarah Johnson",
      primaryEmail: "sarah@yogastudio.com",
    });

    const { req, res } = createMocks({
      method: "POST",
      body: input,
      headers: { "x-csrf-token": "valid-token" },
    });

    const context = new RouteContext({ userId: testUtils.defaultUserId });
    const response = await POST(req, context);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.data.item.displayName).toBe("Sarah Johnson");
  });

  it("should validate required fields", async () => {
    const invalidInput = { displayName: "" }; // Missing required field

    const { req } = createMocks({
      method: "POST",
      body: invalidInput,
    });

    const context = new RouteContext({ userId: testUtils.defaultUserId });
    const response = await POST(req, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});
```

### End-to-End Tests (`e2e/`)

**Purpose**: Test complete user workflows in a real browser environment

**Characteristics:**

- Slow execution (10s+ per test)
- Real browser automation (Playwright)
- Full application stack
- User-focused scenarios

**What to Test:**

- Critical user journeys
- Authentication flows
- Complex interactions across multiple pages
- Browser-specific functionality
- Performance and accessibility

```typescript
// Example: E2E test
import { test, expect } from "@playwright/test";

test.describe("Contact Management Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[data-testid="email"]', "test@example.com");
    await page.fill('[data-testid="password"]', "password123");
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL("/dashboard");
  });

  test("should create and manage a contact", async ({ page }) => {
    // Navigate to contacts
    await page.click('[data-testid="nav-contacts"]');
    await expect(page).toHaveURL("/omni-clients");

    // Create new contact
    await page.click('[data-testid="add-contact"]');
    await page.fill('[data-testid="contact-name"]', "Emma Wilson");
    await page.fill('[data-testid="contact-email"]', "emma@example.com");
    await page.selectOption('[data-testid="contact-stage"]', "New Client");
    await page.click('[data-testid="save-contact"]');

    // Verify contact appears in list
    await expect(page.locator('[data-testid="contact-list"]')).toContainText("Emma Wilson");

    // Edit contact
    await page.click('[data-testid="contact-edit-emma"]');
    await page.selectOption('[data-testid="contact-stage"]', "Core Client");
    await page.click('[data-testid="save-contact"]');

    // Add note
    await page.click('[data-testid="add-note"]');
    await page.fill('[data-testid="note-content"]', "Interested in advanced yoga classes");
    await page.click('[data-testid="save-note"]');

    // Verify note appears
    await expect(page.locator('[data-testid="notes-list"]')).toContainText(
      "Interested in advanced yoga classes",
    );
  });
});
```

## Test Organization Patterns

### File Structure

```bash
src/__tests__/
├── unit/                         # Unit tests
│   ├── components/               # Component unit tests
│   ├── hooks/                    # Hook unit tests
│   ├── services/                 # Service unit tests
│   └── utils/                    # Utility function tests
├── integration/                  # Integration tests
│   ├── api-endpoints.test.ts     # API route tests
│   ├── auth-flows.test.ts        # Authentication integration
│   ├── contact-workflows.test.ts # Business workflow tests
│   └── job-processing.test.ts    # Background job tests
├── helpers/                      # Test helpers and utilities
│   ├── route-context.ts          # API route testing context
│   └── test-providers.tsx        # React testing providers
└── examples/                     # Example test patterns
    └── component-testing.md      # Testing documentation
```

### Naming Conventions

**Test Files:**

- Unit tests: `ComponentName.test.tsx` or `functionName.test.ts`
- Integration tests: `feature-name.test.ts` or `api-route.test.ts`
- E2E tests: `user-workflow.spec.ts`

**Test Descriptions:**

- Describe blocks: Use component/feature names
- Test cases: Use "should + behavior" format
- Test groups: Organize by functionality

```typescript
describe("ContactService", () => {
  describe("listContacts", () => {
    it("should return all contacts for user", async () => {
      // Test implementation
    });

    it("should filter contacts by search term", async () => {
      // Test implementation
    });

    it("should handle empty results gracefully", async () => {
      // Test implementation
    });
  });

  describe("error handling", () => {
    it("should throw error when user not found", async () => {
      // Test implementation
    });
  });
});
```

## Best Practices

### Do's and Don'ts

**✅ DO:**

- Write tests before implementation (TDD approach)
- Use the testing package factories for realistic data
- Test both happy path and error scenarios
- Use meaningful test descriptions that explain behavior
- Keep tests isolated and independent
- Mock external dependencies appropriately
- Use proper assertions that clearly indicate failures

**❌ DON'T:**

- Test implementation details instead of behavior
- Write overly complex tests that are hard to understand
- Share state between tests without proper cleanup
- Mock everything (use real integrations where appropriate)
- Ignore test failures or skip tests without good reason
- Write tests that depend on external services
- Create brittle tests that break with minor changes

### Testing Component Behavior vs Implementation

```typescript
// ✅ GOOD - Testing behavior
describe('ContactForm', () => {
  it('should show validation error when email is invalid', async () => {
    render(<ContactForm />);

    await user.type(screen.getByLabelText('Email'), 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });
});

// ❌ BAD - Testing implementation details
describe('ContactForm', () => {
  it('should call validateEmail function when form is submitted', () => {
    const validateEmailSpy = vi.spyOn(utils, 'validateEmail');
    render(<ContactForm />);

    // Testing internal function calls instead of user-visible behavior
    expect(validateEmailSpy).toHaveBeenCalled();
  });
});
```

### Error Handling Testing

```typescript
describe("ContactService Error Handling", () => {
  const fakes = setupRepoMocks();
  const scenarios = configureCommonScenarios(fakes);

  beforeEach(() => {
    resetRepoMocks(fakes);
  });

  it("should handle database connection errors", async () => {
    scenarios.databaseError();

    await expect(contactService.listContacts(testUtils.defaultUserId, {})).rejects.toThrow(
      "Database connection error",
    );
  });

  it("should handle validation errors for invalid data", async () => {
    const invalidInput = makeCreateOmniClientInput({
      displayName: "", // Invalid - empty name
      primaryEmail: "not-an-email", // Invalid format
    });

    await expect(
      contactService.createContact(testUtils.defaultUserId, invalidInput),
    ).rejects.toThrow("Validation failed");
  });

  it("should handle authorization errors", async () => {
    scenarios.userNotFound(testUtils.defaultUserId);

    await expect(contactService.listContacts(testUtils.defaultUserId, {})).rejects.toThrow(
      "User not found",
    );
  });
});
```

### Async Testing Patterns

```typescript
describe('Async Operations', () => {
  it('should handle async data loading', async () => {
    const fakes = setupRepoMocks();
    const contacts = makeBatch(() => makeOmniClient(), 3);

    fakes.omniClients.listContacts.mockImplementation(async () => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return { items: contacts, total: 3 };
    });

    render(<ContactList />);

    // Check loading state
    expect(screen.getByText('Loading contacts...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(contacts[0].displayName)).toBeInTheDocument();
    });

    // Verify loading state is gone
    expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument();
  });

  it('should handle async errors gracefully', async () => {
    const fakes = setupRepoMocks();

    fakes.omniClients.listContacts.mockRejectedValue(
      new Error('Network error')
    );

    render(<ContactList />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load contacts')).toBeInTheDocument();
    });
  });
});
```

## Common Pitfalls

### Test Isolation Issues

**Problem**: Tests affecting each other due to shared state

```typescript
// ❌ BROKEN - Shared state between tests
describe("ContactService", () => {
  const fakes = setupRepoMocks();

  // Missing resetRepoMocks between tests

  it("should return contacts", async () => {
    fakes.omniClients.listContacts.mockResolvedValue({
      items: [makeOmniClient()],
      total: 1,
    });
    // Test passes
  });

  it("should handle empty database", async () => {
    // Previous test's mock still active!
    const result = await contactService.listContacts(userId, {});
    expect(result.items).toHaveLength(0); // FAILS - still returns 1 item
  });
});
```

**Solution**: Proper test isolation

```typescript
// ✅ FIXED - Proper test isolation
describe("ContactService", () => {
  const fakes = setupRepoMocks();

  beforeEach(() => {
    resetRepoMocks(fakes); // Clean state for each test
  });

  // Tests are now properly isolated
});
```

### Over-Mocking Dependencies

**Problem**: Mocking too much leads to tests that don't reflect real behavior

```typescript
// ❌ BROKEN - Over-mocking
describe("ContactForm", () => {
  it("should save contact", async () => {
    // Mocking every single dependency
    vi.mock("@/components/ui/button");
    vi.mock("@/components/ui/input");
    vi.mock("@/hooks/use-contacts");
    vi.mock("@/lib/validation");
    vi.mock("react-query");

    // Test becomes meaningless - nothing is real
  });
});
```

**Solution**: Mock at appropriate boundaries

```typescript
// ✅ FIXED - Strategic mocking
describe('ContactForm', () => {
  const fakes = setupRepoMocks(); // Mock only data layer

  it('should save contact', async () => {
    // Real UI components, real validation, real React Query
    // Only mock the repository layer
    fakes.omniClients.createContact.mockResolvedValue(makeOmniClient());

    render(<ContactForm />);
    // Test real user interactions and component behavior
  });
});
```

### Testing Implementation Instead of Behavior

**Problem**: Tests break when implementation changes, even if behavior is correct

```typescript
// ❌ BROKEN - Testing implementation details
describe('ContactList', () => {
  it('should call useContacts hook with correct parameters', () => {
    const useContactsSpy = vi.spyOn(hooks, 'useContacts');

    render(<ContactList />);

    expect(useContactsSpy).toHaveBeenCalledWith({
      page: 1,
      pageSize: 50
    });
  });
});
```

**Solution**: Test user-visible behavior

```typescript
// ✅ FIXED - Testing behavior
describe('ContactList', () => {
  it('should display paginated contacts', async () => {
    const contacts = makeBatch(() => makeOmniClient(), 10);
    const fakes = setupRepoMocks();

    fakes.omniClients.listContacts.mockResolvedValue({
      items: contacts.slice(0, 5), // First page
      total: 10
    });

    render(<ContactList />);

    // Test what user sees
    await waitFor(() => {
      expect(screen.getAllByTestId('contact-card')).toHaveLength(5);
    });

    expect(screen.getByText('Showing 1-5 of 10 contacts')).toBeInTheDocument();
  });
});
```

## Migration Patterns

### From Manual Test Setup to Testing Package

**Before** (manual test setup):

```typescript
// ❌ Old pattern - manual mocking
describe("ContactService", () => {
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      listContacts: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      deleteContact: vi.fn(),
    };
  });

  it("should create contact", async () => {
    const mockContact = {
      id: "contact-1",
      userId: "user-1",
      displayName: "John Doe",
      // ... 20+ manual fields
    };

    mockRepository.createContact.mockResolvedValue(mockContact);

    const service = new ContactService(mockRepository);
    const result = await service.createContact("user-1", {
      displayName: "John Doe",
    });

    expect(result).toEqual(mockContact);
  });
});
```

**After** (using testing package):

```typescript
// ✅ New pattern - testing package
import { setupRepoMocks, resetRepoMocks, makeOmniClient, testUtils } from "@packages/testing";

describe("ContactService", () => {
  const fakes = setupRepoMocks();

  beforeEach(() => {
    resetRepoMocks(fakes);
  });

  it("should create contact", async () => {
    const userId = testUtils.defaultUserId;
    const input = makeCreateOmniClientInput({ displayName: "John Doe" });
    const expectedContact = makeOmniClient({ ...input, userId });

    fakes.omniClients.createContact.mockResolvedValue(expectedContact);

    const result = await contactService.createContact(userId, input);
    expect(result).toEqual(expectedContact);
  });
});
```

### Step-by-Step Migration Guide

1. **Replace Manual Mocks**

   ```typescript
   // Replace vi.fn() setups with setupRepoMocks()
   const fakes = setupRepoMocks();
   ```

2. **Use Factory Functions**

   ```typescript
   // Replace manual object creation with factories
   const contact = makeOmniClient({ displayName: "Test User" });
   ```

3. **Add Proper Cleanup**

   ```typescript
   beforeEach(() => {
     resetRepoMocks(fakes);
   });
   ```

4. **Use Common Scenarios**

   ```typescript
   const scenarios = configureCommonScenarios(fakes);
   scenarios.emptyDatabase();
   ```

5. **Standardize Test Utils**

   ```typescript
   const userId = testUtils.defaultUserId;
   const params = testUtils.createPaginationParams();
   ```

## Troubleshooting

### Common Issues and Solutions

**Issue**: Tests pass individually but fail when run together
**Solution**: Add proper test isolation with `beforeEach` cleanup

**Issue**: Tests are slow and flaky
**Solution**: Use appropriate test layer (unit vs integration) and proper async handling

**Issue**: Tests break frequently with code changes
**Solution**: Test behavior instead of implementation details

**Issue**: Mock assertions are confusing or unclear
**Solution**: Use descriptive variable names and clear assertion messages

**Issue**: Tests don't catch real bugs
**Solution**: Increase integration test coverage and use realistic test data

### Debug Patterns

```typescript
// ✅ Debug test failures
describe("ContactService", () => {
  it("should handle search correctly", async () => {
    const fakes = setupRepoMocks();
    const userId = testUtils.defaultUserId;

    // Debug: Log what the mock receives
    fakes.omniClients.listContacts.mockImplementation(async (receivedUserId, receivedParams) => {
      console.log("Mock called with:", { receivedUserId, receivedParams });
      return { items: [], total: 0 };
    });

    await contactService.listContacts(userId, { search: "john" });

    // Debug: Check mock call history
    console.log("Mock call history:", fakes.omniClients.listContacts.mock.calls);

    expect(fakes.omniClients.listContacts).toHaveBeenCalledWith(userId, { search: "john" });
  });
});
```

### Performance Optimization

```typescript
// ✅ Optimize test performance
describe('Large Dataset Tests', () => {
  // Use smaller datasets for unit tests
  it('should handle pagination', () => {
    const contacts = makeBatch(() => makeOmniClient(), 5); // Not 1000
    // Test with minimal realistic data
  });

  // Use test.concurrent for independent tests
  test.concurrent('should validate email format', () => {
    // Independent validation test
  });

  // Skip expensive setup when not needed
  it('should render contact list', () => {
    // Don't setup full database for render tests
    render(<ContactList contacts={[makeOmniClient()]} />);
  });
});
```

This comprehensive testing strategy ensures reliable, maintainable tests that provide confidence in the OmniCRM application's functionality and business requirements.
