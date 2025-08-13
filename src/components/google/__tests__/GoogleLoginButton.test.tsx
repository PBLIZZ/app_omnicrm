import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoogleLoginButton, useOAuthCallback } from "../GoogleLoginButton";
import { toast } from "sonner";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock window.location
const mockLocation = {
  href: "https://example.com/current-page",
  search: "",
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// Mock sessionStorage
const mockSessionStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

describe("GoogleLoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "https://example.com/current-page";
    mockLocation.search = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders with default Gmail scope", () => {
      render(<GoogleLoginButton />);

      expect(screen.getByRole("button", { name: "Connect Gmail account" })).toBeInTheDocument();
      expect(screen.getByText("Connect Gmail")).toBeInTheDocument();
      expect(screen.getByText("Read-only access to your Gmail messages")).toBeInTheDocument();
    });

    it("renders with calendar scope", () => {
      render(<GoogleLoginButton scope="calendar" />);

      expect(
        screen.getByRole("button", { name: "Connect Google Calendar account" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
      expect(
        screen.getByText("Read-only access to your Google Calendar events"),
      ).toBeInTheDocument();
    });

    it("renders custom children", () => {
      render(<GoogleLoginButton>Custom Button Text</GoogleLoginButton>);

      expect(screen.getByText("Custom Button Text")).toBeInTheDocument();
    });

    it("applies custom className and variant", () => {
      render(<GoogleLoginButton className="custom-class" variant="destructive" />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });
      expect(button).toHaveClass("custom-class");
    });

    it("shows Google icon SVG", () => {
      render(<GoogleLoginButton />);

      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    });
  });

  describe("disabled state", () => {
    it("renders disabled button when disabled prop is true", () => {
      render(<GoogleLoginButton disabled />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });
      expect(button).toBeDisabled();
    });

    it("does not trigger OAuth when disabled", async () => {
      const user = userEvent.setup();
      render(<GoogleLoginButton disabled />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });
      await user.click(button);

      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe("OAuth flow initiation", () => {
    it("shows loading state during OAuth", async () => {
      const user = userEvent.setup();

      // Prevent actual redirect for testing
      const originalHref = mockLocation.href;
      Object.defineProperty(mockLocation, "href", {
        set: vi.fn(),
        get: () => originalHref,
      });

      render(<GoogleLoginButton />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });

      // Start OAuth flow
      const clickPromise = user.click(button);

      // Button should show loading state
      await waitFor(() => {
        expect(button).toHaveClass("cursor-not-allowed");
        expect(screen.getByRole("button")).toBeDisabled();
      });

      await clickPromise;
    });

    it("shows toast notification on OAuth start", async () => {
      const user = userEvent.setup();

      // Mock the redirect to prevent actual navigation
      Object.defineProperty(mockLocation, "href", { set: vi.fn(), configurable: true });

      render(<GoogleLoginButton scope="calendar" />);

      const button = screen.getByRole("button", { name: "Connect Google Calendar account" });
      await user.click(button);

      expect(toast.info).toHaveBeenCalledWith("Connecting to Google calendar...", {
        description: "You'll be redirected to Google for authentication",
      });
    });

    it("stores OAuth state in sessionStorage", async () => {
      const user = userEvent.setup();

      Object.defineProperty(mockLocation, "href", { set: vi.fn(), configurable: true });

      render(<GoogleLoginButton scope="gmail" />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });
      await user.click(button);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "oauth_return_url",
        "https://example.com/current-page",
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("oauth_scope", "gmail");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "oauth_initiated_at",
        expect.any(String),
      );
    });

    it("redirects to correct OAuth URL", async () => {
      const user = userEvent.setup();
      const hrefSetter = vi.fn();

      Object.defineProperty(mockLocation, "href", {
        set: hrefSetter,
        get: () => "https://example.com/current-page",
        configurable: true,
      });

      render(<GoogleLoginButton scope="calendar" />);

      const button = screen.getByRole("button", { name: "Connect Google Calendar account" });
      await user.click(button);

      expect(hrefSetter).toHaveBeenCalledWith("/api/google/oauth?scope=calendar");
    });
  });

  describe("error handling", () => {
    it("handles OAuth initiation errors", async () => {
      const user = userEvent.setup();
      const onError = vi.fn();

      // Mock console methods to avoid noise in tests
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});

      // Force an error by making sessionStorage.setItem throw
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      render(<GoogleLoginButton onError={onError} />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });
      await user.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: "oauth_initiation_failed",
            message: "Storage quota exceeded",
            details: expect.objectContaining({
              scope: "gmail",
              originalError: "Storage quota exceeded",
            }),
          }),
        );
      });

      expect(toast.error).toHaveBeenCalledWith("Authentication failed", {
        description: "Storage quota exceeded",
      });
    });

    it("removes loading state after error", async () => {
      const user = userEvent.setup();

      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});

      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error("Test error");
      });

      render(<GoogleLoginButton />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });
      await user.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
        expect(button).not.toHaveClass("cursor-not-allowed");
      });
    });
  });

  describe("accessibility", () => {
    it("has proper aria-label", () => {
      render(<GoogleLoginButton scope="calendar" />);

      expect(
        screen.getByRole("button", { name: "Connect Google Calendar account" }),
      ).toBeInTheDocument();
    });

    it("supports keyboard interaction", async () => {
      const user = userEvent.setup();

      Object.defineProperty(mockLocation, "href", { set: vi.fn(), configurable: true });

      render(<GoogleLoginButton />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });
      button.focus();

      await user.keyboard("{Enter}");

      expect(toast.info).toHaveBeenCalled();
    });

    it("maintains focus visibility", () => {
      render(<GoogleLoginButton />);

      const button = screen.getByRole("button", { name: "Connect Gmail account" });
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe("scope handling", () => {
    const scopes = [
      {
        scope: "gmail" as const,
        displayName: "Gmail",
        description: "Read-only access to your Gmail messages",
      },
      {
        scope: "calendar" as const,
        displayName: "Google Calendar",
        description: "Read-only access to your Google Calendar events",
      },
    ];

    scopes.forEach(({ scope, displayName, description }) => {
      it(`handles ${scope} scope correctly`, () => {
        render(<GoogleLoginButton scope={scope} />);

        expect(screen.getByText(`Connect ${displayName}`)).toBeInTheDocument();
        expect(screen.getByText(description)).toBeInTheDocument();
      });
    });
  });
});

describe("useOAuthCallback", () => {
  // Mock React for the hook test
  const TestComponent = () => {
    const { isComplete } = useOAuthCallback();
    return <div data-testid="completion-status">{isComplete ? "complete" : "incomplete"}</div>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = "";
    mockSessionStorage.getItem.mockReturnValue(null);

    // Mock console methods
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock window.history.replaceState
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects successful OAuth completion", () => {
    mockLocation.search = "?connected=google";
    mockSessionStorage.getItem
      .mockReturnValueOnce("gmail") // oauth_scope
      .mockReturnValueOnce("https://example.com/return"); // oauth_return_url

    render(<TestComponent />);

    expect(screen.getByTestId("completion-status")).toHaveTextContent("complete");
    expect(toast.success).toHaveBeenCalledWith("Successfully connected to Google!", {
      description: "gmail access granted",
    });
  });

  it("cleans up sessionStorage after successful OAuth", () => {
    mockLocation.search = "?connected=google";
    mockSessionStorage.getItem.mockReturnValue("test-value");

    render(<TestComponent />);

    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("oauth_scope");
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("oauth_return_url");
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("oauth_initiated_at");
  });

  it("cleans up URL after successful OAuth", () => {
    mockLocation.search = "?connected=google&other=param";

    render(<TestComponent />);

    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it("handles OAuth error", () => {
    mockLocation.search = "?error=access_denied";

    render(<TestComponent />);

    expect(toast.error).toHaveBeenCalledWith("Authentication failed", {
      description: "Error: access_denied",
    });

    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      "",
      expect.not.stringMatching(/error=/),
    );
  });

  it("handles OAuth completion without scope in storage", () => {
    mockLocation.search = "?connected=google";
    mockSessionStorage.getItem.mockReturnValue(null);

    render(<TestComponent />);

    expect(toast.success).toHaveBeenCalledWith("Successfully connected to Google!", {
      description: "Authentication complete",
    });
  });

  it("does nothing when no OAuth params present", () => {
    mockLocation.search = "";

    render(<TestComponent />);

    expect(screen.getByTestId("completion-status")).toHaveTextContent("incomplete");
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
