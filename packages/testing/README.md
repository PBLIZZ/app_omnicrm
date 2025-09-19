# Testing Utilities Guide

**Date:** 2025-09-19

**Author:** Peter James Blizzard

## Purpose & Architecture

The Testing Utilities package provides comprehensive testing infrastructure for the OmniCRM application, including realistic test data generation, repository mocking, and common testing patterns that ensure consistent and maintainable test suites.

**Key Benefits:**

- **Realistic Data**: Factory functions generate business-appropriate test data using faker.js
- **Type Safety**: Full TypeScript support with proper type inference and validation
- **Repository Fakes**: Pre-configured vi.fn() mocks that simulate real repository behavior
- **Common Scenarios**: Pre-built test scenarios for typical application states
- **Maintainability**: Centralized test utilities reduce code duplication across test files

**Architecture Overview:**

```bash
Test Files → Testing Package → Repository Fakes → Mock Data
    ↓           ↓                   ↓              ↓
  Test Code → Factories/Utils → vi.fn() Mocks → Realistic DTOs
```

## Features

- 🏭 **Factory Functions**: Generate realistic test data for all DTOs using faker.js
- 🎭 **Repository Fakes**: Pre-configured vi.fn() mocks with realistic behaviors
- 🛠️ **Test Utilities**: Common patterns and utilities for test setup
- 🎯 **Type Safety**: Full TypeScript support with proper type inference
- 📦 **Modular**: Import only what you need
- 🎯 **Business Context**: Wellness-specific data tailored for yoga studios and wellness businesses

## Installation

The testing package is already available in the workspace. Use it in your tests:

```typescript
import { setupRepoMocks, makeOmniClient, testUtils } from '@packages/testing';
```

## Quick Start

### Basic Factory Usage

```typescript
import { makeOmniClient, makeInteraction, makeBatch } from '@packages/testing';

// Generate a single contact
const contact = makeOmniClient({
  displayName: 'Custom Name',
  primaryEmail: 'custom@example.com'
});

// Generate multiple contacts
const contacts = makeBatch(() => makeOmniClient(), 5);

// Generate related data
const { contact, notes, interactions } = makeContactWithRelations({
  noteCount: 3,
  interactionCount: 5
});
```

### Repository Mocking

```typescript
import { describe, it, beforeEach } from 'vitest';
import { setupRepoMocks, resetRepoMocks, configureCommonScenarios } from '@packages/testing';

describe('ContactService', () => {
  const fakes = setupRepoMocks();
  const scenarios = configureCommonScenarios(fakes);

  beforeEach(() => {
    resetRepoMocks(fakes);
  });

  it('should handle empty database', async () => {
    scenarios.emptyDatabase();
    // Test empty state behavior
  });

  it('should handle database errors', async () => {
    scenarios.databaseError();
    // Test error handling
  });
});
```

## Factories

### Contact Factories

- `makeOmniClient()` - Generate OmniClient DTO
- `makeOmniClientWithNotes()` - Generate OmniClient with notes metadata
- `makeCreateOmniClientInput()` - Generate create contact input
- `makeUpdateOmniClientInput()` - Generate update contact input
- `makeContactDTO()` - Generate legacy contact DTO
- `makeClientSuggestion()` - Generate calendar-based suggestion
- `makeClientAIInsightsResponse()` - Generate AI insights

### Interaction Factories

- `makeInteraction()` - Generate interaction DTO
- `makeNewInteraction()` - Generate new interaction input
- `makeNormalizedInteraction()` - Generate normalized interaction

### Notes Factories

- `makeNoteDTO()` - Generate note DTO
- `makeCreateNoteInput()` - Generate create note input

### Chat Factories

- `makeChatMessage()` - Generate chat message
- `makeChatRequest()` - Generate chat request
- `makeChatResponse()` - Generate chat response

### AI Insights Factories

