/**
 * Helper utility for creating proper RouteContext in API route tests
 *
 * Next.js App Router route handlers require a second parameter with params.
 * This utility creates the proper context structure expected by route handlers.
 */

/**
 * Creates a proper RouteContext for API route handler tests
 * @param params - Route parameters (e.g., { sessionId: "session-123" })
 * @returns RouteContext with params wrapped in Promise
 */
export const makeRouteContext = (params: RouteParams = {}) => ({
  params: Promise.resolve(params)
});