/**
 * @fileoverview Testing package exports
 *
 * Provides comprehensive testing utilities for the OmniCRM application including:
 * - Factory functions for realistic test data generation
 * - Repository fakes with vi.fn() mocks
 * - Test setup utilities and common scenarios
 */

// =============================================================================
// FACTORY EXPORTS
// =============================================================================

export {
  // Contact factories
  makeOmniClient,
  makeOmniClientWithNotes,
  makeCreateOmniClientInput,
  makeUpdateOmniClientInput,
  makeContactDTO,
  makeCreateContactInput,
  makeUpdateContactInput,
  makeClientSuggestion,
  makeClientAIInsightsResponse,
  makeClientEmailSuggestion,
  makeClientNoteSuggestion,

  // Interaction factories
  makeInteraction,
  makeNewInteraction,
  makeNormalizedInteraction,

  // Notes factories
  makeNoteDTO,
  makeCreateNoteInput,

  // Chat factories
  makeChatMessage,
  makeChatRequest,
  makeChatResponse,
  makeSimpleChatRequest,

  // Task factories
  makeCreateTaskInput,
  makeEmailSuggestionInput,

  // AI Insights factories
  makeInsightContent,
  makeAIInsight,
  makeNewAIInsight,

  // Batch utilities
  makeBatch,
  makeContactWithRelations,
  makePaginatedResponse,
} from "./factories";

// =============================================================================
// FAKE EXPORTS
// =============================================================================

export {
  // Individual repo fakes
  createContactsRepoFakes,
  createInteractionsRepoFakes,
  createAuthUserRepoFakes,
  createIdentitiesRepoFakes,
  createRawEventsRepoFakes,

  // Combined repo fakes
  createAllRepoFakes,

  // Utility functions
  setupRepoMocks,
  resetRepoMocks,
  configureCommonScenarios,

  // Types
  type ContactsRepoFakes,
  type InteractionsRepoFakes,
  type AuthUserRepoFakes,
  type IdentitiesRepoFakes,
  type RawEventsRepoFakes,
  type AllRepoFakes,
} from "./fakes";

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

// Re-export commonly used external dependencies
export { faker } from "@faker-js/faker";
export type { MockedFunction } from "vitest";

// =============================================================================
// TESTING UTILITIES
// =============================================================================

/**
 * Common test setup patterns and utilities
 */
export const testUtils = {
  /**
   * Default user ID for tests
   */
  defaultUserId: "test-user-id",

  /**
   * Default contact ID for tests
   */
  defaultContactId: "test-contact-id",

  /**
   * Creates a minimal test user context
   */
  createTestUser: (overrides: { userId?: string; email?: string } = {}) => ({
    userId: overrides.userId || testUtils.defaultUserId,
    email: overrides.email || "test@example.com",
  }),

  /**
   * Creates common pagination parameters for testing
   */
  createPaginationParams: (
    overrides: {
      page?: number;
      pageSize?: number;
      search?: string;
      sort?: "displayName" | "createdAt";
      order?: "asc" | "desc";
    } = {},
  ) => ({
    page: overrides.page || 1,
    pageSize: overrides.pageSize || 10,
    ...(overrides.search !== undefined && { search: overrides.search }),
    sort: overrides.sort || "displayName",
    order: overrides.order || "asc",
  }),

  /**
   * Common date ranges for testing
   */
  dateRanges: {
    lastWeek: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    lastMonth: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    thisYear: {
      from: new Date(new Date().getFullYear(), 0, 1),
      to: new Date(),
    },
  },

  /**
   * Common HTTP headers for API testing
   */
  headers: {
    json: { "Content-Type": "application/json" },
    csrf: { "x-csrf-token": "test-csrf-token" },
    auth: { Authorization: "Bearer test-token" },
  },

  /**
   * Common error scenarios for testing
   */
  errors: {
    validation: new Error("Validation failed"),
    notFound: new Error("Resource not found"),
    unauthorized: new Error("Unauthorized"),
    database: new Error("Database connection error"),
    network: new Error("Network timeout"),
  },

  /**
   * Wait utility for async tests
   */
  wait: (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Mock console methods to avoid noise in tests
   */
  mockConsole: () => {
    const { vi } = require("vitest");
    const originalConsole = console;
    const mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    // Replace console methods
    Object.assign(console, mockConsole);

    // Return cleanup function
    return () => {
      Object.assign(console, originalConsole);
    };
  },
};

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * Example test setup showing how to use the testing package
 *
 * ```typescript
 * import { describe, it, expect, beforeEach } from 'vitest';
 * import {
 *   setupRepoMocks,
 *   resetRepoMocks,
 *   configureCommonScenarios,
 *   makeOmniClientWithNotes,
 *   testUtils,
 * } from '@packages/testing';
 *
 * describe('ContactService', () => {
 *   const fakes = setupRepoMocks();
 *   const scenarios = configureCommonScenarios(fakes);
 *
 *   beforeEach(() => {
 *     resetRepoMocks(fakes);
 *   });
 *
 *   it('should list contacts', async () => {
 *     // Arrange
 *     const userId = testUtils.defaultUserId;
 *     const params = testUtils.createPaginationParams({ pageSize: 5 });
 *
 *     scenarios.richContactData(userId);
 *
 *     // Act
 *     const result = await contactService.listContacts(userId, params);
 *
 *     // Assert
 *     expect(result.items).toHaveLength(1);
 *     expect(fakes.contacts.listContacts).toHaveBeenCalledWith(userId, params);
 *   });
 *
 *   it('should handle empty database', async () => {
 *     // Arrange
 *     scenarios.emptyDatabase();
 *
 *     // Act & Assert
 *     const result = await contactService.listContacts(testUtils.defaultUserId, testUtils.createPaginationParams());
 *     expect(result.items).toHaveLength(0);
 *   });
 *
 *   it('should handle database errors', async () => {
 *     // Arrange
 *     scenarios.databaseError();
 *
 *     // Act & Assert
 *     await expect(
 *       contactService.listContacts(testUtils.defaultUserId, testUtils.createPaginationParams())
 *     ).rejects.toThrow('Database connection error');
 *   });
 * });
 * ```
 */

// Re-export vi for convenience
export { vi } from "vitest";
