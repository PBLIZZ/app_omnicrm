import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listContactsService,
  createContactService,
  type CreateContactInput,
} from "../contacts.service";
import * as contactsRepo from "../../../../packages/repo/src/contacts.repo";

// Mock the repository
vi.mock("../../../../packages/repo/src/contacts.repo", () => ({
  ContactsRepository: {
    listContacts: vi.fn(),
    createContact: vi.fn(),
  },
}));

describe("ContactsService", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listContactsService", () => {
    it("should call listContacts with correct parameters", async () => {
      const mockRepoResult = {
        items: [
          {
            id: "contact-1",
            userId: mockUserId,
            displayName: "John Doe",
            primaryEmail: "john@example.com",
            primaryPhone: "+1234567890",
            source: "manual" as const,
            lifecycleStage: "New Client",
            tags: null,
            confidenceScore: "0.8",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      };

      const expectedResult = {
        items: [
          {
            id: "contact-1",
            userId: mockUserId,
            displayName: "John Doe",
            primaryEmail: "john@example.com",
            primaryPhone: "+1234567890",
            source: "manual" as const,
            lifecycleStage: "New Client",
            tags: null,
            confidenceScore: "0.8",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastNote: null,
          },
        ],
        total: 1,
      };

      vi.mocked(contactsRepo.ContactsRepository.listContacts).mockResolvedValue(mockRepoResult);

      const params = {
        search: "john",
        sort: "displayName" as const,
        order: "asc" as const,
        page: 1,
        pageSize: 10,
      };

      const result = await listContactsService(mockUserId, params);

      expect(contactsRepo.ContactsRepository.listContacts).toHaveBeenCalledWith(mockUserId, params);
      expect(result).toEqual(expectedResult);
    });

    it("should handle empty search results", async () => {
      const mockResult = { items: [], total: 0 };
      vi.mocked(contactsRepo.ContactsRepository.listContacts).mockResolvedValue(mockResult);

      const params = {
        search: "nonexistent",
        sort: "displayName" as const,
        order: "asc" as const,
        page: 1,
        pageSize: 10,
      };

      const result = await listContactsService(mockUserId, params);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("createContactService", () => {
    it("should create contact with valid input", async () => {
      const mockContact = {
        id: "contact-1",
        userId: mockUserId,
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        notesCount: 0,
        lastNote: null,
      };

      vi.mocked(contactsRepo.ContactsRepository.createContact).mockResolvedValue(mockContact);

      const input: CreateContactInput = {
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual",
      };

      const result = await createContactService(mockUserId, input);

      expect(contactsRepo.ContactsRepository.createContact).toHaveBeenCalledWith({
        userId: mockUserId,
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        primaryPhone: "+1987654321",
        source: "manual",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });
      expect(result).toEqual(mockContact);
    });

    it("should handle empty string values by converting to null", async () => {
      const mockContact = {
        id: "contact-1",
        userId: mockUserId,
        displayName: "John Empty",
        primaryEmail: null,
        primaryPhone: null,
        source: "manual",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        notesCount: 0,
        lastNote: null,
      };

      vi.mocked(contactsRepo.ContactsRepository.createContact).mockResolvedValue(mockContact);

      const input: CreateContactInput = {
        displayName: "John Empty",
        primaryEmail: "   ", // Empty string with spaces
        primaryPhone: "", // Empty string
        source: "gmail_import",
      };

      const result = await createContactService(mockUserId, input);

      expect(contactsRepo.ContactsRepository.createContact).toHaveBeenCalledWith({
        userId: mockUserId,
        displayName: "John Empty",
        primaryEmail: null,
        primaryPhone: null,
        source: "gmail_import",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });
      expect(result).toEqual(mockContact);
    });

    it("should return null when repository returns null", async () => {
      vi.mocked(contactsRepo.ContactsRepository.createContact).mockResolvedValue(null);

      const input: CreateContactInput = {
        displayName: "Failed Contact",
        source: "manual",
      };

      const result = await createContactService(mockUserId, input);

      expect(result).toBeNull();
    });

    it("should handle undefined values correctly", async () => {
      const mockContact = {
        id: "contact-1",
        userId: mockUserId,
        displayName: "Minimal Contact",
        primaryEmail: null,
        primaryPhone: null,
        source: "upload",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        notesCount: 0,
        lastNote: null,
      };

      vi.mocked(contactsRepo.ContactsRepository.createContact).mockResolvedValue(mockContact);

      const input: CreateContactInput = {
        displayName: "Minimal Contact",
        primaryEmail: undefined,
        primaryPhone: undefined,
        source: "upload",
      };

      const result = await createContactService(mockUserId, input);

      expect(contactsRepo.ContactsRepository.createContact).toHaveBeenCalledWith({
        userId: mockUserId,
        displayName: "Minimal Contact",
        primaryEmail: null,
        primaryPhone: null,
        source: "upload",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });
      expect(result).toEqual(mockContact);
    });
  });
});
