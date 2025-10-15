/**
 * Service Mock Patterns for API Route Testing
 *
 * Provides reusable mock configurations for common service layer patterns.
 * These mocks are used in unit tests to isolate API route handlers from
 * business logic and database dependencies.
 */

import { vi } from "vitest";

/**
 * Creates a mock for authentication service
 * @param userId - Default user ID to return (optional)
 * @returns Mock function that can be controlled in tests
 */
export const createAuthMock = (userId = "test-user-123") => {
  return vi.fn().mockResolvedValue(userId);
};

/**
 * Creates a mock for list/query service methods
 * @param items - Array of items to return
 * @param total - Total count (defaults to items.length)
 * @returns Mock list response
 */
export const createListMock = <T>(items: T[] = [], total?: number) => {
  return vi.fn().mockResolvedValue({
    items,
    total: total ?? items.length,
    nextCursor: null,
  });
};

/**
 * Creates a mock for create service methods
 * @param defaultResponse - Default object to return
 * @returns Mock function that merges input with defaults
 */
export const createCreateMock = <T extends { id: string; userId: string }>(
  defaultResponse?: Partial<Omit<T, "id" | "userId">>,
) => {
  return vi.fn().mockImplementation(async (userId: string, data: Partial<T>) => {
    const result: T = {
      id: `test-${Date.now()}`,
      userId,
      ...defaultResponse,
      ...data,
    } as T; // Test-only assertion for mock flexibility
    return result;
  });
};

/**
 * Creates a mock for get/retrieve service methods
 * @param item - Item to return (or null for not found)
 * @returns Mock function
 */
export const createGetMock = <T>(item: T | null) => {
  return vi.fn().mockResolvedValue(item);
};

/**
 * Test mock for update operations - uses Partial<T> cast for flexibility, final result asserted as T
 */
export const createUpdateMock = <T extends { id: string; userId: string }>(
  defaultResponse?: Partial<Omit<T, "userId">>,
) => {
  return vi.fn().mockImplementation(async (userId: string, id: string, data: Partial<T>) => {
    const result: T = {
      id,
      userId,
      ...defaultResponse,
      ...data,
    } as T; // Test-only assertion
    return result;
  });
};

/**
 * Creates a mock for delete service methods
 * @param success - Whether delete succeeds
 * @returns Mock function
 */
export const createDeleteMock = (success = true) => {
  return vi.fn().mockResolvedValue(success);
};

/**
 * Creates a mock that throws an error
 * @param error - Error to throw
 * @returns Mock function that rejects
 */
export const createErrorMock = (error: Error) => {
  return vi.fn().mockRejectedValue(error);
};

/**
 * Common mock scenarios for testing
 */
export const mockScenarios = {
  /**
   * Empty database - no results
   */
  emptyDatabase: () => ({
    items: [],
    total: 0,
    nextCursor: null,
  }),

  /**
   * Not found - resource doesn't exist
   */
  notFound: () => null,

  /**
   * Unauthorized - user not authenticated
   */
  unauthorized: () => {
    const error = new Error("Unauthorized");
    (error as Error & { status: number }).status = 401;
    return error;
  },

  /**
   * Validation error - invalid input
   */
  validationError: (message = "Validation failed") => {
    const error = new Error(message);
    (error as Error & { status: number }).status = 400;
    return error;
  },

  /**
   * Database error - internal server error
   */
  databaseError: () => {
    const error = new Error("Database connection failed");
    (error as Error & { status: number }).status = 500;
    return error;
  },
};

/**
 * Helper to setup common service mocks
 * @returns Object with commonly mocked functions
 */
export const setupCommonMocks = () => {
  const authMock = createAuthMock();
  const listMock = createListMock([]);
  const getMock = createGetMock(null);
  const createMock = createCreateMock();
  const updateMock = createUpdateMock(null);
  const deleteMock = createDeleteMock();

  return {
    auth: authMock,
    list: listMock,
    get: getMock,
    create: createMock,
    update: updateMock,
    delete: deleteMock,
  };
};
