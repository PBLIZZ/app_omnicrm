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
export const makeRouteContext = <T extends RouteParams = RouteParams>(params?: T) => ({
  params: Promise.resolve(params || ({} as T))
});

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
export const parseResponse = async <T = unknown>(response: Response): Promise<T> => {
  return await response.json() as T;
};
