import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ContactsRepository,
  createContactsRepository,
} from "./contacts.repo";
import {
  createMockDbClient,
  createMockQueryBuilder,
  type MockDbClient,
} from "@packages/testing";
import type { Contact } from "@/server/db/schema";

describe("ContactsRepository", () => {
  let mockDb: MockDbClient;
  let repo: ContactsRepository;
  const mockUserId = "user-123";
  const mockContactId = "contact-456";

  const createMockContact = (overrides: Partial<Contact> = {}): Contact => ({
    id: mockContactId,
    userId: mockUserId,
    displayName: "John Doe",
    primaryEmail: "john@example.com",
    primaryPhone: "+1234567890",
    photoUrl: null,
    source: "manual",
    lifecycleStage: "Core Client",
    tags: ["yoga", "regular"],
    confidenceScore: "0.85",
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    contactStatus: null,
    referralSource: null,
    address: null,
    healthContext: null,
    preferences: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createContactsRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listContacts", () => {
    it("should list contacts with default pagination", async () => {
      const mockContacts = [createMockContact(), createMockContact({ id: "contact-2" })];
      
      const selectBuilder = createMockQueryBuilder(mockContacts);
      const countBuilder = createMockQueryBuilder([{ count: 10 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(countBuilder as any)
        .mockReturnValueOnce(selectBuilder as any);

      const result = await repo.listContacts(mockUserId);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it("should respect pagination parameters", async () => {
      const mockContacts = [createMockContact()];
      
      const selectBuilder = createMockQueryBuilder(mockContacts);
      const countBuilder = createMockQueryBuilder([{ count: 100 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(countBuilder as any)
        .mockReturnValueOnce(selectBuilder as any);

      const result = await repo.listContacts(mockUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(100);
    });

    it("should filter by search term", async () => {
      const mockContacts = [createMockContact({ displayName: "Yoga Student" })];
      
      const selectBuilder = createMockQueryBuilder(mockContacts);
      const countBuilder = createMockQueryBuilder([{ count: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(countBuilder as any)
        .mockReturnValueOnce(selectBuilder as any);

      const result = await repo.listContacts(mockUserId, {
        search: "Yoga",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.displayName).toContain("Yoga");
    });

    it("should sort by displayName ascending", async () => {
      const mockContacts = [
        createMockContact({ displayName: "Alice" }),
        createMockContact({ id: "contact-2", displayName: "Bob" }),
      ];
      
      const selectBuilder = createMockQueryBuilder(mockContacts);
      const countBuilder = createMockQueryBuilder([{ count: 2 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(countBuilder as any)
        .mockReturnValueOnce(selectBuilder as any);

      const result = await repo.listContacts(mockUserId, {
        sort: "displayName",
        order: "asc",
      });

      expect(result.items).toHaveLength(2);
    });

    it("should return empty list when no contacts", async () => {
      const selectBuilder = createMockQueryBuilder([]);
      const countBuilder = createMockQueryBuilder([{ count: 0 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(countBuilder as any)
        .mockReturnValueOnce(selectBuilder as any);

      const result = await repo.listContacts(mockUserId);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getContactById", () => {
    it("should retrieve a specific contact", async () => {
      const mockContact = createMockContact();
      const selectBuilder = createMockQueryBuilder([mockContact]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getContactById(mockUserId, mockContactId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockContactId);
    });

    it("should return null when contact not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getContactById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });

    it("should only return contacts for the specified user", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getContactById("different-user", mockContactId);

      expect(result).toBeNull();
    });
  });

  describe("createContact", () => {
    it("should create a contact with valid data", async () => {
      const mockContact = createMockContact({ displayName: "New Contact" });
      const insertBuilder = createMockQueryBuilder([mockContact]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const contactInput = {
        userId: mockUserId,
        displayName: "New Contact",
        primaryEmail: "new@example.com",
        source: "manual",
      };

      const result = await repo.createContact(contactInput);

      expect(result.displayName).toBe("New Contact");
    });

    it("should handle nullable fields correctly", async () => {
      const mockContact = createMockContact({
        primaryEmail: null,
        primaryPhone: null,
      });
      const insertBuilder = createMockQueryBuilder([mockContact]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const contactInput = {
        userId: mockUserId,
        displayName: "Minimal Contact",
        source: "manual",
      };

      const result = await repo.createContact(contactInput);

      expect(result).not.toBeNull();
    });

    it("should throw error when insert returns no data", async () => {
      const insertBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const contactInput = {
        userId: mockUserId,
        displayName: "Test",
        source: "manual",
      };

      await expect(repo.createContact(contactInput)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("updateContact", () => {
    it("should update contact fields", async () => {
      const mockContact = createMockContact({
        displayName: "Updated Name",
        primaryEmail: "updated@example.com",
      });
      const updateBuilder = createMockQueryBuilder([mockContact]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateContact(mockUserId, mockContactId, {
        displayName: "Updated Name",
        primaryEmail: "updated@example.com",
      });

      expect(result).not.toBeNull();
      expect(result?.displayName).toBe("Updated Name");
    });

    it("should return null when contact not found", async () => {
      const updateBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateContact(mockUserId, "non-existent", {
        displayName: "New Name",
      });

      expect(result).toBeNull();
    });

    it("should update updatedAt timestamp", async () => {
      const mockContact = createMockContact({ updatedAt: new Date() });
      const updateBuilder = createMockQueryBuilder([mockContact]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateContact(mockUserId, mockContactId, {
        displayName: "Updated",
      });

      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("deleteContact", () => {
    it("should delete contact successfully", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockContactId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteContact(mockUserId, mockContactId);

      expect(result).toBe(true);
    });

    it("should return false when contact not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteContact(mockUserId, "non-existent");

      expect(result).toBe(false);
    });

    it("should not allow deleting contacts from other users", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteContact("different-user", mockContactId);

      expect(result).toBe(false);
    });
  });

  describe("findContactByEmail", () => {
    it("should find contact by email", async () => {
      const mockContact = createMockContact({ primaryEmail: "john@example.com" });
      const selectBuilder = createMockQueryBuilder([mockContact]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.findContactByEmail(mockUserId, "john@example.com");

      expect(result).not.toBeNull();
      expect(result?.primaryEmail).toBe("john@example.com");
    });

    it("should return null when email not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.findContactByEmail(mockUserId, "nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("getContactsByIds", () => {
    it("should get multiple contacts by IDs", async () => {
      const mockContacts = [
        createMockContact({ id: "contact-1" }),
        createMockContact({ id: "contact-2" }),
      ];
      const selectBuilder = createMockQueryBuilder(mockContacts);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getContactsByIds(mockUserId, ["contact-1", "contact-2"]);

      expect(result).toHaveLength(2);
    });

    it("should return empty array for empty input", async () => {
      const result = await repo.getContactsByIds(mockUserId, []);

      expect(result).toEqual([]);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe("deleteContactsByIds", () => {
    it("should bulk delete contacts", async () => {
      // Mock return value with count property
      const mockResult = { count: 3 };
      const deleteBuilder = createMockQueryBuilder([]);
      // Override the then method to return mockResult
      deleteBuilder.then = vi.fn((resolve) => Promise.resolve(resolve(mockResult)));

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteContactsByIds(mockUserId, [
        "contact-1",
        "contact-2",
        "contact-3",
      ]);

      expect(result).toBe(3);
    });

    it("should return 0 for empty input", async () => {
      const result = await repo.deleteContactsByIds(mockUserId, []);

      expect(result).toBe(0);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe("countContacts", () => {
    it("should count all contacts for user", async () => {
      const selectBuilder = createMockQueryBuilder([{ count: 42 }]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.countContacts(mockUserId);

      expect(result).toBe(42);
    });

    it("should count contacts with search filter", async () => {
      const selectBuilder = createMockQueryBuilder([{ count: 5 }]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.countContacts(mockUserId, "yoga");

      expect(result).toBe(5);
    });
  });
});
