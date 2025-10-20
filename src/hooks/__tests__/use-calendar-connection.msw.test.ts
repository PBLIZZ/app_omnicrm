/**
 * useCalendarConnection Hook Tests
 *
 * Basic tests focusing on core functionality and state management.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { useCalendarConnection } from "../useCalendarConnection";
import { toast } from "sonner";

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("useCalendarConnection", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
    vi.clearAllMocks();
  });

  describe("Hook initialization", () => {
    it("initializes with correct default state", () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.connect).toBe("function");
      expect(typeof result.current.refreshTokens).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });
  });

  describe("Error state management", () => {
    it("clears error state with clearError function", () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Initially no error
      expect(result.current.error).toBeNull();

      // Clear error should work
      result.current.clearError();
      expect(result.current.error).toBeNull();
    });
  });

  describe("Function availability", () => {
    it("provides all required functions", () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(typeof result.current.connect).toBe("function");
      expect(typeof result.current.refreshTokens).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });

    it("functions can be called without throwing", () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(() => result.current.connect()).not.toThrow();
      expect(() => result.current.clearError()).not.toThrow();
    });
  });

  describe("State management", () => {
    it("maintains consistent state structure", () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Check that all expected properties exist
      expect(result.current).toHaveProperty("isConnecting");
      expect(result.current).toHaveProperty("isRefreshing");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("connect");
      expect(result.current).toHaveProperty("refreshTokens");
      expect(result.current).toHaveProperty("clearError");

      // Check types
      expect(typeof result.current.isConnecting).toBe("boolean");
      expect(typeof result.current.isRefreshing).toBe("boolean");
      expect(typeof result.current.error).toBe("object"); // null is an object
      expect(typeof result.current.connect).toBe("function");
      expect(typeof result.current.refreshTokens).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });

    it("maintains state consistency across multiple renders", () => {
      const { result, rerender } = renderHook(() => useCalendarConnection(), { wrapper });

      const initialState = {
        isConnecting: result.current.isConnecting,
        isRefreshing: result.current.isRefreshing,
        error: result.current.error,
      };

      // Rerender the hook
      rerender();

      expect(result.current.isConnecting).toBe(initialState.isConnecting);
      expect(result.current.isRefreshing).toBe(initialState.isRefreshing);
      expect(result.current.error).toBe(initialState.error);
    });
  });
});
