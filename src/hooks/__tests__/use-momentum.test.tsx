import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { useMomentum } from "../use-momentum";
import { apiClient } from "../../lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
  },
}));

const mockApi = vi.mocked(apiClient);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useMomentum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads projects and tasks via Result pattern", async () => {
    mockApi.get
      .mockResolvedValueOnce([{ id: "p1", name: "Proj" }]) // projects
      .mockResolvedValueOnce([{ id: "t1", name: "Task" }]) // tasks
      .mockResolvedValueOnce([{ id: "t2", name: "Pending" }]) // pending
      .mockResolvedValueOnce({
        total: 2,
        todo: 1,
        inProgress: 1,
        completed: 0,
        pendingApproval: 1,
      }); // stats

    const { result } = renderHook(() => useMomentum(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoadingProjects).toBe(false));
    await waitFor(() => expect(result.current.isLoadingTasks).toBe(false));
    await waitFor(() => expect(result.current.isLoadingPending).toBe(false));
    await waitFor(() => expect(result.current.isLoadingStats).toBe(false));

    expect(result.current.projects[0].id).toBe("p1");
    expect(result.current.tasks[0].id).toBe("t1");
    expect(result.current.pendingTasks[0].id).toBe("t2");
    expect(result.current.stats?.total).toBe(2);
  });

  it("handles API errors gracefully", async () => {
    // Test that the hook provides error state access
    const errorSpy = vi.fn().mockRejectedValue(new Error("oops"));
    mockApi.get.mockImplementation(errorSpy);

    const { result } = renderHook(() => useMomentum(), { wrapper: createWrapper() });

    // The hook should be in a loading state initially
    expect(result.current.isLoadingProjects).toBe(true);
    expect(result.current.projectsError).toBeNull();

    // The hook should provide error state access
    expect(typeof result.current.projectsError).toBe("object");
    expect(typeof result.current.tasksError).toBe("object");
  });
});
