/**
 * Test utilities for OmniCRM application
 * Provides common test setup, mocks, and utilities for component testing
 */

import React, { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

// Mock data factories
export const createMockContact = (overrides = {}) => ({
  id: "contact-1",
  userId: "user-1",
  displayName: "John Doe",
  primaryEmail: "john@example.com",
  primaryPhone: "+1234567890",
  source: "manual",
  stage: "Core Client",
  tags: ["yoga", "regular"],
  confidenceScore: "0.85",
  slug: "john-doe",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const createMockNote = (overrides = {}) => ({
  id: "note-1",
  userId: "user-1",
  contactId: "contact-1",
  title: "Meeting Notes",
  content: "Discussed yoga practices and preferences",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const createMockMomentum = (overrides = {}) => ({
  id: "momentum-1",
  userId: "user-1",
  momentumWorkspaceId: "workspace-1",
  momentumProjectId: "project-1",
  parentMomentumId: null,
  title: "Follow up with John",
  description: "Schedule next session",
  status: "todo",
  priority: "medium",
  assignee: "user",
  source: "user",
  approvalStatus: "approved",
  taggedContacts: ["contact-1"],
  dueDate: "2024-01-15T00:00:00Z",
  completedAt: null,
  estimatedMinutes: 30,
  actualMinutes: null,
  aiContext: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const createMockAiInsight = (overrides = {}) => ({
  id: "insight-1",
  userId: "user-1",
  subjectType: "contact",
  subjectId: "contact-1",
  kind: "summary",
  content: {
    summary: "Regular yoga practitioner with strong engagement",
    confidence: 0.85,
    recommendations: ["Schedule weekly check-ins"],
  },
  model: "gpt-4",
  createdAt: "2024-01-01T00:00:00Z",
  fingerprint: "abc123",
  ...overrides,
});

// Mock React Query setup
export const createTestQueryClient = () =>
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

export const renderWithProviders = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  const { queryClient, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper>,
    ...renderOptions,
  });
};

// Mock API responses
export const mockApiResponses = {
  contacts: {
    list: { ok: true, data: [createMockContact()] },
    create: { ok: true, data: createMockContact() },
    update: { ok: true, data: createMockContact() },
    delete: { ok: true, data: { success: true } },
  },
  notes: {
    list: { ok: true, data: { notes: [createMockNote()] } },
    create: { ok: true, data: createMockNote() },
    update: { ok: true, data: createMockNote() },
    delete: { ok: true, data: { success: true } },
  },
  momentum: {
    list: { ok: true, data: [createMockMomentum()] },
    create: { ok: true, data: createMockMomentum() },
    update: { ok: true, data: createMockMomentum() },
    delete: { ok: true, data: { success: true } },
  },
  insights: {
    list: { ok: true, data: [createMockAiInsight()] },
    generate: { ok: true, data: createMockAiInsight() },
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
  data: options.isError ? null : { ok: true, data: {} },
  reset: vi.fn(),
  status: options.isPending ? "pending" : options.isError ? "error" : "success",
});

export const createMockUseQuery = (
  data: any = null,
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
export const getByLabelText = (container: HTMLElement, text: string) => {
  const element = container.querySelector(`[aria-label="${text}"]`);
  if (!element) {
    throw new Error(`Unable to find element with aria-label: ${text}`);
  }
  return element;
};

export const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-testid: ${testId}`);
  }
  return element;
};

// User event helpers
export const createUserEvent = async () => {
  const userEvent = await import("@testing-library/user-event");
  return userEvent.default.setup();
};

// Form testing utilities
export const fillForm = async (form: HTMLFormElement, data: Record<string, string>) => {
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
export const waitForLoadingToFinish = async () => {
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
export const mockLocalStorage = () => {
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

// Re-export common testing library utilities
export * from "@testing-library/react";
export { vi } from "vitest";
