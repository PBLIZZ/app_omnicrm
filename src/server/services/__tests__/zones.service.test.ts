import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listZonesService,
  getZoneByIdService,
  getZoneByNameService,
  createZoneService,
  updateZoneService,
  deleteZoneService,
  getZonesWithStatsService,
} from "../zones.service";
import { createZonesRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { AppError } from "@/lib/errors/app-error";

// Mock dependencies
vi.mock("@repo");
vi.mock("@/server/db/client");

describe("ZonesService", () => {
  let mockDb: any;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {};
    mockRepo = {
      listZones: vi.fn(),
      getZoneById: vi.fn(),
      getZoneByName: vi.fn(),
      createZone: vi.fn(),
      updateZone: vi.fn(),
      deleteZone: vi.fn(),
      getZonesWithStats: vi.fn(),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(createZonesRepository).mockReturnValue(mockRepo);
  });

  describe("listZonesService", () => {
    it("should return list of zones", async () => {
      const mockZones = [
        { id: 1, name: "Work", color: "#3b82f6", createdAt: new Date() },
        { id: 2, name: "Personal", color: "#10b981", createdAt: new Date() },
      ];

      mockRepo.listZones.mockResolvedValue(mockZones);

      const result = await listZonesService();

      expect(result).toEqual(mockZones);
      expect(createZonesRepository).toHaveBeenCalledWith(mockDb);
      expect(mockRepo.listZones).toHaveBeenCalledTimes(1);
    });

    it("should handle database errors", async () => {
      mockRepo.listZones.mockRejectedValue(new Error("Database error"));

      await expect(listZonesService()).rejects.toThrow(AppError);
    });
  });

  describe("getZoneByIdService", () => {
    it("should return zone when found", async () => {
      const mockZone = { id: 1, name: "Work", color: "#3b82f6", createdAt: new Date() };
      mockRepo.getZoneById.mockResolvedValue(mockZone);

      const result = await getZoneByIdService(1);

      expect(result).toEqual(mockZone);
      expect(mockRepo.getZoneById).toHaveBeenCalledWith(1);
    });

    it("should return null when zone not found", async () => {
      mockRepo.getZoneById.mockResolvedValue(null);

      const result = await getZoneByIdService(999);

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      mockRepo.getZoneById.mockRejectedValue(new Error("Database error"));

      await expect(getZoneByIdService(1)).rejects.toThrow(AppError);
    });
  });

  describe("getZoneByNameService", () => {
    it("should return zone when found by name", async () => {
      const mockZone = { id: 1, name: "Work", color: "#3b82f6", createdAt: new Date() };
      mockRepo.getZoneByName.mockResolvedValue(mockZone);

      const result = await getZoneByNameService("Work");

      expect(result).toEqual(mockZone);
      expect(mockRepo.getZoneByName).toHaveBeenCalledWith("Work");
    });

    it("should return null when zone not found by name", async () => {
      mockRepo.getZoneByName.mockResolvedValue(null);

      const result = await getZoneByNameService("NonExistent");

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      mockRepo.getZoneByName.mockRejectedValue(new Error("Database error"));

      await expect(getZoneByNameService("Work")).rejects.toThrow(AppError);
    });
  });

  describe("createZoneService", () => {
    it("should create a new zone", async () => {
      const zoneData = { name: "New Zone", color: "#ef4444" };
      const mockCreatedZone = { id: 3, ...zoneData, createdAt: new Date() };

      mockRepo.createZone.mockResolvedValue(mockCreatedZone);

      const result = await createZoneService(zoneData);

      expect(result).toEqual(mockCreatedZone);
      expect(mockRepo.createZone).toHaveBeenCalledWith(zoneData);
    });

    it("should handle database errors", async () => {
      const zoneData = { name: "New Zone", color: "#ef4444" };
      mockRepo.createZone.mockRejectedValue(new Error("Database error"));

      await expect(createZoneService(zoneData)).rejects.toThrow(AppError);
    });
  });

  describe("updateZoneService", () => {
    it("should update an existing zone", async () => {
      const updateData = { name: "Updated Zone", color: "#8b5cf6" };
      const mockUpdatedZone = { id: 1, ...updateData, createdAt: new Date() };

      mockRepo.updateZone.mockResolvedValue(mockUpdatedZone);

      const result = await updateZoneService(1, updateData);

      expect(result).toEqual(mockUpdatedZone);
      expect(mockRepo.updateZone).toHaveBeenCalledWith(1, updateData);
    });

    it("should return null when zone not found for update", async () => {
      const updateData = { name: "Updated Zone" };
      mockRepo.updateZone.mockResolvedValue(null);

      const result = await updateZoneService(999, updateData);

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      const updateData = { name: "Updated Zone" };
      mockRepo.updateZone.mockRejectedValue(new Error("Database error"));

      await expect(updateZoneService(1, updateData)).rejects.toThrow(AppError);
    });
  });

  describe("deleteZoneService", () => {
    it("should delete an existing zone", async () => {
      mockRepo.deleteZone.mockResolvedValue(true);

      await deleteZoneService(1);

      expect(mockRepo.deleteZone).toHaveBeenCalledWith(1);
    });

    it("should throw error when zone not found for deletion", async () => {
      mockRepo.deleteZone.mockResolvedValue(false);

      await expect(deleteZoneService(999)).rejects.toThrow(AppError);
      expect(mockRepo.deleteZone).toHaveBeenCalledWith(999);
    });

    it("should handle database errors", async () => {
      mockRepo.deleteZone.mockRejectedValue(new Error("Database error"));

      await expect(deleteZoneService(1)).rejects.toThrow(AppError);
    });
  });

  describe("getZonesWithStatsService", () => {
    it("should return zones with usage statistics", async () => {
      const mockZonesWithStats = [
        {
          id: 1,
          name: "Work",
          color: "#3b82f6",
          createdAt: new Date(),
          projectCount: 5,
          taskCount: 12,
          activeTaskCount: 8,
        },
        {
          id: 2,
          name: "Personal",
          color: "#10b981",
          createdAt: new Date(),
          projectCount: 2,
          taskCount: 6,
          activeTaskCount: 3,
        },
      ];

      mockRepo.getZonesWithStats.mockResolvedValue(mockZonesWithStats);

      const result = await getZonesWithStatsService();

      expect(result).toEqual(mockZonesWithStats);
      expect(mockRepo.getZonesWithStats).toHaveBeenCalledTimes(1);
    });

    it("should handle database errors", async () => {
      mockRepo.getZonesWithStats.mockRejectedValue(new Error("Database error"));

      await expect(getZonesWithStatsService()).rejects.toThrow(AppError);
    });
  });
});
