/**
 * @fileoverview Mock DB Client Factory
 *
 * Provides a factory function for creating mock DbClient instances
 * that support the Drizzle ORM chainable query builder pattern.
 */

import { vi, type Mock } from "vitest";

/**
 * Chain methods that can be called on query builders
 */
type ChainMethod =
  | "select"
  | "from"
  | "where"
  | "orderBy"
  | "limit"
  | "offset"
  | "insert"
  | "values"
  | "set"
  | "returning"
  | "update"
  | "delete"
  | "innerJoin"
  | "leftJoin"
  | "rightJoin"
  | "fullJoin"
  | "onConflictDoUpdate"
  | "onConflictDoNothing";

/**
 * Chainable query builder mock type
 */
export interface MockQueryBuilder<T = any[]> {
  select: <U>(fields: U[]) => MockQueryBuilder<T>;
  from: <U>(table: U) => MockQueryBuilder<T>;
  where: <U>(clause: U) => MockQueryBuilder<T>;
  orderBy: <U>(order: U) => MockQueryBuilder<T>;
  limit: <U>(num: number) => MockQueryBuilder<T>;
  offset: <U>(num: number) => MockQueryBuilder<T>;
  insert: <U>(values: U[]) => MockQueryBuilder<T>;
  values: <U>(values: U[]) => MockQueryBuilder<T>;
  set: <U>(updates: U) => MockQueryBuilder<T>;
  returning: <U>() => Promise<T>;
  update: <U>(table: U) => MockQueryBuilder<T>;
  delete: <U>(table: U) => MockQueryBuilder<T>;
  innerJoin: <U>(join: U) => MockQueryBuilder<T>;
  leftJoin: <U>(join: U) => MockQueryBuilder<T>;
  rightJoin: <U>(join: U) => MockQueryBuilder<T>;
  fullJoin: <U>(join: U) => MockQueryBuilder<T>;
  onConflictDoUpdate: <U>(conflict: U) => MockQueryBuilder<T>;
  onConflictDoNothing: <U>() => MockQueryBuilder<T>;
  // Promise compatibility for await
  then: <U>(onfulfilled?: (value: T) => U | Promise<U>) => Promise<U>;
}

/**
 * Mock DbClient type
 */
export interface MockDbClient {
  select: Mock<any[], MockQueryBuilder>;
  insert: Mock<any[], MockQueryBuilder>;
  update: Mock<any[], MockQueryBuilder>;
  delete: Mock<any[], MockQueryBuilder>;
  execute: Mock<any[], Promise<any[]>>;
  transaction: Mock<[(tx: MockDbClient) => Promise<any>], Promise<any>>;
  query: {
    [key: string]: {
      findFirst: Mock<any[], Promise<any>>;
      findMany: Mock<any[], Promise<any[]>>;
    };
  };
}

/**
 * Creates a chainable mock query builder
 *
 * @param finalValue - The value to return when the chain completes (default: [])
 * @returns A mock query builder with chainable methods
 */
export function createMockQueryBuilder(finalValue: any[] = []): MockQueryBuilder {
  const mockBuilder = {} as MockQueryBuilder;

  // Chain methods that return the builder itself
  const chainMethods: ChainMethod[] = [
    "select",
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "insert",
    "values",
    "set",
    "update",
    "delete",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
    "onConflictDoUpdate",
    "onConflictDoNothing",
  ];

  // Create all chain methods
  chainMethods.forEach((method) => {
    (mockBuilder as any)[method] = vi.fn().mockReturnValue(mockBuilder);
  });

  // Terminal method that returns a promise
  mockBuilder.returning = vi.fn().mockResolvedValue(finalValue);

  // Make the builder awaitable (like Drizzle queries)
  mockBuilder.then = vi.fn((resolve) => Promise.resolve(resolve(finalValue)));

  return mockBuilder;
}

/**
 * Creates a mock DbClient instance for testing
 *
 * This factory creates a mock database client that mimics the Drizzle ORM
 * query builder pattern with chainable methods.
 *
 * @example
 * ```typescript
 * const mockDb = createMockDbClient();
 *
 * // Mock a select query
 * mockDb.select.mockReturnValue(
 *   createMockQueryBuilder([{ id: '1', name: 'Test' }])
 * );
 *
 * // Mock an insert query
 * mockDb.insert.mockReturnValue(
 *   createMockQueryBuilder([{ id: '1', name: 'Test' }])
 * );
 * ```
 *
 * @returns A mock DbClient with chainable query methods
 */
export function createMockDbClient(): MockDbClient {
  const mockDb: MockDbClient = {
    select: vi.fn(() => createMockQueryBuilder([])),
    insert: vi.fn(() => createMockQueryBuilder([{ id: "test-id" }])),
    update: vi.fn(() => createMockQueryBuilder([{ id: "test-id" }])),
    delete: vi.fn(() => createMockQueryBuilder([{ id: "test-id" }])),
    execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    transaction: vi.fn((callback) => {
      // Create a transaction-scoped mock db
      const txMock = createMockDbClient();
      return Promise.resolve(callback(txMock));
    }),
    query: new Proxy(
      {},
      {
        get: (_target, tableName: string) => ({
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        }),
      },
    ),
  };

  return mockDb;
}

/**
 * Configures a mock query builder to return specific data
 *
 * Helper function to quickly configure a mock to return data at the end
 * of a chain of operations.
 *
 * @example
 * ```typescript
 * const mockDb = createMockDbClient();
 * const data = [{ id: '1', name: 'Test' }];
 *
 * configureMockQuery(mockDb.select(), data);
 * ```
 */
export function configureMockQuery<T>(
  mockBuilder: MockQueryBuilder<T>,
  data: T[],
): MockQueryBuilder<T> {
  mockBuilder.returning = vi.fn().mockResolvedValue(data);
  mockBuilder.then = vi.fn((resolve) => Promise.resolve(resolve(data as T)));
  return mockBuilder;
}
