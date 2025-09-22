/**
 * Test utilities for OmniCRM application
 * Provides common test setup, mocks, and utilities for component testing
 */

import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

// Mock data factories
const baseMockContact = {
  id: "contact-1",
  userId: "user-1",
  displayName: "John Doe",
  primaryEmail: "john@example.com",
  primaryPhone: "+1234567890",
  source: "manual" as const,
  stage: "Core Client" as const,
  tags: ["yoga", "regular"],
  confidenceScore: "0.85",
  slug: "john-doe",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const createMockContact = (overrides = {}): typeof baseMockContact & typeof overrides => ({
  ...baseMockContact,
  ...overrides,
});

const baseMockNote = {
  id: "note-1",
  userId: "user-1",
  contactId: "contact-1",
  title: "Meeting Notes",
  content: "Discussed yoga practices and preferences",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const createMockNote = (overrides = {}): typeof baseMockNote & typeof overrides => ({
  ...baseMockNote,
  ...overrides,
});

const baseMockAiInsight = {
  id: "insight-1",
  userId: "user-1",
  subjectType: "contact" as const,
  subjectId: "contact-1",
  kind: "summary" as const,
  content: {
    summary: "Regular yoga practitioner with strong engagement",
    confidence: 0.85,
    recommendations: ["Schedule weekly check-ins"],
  },
  model: "gpt-4",
  createdAt: "2024-01-01T00:00:00Z",
  fingerprint: "abc123",
};

export const createMockAiInsight = (
  overrides = {},
): typeof baseMockAiInsight & typeof overrides => ({
  ...baseMockAiInsight,
  ...overrides,
});

// Mock React Query setup
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test wrapper with providers
interface TestWrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

const TestWrapper = ({ children, queryClient }: TestWrapperProps) => {
  const testQueryClient = queryClient || createTestQueryClient();

  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>;
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {},
): ReturnType<typeof render> => {
  const { queryClient, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper queryClient={queryClient || new QueryClient()}>{children}</TestWrapper>
    ),
    ...renderOptions,
  });
};

// Mock API responses (direct JSON, no envelope)
export const mockApiResponses = {
  contacts: {
    list: [createMockContact()],
    create: createMockContact(),
    update: createMockContact(),
    delete: { success: true },
  },
  notes: {
    list: { notes: [createMockNote()] },
    create: createMockNote(),
    update: createMockNote(),
    delete: { success: true },
  },
  insights: {
    list: [createMockAiInsight()],
    generate: createMockAiInsight(),
  },
};

// Mock hooks
export const createMockUseMutation = (
  mockFn = vi.fn(),
  options: { isPending?: boolean; isError?: boolean; error?: Error } = {},
) => ({
  mutate: mockFn,
  mutateAsync: mockFn,
  isPending: options.isPending || false,
  isError: options.isError || false,
  isSuccess: !options.isPending && !options.isError,
  error: options.error || null,
  data: options.isError ? null : {},
  reset: vi.fn(),
  status: options.isPending ? "pending" : options.isError ? "error" : "success",
});

export const createMockUseQuery = (
  data: unknown = null,
  options: { isLoading?: boolean; isError?: boolean; error?: Error } = {},
) => ({
  data: options.isError ? null : data,
  isLoading: options.isLoading || false,
  isError: options.isError || false,
  isSuccess: !options.isLoading && !options.isError,
  error: options.error || null,
  refetch: vi.fn(),
  status: options.isLoading ? "pending" : options.isError ? "error" : "success",
});

// Accessibility testing helpers
export const getByLabelText = (container: HTMLElement, text: string): Element => {
  const element = container.querySelector(`[aria-label="${text}"]`);
  if (!element) {
    throw new Error(`Unable to find element with aria-label: ${text}`);
  }
  return element;
};

export const getByTestId = (container: HTMLElement, testId: string): Element => {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-testid: ${testId}`);
  }
  return element;
};

// User event helpers
export const createUserEvent = async (): Promise<
  ReturnType<typeof import("@testing-library/user-event").default.setup>
> => {
  const userEvent = await import("@testing-library/user-event");
  return userEvent.default.setup();
};

// Form testing utilities
export const fillForm = async (
  form: HTMLFormElement,
  data: Record<string, string>,
): Promise<void> => {
  const user = await createUserEvent();

  for (const [field, value] of Object.entries(data)) {
    const input = form.querySelector(`[name="${field}"]`) as HTMLInputElement;
    if (input) {
      await user.clear(input);
      await user.type(input, value);
    }
  }
};

// Wait for element helpers
export const waitForLoadingToFinish = async (): Promise<void> => {
  const { waitForElementToBeRemoved, screen } = await import("@testing-library/react");

  try {
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i), {
      timeout: 3000,
    });
  } catch {
    // Loading element might not exist or already be removed
  }
};

// Mock localStorage
export const mockLocalStorage = (): {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
} => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
};

// Mock toast notifications
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
};

// Mock database for integration tests
const createMockTable = (tableName: string) => ({
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  del: vi.fn().mockResolvedValue(1),
  insert: vi.fn().mockResolvedValue([{ id: 1 }]),
  update: vi.fn().mockResolvedValue(1),
});

// Create a proper mock database object
export const testDb = Object.assign(
  vi.fn().mockImplementation((tableName: string) => createMockTable(tableName)),
  {
    migrate: {
      latest: vi.fn().mockResolvedValue(undefined),
    },
    destroy: vi.fn().mockResolvedValue(undefined),
    raw: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    del: vi.fn().mockResolvedValue(1),
    insert: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockResolvedValue(1),
  },
);

// Re-export common testing library utilities
export * from "@testing-library/react";
export { vi } from "vitest";
