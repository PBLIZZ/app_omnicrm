import { describe, it, expect, vi, beforeEach } from "vitest";
import { HealthRepository, createHealthRepository } from "../health.repo";
import type { DbClient } from "@/server/db/client";

describe("HealthRepository", () => {
  let mockDb: DbClient;
  let repo: HealthRepository;

  beforeEach(() => {
    mockDb = {
      execute: vi.fn(),
    } as any;
    repo = new HealthRepository(mockDb);
  });

  describe("pingDatabase", () => {
    it("should execute a simple select query", async () => {
      vi.mocked(mockDb.execute).mockResolvedValue([] as any);

      await repo.pingDatabase();

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(expect.anything());
    });

    it("should throw when database query fails", async () => {
      const dbError = new Error("Connection timeout");
      vi.mocked(mockDb.execute).mockRejectedValue(dbError);

      await expect(repo.pingDatabase()).rejects.toThrow("Connection timeout");
    });

    it("should propagate database errors", async () => {
      const dbError = new Error("Database is down");
      vi.mocked(mockDb.execute).mockRejectedValue(dbError);

      await expect(repo.pingDatabase()).rejects.toThrow(dbError);
    });

    it("should complete successfully with valid connection", async () => {
      vi.mocked(mockDb.execute).mockResolvedValue([{ "?column?": 1 }] as any);

      await expect(repo.pingDatabase()).resolves.toBeUndefined();
    });
  });

  describe("createHealthRepository", () => {
    it("should create a new HealthRepository instance", () => {
      const newRepo = createHealthRepository(mockDb);

      expect(newRepo).toBeInstanceOf(HealthRepository);
    });

    it("should inject database client correctly", async () => {
      vi.mocked(mockDb.execute).mockResolvedValue([] as any);

      const newRepo = createHealthRepository(mockDb);
      await newRepo.pingDatabase();

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });
});