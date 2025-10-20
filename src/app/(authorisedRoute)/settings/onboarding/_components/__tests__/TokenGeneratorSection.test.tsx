import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TokenGeneratorSection } from "../TokenGeneratorSection";

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

// Mock the API post function
vi.mock("@/lib/api", () => ({
  post: vi.fn(),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TokenGeneratorSection", () => {
  let mockPost: ReturnType<typeof vi.fn>;
  let mockToast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked functions
    const { post } = await import("@/lib/api");
    const { toast } = await import("sonner");

    mockPost = vi.mocked(post);
    mockToast = {
      success: vi.mocked(toast.success),
      error: vi.mocked(toast.error),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("should render the form with default values", () => {
    render(<TokenGeneratorSection />);

    expect(screen.getByText("Valid Duration")).toBeInTheDocument();
    expect(screen.getByText("Generate Onboarding Link")).toBeInTheDocument();

    // Check default values - the select shows the text in a span, not as a display value
    expect(screen.getByText("72 Hours (3 days)")).toBeInTheDocument();
  });

  it("should render select with default value", () => {
    render(<TokenGeneratorSection />);

    // Check that the select shows the default value
    expect(screen.getByText("72 Hours (3 days)")).toBeInTheDocument();
  });

  it("should generate token successfully", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 1,
    };

    mockPost.mockResolvedValue(mockResponse);

    render(<TokenGeneratorSection />);

    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    // Wait for the API call to complete and the token to be displayed
    await waitFor(() => {
      expect(
        screen.getByDisplayValue("https://test.app.com/onboard/test-token-123"),
      ).toBeInTheDocument();
    });

    expect(mockPost).toHaveBeenCalledWith("/api/onboarding/admin/generate-tokens", {
      hoursValid: 72,
    });

    // Check that the generated token is displayed
    expect(screen.getByText("Expires")).toBeInTheDocument();
    expect(screen.getByText("Single use only")).toBeInTheDocument();
  });

  it("should handle generation errors", async () => {
    const user = userEvent.setup();
    const error = new Error("Failed to create onboarding token");
    mockPost.mockRejectedValue(error);

    render(<TokenGeneratorSection />);

    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to generate onboarding link. Please try again.",
      );
    });

    // Button should be enabled again
    expect(screen.getByText("Generate Onboarding Link")).toBeInTheDocument();
  });

  it("should render copy button when token is generated", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 1,
    };

    mockPost.mockResolvedValue(mockResponse);

    render(<TokenGeneratorSection />);

    // Generate token first
    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("https://test.app.com/onboard/test-token-123"),
      ).toBeInTheDocument();
    });

    // Check that copy button is rendered
    expect(screen.getByLabelText("Copy onboarding URL")).toBeInTheDocument();
  });

  it("should render open button when token is generated", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 1,
    };

    mockPost.mockResolvedValue(mockResponse);

    render(<TokenGeneratorSection />);

    // Generate token first
    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("https://test.app.com/onboard/test-token-123"),
      ).toBeInTheDocument();
    });

    // Check that open button is rendered
    expect(screen.getByLabelText("Open onboarding URL in new tab")).toBeInTheDocument();
  });

  it("should open link in new tab", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 1,
    };

    mockPost.mockResolvedValue(mockResponse);

    render(<TokenGeneratorSection />);

    // Generate token first
    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("https://test.app.com/onboard/test-token-123"),
      ).toBeInTheDocument();
    });

    // Click open button
    const openButton = screen.getByLabelText("Open onboarding URL in new tab");
    await user.click(openButton);

    expect(mockOpen).toHaveBeenCalledWith(
      "https://test.app.com/onboard/test-token-123",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("should format expiration date correctly", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 1,
    };

    mockPost.mockResolvedValue(mockResponse);

    render(<TokenGeneratorSection />);

    // Generate token first
    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Expires")).toBeInTheDocument();
    });

    // The date should be formatted and displayed
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
  });

  it("should handle invalid date gracefully", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "invalid-date",
      maxUses: 1,
    };

    mockPost.mockResolvedValue(mockResponse);

    render(<TokenGeneratorSection />);

    // Generate token first
    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid date")).toBeInTheDocument();
    });
  });

  it("should disable button while generating", async () => {
    const user = userEvent.setup();
    let resolvePost: (value: unknown) => void;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });
    mockPost.mockReturnValue(postPromise);

    render(<TokenGeneratorSection />);

    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    // Button should be disabled and show loading state
    expect(screen.getByText(/Generating Link/)).toBeInTheDocument();
    expect(generateButton).toBeDisabled();

    // Resolve the promise
    resolvePost!({
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 1,
    });

    await waitFor(() => {
      expect(screen.getByText("Generate Onboarding Link")).toBeInTheDocument();
    });
  });
});
