/**
 * Zone Utilities Tests
 *
 * Comprehensive tests for zone utility functions.
 * Tests color utilities, filtering, sorting, validation, and statistics.
 */

import { describe, it, expect } from "vitest";
import type { Zone } from "@/server/db/business-schemas";
import {
  getZoneColor,
  getZoneIcon,
  getZoneById,
  getZoneByName,
  isValidZoneName,
  isValidHexColor,
  isValidIconName,
  filterZonesBySearch,
  filterZonesByCategory,
  sortZonesByName,
  generateRandomZoneColor,
  getContrastingTextColor,
  lightenColor,
  darkenColor,
  validateZoneData,
  sanitizeZoneData,
  getZoneUsageStats,
  getMostUsedZones,
  getLeastUsedZones,
  DEFAULT_ZONE_COLORS,
  ZONE_ICONS,
} from "../zone-utils";

describe("Zone Utilities", () => {
  const mockZones: Zone[] = [
    {
      uuidId: "zone-1",
      name: "Personal Wellness",
      color: "#6366F1",
      iconName: "heart",
      userId: "user-123",
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      uuidId: "zone-2",
      name: "Business Development",
      color: "#F97316",
      iconName: "briefcase",
      userId: "user-123",
      id: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      uuidId: "zone-3",
      name: "Client Care",
      color: "#06B6D4",
      iconName: "users",
      userId: "user-123",
      id: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe("getZoneColor", () => {
    it("should return zone color by name", () => {
      const color = getZoneColor(mockZones, "Personal Wellness");
      expect(color).toBe("#6366F1");
    });

    it("should return default color when zone not found", () => {
      const color = getZoneColor(mockZones, "Non-existent");
      expect(color).toBe("#6366F1");
    });
  });

  describe("getZoneIcon", () => {
    it("should return zone icon by name", () => {
      const icon = getZoneIcon(mockZones, "Business Development");
      expect(icon).toBe("briefcase");
    });

    it("should return default icon when zone not found", () => {
      const icon = getZoneIcon(mockZones, "Non-existent");
      expect(icon).toBe("circle");
    });
  });

  describe("getZoneById", () => {
    it("should return zone by UUID", () => {
      const zone = getZoneById(mockZones, "zone-1");
      expect(zone?.name).toBe("Personal Wellness");
    });

    it("should return null when zone not found", () => {
      const zone = getZoneById(mockZones, "non-existent");
      expect(zone).toBeNull();
    });
  });

  describe("getZoneByName", () => {
    it("should return zone by name", () => {
      const zone = getZoneByName(mockZones, "Client Care");
      expect(zone?.uuidId).toBe("zone-3");
    });

    it("should return null when zone not found", () => {
      const zone = getZoneByName(mockZones, "Non-existent");
      expect(zone).toBeNull();
    });
  });

  describe("isValidZoneName", () => {
    it("should validate correct zone names", () => {
      expect(isValidZoneName("Personal Wellness")).toBe(true);
      expect(isValidZoneName("A")).toBe(true);
    });

    it("should reject empty zone names", () => {
      expect(isValidZoneName("")).toBe(false);
      expect(isValidZoneName("   ")).toBe(false);
    });

    it("should reject zone names over 100 characters", () => {
      const longName = "A".repeat(101);
      expect(isValidZoneName(longName)).toBe(false);
    });

    it("should accept zone names at boundary (100 chars)", () => {
      const boundaryName = "A".repeat(100);
      expect(isValidZoneName(boundaryName)).toBe(true);
    });
  });

  describe("isValidHexColor", () => {
    it("should validate correct hex colors", () => {
      expect(isValidHexColor("#6366F1")).toBe(true);
      expect(isValidHexColor("#000000")).toBe(true);
      expect(isValidHexColor("#FFFFFF")).toBe(true);
      expect(isValidHexColor("#abc123")).toBe(true);
    });

    it("should reject invalid hex colors", () => {
      expect(isValidHexColor("6366F1")).toBe(false); // Missing #
      expect(isValidHexColor("#6366F")).toBe(false); // Too short
      expect(isValidHexColor("#6366F1A")).toBe(false); // Too long
      expect(isValidHexColor("#GGGGGG")).toBe(false); // Invalid chars
      expect(isValidHexColor("red")).toBe(false); // Named color
    });
  });

  describe("isValidIconName", () => {
    it("should validate correct icon names", () => {
      expect(isValidIconName("circle")).toBe(true);
      expect(isValidIconName("heart")).toBe(true);
      expect(isValidIconName("briefcase")).toBe(true);
    });

    it("should reject invalid icon names", () => {
      expect(isValidIconName("invalid-icon")).toBe(false);
      expect(isValidIconName("")).toBe(false);
    });
  });

  describe("filterZonesBySearch", () => {
    it("should filter zones by name", () => {
      const result = filterZonesBySearch(mockZones, "Business");
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Business Development");
    });

    it("should be case insensitive", () => {
      const result = filterZonesBySearch(mockZones, "business");
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Business Development");
    });

    it("should filter by icon name", () => {
      const result = filterZonesBySearch(mockZones, "heart");
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Personal Wellness");
    });

    it("should return all zones for empty search", () => {
      const result = filterZonesBySearch(mockZones, "");
      expect(result).toHaveLength(3);
    });

    it("should return empty array when no matches", () => {
      const result = filterZonesBySearch(mockZones, "NonExistent");
      expect(result).toHaveLength(0);
    });
  });

  describe("filterZonesByCategory", () => {
    it("should return all zones for 'all' category", () => {
      const result = filterZonesByCategory(mockZones, "all");
      expect(result).toHaveLength(3);
    });

    it("should filter zones by category name", () => {
      const result = filterZonesByCategory(mockZones, "Personal");
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toContain("Personal");
    });

    it("should be case insensitive", () => {
      const result = filterZonesByCategory(mockZones, "business");
      expect(result).toHaveLength(1);
    });
  });

  describe("sortZonesByName", () => {
    it("should sort zones ascending by default", () => {
      const result = sortZonesByName(mockZones);
      expect(result[0]?.name).toBe("Business Development");
      expect(result[1]?.name).toBe("Client Care");
      expect(result[2]?.name).toBe("Personal Wellness");
    });

    it("should sort zones descending", () => {
      const result = sortZonesByName(mockZones, "desc");
      expect(result[0]?.name).toBe("Personal Wellness");
      expect(result[1]?.name).toBe("Client Care");
      expect(result[2]?.name).toBe("Business Development");
    });

    it("should not mutate original array", () => {
      const original = [...mockZones];
      sortZonesByName(mockZones);
      expect(mockZones).toEqual(original);
    });
  });

  describe("generateRandomZoneColor", () => {
    it("should return a valid hex color", () => {
      const color = generateRandomZoneColor();
      expect(isValidHexColor(color)).toBe(true);
    });

    it("should return a color from DEFAULT_ZONE_COLORS", () => {
      const color = generateRandomZoneColor();
      expect(DEFAULT_ZONE_COLORS).toContain(color as any);
    });
  });

  describe("getContrastingTextColor", () => {
    it("should return white for dark backgrounds", () => {
      expect(getContrastingTextColor("#000000")).toBe("#FFFFFF");
      expect(getContrastingTextColor("#333333")).toBe("#FFFFFF");
    });

    it("should return black for light backgrounds", () => {
      expect(getContrastingTextColor("#FFFFFF")).toBe("#000000");
      expect(getContrastingTextColor("#FFFF00")).toBe("#000000");
    });

    it("should handle colors without # prefix", () => {
      expect(getContrastingTextColor("000000")).toBe("#FFFFFF");
      expect(getContrastingTextColor("FFFFFF")).toBe("#000000");
    });
  });

  describe("lightenColor", () => {
    it("should lighten a color by percentage", () => {
      const original = "#6366F1";
      const lightened = lightenColor(original, 20);
      expect(lightened).not.toBe(original);
      expect(isValidHexColor(lightened)).toBe(true);
    });

    it("should return white for 100% lightening", () => {
      const result = lightenColor("#000000", 100);
      expect(result).toBe("#ffffff");
    });

    it("should not exceed #FFFFFF", () => {
      const result = lightenColor("#EEEEEE", 50);
      expect(isValidHexColor(result)).toBe(true);
    });
  });

  describe("darkenColor", () => {
    it("should darken a color by percentage", () => {
      const original = "#6366F1";
      const darkened = darkenColor(original, 20);
      expect(darkened).not.toBe(original);
      expect(isValidHexColor(darkened)).toBe(true);
    });

    it("should return black for 100% darkening", () => {
      const result = darkenColor("#FFFFFF", 100);
      expect(result).toBe("#000000");
    });

    it("should not go below #000000", () => {
      const result = darkenColor("#111111", 50);
      expect(isValidHexColor(result)).toBe(true);
    });
  });

  describe("validateZoneData", () => {
    it("should validate correct zone data", () => {
      const data = {
        name: "Test Zone",
        color: "#6366F1",
        iconName: "circle",
      };
      const result = validateZoneData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid zone name", () => {
      const data = {
        name: "",
        color: "#6366F1",
        iconName: "circle",
      };
      const result = validateZoneData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Zone name must be between 1 and 100 characters"
      );
    });

    it("should reject invalid color", () => {
      const data = {
        name: "Test Zone",
        color: "invalid",
        iconName: "circle",
      };
      const result = validateZoneData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("hex color"))).toBe(true);
    });

    it("should reject invalid icon name", () => {
      const data = {
        name: "Test Zone",
        color: "#6366F1",
        iconName: "invalid-icon",
      };
      const result = validateZoneData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("icon"))).toBe(true);
    });

    it("should allow optional color and iconName", () => {
      const data = {
        name: "Test Zone",
      };
      const result = validateZoneData(data);
      expect(result.isValid).toBe(true);
    });
  });

  describe("sanitizeZoneData", () => {
    it("should sanitize valid zone data", () => {
      const data = {
        name: "  Test Zone  ",
        color: "#6366F1",
        iconName: "circle",
      };
      const result = sanitizeZoneData(data);
      expect(result.name).toBe("Test Zone");
      expect(result.color).toBe("#6366F1");
      expect(result.iconName).toBe("circle");
    });

    it("should use defaults for invalid color", () => {
      const data = {
        name: "Test Zone",
        color: "invalid",
      };
      const result = sanitizeZoneData(data);
      expect(result.color).toBe("#6366F1");
    });

    it("should use defaults for invalid icon", () => {
      const data = {
        name: "Test Zone",
        iconName: "invalid",
      };
      const result = sanitizeZoneData(data);
      expect(result.iconName).toBe("circle");
    });

    it("should trim whitespace from name", () => {
      const data = {
        name: "   Spaced Out   ",
      };
      const result = sanitizeZoneData(data);
      expect(result.name).toBe("Spaced Out");
    });
  });

  describe("getZoneUsageStats", () => {
    it("should calculate zone usage statistics", () => {
      const tasks = [
        { zoneUuid: "zone-1", status: "done" },
        { zoneUuid: "zone-1", status: "done" },
        { zoneUuid: "zone-1", status: "todo" },
        { zoneUuid: "zone-2", status: "todo" },
      ];

      const result = getZoneUsageStats(mockZones, tasks);

      expect(result).toHaveLength(3);
      expect(result[0]?.taskCount).toBe(3);
      expect(result[0]?.completedTaskCount).toBe(2);
      expect(result[0]?.progressPercentage).toBeCloseTo(66.67, 1);
      expect(result[1]?.taskCount).toBe(1);
      expect(result[1]?.completedTaskCount).toBe(0);
      expect(result[2]?.taskCount).toBe(0);
    });

    it("should handle zones with no tasks", () => {
      const tasks: Array<{ zoneUuid: string | null; status: string }> = [];
      const result = getZoneUsageStats(mockZones, tasks);

      expect(result).toHaveLength(3);
      result.forEach((stat) => {
        expect(stat.taskCount).toBe(0);
        expect(stat.completedTaskCount).toBe(0);
        expect(stat.progressPercentage).toBe(0);
      });
    });
  });

  describe("getMostUsedZones", () => {
    it("should return most used zones", () => {
      const tasks = [
        { zoneUuid: "zone-1", status: "done" },
        { zoneUuid: "zone-1", status: "done" },
        { zoneUuid: "zone-1", status: "todo" },
        { zoneUuid: "zone-2", status: "todo" },
      ];

      const result = getMostUsedZones(mockZones, tasks, 2);

      expect(result).toHaveLength(2);
      expect(result[0]?.uuidId).toBe("zone-1");
      expect(result[1]?.uuidId).toBe("zone-2");
    });

    it("should respect limit parameter", () => {
      const tasks = [
        { zoneUuid: "zone-1", status: "done" },
        { zoneUuid: "zone-2", status: "todo" },
        { zoneUuid: "zone-3", status: "todo" },
      ];

      const result = getMostUsedZones(mockZones, tasks, 1);

      expect(result).toHaveLength(1);
    });

    it("should default to limit of 5", () => {
      const tasks = mockZones.map((zone) => ({
        zoneUuid: zone.uuidId,
        status: "todo",
      }));

      const result = getMostUsedZones(mockZones, tasks);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getLeastUsedZones", () => {
    it("should return least used zones", () => {
      const tasks = [
        { zoneUuid: "zone-1", status: "done" },
        { zoneUuid: "zone-1", status: "done" },
        { zoneUuid: "zone-1", status: "todo" },
        { zoneUuid: "zone-2", status: "todo" },
      ];

      const result = getLeastUsedZones(mockZones, tasks, 2);

      expect(result).toHaveLength(2);
      expect(result[0]?.uuidId).toBe("zone-3"); // Zero tasks
      expect(result[1]?.uuidId).toBe("zone-2"); // One task
    });

    it("should respect limit parameter", () => {
      const tasks = [{ zoneUuid: "zone-1", status: "done" }];

      const result = getLeastUsedZones(mockZones, tasks, 1);

      expect(result).toHaveLength(1);
    });
  });

  describe("Constants", () => {
    it("should export DEFAULT_ZONE_COLORS", () => {
      expect(DEFAULT_ZONE_COLORS).toBeDefined();
      expect(DEFAULT_ZONE_COLORS.length).toBeGreaterThan(0);
      DEFAULT_ZONE_COLORS.forEach((color) => {
        expect(isValidHexColor(color)).toBe(true);
      });
    });

    it("should export ZONE_ICONS", () => {
      expect(ZONE_ICONS).toBeDefined();
      expect(ZONE_ICONS.length).toBeGreaterThan(0);
      expect(ZONE_ICONS).toContain("circle");
      expect(ZONE_ICONS).toContain("heart");
    });
  });
});