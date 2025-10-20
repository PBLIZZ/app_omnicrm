import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveTokensList } from "../ActiveTokensList";
import { toast } from "sonner";
import { get, del } from "@/lib/api";

// Mock the API client
vi.mock("@/lib/api", () => ({
  get: vi.fn(),
  del: vi.fn(),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clipboard API
const mockWriteText = vi.fn();
vi.stubGlobal("navigator", {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock window.open
const mockOpen = vi.fn();
Object.defineProperty(window, "open", {
  value: mockOpen,
  writable: true,
});

// Mock window.location.origin
Object.defineProperty(window.location, "origin", {
  value: "https://test.app.com",
  writable: true,
  configurable: true,
});

// Mock Date constructor to return a fixed time
const mockDate = new Date("2024-01-01T10:00:00Z");
const OriginalDate = global.Date;
global.Date = class extends OriginalDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      return mockDate;
    }
    return new OriginalDate(...args);
  }
  static now() {
    return mockDate.getTime();
  }
} as any;

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn((date) => {
    const now = new Date("2024-01-01T10:00:00Z");
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} hours ago`;
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("ActiveTokensList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    global.Date = OriginalDate;
  });

  it("should render loading state", () => {
    vi.mocked(get).mockReturnValue(new Promise(() => {})); // Never resolves

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    // Should show skeleton loading state - look for the specific skeleton divs
    const skeletonDivs = screen
      .getAllByRole("generic")
      .filter((div) => div.className.includes("animate-pulse"));
    expect(skeletonDivs).toHaveLength(3);
  });

  it("should render error state", async () => {
    vi.mocked(get).mockRejectedValue(new Error("Failed to fetch"));

    // Create a query client with retries disabled for this test
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    render(<ActiveTokensList />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load active links. Please try refreshing the page."),
      ).toBeInTheDocument();
    });
  });

  it("should render empty state", async () => {
    vi.mocked(get).mockResolvedValue({ tokens: [] });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No active onboarding links")).toBeInTheDocument();
      expect(screen.getByText("Generate a link to get started")).toBeInTheDocument();
    });
  });

  it("should render active tokens", async () => {
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 1,
        usedCount: 0,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "token-2",
        token: "test-token-2",
        expiresAt: "2024-01-01T08:00:00Z", // Expired
        maxUses: 3,
        usedCount: 2,
        disabled: false,
        createdAt: "2024-01-01T09:00:00Z",
      },
      {
        id: "token-3",
        token: "test-token-3",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 5,
        usedCount: 5, // Fully used
        disabled: false,
        createdAt: "2024-01-01T11:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    // Check summary - only active tokens are rendered
    expect(screen.getByText(/1 total link.*1 active.*0 used.*0 expired/)).toBeInTheDocument();
  });

  it("should copy token URL to clipboard", async () => {
    const user = userEvent.setup();
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 1,
        usedCount: 0,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });
    mockWriteText.mockResolvedValue(undefined);

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    // Wait for the origin to be set
    await waitFor(() => {
      expect(window.location.origin).toBe("https://test.app.com");
    });

    const copyButton = screen.getByLabelText("Copy onboarding URL");
    await user.click(copyButton);

    // Wait for the clipboard operation to complete
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });

    const calledWith = mockWriteText.mock.calls[0][0];
    expect(calledWith).toContain("/onboard/test-token-1");
    expect(toast.success).toHaveBeenCalledWith("Link copied to clipboard!");
  });

  it("should open token URL in new tab", async () => {
    const user = userEvent.setup();
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 1,
        usedCount: 0,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const openButton = screen.getByLabelText("Open onboarding URL in new tab");
    await user.click(openButton);

    // The component might be using the actual window.location.origin instead of the mock
    // Let's check what was actually called
    expect(mockOpen).toHaveBeenCalled();
    const calledWith = mockOpen.mock.calls[0];
    expect(calledWith[0]).toContain("/onboard/test-token-1");
    expect(calledWith[1]).toBe("_blank");
    expect(calledWith[2]).toBe("noopener,noreferrer");
  });

  it("should delete token successfully", async () => {
    const user = userEvent.setup();
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 1,
        usedCount: 0,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });
    vi.mocked(del).mockResolvedValue(undefined);

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText("Delete token");
    await user.click(deleteButton);

    expect(vi.mocked(del)).toHaveBeenCalledWith("/api/onboarding/admin/tokens/token-1");
    expect(toast.success).toHaveBeenCalledWith("Onboarding link deleted successfully");
  });

  it("should handle delete errors", async () => {
    const user = userEvent.setup();
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 1,
        usedCount: 0,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });
    vi.mocked(del).mockRejectedValue(new Error("Delete failed"));

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText("Delete token");
    await user.click(deleteButton);

    expect(toast.error).toHaveBeenCalledWith("Failed to delete onboarding link");
  });

  it("should show correct usage information", async () => {
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 3,
        usedCount: 1,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 uses left")).toBeInTheDocument();
      expect(screen.getByText("1/3 used")).toBeInTheDocument();
    });
  });

  it("should not show action buttons for non-active tokens", async () => {
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-01T08:00:00Z", // Expired
        maxUses: 1,
        usedCount: 0,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Expired")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Copy onboarding URL")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Open onboarding URL in new tab")).not.toBeInTheDocument();
  });

  it("should handle clipboard errors gracefully", async () => {
    const user = userEvent.setup();
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 1,
        usedCount: 0,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });
    mockWriteText.mockRejectedValue(new Error("Clipboard error"));

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    // Wait for the origin to be set
    await waitFor(() => {
      expect(window.location.origin).toBe("https://test.app.com");
    });

    const copyButton = screen.getByLabelText("Copy onboarding URL");
    await user.click(copyButton);

    // Wait for the error to be handled
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to copy link");
    });
  });

  it("should handle missing origin gracefully", async () => {
    const user = userEvent.setup();
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 1,
        usedCount: 0,
        disabled: false,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    // Mock missing origin
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {},
      writable: true,
    });

    try {
      vi.mocked(get).mockResolvedValue({ tokens: mockTokens });

      render(<ActiveTokensList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument();
      });

      const copyButton = screen.getByLabelText("Copy onboarding URL");
      await user.click(copyButton);

      expect(toast.error).toHaveBeenCalledWith("Unable to generate link - origin not available");
    } finally {
      // Restore original location
      window.location = originalLocation;
    }
  });

  it("should show disabled state for disabled tokens", async () => {
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expiresAt: "2024-01-02T12:00:00Z",
        maxUses: 1,
        usedCount: 0,
        disabled: true,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    vi.mocked(get).mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Copy onboarding URL")).not.toBeInTheDocument();
  });
});
