/**
 * Contacts Repository Tests
 *
 * Comprehensive tests for ContactsRepository.
 * Tests CRUD operations, search, filtering, and contact management with tags and notes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContactsRepository, createContactsRepository } from "../contacts.repo";
import { createMockDbClient, type MockDbClient } from "@packages/testing";
import type { Contact } from "@/server/db/schema";

describe("ContactsRepository", () => {
  let mockDb: MockDbClient;
  let repo: ContactsRepository;
  const mockUserId = "user-123";
  const mockContactId = "contact-456";

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = new ContactsRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listContacts", () => {
    it("should list contacts with default pagination", async () => {
      const mockContacts = [
        {
          id: mockContactId,
          userId: mockUserId,
          displayName: "John Doe",
          primaryEmail: "john@example.com",
          primaryPhone: "+1234567890",
          photoUrl: null,
          source: null,
          lifecycleStage: null,
          confidenceScore: null,
          dateOfBirth: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          clientStatus: null,
          referralSource: null,
          address: null,
          healthContext: null,
          preferences: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning = undefined;
      mockDb.select.mockResolvedValueOnce([{ value: 1 }]);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.offset.mockResolvedValue(mockContacts);

      const result = await repo.listContacts(mockUserId);

      expect(result.items).toEqual(mockContacts);
      expect(result.total).toBe(1);
    });

    it("should filter contacts by search term", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce([{ value: 1 }]);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.offset.mockResolvedValue([]);

      await repo.listContacts(mockUserId, { search: "john" });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should support custom pagination", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce([{ value: 100 }]);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.offset.mockResolvedValue([]);

      const result = await repo.listContacts(mockUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(25);
      expect(mockDb.offset).toHaveBeenCalledWith(25);
      expect(result.total).toBe(100);
    });

    it("should support sorting by different fields", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce([{ value: 10 }]);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.offset.mockResolvedValue([]);

      await repo.listContacts(mockUserId, {
        sort: "displayName",
        order: "asc",
      });

      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it("should throw error when count query returns no rows", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce([]);

      await expect(repo.listContacts(mockUserId)).rejects.toThrow(
        "Count query returned no rows"
      );
    });
  });

  describe("listContactsWithLastNote", () => {
    it("should list contacts with last note preview", async () => {
      const mockRawItems = [
        {
          id: mockContactId,
          userId: mockUserId,
          displayName: "John Doe",
          primaryEmail: "john@example.com",
          primaryPhone: "+1234567890",
          photoUrl: null,
          source: null,
          lifecycleStage: null,
          confidenceScore: null,
          dateOfBirth: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          clientStatus: null,
          referralSource: null,
          address: null,
          healthContext: null,
          preferences: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastNote: "This is a note preview",
          tagsJson: JSON.stringify([
            { id: "tag-1", name: "VIP", color: "#FF0000", category: "client" },
          ]),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce([{ value: 1 }]);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.leftJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.offset.mockResolvedValue(mockRawItems);

      const result = await repo.listContactsWithLastNote(mockUserId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.displayName).toBe("John Doe");
      expect(result.items[0]?.lastNote).toBe("This is a note preview");
      expect(result.items[0]?.tags).toHaveLength(1);
      expect(result.items[0]?.tags[0]?.name).toBe("VIP");
    });

    it("should handle contacts with no tags", async () => {
      const mockRawItems = [
        {
          id: mockContactId,
          userId: mockUserId,
          displayName: "Jane Smith",
          primaryEmail: "jane@example.com",
          primaryPhone: null,
          photoUrl: null,
          source: null,
          lifecycleStage: null,
          confidenceScore: null,
          dateOfBirth: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          clientStatus: null,
          referralSource: null,
          address: null,
          healthContext: null,
          preferences: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastNote: null,
          tagsJson: "[]",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce([{ value: 1 }]);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.leftJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.offset.mockResolvedValue(mockRawItems);

      const result = await repo.listContactsWithLastNote(mockUserId);

      expect(result.items[0]?.tags).toEqual([]);
    });

    it("should filter by search term", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce([{ value: 1 }]);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.leftJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.groupBy.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.offset.mockResolvedValue([]);

      await repo.listContactsWithLastNote(mockUserId, { search: "john" });

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("getContactById", () => {
    it("should return contact when found", async () => {
      const mockContact: Contact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: "John Doe",
        primaryEmail: "john@example.com",
        primaryPhone: "+1234567890",
        photoUrl: null,
        source: null,
        lifecycleStage: null,
        confidenceScore: null,
        dateOfBirth: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        clientStatus: null,
        referralSource: null,
        address: null,
        healthContext: null,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockContact]);

      const result = await repo.getContactById(mockUserId, mockContactId);

      expect(result).toEqual(mockContact);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return null when contact not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await repo.getContactById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createContact", () => {
    it("should create a new contact", async () => {
      const contactData = {
        displayName: "New Contact",
        primaryEmail: "new@example.com",
        primaryPhone: "+1234567890",
      };

      const mockCreatedContact: Contact = {
        id: mockContactId,
        userId: mockUserId,
        ...contactData,
        photoUrl: null,
        source: null,
        lifecycleStage: null,
        confidenceScore: null,
        dateOfBirth: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        clientStatus: null,
        referralSource: null,
        address: null,
        healthContext: null,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockCreatedContact]);

      const result = await repo.createContact(mockUserId, contactData);

      expect(result).toEqual(mockCreatedContact);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should throw error when insert returns no data", async () => {
      const contactData = {
        displayName: "Test",
        primaryEmail: "test@example.com",
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      await expect(repo.createContact(mockUserId, contactData)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("updateContact", () => {
    it("should update contact fields", async () => {
      const updates = {
        displayName: "Updated Name",
        primaryEmail: "updated@example.com",
      };

      const mockUpdatedContact: Contact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: updates.displayName,
        primaryEmail: updates.primaryEmail,
        primaryPhone: null,
        photoUrl: null,
        source: null,
        lifecycleStage: null,
        confidenceScore: null,
        dateOfBirth: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        clientStatus: null,
        referralSource: null,
        address: null,
        healthContext: null,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockUpdatedContact]);

      const result = await repo.updateContact(mockUserId, mockContactId, updates);

      expect(result).toEqual(mockUpdatedContact);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it("should return null when contact not found", async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      const result = await repo.updateContact(mockUserId, "non-existent", {
        displayName: "Test",
      });

      expect(result).toBeNull();
    });

    it("should update timestamp automatically", async () => {
      const updates = { displayName: "Test" };

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      await repo.updateContact(mockUserId, mockContactId, updates);

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe("deleteContact", () => {
    it("should delete contact and return true", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{ id: mockContactId }]);

      const result = await repo.deleteContact(mockUserId, mockContactId);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should return false when contact not found", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      const result = await repo.deleteContact(mockUserId, "non-existent");

      expect(result).toBe(false);
    });
  });

  describe("findContactByEmail", () => {
    it("should find contact by email", async () => {
      const mockContact: Contact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: "John Doe",
        primaryEmail: "john@example.com",
        primaryPhone: null,
        photoUrl: null,
        source: null,
        lifecycleStage: null,
        confidenceScore: null,
        dateOfBirth: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        clientStatus: null,
        referralSource: null,
        address: null,
        healthContext: null,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockContact]);

      const result = await repo.findContactByEmail(mockUserId, "john@example.com");

      expect(result).toEqual(mockContact);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return null when email not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await repo.findContactByEmail(mockUserId, "nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("createContactsRepository factory", () => {
    it("should create a ContactsRepository instance", () => {
      const repo = createContactsRepository(mockDb as any);
      expect(repo).toBeInstanceOf(ContactsRepository);
    });
  });
});