- `makeAIInsight()` - Generate AI insight
- `makeInsightContent()` - Generate insight content
- `makeNewAIInsight()` - Generate new insight input

### Batch Utilities

- `makeBatch(factory, count)` - Generate arrays of items
- `makeContactWithRelations()` - Generate contact with related data
- `makePaginatedResponse()` - Generate paginated response

## Repository Fakes

### Setup

```typescript
import { setupRepoMocks } from '@packages/testing';

const fakes = setupRepoMocks();
```

### Available Fakes

- `omniClients` - Contact repository operations
- `interactions` - Interaction repository operations
- `authUser` - User authentication operations
- `identities` - Identity management operations
- `rawEvents` - Raw event processing operations

### Common Scenarios

```typescript
import { configureCommonScenarios } from '@packages/testing';

const scenarios = configureCommonScenarios(fakes);

// Empty database
scenarios.emptyDatabase();

// Database errors
scenarios.databaseError();

// User not found
scenarios.userNotFound('user-id');

// Rich contact data
scenarios.richContactData('user-id');
```

## Test Utilities

### Default Values

```typescript
import { testUtils } from '@packages/testing';

const userId = testUtils.defaultUserId;
const contactId = testUtils.defaultContactId;
```

### Common Patterns

```typescript
// User context
const user = testUtils.createTestUser({
  userId: 'custom-id',
  email: 'custom@example.com'
});

// Pagination parameters
const params = testUtils.createPaginationParams({
  pageSize: 20,
  search: 'john'
});

// Date ranges
const range = testUtils.dateRanges.lastWeek;

// HTTP headers
const headers = testUtils.headers.json;

// Error scenarios
throw testUtils.errors.validation;
```

### Console Mocking

```typescript
it('should not log errors in test output', () => {
  const restoreConsole = testUtils.mockConsole();

  // Test code that might log
  someFunction();

  restoreConsole();
});
```

## Wellness Business Data

The factories include wellness-specific data tailored for yoga studios, massage therapy, and wellness businesses:

### Wellness Tags (36 total)

- **Services**: Yoga, Massage, Meditation, Pilates, Reiki, etc.
- **Demographics**: Senior, Young Adult, Professional, Parent, etc.
- **Goals & Health**: Stress Relief, Weight Loss, Flexibility, etc.
- **Engagement**: Regular Attendee, Weekend Warrior, VIP, etc.

### Client Lifecycle Stages

- Prospect, New Client, Core Client, Referring Client, VIP Client, Lost Client, At Risk Client

## Best Practices

### Do's and Don'ts

**✅ DO:**

- Use factory functions with partial overrides for test data generation
- Reset mocks between tests to avoid test pollution
- Use pre-configured scenarios for common test states
- Mock at the repository layer, not the database layer
- Generate realistic business data that matches production patterns
- Use type-safe mock implementations with proper return types

**❌ DON'T:**

- Create test data manually when factories are available
- Share mock state between tests without proper cleanup
- Mock internal implementation details (mock interfaces, not internals)
- Use unrealistic data that doesn't match business domain
- Mock database connections directly (use repository fakes instead)
- Ignore TypeScript errors in test code

### Factory Usage Patterns

```typescript
// ✅ GOOD - Use partial overrides
const contact = makeOmniClient({
  displayName: 'Test User',
  stage: 'VIP Client',
  primaryEmail: 'test@example.com'
});

// ✅ GOOD - Generate related data
const { contact, notes, interactions } = makeContactWithRelations({
  noteCount: 3,
  interactionCount: 5,
  contactOverrides: { stage: 'Core Client' }
});

// ✅ GOOD - Batch generation with customization
const contacts = makeBatch(() => makeOmniClient({
  source: 'calendar_import'
}), 10);

// ❌ AVOID - Manual object creation
const contact = {
  id: 'some-uuid',
  userId: 'user-id',
  displayName: 'Manual Contact',
  // ... 20+ more fields manually created
};
```

### Repository Mocking Patterns

