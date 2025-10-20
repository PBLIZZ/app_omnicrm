import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getSystemHealthService,
  isDatabaseConfiguredService,
  getSystemInfoService,
} from "../health.service";
import { createHealthRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { AppError } from "@/lib/errors/app-error";

// Mock dependencies
vi.mock("@repo");
vi.mock("@/server/db/client");

describe("HealthService", () => {
  let mockDb: any;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {};
    mockRepo = {
      pingDatabase: vi.fn(),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(createHealthRepository).mockReturnValue(mockRepo);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSystemHealthService", () => {
    it("should return healthy status when database is accessible", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      mockRepo.pingDatabase.mockResolvedValue(undefined);

      const result = await getSystemHealthService();

      expect(result).toEqual({
        ts: expect.any(String),
        db: true,
      });
      expect(createHealthRepository).toHaveBeenCalledWith(mockDb);
      expect(mockRepo.pingDatabase).toHaveBeenCalledTimes(1);
    });

    it("should return unhealthy status when database is not configured", async () => {
      delete process.env.DATABASE_URL;

      const result = await getSystemHealthService();

      expect(result).toEqual({
        ts: expect.any(String),
        db: false,
      });
    });

    it("should return unhealthy status when database ping fails", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      mockRepo.pingDatabase.mockRejectedValue(new Error("Connection failed"));

      await expect(getSystemHealthService()).rejects.toThrow(AppError);
    });

    it("should handle database ping timeout", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

      // Mock a slow ping that will timeout
      mockRepo.pingDatabase.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      await expect(getSystemHealthService()).rejects.toThrow(AppError);
    });

    it("should handle database connection errors", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      vi.mocked(getDb).mockRejectedValue(new Error("Connection failed"));

      await expect(getSystemHealthService()).rejects.toThrow(AppError);
    });
  });

  describe("isDatabaseConfiguredService", () => {
    it("should return true when DATABASE_URL is set", () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

      expect(isDatabaseConfiguredService()).toBe(true);
    });

    it("should return false when DATABASE_URL is not set", () => {
      delete process.env.DATABASE_URL;

      expect(isDatabaseConfiguredService()).toBe(false);
    });

    it("should return false when DATABASE_URL is empty", () => {
      process.env.DATABASE_URL = "";

      expect(isDatabaseConfiguredService()).toBe(false);
    });
  });

  describe("getSystemInfoService", () => {
    it("should return system information with timestamp and environment", () => {
      process.env.NODE_ENV = "test";

      const result = getSystemInfoService();

      expect(result).toEqual({
        timestamp: expect.any(String),
        env: "test",
      });
    });

    it("should default to development when NODE_ENV is not set", () => {
      delete process.env.NODE_ENV;

      const result = getSystemInfoService();

      expect(result).toEqual({
        timestamp: expect.any(String),
        env: "development",
      });
    });

    it("should return valid ISO timestamp", () => {
      const result = getSystemInfoService();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });
});
