import { NextRequest } from "next/server";

/**
 * Creates a properly mocked NextRequest with all required headers for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, headers: customHeaders = {} } = options;

  // Default headers that are commonly expected by middleware
  const defaultHeaders = {
    "x-correlation-id": "test-correlation-id",
    "x-forwarded-for": "127.0.0.1",
    "x-forwarded-proto": "https",
    "x-forwarded-host": "localhost:3000",
    "user-agent": "test-user-agent",
    accept: "application/json",
    "accept-language": "en-US,en;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    connection: "keep-alive",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    ...customHeaders,
  };

  // Create headers object
  const headers = new Headers();
  Object.entries(defaultHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Create the request
  const request = new NextRequest(url, {
    method,
    body: body || null,
    headers,
  });

  return request;
}

/**
 * Creates a mock request specifically for API routes
 */
export function createMockApiRequest(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, headers: customHeaders = {}, searchParams = {} } = options;

  // Build URL with search params
  const url = new URL(endpoint, "http://localhost:3000");
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  // API-specific headers
  const apiHeaders = {
    "content-type": "application/json",
    "x-correlation-id": "test-correlation-id",
    "x-request-id": "test-request-id",
    "x-forwarded-for": "127.0.0.1",
    "x-forwarded-proto": "https",
    "x-forwarded-host": "localhost:3000",
    "user-agent": "test-user-agent",
    accept: "application/json",
    "accept-encoding": "gzip, deflate, br",
    connection: "keep-alive",
    ...customHeaders,
  };

  const request = createMockRequest(url.toString(), {
    method,
    ...(body && { body: JSON.stringify(body) }),
    headers: apiHeaders,
  });

  return request;
}

/**
 * Creates a mock request for authentication-required routes
 */
export function createMockAuthenticatedRequest(
  endpoint: string,
  userId: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {},
): NextRequest {
  const authHeaders = {
    authorization: `Bearer test-token-${userId}`,
    "x-user-id": userId,
    "x-session-id": `session-${userId}`,
  };

  return createMockApiRequest(endpoint, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });
}

/**
 * Creates a mock request for public routes (like onboarding forms)
 */
export function createMockPublicRequest(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {},
): NextRequest {
  const publicHeaders = {
    "x-forwarded-for": "127.0.0.1",
    "x-forwarded-proto": "https",
    "x-forwarded-host": "localhost:3000",
    "user-agent": "test-user-agent",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    connection: "keep-alive",
    "upgrade-insecure-requests": "1",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
  };

  return createMockApiRequest(endpoint, {
    ...options,
    headers: {
      ...publicHeaders,
      ...options.headers,
    },
  });
}

/**
 * Mock context for route handlers
 */
export interface MockRouteContext {
  userId: string;
  validated: {
    body: any;
    query?: any;
    params?: any;
  };
  requestId: string;
  correlationId: string;
}

/**
 * Creates a mock context for route handlers
 */
export function createMockRouteContext(
  userId: string,
  validatedBody: any,
  options: {
    requestId?: string;
    correlationId?: string;
    query?: any;
    params?: any;
  } = {},
): MockRouteContext {
  return {
    userId,
    validated: {
      body: validatedBody,
      query: options.query || {},
      params: options.params || {},
    },
    requestId: options.requestId || "test-request-id",
    correlationId: options.correlationId || "test-correlation-id",
  };
}

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      single: vi.fn(),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  }));

  return {
    from: mockFrom,
  };
}

// TypeScript interfaces for test data factories
interface OnboardingToken {
  id: string;
  token: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  disabled: boolean;
  created_at: string;
  user_id: string;
  created_by: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
  user_id: string;
}

/**
 * Common test data factories
 */
export const TestDataFactory = {
  createOnboardingToken: (overrides: Partial<OnboardingToken> = {}): OnboardingToken => ({
    id: "test-token-id",
    token: "test-token-123",
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    max_uses: 1,
    used_count: 0,
    disabled: false,
    created_at: new Date().toISOString(),
    user_id: "test-user-id",
    created_by: "test-user-id",
    ...overrides,
  }),

  createUser: (overrides: Partial<User> = {}): User => ({
    id: "test-user-id",
    email: "test@example.com",
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  createContact: (overrides: Partial<Contact> = {}): Contact => ({
    id: "test-contact-id",
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    created_at: new Date().toISOString(),
    user_id: "test-user-id",
    ...overrides,
  }),
};
