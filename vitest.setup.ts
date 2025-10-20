import "@testing-library/jest-dom/vitest";
import { vi, beforeAll, afterEach, afterAll } from "vitest";
import React from "react";
import { setupMswServer, resetMswServer, closeMswServer } from "./test/msw/server";

// Load test environment variables
if (process.env.NODE_ENV === "test") {
  import("path").then((path) => {
    import("fs").then((fs) => {
      const envTestPath = path.resolve(process.cwd(), ".env.test");
      if (fs.existsSync(envTestPath)) {
        const envContent = fs.readFileSync(envTestPath, "utf8");
        const envLines = envContent
          .split("\n")
          .filter((line) => line.trim() && !line.trim().startsWith("#"));

        envLines.forEach((line) => {
          const [key, value] = line.split("=");
          if (key && value) {
            process.env[key.trim()] = value.trim();
          }
        });
      }
    });
  });
}

// Ensure React is globally available
globalThis.React = React;

// Mock implementations for external services
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "test-user" } } })),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock Next.js headers (cookies)
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      // Mock cookie values for testing
      const mockCookies: Record<string, { value: string }> = {
        "sb-access-token": { value: "mock-access-token" },
        "sb-refresh-token": { value: "mock-refresh-token" },
      };
      return mockCookies[name] || null;
    }),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn((name: string) => {
      const mockCookies: Record<string, boolean> = {
        "sb-access-token": true,
        "sb-refresh-token": true,
      };
      return mockCookies[name] || false;
    }),
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    forEach: vi.fn(),
    entries: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
  })),
}));

// ==============================================================================
// MSW (Mock Service Worker) Setup
// ==============================================================================
// MSW intercepts HTTP requests at the network level, providing realistic mocking
// without brittle module mocks. This is the recommended approach for testing hooks
// that use React Query or make HTTP requests.

beforeAll(() => {
  setupMswServer();
});

afterEach(() => {
  resetMswServer();
});

afterAll(() => {
  closeMswServer();
});

// Note: The old global fetch mock has been replaced by MSW.
// If specific tests need custom fetch behavior, they can override MSW handlers
// using server.use() from "./test/msw/server".

// Mock database dependencies
vi.mock("postgres", () => ({
  default: vi.fn().mockImplementation(() => {
    const mockSql = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    return Object.assign(mockSql, {
      end: vi.fn().mockResolvedValue(undefined),
    });
  }),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn().mockImplementation(() => {
    // Create reusable chainable mock functions
    const createChainableMock = (finalValue = []) => {
      const mock = vi.fn();

      // Create chainable object with proper recursive structure
      const chainable: Record<string, any> = {};

      // Populate the chainable object
      Object.assign(chainable, {
        from: vi.fn().mockReturnValue(chainable),
        where: vi.fn().mockReturnValue(chainable),
        orderBy: vi.fn().mockReturnValue(chainable),
        limit: vi.fn().mockReturnValue(chainable),
        offset: vi.fn().mockReturnValue(chainable),
        values: vi.fn().mockReturnValue(chainable),
        set: vi.fn().mockReturnValue(chainable),
        returning: vi.fn().mockResolvedValue(finalValue),
        execute: vi.fn().mockResolvedValue(finalValue),
        then: vi.fn().mockImplementation((resolve) => Promise.resolve(resolve(finalValue))),
      });

      // Make the base function return the chainable object
      mock.mockReturnValue(chainable);

      // Also make the chainable object itself callable to handle edge cases
      Object.setPrototypeOf(chainable, Function.prototype);
      Object.assign(chainable, mock);

      return mock;
    };

    return {
      select: createChainableMock([]),
      insert: createChainableMock([{ id: "test-id" }] as any),
      update: createChainableMock([{ id: "test-id" }] as any),
      delete: createChainableMock([{ id: "test-id" }] as any),
      execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
      transaction: vi.fn((cb) => {
        const txMocks = {
          select: createChainableMock([]),
          insert: createChainableMock([{ id: "test-id" }] as any),
          update: createChainableMock([{ id: "test-id" }] as any),
          delete: createChainableMock([{ id: "test-id" }] as any),
        };
        return Promise.resolve(cb(txMocks));
      }),
      // Add Drizzle query API support
      query: {
        contacts: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        },
        jobs: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };
  }),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: "0px",
  thresholds: [0],
  takeRecords: vi.fn(() => []),
}));

// Mock Web APIs
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Note: API client (@/lib/api) is NOT mocked globally.
// HTTP requests are intercepted by MSW (Mock Service Worker) for realistic testing.
// If specific tests need to mock the API client directly, they can do so locally.

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Set window.location for tests (needed for MSW and fetch)
if (typeof window !== "undefined") {
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      origin: "http://localhost:3000",
      href: "http://localhost:3000",
      protocol: "http:",
      host: "localhost:3000",
      hostname: "localhost",
      port: "3000",
      pathname: "/",
      search: "",
      hash: "",
    },
  });
} else {
  // For Node.js environment (MSW)
  global.location = {
    origin: "http://localhost:3000",
    href: "http://localhost:3000",
    protocol: "http:",
    host: "localhost:3000",
    hostname: "localhost",
    port: "3000",
    pathname: "/",
    search: "",
    hash: "",
  } as Location;
}

// Note: Fake timers are disabled because they can interfere with MSW and React Query
// If you need fake timers for specific tests, enable them per-test using vi.useFakeTimers()

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn((date) => {
    const now = new Date(); // This will use the fake time
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} hours ago`;
  }),
}));

// React Query should NOT be globally mocked - let individual tests handle it
// This allows tests to use real QueryClient with proper hook behavior

// Additional environment defaults for backward compatibility
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test";
process.env.GOOGLE_GMAIL_REDIRECT_URI =
  process.env.GOOGLE_GMAIL_REDIRECT_URI || "http://localhost:3000/api/google/gmail/callback";
process.env.GOOGLE_CALENDAR_REDIRECT_URI =
  process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:3000/api/google/calendar/callback";
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "test-publishable-key";
process.env.APP_ENCRYPTION_KEY =
  process.env.APP_ENCRYPTION_KEY || "a_secure_but_test_only_encryption_key_32b";

// Set API base URL for tests (needed for relative URL resolution in fetch)
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
