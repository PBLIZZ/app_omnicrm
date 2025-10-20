import { vi } from "vitest";

/**
 * Mock utilities for testing
 */

export interface MockFakes {
  // Add any mock properties that tests might need
  [key: string]: any;
}

/**
 * Sets up repository mocks for testing
 * This is a placeholder implementation
 */
export function setupRepoMocks(): MockFakes {
  return {
    // Add any default mock implementations here
  };
}

/**
 * Resets repository mocks
 */
export function resetRepoMocks(fakes: MockFakes): void {
  // Reset any mocks if needed
  vi.clearAllMocks();
}
