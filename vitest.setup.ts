import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

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

// Mock fetch globally with smart response handling
global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
  // Default successful response structure (direct JSON)
  const defaultResponse = {};

  // Handle specific API endpoints
  if (typeof url === "string") {
    if (url.includes("/api/contacts-new")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "new-contact" }),
        text: () => Promise.resolve(JSON.stringify({ id: "new-contact" })),
      });
    }
    if (url.includes("/api/contacts/enrich")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ enriched: true }),
        text: () => Promise.resolve(JSON.stringify({ enriched: true })),
      });
    }
    if (url.includes("/api/contacts/suggestions")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ created: 1 }),
        text: () => Promise.resolve(JSON.stringify({ created: 1 })),
      });
    }
  }

  // Default response for all other URLs
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(defaultResponse),
    text: () => Promise.resolve(JSON.stringify(defaultResponse)),
    headers: new Headers({
      "content-type": "application/json",
    }),
  } as Response);
});

// Mock database dependencies
vi.mock("postgres", () => ({
  default: vi.fn().mockImplementation(() => {
    const mockSql = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    mockSql.end = vi.fn().mockResolvedValue(undefined);
    return mockSql;
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
      insert: createChainableMock([{ id: "test-id" }]),
      update: createChainableMock([{ id: "test-id" }]),
      delete: createChainableMock([{ id: "test-id" }]),
      execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
      transaction: vi.fn((cb) => {
        const txMocks = {
          select: createChainableMock([]),
          insert: createChainableMock([{ id: "test-id" }]),
          update: createChainableMock([{ id: "test-id" }]),
          delete: createChainableMock([{ id: "test-id" }]),
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
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
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
