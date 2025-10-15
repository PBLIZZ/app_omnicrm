/**
 * Helper utility for creating proper RouteContext in API route tests
 *
 * Next.js App Router route handlers require a second parameter with params.
 * This utility creates the proper context structure expected by route handlers.
 */

type RouteParams = Record<string, string>;

/**
 * Creates a proper RouteContext for API route handler tests
 * @param params - Route parameters (e.g., { contactId: "contact-123" })
 * @returns RouteContext with params wrapped in Promise
 */
export function makeRouteContext<T extends RouteParams = RouteParams>(
  params?: T,
): { params: Promise<T> } {
  return {
    params: Promise.resolve(params || ({} as RouteParams)),
  };
}

// Overload for default
export function makeRouteContext(): { params: Promise<RouteParams> };
export function makeRouteContext<T extends RouteParams>(params: T): { params: Promise<T> };

/**
 * Creates a mock Request object for testing
 * @param url - Request URL
 * @param options - Request options (method, headers, body)
 * @returns Request object
 */
export const makeRequest = (url: string, options?: RequestInit): Request => {
  return new Request(url, options);
};

/**
 * Helper to parse JSON response from API route
 * @param response - Response object
 * @returns Parsed JSON data
 */
export async function parseResponse<T>(
  response: Response,
  validator?: (value: unknown) => value is T,
): Promise<T | unknown> {
  const data = await response.json();
  if (validator && validator(data)) {
    return data;
  }
  return data;
}
