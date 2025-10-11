import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgnoredIdentifiersRepository } from "./ignored-identifiers.repo";
import type { DbClient } from "@/server/db/client";
import { ignoredIdentifiers } from "@/server/db/schema";

const createMockDb = () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return mockDb as unknown as DbClient;
};

describe("IgnoredIdentifiersRepository", () => {
  let mockDb: DbClient;
  const testUserId = "test-user-123";
  const testIdentifierId = "identifier-123";

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("listIgnoredIdentifiers", () => {
    it("should list ignored identifiers with default pagination", async () => {
      const mockIdentifiers = [
        {
          id: testIdentifierId,
          userId: testUserId,
          kind: "email",
          value: "spam@example.com",
          reason: "Automated system",
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce(mockIdentifiers);
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([{ value: 1 }]);

      const result = await IgnoredIdentifiersRepository.listIgnoredIdentifiers(mockDb, testUserId);

      expect(result.items).toEqual(mockIdentifiers);
      expect(result.total).toBe(1);
    });

    it("should filter by kinds", async () => {
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([{ value: 0 }]);

      await IgnoredIdentifiersRepository.listIgnoredIdentifiers(mockDb, testUserId, {
        kinds: ["email", "phone"],
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should search by value", async () => {
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([{ value: 0 }]);

      await IgnoredIdentifiersRepository.listIgnoredIdentifiers(mockDb, testUserId, {
        search: "spam",
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should handle custom pagination", async () => {
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([{ value: 0 }]);

      await IgnoredIdentifiersRepository.listIgnoredIdentifiers(mockDb, testUserId, {
        page: 3,
        pageSize: 25,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(25);
      expect(mockDb.offset).toHaveBeenCalledWith(50); // (3-1) * 25
    });

    it("should enforce maximum page size", async () => {
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([{ value: 0 }]);

      await IgnoredIdentifiersRepository.listIgnoredIdentifiers(mockDb, testUserId, {
        pageSize: 500,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(200);
    });

    it("should sort ascending when specified", async () => {
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([{ value: 0 }]);

      await IgnoredIdentifiersRepository.listIgnoredIdentifiers(mockDb, testUserId, {
        order: "asc",
      });

      expect(mockDb.orderBy).toHaveBeenCalled();
    });
  });

  describe("isIgnored", () => {
    it("should return true when identifier is ignored", async () => {
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([{ id: testIdentifierId }]);

      const result = await IgnoredIdentifiersRepository.isIgnored(mockDb, testUserId, "email", "spam@example.com");

      expect(result).toBe(true);
    });

    it("should return false when identifier is not ignored", async () => {
      vi.mocked(mockDb.select().from(ignoredIdentifiers).where).mockResolvedValueOnce([]);

      const result = await IgnoredIdentifiersRepository.isIgnored(mockDb, testUserId, "email", "valid@example.com");

      expect(result).toBe(false);
    });
  });

  describe("createIgnoredIdentifier", () => {
    it("should create new ignored identifier", async () => {
      const newIdentifier = {
        userId: testUserId,
        kind: "email",
        value: "spam@example.com",
        reason: "Automated system",
      };

      const created = { ...newIdentifier, id: "new-id", createdAt: new Date() };

      vi.mocked(mockDb.insert(ignoredIdentifiers).values(newIdentifier).returning).mockResolvedValueOnce([created]);

      const result = await IgnoredIdentifiersRepository.createIgnoredIdentifier(mockDb, newIdentifier);

      expect(result).toEqual(created);
    });

    it("should throw error when insert returns no data", async () => {
      const newIdentifier = {
        userId: testUserId,
        kind: "email",
        value: "spam@example.com",
      };

      vi.mocked(mockDb.insert(ignoredIdentifiers).values(newIdentifier).returning).mockResolvedValueOnce([]);

      await expect(IgnoredIdentifiersRepository.createIgnoredIdentifier(mockDb, newIdentifier)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("updateIgnoredIdentifier", () => {
    it("should update existing identifier", async () => {
      const updates = { reason: "Updated reason" };
      const updated = {
        id: testIdentifierId,
        userId: testUserId,
        kind: "email",
        value: "spam@example.com",
        reason: "Updated reason",
        createdAt: new Date(),
      };

      vi.mocked(mockDb.update(ignoredIdentifiers).set(updates).where).mockResolvedValueOnce([updated]);

      const result = await IgnoredIdentifiersRepository.updateIgnoredIdentifier(
        mockDb,
        testUserId,
        testIdentifierId,
        updates
      );

      expect(result).toEqual(updated);
    });

    it("should return null when not found", async () => {
      vi.mocked(mockDb.update(ignoredIdentifiers).set({}).where).mockResolvedValueOnce([]);

      const result = await IgnoredIdentifiersRepository.updateIgnoredIdentifier(
        mockDb,
        testUserId,
        testIdentifierId,
        { reason: "test" }
      );

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(
        IgnoredIdentifiersRepository.updateIgnoredIdentifier(mockDb, testUserId, testIdentifierId, {})
      ).rejects.toThrow("No fields provided for update");
    });
  });

  describe("deleteIgnoredIdentifier", () => {
    it("should delete identifier and return count", async () => {
      vi.mocked(mockDb.delete(ignoredIdentifiers).where).mockResolvedValueOnce([{ id: testIdentifierId }]);

      const count = await IgnoredIdentifiersRepository.deleteIgnoredIdentifier(mockDb, testUserId, testIdentifierId);

      expect(count).toBe(1);
    });

    it("should return 0 when not found", async () => {
      vi.mocked(mockDb.delete(ignoredIdentifiers).where).mockResolvedValueOnce([]);

      const count = await IgnoredIdentifiersRepository.deleteIgnoredIdentifier(mockDb, testUserId, testIdentifierId);

      expect(count).toBe(0);
    });
  });

  describe("deleteIgnoredIdentifiersForUser", () => {
    it("should delete all identifiers for user", async () => {
      vi.mocked(mockDb.delete(ignoredIdentifiers).where).mockResolvedValueOnce([
        { id: "id-1" },
        { id: "id-2" },
        { id: "id-3" },
      ]);

      const count = await IgnoredIdentifiersRepository.deleteIgnoredIdentifiersForUser(mockDb, testUserId);

      expect(count).toBe(3);
    });

    it("should return 0 when no identifiers exist", async () => {
      vi.mocked(mockDb.delete(ignoredIdentifiers).where).mockResolvedValueOnce([]);

      const count = await IgnoredIdentifiersRepository.deleteIgnoredIdentifiersForUser(mockDb, testUserId);

      expect(count).toBe(0);
    });
  });
});