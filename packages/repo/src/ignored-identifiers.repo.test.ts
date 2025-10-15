import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  IgnoredIdentifiersRepository,
  createIgnoredIdentifiersRepository,
} from "./ignored-identifiers.repo";
import {
  createMockDbClient,
  createMockQueryBuilder,
  type MockDbClient,
} from "@packages/testing";
import type { IgnoredIdentifier } from "@/server/db/schema";

describe("IgnoredIdentifiersRepository", () => {
  let mockDb: MockDbClient;
  let repo: IgnoredIdentifiersRepository;
  const mockUserId = "user-123";
  const mockIdentifierId = "id-456";

  const createMockIgnoredIdentifier = (
    overrides: Partial<IgnoredIdentifier> = {}
  ): IgnoredIdentifier => ({
    id: mockIdentifierId,
    userId: mockUserId,
    kind: "email",
    value: "spam@example.com",
    reason: "Spam sender",
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createIgnoredIdentifiersRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listIgnoredIdentifiers", () => {
    it("should list ignored identifiers with default pagination", async () => {
      const mockIds = [
        createMockIgnoredIdentifier(),
        createMockIgnoredIdentifier({ id: "id-2", value: "test@example.com" }),
      ];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 10 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listIgnoredIdentifiers(mockUserId);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it("should filter by kinds", async () => {
      const mockIds = [createMockIgnoredIdentifier({ kind: "email" })];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listIgnoredIdentifiers(mockUserId, {
        kinds: ["email"],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.kind).toBe("email");
    });

    it("should search by value", async () => {
      const mockIds = [createMockIgnoredIdentifier({ value: "spam@test.com" })];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listIgnoredIdentifiers(mockUserId, {
        search: "spam",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.value).toContain("spam");
    });

    it("should handle custom pagination", async () => {
      const mockIds = [createMockIgnoredIdentifier()];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 100 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listIgnoredIdentifiers(mockUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(100);
    });

    it("should enforce maximum page size", async () => {
      const mockIds = [createMockIgnoredIdentifier()];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      await repo.listIgnoredIdentifiers(mockUserId, { pageSize: 500 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should sort ascending when specified", async () => {
      const mockIds = [
        createMockIgnoredIdentifier({ id: "id-1" }),
        createMockIgnoredIdentifier({ id: "id-2" }),
      ];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 2 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listIgnoredIdentifiers(mockUserId, {
        order: "asc",
      });

      expect(result.items).toHaveLength(2);
    });
  });

  describe("isIgnored", () => {
    it("should return true when identifier is ignored", async () => {
      const selectBuilder = createMockQueryBuilder([{ id: mockIdentifierId }]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.isIgnored(mockUserId, "email", "spam@example.com");

      expect(result).toBe(true);
    });

    it("should return false when identifier is not ignored", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.isIgnored(mockUserId, "email", "clean@example.com");

      expect(result).toBe(false);
    });
  });

  describe("createIgnoredIdentifier", () => {
    it("should create new ignored identifier", async () => {
      const mockId = createMockIgnoredIdentifier();
      const insertBuilder = createMockQueryBuilder([mockId]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        kind: "email",
        value: "spam@example.com",
        reason: "Spam",
      };

      const result = await repo.createIgnoredIdentifier(data);

      expect(result).not.toBeNull();
      expect(result.id).toBe(mockIdentifierId);
    });

    it("should throw error when insert returns no data", async () => {
      const insertBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        kind: "email",
        value: "test@example.com",
        reason: "Test",
      };

      await expect(repo.createIgnoredIdentifier(data)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("updateIgnoredIdentifier", () => {
    it("should update existing identifier", async () => {
      const mockId = createMockIgnoredIdentifier({ reason: "Updated reason" });
      const updateBuilder = createMockQueryBuilder([mockId]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateIgnoredIdentifier(
        mockUserId,
        mockIdentifierId,
        { reason: "Updated reason" }
      );

      expect(result).not.toBeNull();
      expect(result?.reason).toBe("Updated reason");
    });

    it("should return null when not found", async () => {
      const updateBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateIgnoredIdentifier(
        mockUserId,
        "non-existent",
        { reason: "Updated" }
      );

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(
        repo.updateIgnoredIdentifier(mockUserId, mockIdentifierId, {})
      ).rejects.toThrow("No fields provided for update");
    });
  });

  describe("deleteIgnoredIdentifier", () => {
    it("should delete identifier and return count", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockIdentifierId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteIgnoredIdentifier(mockUserId, mockIdentifierId);

      expect(result).toBe(1);
    });

    it("should return 0 when not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteIgnoredIdentifier(mockUserId, "non-existent");

      expect(result).toBe(0);
    });
  });

  describe("deleteIgnoredIdentifiersForUser", () => {
    it("should delete all identifiers for user", async () => {
      const deleteBuilder = createMockQueryBuilder([
        { id: "id-1" },
        { id: "id-2" },
        { id: "id-3" },
      ]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteIgnoredIdentifiersForUser(mockUserId);

      expect(result).toBe(3);
    });

    it("should return 0 when no identifiers exist", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteIgnoredIdentifiersForUser(mockUserId);

      expect(result).toBe(0);
    });
  });
});
