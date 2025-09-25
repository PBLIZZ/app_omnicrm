import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveTokensList } from "../ActiveTokensList";

// Mock the API client
const mockGet = vi.fn();
const mockDel = vi.fn();
vi.mock("@/lib/api", () => ({
  get: mockGet,
  del: mockDel,
}));

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
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
Object.defineProperty(window, "location", {
  value: {
    origin: "https://test.app.com",
  },
  writable: true,
});

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
  });

  it("should render loading state", () => {
    mockGet.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId(/skeleton/i)).toHaveLength(3);
  });

  it("should render error state", async () => {
    mockGet.mockRejectedValue(new Error("Failed to fetch"));

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load active links. Please try refreshing the page."),
      ).toBeInTheDocument();
    });
  });

  it("should render empty state", async () => {
    mockGet.mockResolvedValue({ tokens: [] });

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

    mockGet.mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Expired")).toBeInTheDocument();
      expect(screen.getByText("Used Up")).toBeInTheDocument();
    });

    // Check summary
    expect(screen.getByText("3 total links • 1 active")).toBeInTheDocument();
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

    mockGet.mockResolvedValue({ tokens: mockTokens });
    mockWriteText.mockResolvedValue(undefined);

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const copyButton = screen.getByLabelText("Copy onboarding URL");
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith("https://test.app.com/onboard/test-token-1");
    expect(mockToast.success).toHaveBeenCalledWith("Link copied to clipboard!");
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

    mockGet.mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const openButton = screen.getByLabelText("Open onboarding URL in new tab");
    await user.click(openButton);

    expect(mockOpen).toHaveBeenCalledWith(
      "https://test.app.com/onboard/test-token-1",
      "_blank",
      "noopener,noreferrer",
    );
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

    mockGet.mockResolvedValue({ tokens: mockTokens });
    mockDel.mockResolvedValue(undefined);

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText("Delete token");
    await user.click(deleteButton);

    expect(mockDel).toHaveBeenCalledWith("/api/onboarding/admin/tokens/token-1");
    expect(mockToast.success).toHaveBeenCalledWith("Onboarding link deleted successfully");
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

    mockGet.mockResolvedValue({ tokens: mockTokens });
    mockDel.mockRejectedValue(new Error("Delete failed"));

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText("Delete token");
    await user.click(deleteButton);

    expect(mockToast.error).toHaveBeenCalledWith("Failed to delete onboarding link");
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

    mockGet.mockResolvedValue({ tokens: mockTokens });

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

    mockGet.mockResolvedValue({ tokens: mockTokens });

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

    mockGet.mockResolvedValue({ tokens: mockTokens });
    mockWriteText.mockRejectedValue(new Error("Clipboard error"));

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const copyButton = screen.getByLabelText("Copy onboarding URL");
    await user.click(copyButton);

    expect(mockToast.error).toHaveBeenCalledWith("Failed to copy link");
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
    Object.defineProperty(window, "location", {
      value: {},
      writable: true,
    });

    mockGet.mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    const copyButton = screen.getByLabelText("Copy onboarding URL");
    await user.click(copyButton);

    expect(mockToast.error).toHaveBeenCalledWith("Unable to generate link - origin not available");
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

    mockGet.mockResolvedValue({ tokens: mockTokens });

    render(<ActiveTokensList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Copy onboarding URL")).not.toBeInTheDocument();
  });
});
