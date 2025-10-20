import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { useEnhancedContacts, useContactsuggestions } from "../use-contacts";
import { apiClient } from "../../lib/api/client";

// Mock the API client
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useContacts hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useEnhancedContacts", () => {
    it("should fetch omni clients without search query", async () => {
      const mockResponse = {
        items: [
          {
            id: "client-1",
            displayName: "John Doe",
            primaryEmail: "john@example.com",
            lastNote: "Recent interaction",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEnhancedContacts(""), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/contacts?page=1&pageSize=25");
      expect(result.current.data).toEqual({
        items: mockResponse.items,
        total: mockResponse.pagination.total,
      });
    });

    it("should fetch omni clients with search query", async () => {
      const mockResponse = {
        items: [
          {
            id: "client-1",
            displayName: "John Doe",
            primaryEmail: "john@example.com",
            lastNote: null,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEnhancedContacts("john"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/contacts?page=1&pageSize=25&search=john",
      );
      expect(result.current.data).toEqual({
        items: mockResponse.items,
        total: mockResponse.pagination.total,
      });
    });

    it("should trim search query before making request", async () => {
      const mockResponse = {
        items: [],
        pagination: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEnhancedContacts("  jane  "), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/contacts?page=1&pageSize=25&search=jane",
      );
    });

    it("should handle empty search results", async () => {
      const mockResponse = {
        items: [],
        pagination: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEnhancedContacts("nonexistent"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        items: [],
        total: 0,
      });
    });

    it("should handle API errors", async () => {
      const mockError = new Error("API Error");
      mockApiClient.get.mockRejectedValue(mockError);

      const { result } = renderHook(() => useEnhancedContacts("test"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe("useContactsuggestions", () => {
    it("should fetch suggestions when enabled", async () => {
      const mockResponse = {
        suggestions: [
          {
            id: "suggestion-1",
            displayName: "Suggested Client",
            primaryEmail: "suggested@example.com",
            confidence: 0.8,
          },
        ],
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useContactsuggestions(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/contacts/suggestions");
      expect(result.current.data).toEqual(mockResponse.suggestions);
    });

    it("should not fetch suggestions when disabled", () => {
      const { result } = renderHook(() => useContactsuggestions(false), {
        wrapper: createWrapper(),
      });

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it("should handle suggestions API errors", async () => {
      const mockError = new Error("Suggestions API Error");
      mockApiClient.get.mockRejectedValue(mockError);

      const { result } = renderHook(() => useContactsuggestions(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it("should handle empty suggestions response", async () => {
      const mockResponse = { suggestions: [] };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useContactsuggestions(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });
});
