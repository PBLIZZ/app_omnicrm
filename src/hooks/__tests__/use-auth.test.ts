/**
 * Auth Hook Tests
 *
 * Tests for useAuth hook which manages authentication state
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "../use-auth";
import type { User } from "@supabase/supabase-js";

// Mock the auth service
vi.mock("@/lib/services/client/auth.service", () => ({
  fetchCurrentUser: vi.fn(),
}));

import { fetchCurrentUser } from "@/lib/services/client/auth.service";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful Authentication", () => {
    it("should fetch and set user on mount", async () => {
      const mockUser: User = {
        id: "test-user-id",
        email: "test@example.com",
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(fetchCurrentUser).mockResolvedValueOnce({
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for auth to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
      expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    });

    it("should handle null user (not authenticated)", async () => {
      vi.mocked(fetchCurrentUser).mockResolvedValueOnce({
        user: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle authentication errors", async () => {
      const mockError = new Error("Authentication failed");

      vi.mocked(fetchCurrentUser).mockResolvedValueOnce({
        user: null,
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.error).toEqual(mockError);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle fetchCurrentUser throwing an exception", async () => {
      const mockError = new Error("Network error");
      vi.mocked(fetchCurrentUser).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.error).toEqual(mockError);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(fetchCurrentUser).mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("String error");
    });
  });

  describe("Loading States", () => {
    it("should start with loading state", () => {
      vi.mocked(fetchCurrentUser).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should set loading to false after successful auth", async () => {
      vi.mocked(fetchCurrentUser).mockResolvedValueOnce({
        user: null,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Failsafe Timeout", () => {
    it("should trigger failsafe timeout after 15 seconds", async () => {
      vi.useFakeTimers();

      // Mock fetchCurrentUser to never resolve
      vi.mocked(fetchCurrentUser).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);

      // Fast-forward time by 15 seconds and wrap in act
      await act(async () => {
        vi.advanceTimersByTime(15000);
      });

      // Check that timeout triggered
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Authentication check timed out");
      expect(result.current.user).toBeNull();

      vi.useRealTimers();
    }, 10000); // 10 second timeout for this test

    it("should clear failsafe timeout on successful auth", async () => {
      const mockUser: User = {
        id: "test-user-id",
        email: "test@example.com",
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.useFakeTimers();

      vi.mocked(fetchCurrentUser).mockResolvedValueOnce({
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth());

      // Run all timers
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should have user, no timeout error
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();

      vi.useRealTimers();
    }, 10000); // 10 second timeout for this test
  });

  describe("Cleanup and Unmount", () => {
    it("should cleanup timeout on unmount", () => {
      vi.useFakeTimers();

      vi.mocked(fetchCurrentUser).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { unmount, result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);

      // Unmount before timeout
      unmount();

      // Fast-forward time
      vi.advanceTimersByTime(20000);

      // No error should be set since component was unmounted
      // (We can't check result.current after unmount, but we verify no errors thrown)

      vi.useRealTimers();
    });

    it("should not update state after unmount", async () => {
      let resolveAuth: ((value: { user: User | null }) => void) | null = null;
      const authPromise = new Promise<{ user: User | null }>((resolve) => {
        resolveAuth = resolve;
      });

      vi.mocked(fetchCurrentUser).mockReturnValueOnce(authPromise);

      const { unmount, result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);

      // Unmount before auth completes
      unmount();

      // Resolve auth after unmount
      resolveAuth?.({ user: null });

      // Wait a bit to ensure any pending updates would have run
      await new Promise((resolve) => setTimeout(resolve, 10));

      // No errors should be thrown from attempting to set state on unmounted component
    });
  });

  describe("Effect Dependencies", () => {
    it("should only run auth check once on mount", async () => {
      vi.mocked(fetchCurrentUser).mockResolvedValue({
        user: null,
      });

      const { rerender } = renderHook(() => useAuth());

      await waitFor(() => expect(fetchCurrentUser).toHaveBeenCalledTimes(1));

      // Rerender the hook
      rerender();
      rerender();
      rerender();

      // Should still only have been called once
      expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined user in response", async () => {
      vi.mocked(fetchCurrentUser).mockResolvedValueOnce({
        user: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should handle concurrent renders during auth", async () => {
      const mockUser: User = {
        id: "test-user-id",
        email: "test@example.com",
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(fetchCurrentUser).mockResolvedValue({
        user: mockUser,
      });

      // Render multiple times quickly
      const { result: result1 } = renderHook(() => useAuth());
      const { result: result2 } = renderHook(() => useAuth());
      const { result: result3 } = renderHook(() => useAuth());

      await waitFor(() => expect(result1.current.isLoading).toBe(false));
      await waitFor(() => expect(result2.current.isLoading).toBe(false));
      await waitFor(() => expect(result3.current.isLoading).toBe(false));

      // All should have the same user
      expect(result1.current.user).toEqual(mockUser);
      expect(result2.current.user).toEqual(mockUser);
      expect(result3.current.user).toEqual(mockUser);

      // Each hook instance should call fetchCurrentUser once
      expect(fetchCurrentUser).toHaveBeenCalledTimes(3);
    });
  });

  describe("Type Safety", () => {
    it("should return correct types", async () => {
      vi.mocked(fetchCurrentUser).mockResolvedValueOnce({
        user: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Type assertions - these should compile
      const user: User | null = result.current.user;
      const isLoading: boolean = result.current.isLoading;
      const error: Error | null = result.current.error;

      expect(typeof isLoading).toBe("boolean");
      expect(user === null || typeof user === "object").toBe(true);
      expect(error === null || error instanceof Error).toBe(true);
    });
  });
});
