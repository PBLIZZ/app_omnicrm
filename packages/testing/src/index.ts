/**
 * @fileoverview Testing package exports
 *
 * Provides comprehensive testing utilities for the OmniCRM application including:
 * - Factory functions for realistic test data generation
 * - Test setup utilities and common scenarios
 */

// =============================================================================
// FACTORY EXPORTS
// =============================================================================

export {
  // Contact factories
  makeContactDTO,
  makeCreateContactInput,
  makeUpdateContactInput,
  makeClientSuggestion,
  makeClientAIInsightsResponse,

  // Interaction factories
  makeInteraction,
  makeNewInteraction,

  // Notes factories
  makeNoteDTO,
  makeCreateNoteInput,

  // Task factories
  makeCreateTaskInput,

  // Batch utilities
  makeBatch,
  makeContactWithRelations,
  makePaginatedResponse,
} from "./factories";

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

// Re-export commonly used external dependencies
export { faker } from "@faker-js/faker";
export type { MockedFunction } from "vitest";

// =============================================================================
// MOCK FACTORIES
// =============================================================================

export {
  createMockDbClient,
  createMockQueryBuilder,
  configureMockQuery,
  type MockDbClient,
  type MockQueryBuilder,
} from "./factories/mock-db-client";

// =============================================================================
// TEST HELPERS
// =============================================================================

export {
  expectAppError,
  expectAppErrorRejection,
  createMockAppError,
  commonAppErrors,
  type ExpectedAppError,
} from "./helpers/app-error";

export {
  createTestQueryClient,
  createQueryClientWrapper,
  clearQueryClient,
  waitForQueries,
} from "./helpers/query-client";

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

// Re-export vi for convenience
export { vi } from "vitest";