```typescript
// ✅ GOOD - Reset mocks between tests
beforeEach(() => {
  resetRepoMocks(fakes);
});

// ✅ GOOD - Use scenarios for common states
scenarios.emptyDatabase(); // All repos return empty results
scenarios.databaseError(); // All repos throw database errors
scenarios.richContactData(userId); // Realistic data for comprehensive testing

// ✅ GOOD - Custom mock implementations with proper types
fakes.omniClients.listContacts.mockImplementation(async (userId, params) => {
  // TypeScript enforces correct return type
  const contacts = makeBatch(() => makeOmniClient({ userId }), 5);
  return { items: contacts, total: 5 };
});

// ❌ AVOID - Direct database mocking
vi.mock('@/server/db/client', () => ({
  getDb: vi.fn().mockResolvedValue(mockDb) // Too low-level
}));
```

### Test Organization Patterns

```typescript
// ✅ GOOD - Organized test structure
describe('ContactService', () => {
  const fakes = setupRepoMocks();
  const scenarios = configureCommonScenarios(fakes);

  beforeEach(() => {
    resetRepoMocks(fakes);
  });

  describe('listContacts', () => {
    it('should return empty list when no contacts exist', async () => {
      scenarios.emptyDatabase();
      const result = await contactService.listContacts(testUtils.defaultUserId, {});
      expect(result.items).toHaveLength(0);
    });

    it('should filter contacts by search term', async () => {
      const userId = testUtils.defaultUserId;
      const searchContact = makeOmniClient({
        displayName: 'John Doe',
        userId
      });

      fakes.omniClients.listContacts.mockResolvedValue({
        items: [searchContact],
        total: 1
      });

      const result = await contactService.listContacts(userId, { search: 'John' });
      expect(result.items).toContain(searchContact);
      expect(fakes.omniClients.listContacts).toHaveBeenCalledWith(userId, { search: 'John' });
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      scenarios.databaseError();
      await expect(
        contactService.listContacts(testUtils.defaultUserId, {})
      ).rejects.toThrow('Database connection error');
    });
  });
});
```

### Wellness Business Testing Patterns

```typescript
// ✅ GOOD - Business-appropriate test data
const yogaClient = makeOmniClient({
  displayName: 'Sarah Johnson',
  stage: 'Core Client',
  tags: ['yoga', 'regular_attendee', 'stress_relief'],
  source: 'calendar_import'
});

const massageClient = makeOmniClient({
  displayName: 'Mike Thompson',
  stage: 'VIP Client',
  tags: ['massage', 'pain_management', 'weekly_regular'],
  primaryPhone: '+1-555-0123'
});

// ✅ GOOD - Realistic interaction patterns
const yogaClassInteraction = makeInteraction({
  type: 'meeting',
  subject: 'Vinyasa Flow Class - Morning Session',
  occurredAt: new Date('2024-01-15T09:00:00Z'),
  source: 'calendar'
});

// ✅ GOOD - AI insights for wellness business
const aiInsight = makeAIInsight({
  kind: 'wellness_recommendation',
  content: {
    title: 'Client Progression Opportunity',
    summary: 'Sarah has attended 15 yoga classes in the past month and shows interest in meditation',
    confidence: 0.85,
    tags: ['upsell_opportunity', 'meditation', 'regular_client'],
    priority: 'medium',
    actionable: true
  }
});
```

## Development

### Adding New Factories

1. Add the factory function to `factories.ts`
2. Use faker.js for realistic data generation
3. Support partial overrides with defaults
4. Export from `index.ts`

### Adding New Repository Fakes

1. Define the interface in `fakes.ts`
2. Create the factory function with vi.fn() mocks
3. Add realistic default behaviors
4. Include in `createAllRepoFakes()`
5. Export types and functions from `index.ts`

### Testing the Testing Package

```bash
cd packages/testing
pnpm test
```

## Common Pitfalls

### Mock State Pollution

