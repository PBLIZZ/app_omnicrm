import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContactIdentitiesRepository } from "./contact-identities.repo";
import type { DbClient } from "@/server/db/client";
import { contactIdentities } from "@/server/db/schema";

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

describe("ContactIdentitiesRepository", () => {
  let mockDb: DbClient;
  const testUserId = "test-user-123";
  const testContactId = "contact-123";
  const testIdentityId = "identity-123";

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("listContactIdentities", () => {
    it("should list identities with default pagination", async () => {
      const mockIdentities = [
        {
          id: "identity-1",
          contactId: testContactId,
          userId: testUserId,
          kind: "email",
          provider: "gmail",
          value: "test@example.com",
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce(mockIdentities);
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([{ value: 1 }]);

      const result = await ContactIdentitiesRepository.listContactIdentities(mockDb, testUserId);

      expect(result.items).toEqual(mockIdentities);
      expect(result.total).toBe(1);
    });

    it("should filter by contact id", async () => {
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([{ value: 0 }]);

      await ContactIdentitiesRepository.listContactIdentities(mockDb, testUserId, {
        contactId: testContactId,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by kinds array", async () => {
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([{ value: 0 }]);

      await ContactIdentitiesRepository.listContactIdentities(mockDb, testUserId, {
        kinds: ["email", "phone"],
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by provider", async () => {
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([{ value: 0 }]);

      await ContactIdentitiesRepository.listContactIdentities(mockDb, testUserId, {
        provider: "gmail",
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should search by value", async () => {
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([{ value: 0 }]);

      await ContactIdentitiesRepository.listContactIdentities(mockDb, testUserId, {
        search: "example.com",
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should handle custom pagination", async () => {
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([{ value: 0 }]);

      await ContactIdentitiesRepository.listContactIdentities(mockDb, testUserId, {
        page: 3,
        pageSize: 20,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(20);
      expect(mockDb.offset).toHaveBeenCalledWith(40); // (3-1) * 20
    });

    it("should enforce maximum page size", async () => {
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([{ value: 0 }]);

      await ContactIdentitiesRepository.listContactIdentities(mockDb, testUserId, {
        pageSize: 300,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(200);
    });

    it("should sort ascending when specified", async () => {
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([{ value: 0 }]);

      await ContactIdentitiesRepository.listContactIdentities(mockDb, testUserId, {
        order: "asc",
      });

      expect(mockDb.orderBy).toHaveBeenCalled();
    });
  });

  describe("findByKindAndValue", () => {
    it("should find identity by kind and value with provider", async () => {
      const mockIdentity = {
        id: testIdentityId,
        contactId: testContactId,
        userId: testUserId,
        kind: "email",
        provider: "gmail",
        value: "test@example.com",
        createdAt: new Date(),
      };

      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([mockIdentity]);

      const result = await ContactIdentitiesRepository.findByKindAndValue(
        mockDb,
        testUserId,
        "email",
        "test@example.com",
        "gmail"
      );

      expect(result).toEqual(mockIdentity);
    });

    it("should find identity without provider (null provider)", async () => {
      const mockIdentity = {
        id: testIdentityId,
        contactId: testContactId,
        userId: testUserId,
        kind: "phone",
        provider: null,
        value: "+1234567890",
        createdAt: new Date(),
      };

      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([mockIdentity]);

      const result = await ContactIdentitiesRepository.findByKindAndValue(
        mockDb,
        testUserId,
        "phone",
        "+1234567890",
        null
      );

      expect(result).toEqual(mockIdentity);
    });

    it("should return null when not found", async () => {
      vi.mocked(mockDb.select().from(contactIdentities).where).mockResolvedValueOnce([]);

      const result = await ContactIdentitiesRepository.findByKindAndValue(
        mockDb,
        testUserId,
        "email",
        "nonexistent@example.com",
        "gmail"
      );

      expect(result).toBeNull();
    });
  });

  describe("createContactIdentity", () => {
    it("should create new identity", async () => {
      const newIdentity = {
        contactId: testContactId,
        userId: testUserId,
        kind: "email",
        provider: "gmail",
        value: "new@example.com",
      };

      const createdIdentity = { ...newIdentity, id: "new-id", createdAt: new Date() };

      vi.mocked(mockDb.insert(contactIdentities).values(newIdentity).returning).mockResolvedValueOnce([
        createdIdentity,
      ]);

      const result = await ContactIdentitiesRepository.createContactIdentity(mockDb, newIdentity);

      expect(result).toEqual(createdIdentity);
    });

    it("should throw error when insert returns no data", async () => {
      const newIdentity = {
        contactId: testContactId,
        userId: testUserId,
        kind: "email",
        value: "test@example.com",
      };

      vi.mocked(mockDb.insert(contactIdentities).values(newIdentity).returning).mockResolvedValueOnce([]);

      await expect(ContactIdentitiesRepository.createContactIdentity(mockDb, newIdentity)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("createContactIdentitiesBulk", () => {
    it("should create multiple identities", async () => {
      const identities = [
        {
          contactId: testContactId,
          userId: testUserId,
          kind: "email",
          value: "email1@example.com",
        },
        {
          contactId: testContactId,
          userId: testUserId,
          kind: "email",
          value: "email2@example.com",
        },
      ];

      const created = identities.map((i, idx) => ({ ...i, id: `id-${idx}`, createdAt: new Date() }));

      vi.mocked(mockDb.insert(contactIdentities).values(identities).returning).mockResolvedValueOnce(created);

      const result = await ContactIdentitiesRepository.createContactIdentitiesBulk(mockDb, identities);

      expect(result).toHaveLength(2);
      expect(result).toEqual(created);
    });

    it("should return empty array for empty input", async () => {
      const result = await ContactIdentitiesRepository.createContactIdentitiesBulk(mockDb, []);

      expect(result).toEqual([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("updateContactIdentity", () => {
    it("should update existing identity", async () => {
      const updates = { value: "updated@example.com" };
      const updated = {
        id: testIdentityId,
        contactId: testContactId,
        userId: testUserId,
        kind: "email",
        provider: "gmail",
        value: "updated@example.com",
        createdAt: new Date(),
      };

      vi.mocked(mockDb.update(contactIdentities).set(updates).where).mockResolvedValueOnce([updated]);

      const result = await ContactIdentitiesRepository.updateContactIdentity(
        mockDb,
        testUserId,
        testIdentityId,
        updates
      );

      expect(result).toEqual(updated);
    });

    it("should return null when not found", async () => {
      vi.mocked(mockDb.update(contactIdentities).set({}).where).mockResolvedValueOnce([]);

      const result = await ContactIdentitiesRepository.updateContactIdentity(mockDb, testUserId, testIdentityId, {
        value: "test",
      });

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(
        ContactIdentitiesRepository.updateContactIdentity(mockDb, testUserId, testIdentityId, {})
      ).rejects.toThrow("No fields provided for update");
    });
  });

  describe("deleteContactIdentity", () => {
    it("should delete identity and return count", async () => {
      vi.mocked(mockDb.delete(contactIdentities).where).mockResolvedValueOnce([{ id: testIdentityId }]);

      const count = await ContactIdentitiesRepository.deleteContactIdentity(mockDb, testUserId, testIdentityId);

      expect(count).toBe(1);
    });

    it("should return 0 when not found", async () => {
      vi.mocked(mockDb.delete(contactIdentities).where).mockResolvedValueOnce([]);

      const count = await ContactIdentitiesRepository.deleteContactIdentity(mockDb, testUserId, testIdentityId);

      expect(count).toBe(0);
    });
  });

  describe("deleteIdentitiesForContact", () => {
    it("should delete all identities for a contact", async () => {
      vi.mocked(mockDb.delete(contactIdentities).where).mockResolvedValueOnce([
        { id: "id-1" },
        { id: "id-2" },
        { id: "id-3" },
      ]);

      const count = await ContactIdentitiesRepository.deleteIdentitiesForContact(mockDb, testUserId, testContactId);

      expect(count).toBe(3);
    });

    it("should return 0 when no identities exist", async () => {
      vi.mocked(mockDb.delete(contactIdentities).where).mockResolvedValueOnce([]);

      const count = await ContactIdentitiesRepository.deleteIdentitiesForContact(mockDb, testUserId, testContactId);

      expect(count).toBe(0);
    });
  });
});