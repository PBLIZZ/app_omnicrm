import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { useZones, useZonesWithStats, useZoneByName, useZoneById, useZoneOptions, WELLNESS_ZONES, isValidWellnessZone, getZoneColor, getZoneIcon } from "../use-zones";
import { apiClient } from "../../lib/api/client";

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
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useZones hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches zones without stats by default", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [{ id: 1, name: "Personal Wellness", color: "#111111", iconName: "heart" }], total: 1 } });
    const { result } = renderHook(() => useZones(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.zones).toHaveLength(1);
    expect(mockApiClient.get).toHaveBeenCalledWith("/api/omni-momentum/zones");
  });

  it("fetches zones with stats when withStats is true", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [{ id: 2, name: "Client Care", color: "#222222", iconName: "user", projectCount: 1, taskCount: 2, activeTaskCount: 1 }], total: 1 } });
    const { result } = renderHook(() => useZones({ withStats: true }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.zones[0]).toHaveProperty("projectCount");
    expect(mockApiClient.get).toHaveBeenCalledWith("/api/omni-momentum/zones?withStats=true");
  });

  it("exposes helper hooks", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [{ id: 3, name: "Self Care", color: "#333333", iconName: "star" }], total: 1 } });
    const { result: base } = renderHook(() => useZones(), { wrapper: createWrapper() });
    await waitFor(() => expect(base.current.isLoading).toBe(false));

    const { result: byName } = renderHook(() => useZoneByName("Self Care"), { wrapper: createWrapper() });
    const { result: byId } = renderHook(() => useZoneById(3), { wrapper: createWrapper() });
    const { result: options } = renderHook(() => useZoneOptions(), { wrapper: createWrapper() });

    expect(byName.current.zone?.name).toBe("Self Care");
    expect(byId.current.zone?.id).toBe(3);
    expect(options.current.options[0]).toMatchObject({ value: "3", label: "Self Care" });
  });

  it("WELLNESS_ZONES and validation utilities", () => {
    expect(WELLNESS_ZONES.length).toBeGreaterThan(0);
    expect(isValidWellnessZone(WELLNESS_ZONES[0])).toBe(true);
    expect(isValidWellnessZone("Unknown")).toBe(false);

    const zones = [{ id: 1, name: "Personal Wellness", color: "#abc", iconName: "heart" }];
    expect(getZoneColor(zones as any, "Personal Wellness")).toBe("#abc");
    expect(getZoneColor(zones as any, "X")).toBe("#6366f1");

    expect(getZoneIcon(zones as any, "Personal Wellness")).toBe("heart");
    expect(getZoneIcon(zones as any, "X")).toBe("circle");
  });
});