**Problem**: Tests affecting each other due to shared mock state

```typescript
// ❌ BROKEN - Mocks not reset between tests
describe('ContactService', () => {
  const fakes = setupRepoMocks();

  it('should return contacts', async () => {
    fakes.omniClients.listContacts.mockResolvedValue({
      items: [makeOmniClient()],
      total: 1
    });
    // Test implementation
  });

  it('should handle empty results', async () => {
    // ❌ Previous test's mock still active
    const result = await contactService.listContacts(userId, {});
    expect(result.items).toHaveLength(0); // Fails - still returns 1 item
  });
});
```

**Solution**: Reset mocks in beforeEach

```typescript
// ✅ FIXED - Proper mock reset
describe('ContactService', () => {
  const fakes = setupRepoMocks();

  beforeEach(() => {
    resetRepoMocks(fakes); // Clean slate for each test
  });

  // Tests now isolated
});
```

### Type Safety Violations in Mocks

**Problem**: Mock implementations don't match real repository signatures

```typescript
// ❌ BROKEN - Wrong return type
fakes.omniClients.listContacts.mockResolvedValue([makeOmniClient()]);
// Should return { items: [], total: 0 }, not just array

// ❌ BROKEN - Wrong parameter types
fakes.omniClients.createContact.mockImplementation((data) => {
  // Missing userId parameter
  return makeOmniClient();
});
```

**Solution**: Use proper TypeScript-validated implementations

```typescript
// ✅ FIXED - Correct types enforced by TypeScript
fakes.omniClients.listContacts.mockImplementation(async (userId: string, params?: any) => {
  const contacts = makeBatch(() => makeOmniClient({ userId }), 3);
  return { items: contacts, total: contacts.length };
});

fakes.omniClients.createContact.mockImplementation(async (userId: string, data: CreateContactDTO) => {
  return makeOmniClient({ ...data, userId });
});
```

### Unrealistic Test Data

**Problem**: Test data doesn't match business domain or real-world patterns

```typescript
// ❌ BROKEN - Unrealistic data
const contact = makeOmniClient({
  displayName: 'Test User',
  tags: ['random', 'nonsense', 'tags'],
  stage: 'Invalid Stage',
  primaryEmail: 'not-an-email'
});
```

**Solution**: Use business-appropriate data

```typescript
// ✅ FIXED - Realistic wellness business data
const contact = makeOmniClient({
  displayName: 'Sarah Johnson',
  tags: ['yoga', 'regular_attendee', 'stress_relief'],
  stage: 'Core Client',
  primaryEmail: 'sarah.johnson@gmail.com'
});
```

### Missing Error Scenarios

**Problem**: Tests only cover happy path, missing error handling

```typescript
// ❌ INCOMPLETE - Only tests success case
it('should create contact', async () => {
  const input = makeCreateOmniClientInput();
  const result = await contactService.createContact(userId, input);
  expect(result).toBeDefined();
});
```

**Solution**: Test error scenarios with scenarios helper

```typescript
// ✅ COMPLETE - Tests both success and error cases
describe('createContact', () => {
  it('should create contact successfully', async () => {
    const input = makeCreateOmniClientInput();
    fakes.omniClients.createContact.mockResolvedValue(makeOmniClient(input));

    const result = await contactService.createContact(userId, input);
    expect(result).toBeDefined();
  });

  it('should handle database errors', async () => {
    scenarios.databaseError();
    const input = makeCreateOmniClientInput();

    await expect(
      contactService.createContact(userId, input)
    ).rejects.toThrow('Database connection error');
  });

  it('should handle validation errors', async () => {
    const invalidInput = makeCreateOmniClientInput({
      displayName: '', // Invalid - empty name
    });

    await expect(
      contactService.createContact(userId, invalidInput)
    ).rejects.toThrow('Validation failed');
  });
});
```

## Migration Patterns

### From Manual Mocks to Testing Package

**Before** (manual test setup):

