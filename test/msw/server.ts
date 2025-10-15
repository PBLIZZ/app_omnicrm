/**
 * MSW Server for Testing
 *
 * Mock Service Worker setup for intercepting HTTP requests in tests.
 * This provides a realistic testing environment without brittle module mocks.
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Create MSW server with default handlers
 *
 * The server is configured to intercept all HTTP requests during tests
 * and respond with mock data defined in handlers.
 */
export const server = setupServer(...handlers);

/**
 * Setup function to be called in vitest.setup.ts
 */
export function setupMswServer() {
  // Set base URL for MSW to resolve relative URLs
  // This is required for Node.js test environment
  global.location = {
    origin: "http://localhost:3000",
    href: "http://localhost:3000/",
  } as Location;

  // Start server before all tests
  server.listen({
    onUnhandledRequest: "warn", // Warn about unhandled requests during development
  });

  // Reset handlers after each test
  server.events.on("request:start", ({ request }) => {
    // Optional: log requests during test debugging
    if (process.env["DEBUG_MSW"]) {
      console.log("MSW intercepted:", request.method, request.url);
    }
  });
}

/**
 * Cleanup function for afterEach
 */
export function resetMswServer() {
  server.resetHandlers();
}

/**
 * Cleanup function for afterAll
 */
export function closeMswServer() {
  server.close();
}
