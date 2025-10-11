import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { useInbox } from "../use-inbox";
import { apiClient } from "../../lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
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

describe("useInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // default fetch mock via vitest.setup.ts replaces global.fetch for list/stats endpoints
  });

  it("fetches inbox items and stats", async () => {
    // fetch() is globally mocked to return {} in vitest.setup.ts; override for this test
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [{ id: "i1", userId: "", rawText: "x", status: "unprocessed", createdTaskId: null, processedAt: null, createdAt: new Date(), updatedAt: new Date() }], total: 1 }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stats: { unprocessed: 1, processed: 0, archived: 0, total: 1 } }),
      } as any);

    const { result } = renderHook(() => useInbox(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.isLoadingStats).toBe(false));

    expect(result.current.items.length).toBe(1);
    expect(result.current.stats?.total).toBe(1);
  });

  it("quickCapture performs optimistic update and rolls back on error", async () => {
    // list and stats initial fetch
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) } as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ stats: { unprocessed: 0, processed: 0, archived: 0, total: 0 } }) } as any);

    // cause mutation post to reject to test rollback
    mockApi.post.mockRejectedValueOnce(new Error("Network"));

    const { result } = renderHook(() => useInbox(), { wrapper: createWrapper() });

    await waitFor(() => !result.current.isLoading);

    const beforeCount = result.current.items.length;

    await act(async () => {
      await result.current.quickCapture({ rawText: "Buy milk" });
    });

    // Since the mutation failed, optimistic item should be rolled back
    expect(result.current.items.length).toBe(beforeCount);
  });

  it("processItem calls API client and returns result", async () => {
    // initial
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) } as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ stats: { unprocessed: 0, processed: 0, archived: 0, total: 0 } }) } as any);

    mockApi.post.mockResolvedValueOnce({ result: { createdTaskId: "t1", actions: [], status: "processed" } });

    const { result } = renderHook(() => useInbox(), { wrapper: createWrapper() });

    await waitFor(() => !result.current.isLoading);

    const out = await result.current.processItem({ itemId: "i1", action: "create_task" } as any);
    expect(out.createdTaskId).toBe("t1");
  });
});