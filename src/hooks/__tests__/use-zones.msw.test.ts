/**
 * Zones Hooks Tests (using MSW)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import {
  useZones,
  useZonesWithStats,
  useZoneByName,
  useZoneById,
  useZoneOptions,
  isValidWellnessZone,
  getZoneColor,
  getZoneIcon,
  WELLNESS_ZONES,
} from "../use-zones";

describe("useZones (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches zones without stats", async () => {
    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zones).toHaveLength(3);
    expect(result.current.zones[0].name).toBe("Personal Wellness");
    expect(result.current.zones[0].color).toBe("#10b981");
    // Should not have stats
    expect(result.current.zones[0]).not.toHaveProperty("projectCount");
  });

  it("fetches zones with stats when requested", async () => {
    const { result } = renderHook(() => useZones({ withStats: true }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zones).toHaveLength(3);
    const firstZone = result.current.zones[0];
    expect(firstZone).toHaveProperty("projectCount");
    expect(firstZone).toHaveProperty("taskCount");
    expect(firstZone).toHaveProperty("activeTaskCount");
  });

  it("returns empty array while loading", () => {
    const { result } = renderHook(() => useZones(), { wrapper });

    expect(result.current.zones).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("provides refetch function", async () => {
    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.refetch).toBe("function");

    // Refetch should work
    result.current.refetch();
    expect(result.current.zones).toHaveLength(3);
  });
});

describe("useZonesWithStats (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches zones with stats by default", async () => {
    const { result } = renderHook(() => useZonesWithStats(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zones).toHaveLength(3);
    const firstZone = result.current.zones[0];
    
    // Should have stats
    expect(firstZone).toHaveProperty("projectCount", 3);
    expect(firstZone).toHaveProperty("taskCount", 15);
    expect(firstZone).toHaveProperty("activeTaskCount", 8);
  });
});

describe("useZoneByName (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("finds zone by exact name", async () => {
    const { result } = renderHook(() => useZoneByName("Self Care"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zone).not.toBeNull();
    expect(result.current.zone?.name).toBe("Self Care");
    expect(result.current.zone?.color).toBe("#f59e0b");
  });

  it("returns null for non-existent zone", async () => {
    const { result } = renderHook(() => useZoneByName("Non Existent Zone"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zone).toBeNull();
  });

  it("is case-sensitive", async () => {
    const { result } = renderHook(() => useZoneByName("self care"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zone).toBeNull();
  });
});

describe("useZoneById (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("finds zone by ID", async () => {
    const { result } = renderHook(() => useZoneById(2), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zone).not.toBeNull();
    expect(result.current.zone?.id).toBe(2);
    expect(result.current.zone?.name).toBe("Self Care");
  });

  it("returns null for non-existent ID", async () => {
    const { result } = renderHook(() => useZoneById(999), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zone).toBeNull();
  });
});

describe("useZoneOptions (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("formats zones as select options", async () => {
    const { result } = renderHook(() => useZoneOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.options).toHaveLength(3);
    
    const firstOption = result.current.options[0];
    expect(firstOption).toEqual({
      value: "1",
      label: "Personal Wellness",
      color: "#10b981",
      icon: "heart",
    });
  });

  it("returns empty options while loading", () => {
    const { result } = renderHook(() => useZoneOptions(), { wrapper });

    expect(result.current.options).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});

describe("Zone Utility Functions", () => {
  describe("isValidWellnessZone", () => {
    it("returns true for valid wellness zones", () => {
      expect(isValidWellnessZone("Personal Wellness")).toBe(true);
      expect(isValidWellnessZone("Self Care")).toBe(true);
      expect(isValidWellnessZone("Client Care")).toBe(true);
      expect(isValidWellnessZone("Admin & Finances")).toBe(true);
      expect(isValidWellnessZone("Business Development")).toBe(true);
      expect(isValidWellnessZone("Social Media & Marketing")).toBe(true);
    });

    it("returns false for invalid zones", () => {
      expect(isValidWellnessZone("Invalid Zone")).toBe(false);
      expect(isValidWellnessZone("personal wellness")).toBe(false); // Case sensitive
      expect(isValidWellnessZone("")).toBe(false);
    });
  });

  describe("WELLNESS_ZONES constant", () => {
    it("contains all 6 wellness zones", () => {
      expect(WELLNESS_ZONES).toHaveLength(6);
      expect(WELLNESS_ZONES).toContain("Personal Wellness");
      expect(WELLNESS_ZONES).toContain("Self Care");
      expect(WELLNESS_ZONES).toContain("Admin & Finances");
      expect(WELLNESS_ZONES).toContain("Business Development");
      expect(WELLNESS_ZONES).toContain("Social Media & Marketing");
      expect(WELLNESS_ZONES).toContain("Client Care");
    });
  });

  describe("getZoneColor", () => {
    const mockZones = [
      { id: 1, name: "Test Zone", color: "#ff0000", iconName: "test" },
      { id: 2, name: "Another Zone", color: "#00ff00", iconName: "another" },
    ];

    it("returns color for existing zone", () => {
      expect(getZoneColor(mockZones, "Test Zone")).toBe("#ff0000");
      expect(getZoneColor(mockZones, "Another Zone")).toBe("#00ff00");
    });

    it("returns default color for non-existent zone", () => {
      expect(getZoneColor(mockZones, "Non Existent")).toBe("#6366f1");
    });

    it("returns default color for empty zones array", () => {
      expect(getZoneColor([], "Any Zone")).toBe("#6366f1");
    });
  });

  describe("getZoneIcon", () => {
    const mockZones = [
      { id: 1, name: "Test Zone", color: "#ff0000", iconName: "star" },
      { id: 2, name: "Another Zone", color: "#00ff00", iconName: "heart" },
    ];

    it("returns icon for existing zone", () => {
      expect(getZoneIcon(mockZones, "Test Zone")).toBe("star");
      expect(getZoneIcon(mockZones, "Another Zone")).toBe("heart");
    });

    it("returns default icon for non-existent zone", () => {
      expect(getZoneIcon(mockZones, "Non Existent")).toBe("circle");
    });

    it("returns default icon for empty zones array", () => {
      expect(getZoneIcon([], "Any Zone")).toBe("circle");
    });
  });
});
