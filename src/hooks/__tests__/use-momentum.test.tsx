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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
      .mockResolvedValueOnce({ success: true, data: [{ id: "p1", name: "Proj" }] }) // projects
      .mockResolvedValueOnce({ success: true, data: [{ id: "t1", name: "Task" }] }) // tasks
      .mockResolvedValueOnce({ success: true, data: [{ id: "t2", name: "Pending" }] }) // pending
      .mockResolvedValueOnce({ success: true, data: { total: 2, todo: 1, inProgress: 1, completed: 0, pendingApproval: 1 } }); // stats

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

  it("propagates API errors when Result is Err", async () => {
    mockApi.get.mockResolvedValueOnce({ success: false, error: { message: "oops", code: "X" } });

    const { result } = renderHook(() => useMomentum(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.projectsError).toBeTruthy());
    expect(String(result.current.projectsError)).toContain("oops");
  });
});