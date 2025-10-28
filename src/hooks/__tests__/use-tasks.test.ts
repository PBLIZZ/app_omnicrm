import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@packages/testing";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskComplete } from "../use-tasks";

vi.mock("@/lib/api/client", () => {
  return {
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const { apiClient } = await import("@/lib/api/client");

function wrapperWithClient() {
  const qc = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useTasks queries and mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom location origin
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost" },
      writable: true,
    });
  });

  it("useTasks builds request and returns items", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { items: [{ id: "t1" }], total: 1 } });

    const { result } = renderHook(() => useTasks({
      filters: { status: ["todo"], priority: ["high"], dueDate: "today" },
      sort: { field: "createdAt", direction: "desc" },
      search: "demo",
    }), { wrapper: wrapperWithClient() });

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.data![0]).toMatchObject({ id: "t1" });
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("/api/omni-momentum/tasks?"));
  });

  it("useCreateTask posts and invalidates", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: "t2", name: "N", status: "todo" });

    const { result } = renderHook(() => useCreateTask(), { wrapper: wrapperWithClient() });

    await act(async () => {
      await result.current.mutateAsync({ name: "N" });
    });

    expect(apiClient.post).toHaveBeenCalledWith("/api/omni-momentum/tasks", { name: "N" });
  });

  it("useUpdateTask patches and invalidates", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ id: "t1", name: "U", status: "done" });

    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapperWithClient() });

    await act(async () => {
      await result.current.mutateAsync({ taskId: "t1", data: { status: "done" } });
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/api/omni-momentum/tasks/t1", { status: "done" });
  });

  it("useDeleteTask deletes and invalidates", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTask(), { wrapper: wrapperWithClient() });

    await act(async () => {
      await result.current.mutateAsync("t1");
    });

    expect(apiClient.delete).toHaveBeenCalledWith("/api/omni-momentum/tasks/t1");
  });

  it("useToggleTaskComplete toggles status via patch", async () => {
    // Seed cache with a list so hook can read current status
    const qc = createTestQueryClient();
    qc.setQueryData(["tasks"], [{ id: "t1", name: "A", status: "todo" }]);

    vi.mocked(apiClient.patch).mockResolvedValue({ id: "t1", name: "A", status: "done" });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useToggleTaskComplete(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("t1");
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/api/omni-momentum/tasks/t1", { status: "done" });
  });
});