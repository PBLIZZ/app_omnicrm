import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNotesInfinite } from "../use-notes-infinite";
import { apiClient } from "@/lib/api/client";
import React from "react";

// Mock the API client
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe("useNotesInfinite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch first page of notes", async () => {
    const mockResponse = {
      notes: [
        {
          id: "note-1",
          userId: "user-1",
          contactId: "contact-1",
          contentPlain: "Test note 1",
          contentRich: {},
          // tags: ["tag1"], // Tags field removed - now using relational tagging system
          piiEntities: [],
          sourceType: "typed" as const,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useNotesInfinite({ contactId: "contact-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]).toEqual(mockResponse);
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/notes/paginated?contactId=contact-1&page=1&pageSize=10",
    );
  });

  it("should use custom pageSize when provided", async () => {
    const mockResponse = {
      notes: [],
      pagination: {
        page: 1,
        pageSize: 5,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    renderHook(() => useNotesInfinite({ contactId: "contact-1", pageSize: 5 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        "/api/notes/paginated?contactId=contact-1&page=1&pageSize=5",
      );
    });
  });

  it("should not fetch when contactId is empty", () => {
    const { result } = renderHook(() => useNotesInfinite({ contactId: "" }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("should handle fetchNextPage correctly", async () => {
    const firstPageResponse = {
      notes: [{ id: "note-1", contentPlain: "Note 1" }],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    };

    const secondPageResponse = {
      notes: [{ id: "note-2", contentPlain: "Note 2" }],
      pagination: {
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      },
    };

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(firstPageResponse)
      .mockResolvedValueOnce(secondPageResponse);

    const { result } = renderHook(() => useNotesInfinite({ contactId: "contact-1" }), {
      wrapper: createWrapper(),
    });

    // Wait for first page to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.pages).toHaveLength(1);

    // Fetch next page
    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });

    expect(result.current.data?.pages[0]).toEqual(firstPageResponse);
    expect(result.current.data?.pages[1]).toEqual(secondPageResponse);
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it("should handle errors correctly", async () => {
    const error = new Error("API Error");
    vi.mocked(apiClient.get).mockRejectedValue(error);

    const { result } = renderHook(() => useNotesInfinite({ contactId: "contact-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it("should determine hasNextPage correctly", async () => {
    const responseWithNext = {
      notes: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    };

    vi.mocked(apiClient.get).mockResolvedValue(responseWithNext);

    const { result } = renderHook(() => useNotesInfinite({ contactId: "contact-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(true);
  });

  it("should determine hasNextPage as false when no more pages", async () => {
    const responseWithoutNext = {
      notes: [],
      pagination: {
        page: 3,
        pageSize: 10,
        total: 25,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      },
    };

    vi.mocked(apiClient.get).mockResolvedValue(responseWithoutNext);

    const { result } = renderHook(() => useNotesInfinite({ contactId: "contact-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(false);
  });
});