```typescript
// ❌ Old pattern - manual mocking and data creation
describe('ContactService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list contacts', async () => {
    const mockContact = {
      id: 'contact-id',
      userId: 'user-id',
      displayName: 'John Doe',
      primaryEmail: 'john@example.com',
      // ... manually creating 15+ fields
    };

    const mockRepo = {
      listContacts: vi.fn().mockResolvedValue({
        items: [mockContact],
        total: 1
      })
    };

    // Manual service instantiation with mocked dependencies
    const service = new ContactService(mockRepo);
    const result = await service.listContacts('user-id', {});

    expect(result.items).toHaveLength(1);
  });
});
```

**After** (using testing package):

```typescript
// ✅ New pattern - testing package utilities
import { setupRepoMocks, resetRepoMocks, makeOmniClient, testUtils } from '@packages/testing';

describe('ContactService', () => {
  const fakes = setupRepoMocks();

  beforeEach(() => {
    resetRepoMocks(fakes);
  });

  it('should list contacts', async () => {
    const userId = testUtils.defaultUserId;
    const contact = makeOmniClient({ userId });

    fakes.omniClients.listContacts.mockResolvedValue({
      items: [contact],
      total: 1
    });

    const result = await contactService.listContacts(userId, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(contact);
  });
});
```

### Step-by-Step Migration Guide

1. **Replace Manual Data Creation**

   ```typescript
   // Replace manual object creation with factories
   const contact = makeOmniClient({ userId: testUtils.defaultUserId });
   ```

2. **Setup Repository Fakes**

   ```typescript
   const fakes = setupRepoMocks();
   ```

3. **Use Common Scenarios**

   ```typescript
   const scenarios = configureCommonScenarios(fakes);
   scenarios.emptyDatabase(); // Instead of manual mock setup
   ```

4. **Add Proper Cleanup**

   ```typescript
   beforeEach(() => {
     resetRepoMocks(fakes);
   });
   ```

5. **Use Test Utils**

   ```typescript
   const userId = testUtils.defaultUserId;
   const params = testUtils.createPaginationParams({ pageSize: 10 });
   ```

## Troubleshooting

### Common Issues and Solutions

**Issue**: "Cannot read properties of undefined" in mock functions
**Solution**: Ensure `setupRepoMocks()` is called and fakes are properly initialized

**Issue**: Tests passing in isolation but failing when run together
**Solution**: Add `resetRepoMocks(fakes)` in `beforeEach()` hooks

**Issue**: TypeScript errors with mock implementations
**Solution**: Check that mock return types match repository interface exactly

**Issue**: Unrealistic test failures due to fake data
**Solution**: Use factories with business-appropriate overrides

**Issue**: Factory functions returning inconsistent data types
**Solution**: Verify DTO schemas are up to date with current contracts

### Debug Patterns

```typescript
// ✅ Debug mock calls
it('should call repository with correct parameters', async () => {
  const userId = testUtils.defaultUserId;
  const params = { search: 'john' };

  await contactService.listContacts(userId, params);

  console.log('Mock calls:', fakes.omniClients.listContacts.mock.calls);
  expect(fakes.omniClients.listContacts).toHaveBeenCalledWith(userId, params);
});

// ✅ Debug generated data
it('should generate realistic contact data', () => {
  const contact = makeOmniClient();
  console.log('Generated contact:', JSON.stringify(contact, null, 2));

  expect(contact.displayName).toBeTruthy();
  expect(contact.userId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
});
```

## Contributing

When adding new DTOs or repository methods:

1. **Add Factory Functions**: Create realistic data generators with faker.js
2. **Create Repository Fakes**: Add corresponding vi.fn() mocks with proper types
3. **Update Exports**: Add new functions to `index.ts` exports
4. **Add Documentation**: Update this README with usage examples
5. **Write Tests**: Verify factories generate valid data that passes DTO validation
6. **Business Context**: Ensure generated data matches wellness business domain
