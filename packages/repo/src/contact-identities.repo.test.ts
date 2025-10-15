import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ContactIdentitiesRepository,
  createContactIdentitiesRepository,
} from "./contact-identities.repo";
import { createMockDbClient, createMockQueryBuilder, type MockDbClient } from "@packages/testing";
import type { ContactIdentity } from "@/server/db/schema";

describe("ContactIdentitiesRepository", () => {
  let mockDb: MockDbClient;
  let repo: ContactIdentitiesRepository;
  const mockUserId = "user-123";
  const mockIdentityId = "identity-456";
  const mockContactId = "contact-789";

  const createMockIdentity = (overrides: Partial<ContactIdentity> = {}): ContactIdentity => ({
    id: mockIdentityId,
    userId: mockUserId,
    contactId: mockContactId,
    kind: "email",
    value: "test@example.com",
    provider: "google",
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createContactIdentitiesRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listContactIdentities", () => {
    it("should list identities with default pagination", async () => {
      const mockIds = [createMockIdentity(), createMockIdentity({ id: "identity-2" })];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 10 }]);

      vi.mocked(mockDb.select).mockReturnValueOnce(selectBuilder).mockReturnValueOnce(countBuilder);

      const result = await repo.listContactIdentities(mockUserId);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it("should filter by contact id", async () => {
      const mockIds = [createMockIdentity()];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select).mockReturnValueOnce(selectBuilder).mockReturnValueOnce(countBuilder);

      const result = await repo.listContactIdentities(mockUserId, {
        contactId: mockContactId,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.contactId).toBe(mockContactId);
    });

    it("should filter by kinds array", async () => {
      const mockIds = [createMockIdentity({ kind: "email" })];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select).mockReturnValueOnce(selectBuilder).mockReturnValueOnce(countBuilder);

      const result = await repo.listContactIdentities(mockUserId, {
        kinds: ["email"],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.kind).toBe("email");
    });

    it("should filter by provider", async () => {
      const mockIds = [createMockIdentity({ provider: "google" })];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select).mockReturnValueOnce(selectBuilder).mockReturnValueOnce(countBuilder);

      const result = await repo.listContactIdentities(mockUserId, {
        provider: "google",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.provider).toBe("google");
    });

    it("should search by value", async () => {
      const mockIds = [createMockIdentity({ value: "test@example.com" })];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select).mockReturnValueOnce(selectBuilder).mockReturnValueOnce(countBuilder);

      const result = await repo.listContactIdentities(mockUserId, {
        search: "test",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.value).toContain("test");
    });

    it("should handle custom pagination", async () => {
      const mockIds = [createMockIdentity()];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 100 }]);

      vi.mocked(mockDb.select).mockReturnValueOnce(selectBuilder).mockReturnValueOnce(countBuilder);

      const result = await repo.listContactIdentities(mockUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(100);
    });

    it("should enforce maximum page size", async () => {
      const mockIds = [createMockIdentity()];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select).mockReturnValueOnce(selectBuilder).mockReturnValueOnce(countBuilder);

      await repo.listContactIdentities(mockUserId, { pageSize: 500 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should sort ascending when specified", async () => {
      const mockIds = [
        createMockIdentity({ id: "identity-1" }),
        createMockIdentity({ id: "identity-2" }),
      ];

      const selectBuilder = createMockQueryBuilder(mockIds);
      const countBuilder = createMockQueryBuilder([{ value: 2 }]);

      vi.mocked(mockDb.select).mockReturnValueOnce(selectBuilder).mockReturnValueOnce(countBuilder);

      const result = await repo.listContactIdentities(mockUserId, {
        order: "asc",
      });

      expect(result.items).toHaveLength(2);
    });
  });

  describe("findByKindAndValue", () => {
    it("should find identity by kind and value with provider", async () => {
      const mockId = createMockIdentity();
      const selectBuilder = createMockQueryBuilder([mockId]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.findByKindAndValue(
        mockUserId,
        "email",
        "test@example.com",
        "google",
      );

      expect(result).not.toBeNull();
      expect(result?.kind).toBe("email");
      expect(result?.provider).toBe("google");
    });

    it("should find identity without provider (null provider)", async () => {
      const mockId = createMockIdentity({ provider: null });
      const selectBuilder = createMockQueryBuilder([mockId]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.findByKindAndValue(mockUserId, "email", "test@example.com", null);

      expect(result).not.toBeNull();
      expect(result?.provider).toBeNull();
    });

    it("should return null when not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.findByKindAndValue(mockUserId, "email", "nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("createContactIdentity", () => {
    it("should create new identity", async () => {
      const mockId = createMockIdentity();
      const insertBuilder = createMockQueryBuilder([mockId]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      const data = {
        userId: mockUserId,
        contactId: mockContactId,
        kind: "email",
        value: "test@example.com",
        provider: "google",
      };

      const result = await repo.createContactIdentity(data);

      expect(result).not.toBeNull();
      expect(result.id).toBe(mockIdentityId);
    });

    it("should throw error when insert returns no data", async () => {
      const insertBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      const data = {
        userId: mockUserId,
        contactId: mockContactId,
        kind: "email",
        value: "test@example.com",
      };

      await expect(repo.createContactIdentity(data)).rejects.toThrow("Insert returned no data");
    });
  });

  describe("createContactIdentitiesBulk", () => {
    it("should create multiple identities", async () => {
      const mockIds = [
        createMockIdentity({ id: "identity-1" }),
        createMockIdentity({ id: "identity-2" }),
      ];

      const insertBuilder = createMockQueryBuilder(mockIds);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      const items = [
        {
          userId: mockUserId,
          contactId: mockContactId,
          kind: "email",
          value: "test1@example.com",
        },
        {
          userId: mockUserId,
          contactId: mockContactId,
          kind: "phone",
          value: "+1234567890",
        },
      ];

      const result = await repo.createContactIdentitiesBulk(items);

      expect(result).toHaveLength(2);
    });

    it("should return empty array for empty input", async () => {
      const result = await repo.createContactIdentitiesBulk([]);

      expect(result).toEqual([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("updateContactIdentity", () => {
    it("should update existing identity", async () => {
      const mockId = createMockIdentity({ value: "updated@example.com" });
      const updateBuilder = createMockQueryBuilder([mockId]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      const result = await repo.updateContactIdentity(mockUserId, mockIdentityId, {
        value: "updated@example.com",
      });

      expect(result).not.toBeNull();
      expect(result?.value).toBe("updated@example.com");
    });

    it("should return null when not found", async () => {
      const updateBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      const result = await repo.updateContactIdentity(mockUserId, "non-existent", {
        value: "updated@example.com",
      });

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(repo.updateContactIdentity(mockUserId, mockIdentityId, {})).rejects.toThrow(
        "No fields provided for update",
      );
    });
  });

  describe("deleteContactIdentity", () => {
    it("should delete identity and return count", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockIdentityId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteContactIdentity(mockUserId, mockIdentityId);

      expect(result).toBe(1);
    });

    it("should return 0 when not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteContactIdentity(mockUserId, "non-existent");

      expect(result).toBe(0);
    });
  });

  describe("deleteIdentitiesForContact", () => {
    it("should delete all identities for a contact", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: "identity-1" }, { id: "identity-2" }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteIdentitiesForContact(mockUserId, mockContactId);

      expect(result).toBe(2);
    });

    it("should return 0 when no identities exist", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteIdentitiesForContact(mockUserId, mockContactId);

      expect(result).toBe(0);
    });
  });
});
