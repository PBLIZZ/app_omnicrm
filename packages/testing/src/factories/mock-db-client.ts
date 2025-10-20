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
  select: Mock<(...args: any[]) => MockQueryBuilder>;
  insert: Mock<(...args: any[]) => MockQueryBuilder>;
  update: Mock<(...args: any[]) => MockQueryBuilder>;
  delete: Mock<(...args: any[]) => MockQueryBuilder>;
  execute: Mock<(...args: any[]) => Promise<any[]>>;
  transaction: Mock<(callback: (tx: MockDbClient) => Promise<any>) => Promise<any>>;
  query: {
    [key: string]: {
      findFirst: Mock<(...args: any[]) => Promise<any>>;
      findMany: Mock<(...args: any[]) => Promise<any[]>>;
    };
  };
  // Chainable methods for backwards compatibility with existing tests - always provided by createMockDbClient
  from: Mock<(...args: any[]) => MockQueryBuilder>;
  where: Mock<(...args: any[]) => MockQueryBuilder>;
  orderBy: Mock<(...args: any[]) => MockQueryBuilder>;
  limit: Mock<(num: number) => MockQueryBuilder>;
  offset: Mock<(num: number) => MockQueryBuilder>;
  values: Mock<(...args: any[]) => MockQueryBuilder>;
  set: Mock<(...args: any[]) => MockQueryBuilder>;
  returning: Mock<(...args: any[]) => Promise<any[]>>;
  innerJoin: Mock<(...args: any[]) => MockQueryBuilder>;
  leftJoin: Mock<(...args: any[]) => MockQueryBuilder>;
  rightJoin: Mock<(...args: any[]) => MockQueryBuilder>;
  fullJoin: Mock<(...args: any[]) => MockQueryBuilder>;
  onConflictDoUpdate: Mock<(...args: any[]) => MockQueryBuilder>;
  onConflictDoNothing: Mock<(...args: any[]) => MockQueryBuilder>;
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
  const builder = createMockQueryBuilder([]);

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
    // Chainable methods for backwards compatibility
    from: vi.fn().mockReturnValue(builder),
    where: vi.fn().mockReturnValue(builder),
    orderBy: vi.fn().mockReturnValue(builder),
    limit: vi.fn().mockReturnValue(builder),
    offset: vi.fn().mockReturnValue(builder),
    values: vi.fn().mockReturnValue(builder),
    set: vi.fn().mockReturnValue(builder),
    returning: vi.fn().mockResolvedValue([]),
    innerJoin: vi.fn().mockReturnValue(builder),
    leftJoin: vi.fn().mockReturnValue(builder),
    rightJoin: vi.fn().mockReturnValue(builder),
    fullJoin: vi.fn().mockReturnValue(builder),
    onConflictDoUpdate: vi.fn().mockReturnValue(builder),
    onConflictDoNothing: vi.fn().mockReturnValue(builder),
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
export function configureMockQuery<T>(
  mockBuilder: MockQueryBuilder<T>,
  data: T[],
): MockQueryBuilder<T> {
  mockBuilder.returning = vi.fn().mockResolvedValue(data);
  mockBuilder.then = vi.fn((resolve) => Promise.resolve(resolve(data as T)));
  return mockBuilder;
}