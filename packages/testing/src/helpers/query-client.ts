/**
 * @fileoverview Query Client Test Helper
 *
 * Utilities for creating and managing QueryClient instances in tests.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QueryClientConfig } from "@tanstack/react-query";
import React from "react";

/**
 * Default test QueryClient configuration
 *
 * Optimized for testing with:
 * - No retries (fail fast)
 * - Short stale times
 * - No caching between tests
 * - Silent error logging
 */
const DEFAULT_TEST_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
      gcTime: 0,
    },
  },
  logger: {
    log: () => {
      // Silent
    },
    warn: () => {
      // Silent
    },
    error: () => {
      // Silent
    },
  },
};

/**
 * Creates a test QueryClient instance
 *
 * @param config - Optional custom configuration to merge with defaults
 * @returns A QueryClient configured for testing
 *
 * @example
 * ```typescript
 * import { renderHook } from '@testing-library/react';
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { createTestQueryClient } from '@packages/testing';
 *
 * const queryClient = createTestQueryClient();
 *
 * const wrapper = ({ children }) => (
 *   <QueryClientProvider client={queryClient}>
 *     {children}
 *   </QueryClientProvider>
 * );
 *
 * const { result } = renderHook(() => useMyHook(), { wrapper });
 * ```
 */
export function createTestQueryClient(config?: Partial<QueryClientConfig>): QueryClient {
  return new QueryClient({
    ...DEFAULT_TEST_CONFIG,
    ...config,
    defaultOptions: {
      ...DEFAULT_TEST_CONFIG.defaultOptions,
      ...config?.defaultOptions,
      queries: {
        ...DEFAULT_TEST_CONFIG.defaultOptions?.queries,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        ...DEFAULT_TEST_CONFIG.defaultOptions?.mutations,
        ...config?.defaultOptions?.mutations,
      },
    },
  });
}

/**
 * Creates a wrapper component with QueryClientProvider
 *
 * @param queryClient - Optional QueryClient instance (creates one if not provided)
 * @returns A wrapper component for testing hooks
 *
 * @example
 * ```typescript
 * const wrapper = createQueryClientWrapper();
 *
 * const { result } = renderHook(() => useMyHook(), { wrapper });
 * ```
 */
export function createQueryClientWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();

  return function QueryClientWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

/**
 * Clears all queries and mutations from a QueryClient
 *
 * Useful for cleanup between tests when reusing a QueryClient instance.
 *
 * @param queryClient - The QueryClient to clear
 *
 * @example
 * ```typescript
 * let queryClient: QueryClient;
 *
 * beforeEach(() => {
 *   queryClient = createTestQueryClient();
 * });
 *
 * afterEach(() => {
 *   clearQueryClient(queryClient);
 * });
 * ```
 */
export function clearQueryClient(queryClient: QueryClient): void {
  queryClient.clear();
  queryClient.removeQueries();
  queryClient.cancelQueries();
}

/**
 * Waits for all queries in a QueryClient to settle
 *
 * Useful for ensuring all async operations complete before assertions.
 *
 * @param queryClient - The QueryClient to wait for
 * @returns A promise that resolves when all queries are settled
 *
 * @example
 * ```typescript
 * await waitForQueries(queryClient);
 * expect(result.current.data).toBeDefined();
 * ```
 */
export async function waitForQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.refetchQueries();
}
