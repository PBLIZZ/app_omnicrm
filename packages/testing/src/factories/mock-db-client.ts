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
export interface MockQueryBuilder {
  select: Mock<any[], MockQueryBuilder>;
  from: Mock<any[], MockQueryBuilder>;
  where: Mock<any[], MockQueryBuilder>;
  orderBy: Mock<any[], MockQueryBuilder>;
  limit: Mock<[number], MockQueryBuilder>;
  offset: Mock<[number], MockQueryBuilder>;
  insert: Mock<any[], MockQueryBuilder>;
  values: Mock<any[], MockQueryBuilder>;
  set: Mock<any[], MockQueryBuilder>;
  returning: Mock<any[], Promise<any[]>>;
  update: Mock<any[], MockQueryBuilder>;
  delete: Mock<any[], MockQueryBuilder>;
  innerJoin: Mock<any[], MockQueryBuilder>;
  leftJoin: Mock<any[], MockQueryBuilder>;
  rightJoin: Mock<any[], MockQueryBuilder>;
  fullJoin: Mock<any[], MockQueryBuilder>;
  onConflictDoUpdate: Mock<any[], MockQueryBuilder>;
  onConflictDoNothing: Mock<any[], MockQueryBuilder>;
  // Promise compatibility for await
  then: Mock<[(value: any[]) => any], Promise<any>>;
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
 * Creates a chainable mock query builder for tests.
 *
 * The returned builder's chain methods return the builder to allow fluent chaining.
 * Its `returning` method resolves to `finalValue`, and the builder is awaitable via `then`.
 *
 * @param finalValue - The value to resolve when the chain completes (default: `[]`)
 * @returns A configured `MockQueryBuilder` whose chain methods return the builder and whose final result resolves to `finalValue`
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
 * Configure a MockQueryBuilder to resolve with the provided rows when awaited or when `returning` is called.
 *
 * @param mockBuilder - The chainable mock query builder to configure
 * @param data - The array of rows the mock should resolve to
 * @returns The same `mockBuilder` instance, for chaining or assertions
 */
export function configureMockQuery(
  mockBuilder: MockQueryBuilder,
  data: any[],
): MockQueryBuilder {
  mockBuilder.returning.mockResolvedValue(data);
  mockBuilder.then.mockImplementation((resolve) => Promise.resolve(resolve(data)));
  return mockBuilder;
}