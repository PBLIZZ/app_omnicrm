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

describe("TokenGeneratorSection", () => {
  const mockPost = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("should render the form with default values", () => {
    render(<TokenGeneratorSection />);

    expect(screen.getByText("Valid Duration")).toBeInTheDocument();
    expect(screen.getByText("Maximum Uses")).toBeInTheDocument();
    expect(screen.getByText("Generate Onboarding Link")).toBeInTheDocument();

    // Check default values
    expect(screen.getByDisplayValue("72 Hours (3 days)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Single Use")).toBeInTheDocument();
  });

  it("should update form values when selections change", async () => {
    const user = userEvent.setup();
    render(<TokenGeneratorSection />);

    // Change duration
    const durationSelect = screen.getByRole("combobox", { name: "Select duration" });
    await user.click(durationSelect);
    await user.click(screen.getByText("24 Hours"));

    // Change max uses
    const usesSelect = screen.getByRole("combobox", { name: "Select uses" });
    await user.click(usesSelect);
    await user.click(screen.getByText("3 Uses"));

    expect(screen.getByDisplayValue("24 Hours")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3 Uses")).toBeInTheDocument();
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

    expect(screen.getByText("Generating Link...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/onboarding/admin/generate-tokens", {
        hoursValid: 72,
        maxUses: 1,
      });
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Onboarding link generated successfully!");
    });

    // Check that the generated token is displayed
    expect(
      screen.getByDisplayValue("https://test.app.com/onboard/test-token-123"),
    ).toBeInTheDocument();
    expect(screen.getByText("Expires:")).toBeInTheDocument();
    expect(screen.getByText("Uses allowed: 1 use")).toBeInTheDocument();
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

  it("should copy link to clipboard", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 1,
    };

    mockPost.mockResolvedValue(mockResponse);
    mockWriteText.mockResolvedValue(undefined);

    render(<TokenGeneratorSection />);

    // Generate token first
    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("https://test.app.com/onboard/test-token-123"),
      ).toBeInTheDocument();
    });

    // Click copy button
    const copyButton = screen.getByLabelText("Copy onboarding URL");
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith("https://test.app.com/onboard/test-token-123");
    expect(mockToast.success).toHaveBeenCalledWith("Link copied to clipboard!");
  });

  it("should handle copy errors", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 1,
    };

    mockPost.mockResolvedValue(mockResponse);
    mockWriteText.mockRejectedValue(new Error("Clipboard error"));

    render(<TokenGeneratorSection />);

    // Generate token first
    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("https://test.app.com/onboard/test-token-123"),
      ).toBeInTheDocument();
    });

    // Click copy button
    const copyButton = screen.getByLabelText("Copy onboarding URL");
    await user.click(copyButton);

    expect(mockToast.error).toHaveBeenCalledWith("Failed to copy link");
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
      expect(screen.getByText("Expires:")).toBeInTheDocument();
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
    let resolvePost: (value: any) => void;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });
    mockPost.mockReturnValue(postPromise);

    render(<TokenGeneratorSection />);

    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    // Button should be disabled and show loading state
    expect(screen.getByText("Generating Link...")).toBeInTheDocument();
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

  it("should show correct usage text for multiple uses", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: "2024-01-01T12:00:00Z",
      maxUses: 3,
    };

    mockPost.mockResolvedValue(mockResponse);

    render(<TokenGeneratorSection />);

    // Change to 3 uses
    const usesSelect = screen.getByRole("combobox", { name: "Select uses" });
    await user.click(usesSelect);
    await user.click(screen.getByText("3 Uses"));

    // Generate token
    const generateButton = screen.getByText("Generate Onboarding Link");
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Uses allowed: 3 uses")).toBeInTheDocument();
    });
  });
});
