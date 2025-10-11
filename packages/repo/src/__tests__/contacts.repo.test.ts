import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ContactsRepository } from "../contacts.repo";
import { getDb } from "@/server/db/client";
import { contacts, notes } from "@/server/db/schema";
import { isOk, isErr } from "@/lib/utils/result";

// Mock the database client
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("ContactsRepository", () => {
  const mockUserId = "test-user-123";
  const mockContactId = "contact-456";
  
  let mockDb: any;
  
  beforeEach(() => {
    // Create a fresh mock db for each test
    mockDb = {
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
    };
    
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listContacts", () => {
    it("should return paginated contacts with defaults", async () => {
      const mockContacts = [
        {
          id: "contact-1",
          userId: mockUserId,
          displayName: "John Doe",
          primaryEmail: "john@example.com",
          primaryPhone: "+1234567890",
          source: "manual",
          lifecycleStage: "New Client",
          tags: null,
          confidenceScore: "0.8",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-02"),
        },
      ];

      // Mock count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ count: 1 }]);

      // Mock main query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockContacts);

      const result = await ContactsRepository.listContacts(mockUserId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.items).toEqual(mockContacts);
        expect(result.data.total).toBe(1);
      }
    });

    it("should apply search filter when provided", async () => {
      const searchTerm = "john";
      
      // Mock count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]);

      // Mock main query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce([]);

      const result = await ContactsRepository.listContacts(mockUserId, { search: searchTerm });

      expect(isOk(result)).toBe(true);
      expect(mockDb.where).toHaveBeenCalledTimes(2);
    });

    it("should handle pagination parameters correctly", async () => {
      const page = 2;
      const pageSize = 25;
      
      // Mock count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ count: 100 }]);

      // Mock main query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce([]);

      await ContactsRepository.listContacts(mockUserId, { page, pageSize });

      expect(mockDb.limit).toHaveBeenCalledWith(pageSize);
      expect(mockDb.offset).toHaveBeenCalledWith(25);
    });

    it("should return error on database failure", async () => {
      const dbError = new Error("Database connection failed");
      vi.mocked(getDb).mockRejectedValueOnce(dbError);

      const result = await ContactsRepository.listContacts(mockUserId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
      }
    });
  });

  describe("getContactById", () => {
    it("should return a contact when found", async () => {
      const mockContact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: null,
        source: "google",
        lifecycleStage: "VIP Client",
        tags: null,
        confidenceScore: "0.95",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockContact]);

      const result = await ContactsRepository.getContactById(mockUserId, mockContactId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual(mockContact);
      }
    });

    it("should return null when contact not found", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await ContactsRepository.getContactById(mockUserId, "non-existent");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe("createContact", () => {
    it("should create a new contact successfully", async () => {
      const createData = {
        displayName: "New Contact",
        primaryEmail: "new@example.com",
        source: "manual" as const,
      };

      const mockCreatedContact = {
        id: "new-contact-id",
        userId: mockUserId,
        ...createData,
        primaryPhone: null,
        lifecycleStage: "New Lead",
        tags: null,
        confidenceScore: "1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockCreatedContact]);

      const result = await ContactsRepository.createContact(mockUserId, createData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.displayName).toBe(createData.displayName);
        expect(result.data.primaryEmail).toBe(createData.primaryEmail);
      }
    });

    it("should return error when insert fails", async () => {
      const createData = {
        displayName: "Test Contact",
        primaryEmail: "test@example.com",
        source: "manual" as const,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockRejectedValueOnce(new Error("Unique constraint violation"));

      const result = await ContactsRepository.createContact(mockUserId, createData);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
      }
    });
  });
});