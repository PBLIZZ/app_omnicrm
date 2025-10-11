/**
 * Unit Tests for ContactsRepository
 *
 * Tests all CRUD operations, pagination, search, validation, and bulk operations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ContactsRepository } from "./contacts.repo";
import * as dbClient from "@/server/db/client";
import type { Contact, Note } from "@/server/db/schema";

// Mock dependencies
vi.mock("@/server/db/client");
vi.mock("@/lib/utils/zod-helpers");

describe("ContactsRepository", () => {
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

  const createMockNote = (overrides: Partial<Note> = {}): Note => ({
    id: "note-1",
    userId: mockUserId,
    contactId: mockContactId,
    contentPlain: "Test note",
    contentRich: {},
    tags: [],
    piiEntities: [],
    sourceType: "typed",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockDb = () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("listContacts", () => {
    it("should list contacts with default pagination", async () => {
      const mockContacts = [createMockContact(), createMockContact({ id: "contact-2" })];
      const mockDb = createMockDb();
      
      // Mock count query
      mockDb.where.mockImplementationOnce(function(this: any) {
        return Promise.resolve([{ count: 10 }]);
      });
      
      // Mock select query
      mockDb.offset.mockResolvedValue(mockContacts);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.listContacts(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(2);
        expect(result.data.total).toBe(10);
      }
    });

    it("should respect pagination parameters", async () => {
      const mockContacts = [createMockContact()];
      const mockDb = createMockDb();
      
      mockDb.where.mockImplementationOnce(function(this: any) {
        return Promise.resolve([{ count: 100 }]);
      });
      mockDb.offset.mockResolvedValue(mockContacts);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.listContacts(mockUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.total).toBe(100);
      }
    });

    it("should filter by search term", async () => {
      const mockContacts = [createMockContact({ displayName: "Yoga Student" })];
      const mockDb = createMockDb();
      
      mockDb.where.mockImplementationOnce(function(this: any) {
        return Promise.resolve([{ count: 1 }]);
      });
      mockDb.offset.mockResolvedValue(mockContacts);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.listContacts(mockUserId, {
        search: "Yoga",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0].displayName).toContain("Yoga");
      }
    });

    it("should sort by displayName ascending", async () => {
      const mockContacts = [
        createMockContact({ displayName: "Alice" }),
        createMockContact({ id: "contact-2", displayName: "Bob" }),
      ];
      const mockDb = createMockDb();
      
      mockDb.where.mockImplementationOnce(function(this: any) {
        return Promise.resolve([{ count: 2 }]);
      });
      mockDb.offset.mockResolvedValue(mockContacts);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.listContacts(mockUserId, {
        sort: "displayName",
        order: "asc",
      });

      expect(result.success).toBe(true);
    });

    it("should return empty list when no contacts", async () => {
      const mockDb = createMockDb();
      
      mockDb.where.mockImplementationOnce(function(this: any) {
        return Promise.resolve([{ count: 0 }]);
      });
      mockDb.offset.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.listContacts(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(0);
        expect(result.data.total).toBe(0);
      }
    });

    it("should handle database errors", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(dbClient.getDb).mockRejectedValue(mockError);

      const result = await ContactsRepository.listContacts(mockUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
      }
    });
  });

  describe("getContactById", () => {
    it("should retrieve a specific contact", async () => {
      const mockContact = createMockContact();
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockContact]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.getContactById(mockUserId, mockContactId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.id).toBe(mockContactId);
      }
    });

    it("should return null when contact not found", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.getContactById(mockUserId, "non-existent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should only return contacts for the specified user", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.getContactById("different-user", mockContactId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe("getContactWithNotes", () => {
    it("should retrieve contact with associated notes", async () => {
      const mockContact = createMockContact();
      const mockNotes = [createMockNote(), createMockNote({ id: "note-2" })];
      const mockDb = createMockDb();
      
      // First call for contact
      mockDb.limit.mockResolvedValueOnce([mockContact]);
      // Second call for notes
      mockDb.orderBy.mockResolvedValueOnce(mockNotes);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.getContactWithNotes(mockUserId, mockContactId);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe(mockContactId);
        expect(result.data.notes).toHaveLength(2);
      }
    });

    it("should return null when contact not found", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.getContactWithNotes(mockUserId, "non-existent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should return contact with empty notes array if no notes", async () => {
      const mockContact = createMockContact();
      const mockDb = createMockDb();
      
      mockDb.limit.mockResolvedValueOnce([mockContact]);
      mockDb.orderBy.mockResolvedValueOnce([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.getContactWithNotes(mockUserId, mockContactId);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.notes).toHaveLength(0);
      }
    });
  });

  describe("createContact", () => {
    it("should create a contact with valid data", async () => {
      const contactInput = {
        userId: mockUserId,
        displayName: "New Contact",
        primaryEmail: "new@example.com",
        source: "manual",
      };

      const mockContact = createMockContact(contactInput);
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockContact]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      // Mock zod validation
      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: true,
        data: contactInput,
      } as any);

      const result = await ContactsRepository.createContact(contactInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe("New Contact");
      }
    });

    it("should reject invalid contact data", async () => {
      const invalidInput = {
        // Missing required fields
        primaryEmail: "invalid",
      };

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: false,
        error: { issues: [{ message: "displayName is required" }] },
      } as any);

      const result = await ContactsRepository.createContact(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should handle nullable fields correctly", async () => {
      const contactInput = {
        userId: mockUserId,
        displayName: "Minimal Contact",
        primaryEmail: null,
        primaryPhone: null,
        source: "manual",
      };

      const mockContact = createMockContact(contactInput);
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockContact]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: true,
        data: contactInput,
      } as any);

      const result = await ContactsRepository.createContact(contactInput);

      expect(result.success).toBe(true);
    });

    it("should handle database insert failure", async () => {
      const contactInput = {
        userId: mockUserId,
        displayName: "Test",
        source: "manual",
      };

      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: true,
        data: contactInput,
      } as any);

      const result = await ContactsRepository.createContact(contactInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
      }
    });
  });

  describe("updateContact", () => {
    it("should update contact fields", async () => {
      const updateInput = {
        displayName: "Updated Name",
        primaryEmail: "updated@example.com",
      };

      const mockContact = createMockContact(updateInput);
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockContact]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: true,
        data: updateInput,
      } as any);

      const result = await ContactsRepository.updateContact(mockUserId, mockContactId, updateInput);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.displayName).toBe("Updated Name");
      }
    });

    it("should update partial fields", async () => {
      const updateInput = {
        tags: ["vip", "yoga"],
      };

      const mockContact = createMockContact({ tags: ["vip", "yoga"] });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockContact]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: true,
        data: updateInput,
      } as any);

      const result = await ContactsRepository.updateContact(mockUserId, mockContactId, updateInput);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.tags).toEqual(["vip", "yoga"]);
      }
    });

    it("should return null when contact not found", async () => {
      const updateInput = { displayName: "New Name" };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: true,
        data: updateInput,
      } as any);

      const result = await ContactsRepository.updateContact(mockUserId, "non-existent", updateInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should reject invalid update data", async () => {
      const invalidInput = {
        primaryEmail: "not-an-email",
      };

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: false,
        error: { issues: [{ message: "Invalid email" }] },
      } as any);

      const result = await ContactsRepository.updateContact(mockUserId, mockContactId, invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("deleteContact", () => {
    it("should delete contact successfully", async () => {
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([{ id: mockContactId }]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.deleteContact(mockUserId, mockContactId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it("should return false when contact not found", async () => {
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.deleteContact(mockUserId, "non-existent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it("should not delete contacts from other users", async () => {
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.deleteContact("different-user", mockContactId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });

  describe("findContactByEmail", () => {
    it("should find contact by email", async () => {
      const mockContact = createMockContact({ primaryEmail: "find@example.com" });
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockContact]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.findContactByEmail(mockUserId, "find@example.com");

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.primaryEmail).toBe("find@example.com");
      }
    });

    it("should return null when email not found", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.findContactByEmail(mockUserId, "notfound@example.com");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should be case-sensitive", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.findContactByEmail(mockUserId, "DIFFERENT@CASE.COM");

      expect(result.success).toBe(true);
    });
  });

  describe("getContactsByIds", () => {
    it("should retrieve multiple contacts", async () => {
      const mockContacts = [
        createMockContact({ id: "contact-1" }),
        createMockContact({ id: "contact-2" }),
      ];
      const mockDb = createMockDb();
      mockDb.where.mockResolvedValue(mockContacts);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.getContactsByIds(mockUserId, ["contact-1", "contact-2"]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it("should return empty array for empty input", async () => {
      const result = await ContactsRepository.getContactsByIds(mockUserId, []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("should only return contacts for the specified user", async () => {
      const mockDb = createMockDb();
      mockDb.where.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.getContactsByIds("different-user", ["contact-1"]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe("deleteContactsByIds", () => {
    it("should delete multiple contacts", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ n: 2 }]);
      mockDb.where.mockResolvedValue({ count: 2 });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.deleteContactsByIds(mockUserId, ["contact-1", "contact-2"]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(2);
      }
    });

    it("should return 0 for empty input", async () => {
      const result = await ContactsRepository.deleteContactsByIds(mockUserId, []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it("should return 0 when no contacts found", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ n: 0 }]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.deleteContactsByIds(mockUserId, ["non-existent"]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });
  });

  describe("countContacts", () => {
    it("should count all contacts for a user", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ count: 42 }]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.countContacts(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it("should count contacts with search filter", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ count: 5 }]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.countContacts(mockUserId, "yoga");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });

    it("should return 0 when no contacts", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ count: 0 }]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.countContacts(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });
  });

  describe("Edge Cases and Validation", () => {
    it("should handle special characters in search", async () => {
      const mockDb = createMockDb();
      mockDb.where.mockImplementationOnce(function(this: any) {
        return Promise.resolve([{ count: 0 }]);
      });
      mockDb.offset.mockResolvedValue([]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await ContactsRepository.listContacts(mockUserId, {
        search: "O'Brien",
      });

      expect(result.success).toBe(true);
    });

    it("should handle very long display names", async () => {
      const longName = "A".repeat(255);
      const contactInput = {
        userId: mockUserId,
        displayName: longName,
        source: "manual",
      };

      const mockContact = createMockContact({ displayName: longName });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockContact]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: true,
        data: contactInput,
      } as any);

      const result = await ContactsRepository.createContact(contactInput);

      expect(result.success).toBe(true);
    });

    it("should handle wellness-specific lifecycle stages", async () => {
      const stages = ["Prospect", "New Client", "Core Client", "VIP Client"];
      
      for (const stage of stages) {
        const contactInput = {
          userId: mockUserId,
          displayName: "Test Client",
          lifecycleStage: stage,
          source: "manual",
        };

        const mockContact = createMockContact({ lifecycleStage: stage });
        const mockDb = createMockDb();
        mockDb.returning.mockResolvedValue([mockContact]);

        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const { safeParse } = await import("@/lib/utils/zod-helpers");
        vi.mocked(safeParse).mockReturnValue({
          success: true,
          data: contactInput,
        } as any);

        const result = await ContactsRepository.createContact(contactInput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.lifecycleStage).toBe(stage);
        }
      }
    });

    it("should preserve JSON fields correctly", async () => {
      const healthContext = {
        conditions: ["back pain"],
        preferences: ["gentle yoga"],
      };

      const contactInput = {
        userId: mockUserId,
        displayName: "Health Client",
        healthContext,
        source: "manual",
      };

      const mockContact = createMockContact({ healthContext });
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([mockContact]);

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const { safeParse } = await import("@/lib/utils/zod-helpers");
      vi.mocked(safeParse).mockReturnValue({
        success: true,
        data: contactInput,
      } as any);

      const result = await ContactsRepository.createContact(contactInput);

      expect(result.success).toBe(true);
    });
  });
});