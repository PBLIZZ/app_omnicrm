/**
 * Contact Management Tools Tests
 *
 * Tests for the 10 AI-callable contact management tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ToolExecutionContext } from "@/server/ai/tools/types";
import {
  getContactHandler,
  searchContactsHandler,
  listContactsHandler,
  createContactHandler,
  updateContactHandler,
  updateLifecycleStageHandler,
  getReferralSourcesHandler,
  addContactTagHandler,
  removeContactTagHandler,
  getContactTimelineHandler,
} from "../contacts";

// Mock dependencies
vi.mock("@/server/db/client");
vi.mock("@repo");

const mockContext: ToolExecutionContext = {
  userId: "user-123",
  threadId: "thread-123",
  messageId: "message-123",
  timestamp: new Date("2025-01-15T10:00:00Z"),
  requestId: "request-123",
};

describe("Contact Management Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get_contact", () => {
    it("should retrieve a contact by ID", async () => {
      const mockContact = {
        id: "contact-123",
        userId: "user-123",
        displayName: "Sarah Johnson",
        primaryEmail: "sarah@example.com",
        primaryPhone: "555-1234",
        lifecycleStage: "core_client",
        referralSource: "friend",
        photoUrl: null,
        source: null,
        clientStatus: null,
        confidenceScore: null,
        dateOfBirth: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        address: null,
        healthContext: null,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContactById: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const result = await getContactHandler(
        { contact_id: "contact-123" },
        mockContext,
      );

      expect(result).toEqual(mockContact);
      expect(mockRepo.getContactById).toHaveBeenCalledWith("user-123", "contact-123");
    });

    it("should throw error if contact not found", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContactById: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      await expect(
        getContactHandler({ contact_id: "contact-123" }, mockContext),
      ).rejects.toThrow("Contact with ID contact-123 not found");
    });
  });

  describe("search_contacts", () => {
    it("should search contacts by query", async () => {
      const mockContacts = [
        {
          id: "contact-1",
          userId: "user-123",
          displayName: "Sarah Johnson",
          primaryEmail: "sarah@example.com",
          lifecycleStage: "core_client",
        },
      ];

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        listContacts: vi.fn().mockResolvedValue({ items: mockContacts, total: 1 }),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const result = await searchContactsHandler(
        { query: "Sarah", limit: 20 },
        mockContext,
      );

      expect(result.contacts).toEqual(mockContacts);
      expect(result.count).toBe(1);
      expect(result.query).toBe("Sarah");
    });
  });

  describe("list_contacts", () => {
    it("should list contacts with pagination", async () => {
      const mockContacts = [
        {
          id: "contact-1",
          displayName: "Contact 1",
          lifecycleStage: "core_client",
        },
        {
          id: "contact-2",
          displayName: "Contact 2",
          lifecycleStage: "new_client",
        },
      ];

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        listContacts: vi.fn().mockResolvedValue({ items: mockContacts, total: 25 }),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const result = await listContactsHandler(
        { limit: 2, offset: 0 },
        mockContext,
      );

      expect(result.contacts).toEqual(mockContacts);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.hasMore).toBe(true);
    });

    it("should filter by lifecycle stage", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        listContacts: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      await listContactsHandler(
        { lifecycle_stage: "vip_client", limit: 50, offset: 0 },
        mockContext,
      );

      expect(mockRepo.listContacts).toHaveBeenCalledWith("user-123", {
        lifecycleStage: "vip_client",
        limit: 50,
        offset: 0,
      });
    });
  });

  describe("create_contact", () => {
    it("should create a new contact", async () => {
      const mockContact = {
        id: "contact-new",
        userId: "user-123",
        displayName: "New Contact",
        primaryEmail: "new@example.com",
        primaryPhone: "555-9999",
        lifecycleStage: "prospect",
        source: "referral",
        dateOfBirth: new Date("1990-01-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        createContact: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const result = await createContactHandler(
        {
          display_name: "New Contact",
          primary_email: "new@example.com",
          primary_phone: "555-9999",
          source: "referral",
          lifecycle_stage: "prospect",
          date_of_birth: new Date("1990-01-01"),
        },
        mockContext,
      );

      expect(result).toEqual(mockContact);
      expect(mockRepo.createContact).toHaveBeenCalledWith("user-123", {
        displayName: "New Contact",
        primaryEmail: "new@example.com",
        primaryPhone: "555-9999",
        source: "referral",
        lifecycleStage: "prospect",
        dateOfBirth: new Date("1990-01-01"),
      });
    });
  });

  describe("update_contact", () => {
    it("should update contact fields", async () => {
      const mockContact = {
        id: "contact-123",
        userId: "user-123",
        displayName: "Updated Name",
        primaryEmail: "updated@example.com",
        lifecycleStage: "core_client",
        updatedAt: new Date(),
      };

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        updateContact: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const result = await updateContactHandler(
        {
          contact_id: "contact-123",
          display_name: "Updated Name",
          primary_email: "updated@example.com",
        },
        mockContext,
      );

      expect(result).toEqual(mockContact);
      expect(mockRepo.updateContact).toHaveBeenCalledWith("user-123", "contact-123", {
        displayName: "Updated Name",
        primaryEmail: "updated@example.com",
      });
    });

    it("should throw error if contact not found", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        updateContact: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      await expect(
        updateContactHandler(
          { contact_id: "contact-123", display_name: "New Name" },
          mockContext,
        ),
      ).rejects.toThrow("Contact with ID contact-123 not found");
    });
  });

  describe("update_lifecycle_stage", () => {
    it("should update contact lifecycle stage", async () => {
      const mockContact = {
        id: "contact-123",
        userId: "user-123",
        displayName: "Sarah Johnson",
        lifecycleStage: "vip_client",
        updatedAt: new Date(),
      };

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        updateContact: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const result = await updateLifecycleStageHandler(
        {
          contact_id: "contact-123",
          lifecycle_stage: "vip_client",
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.newStage).toBe("vip_client");
      expect(mockRepo.updateContact).toHaveBeenCalledWith("user-123", "contact-123", {
        lifecycleStage: "vip_client",
      });
    });
  });

  describe("get_referral_sources", () => {
    it("should aggregate referral sources with counts", async () => {
      const mockContacts = [
        { id: "1", referralSource: "friend" },
        { id: "2", referralSource: "google" },
        { id: "3", referralSource: "friend" },
        { id: "4", referralSource: "instagram" },
        { id: "5", referralSource: null },
      ];

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        listContacts: vi.fn().mockResolvedValue({ items: mockContacts, total: 5 }),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const result = await getReferralSourcesHandler({ limit: 20 }, mockContext);

      expect(result.totalContacts).toBe(5);
      expect(result.contactsWithSource).toBe(4);
      expect(result.contactsWithoutSource).toBe(1);
      expect(result.sources).toHaveLength(3);
      expect(result.sources[0]?.source).toBe("friend");
      expect(result.sources[0]?.count).toBe(2);
    });
  });

  describe("add_contact_tag", () => {
    it("should add a tag to a contact", async () => {
      const mockContact = {
        id: "contact-123",
        displayName: "Sarah Johnson",
      };

      const mockTag = {
        id: "tag-456",
        name: "Yoga Client",
      };

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository, createTagsRepository } = await import("@repo");

      const mockContactsRepo = {
        getContactById: vi.fn().mockResolvedValue(mockContact),
      };

      const mockTagsRepo = {
        getTagById: vi.fn().mockResolvedValue(mockTag),
        getContactTags: vi.fn().mockResolvedValue([]),
        applyTagsToContact: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockContactsRepo as never);
      vi.mocked(createTagsRepository).mockReturnValue(mockTagsRepo as never);

      const result = await addContactTagHandler(
        {
          contact_id: "contact-123",
          tag_id: "tag-456",
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.contactName).toBe("Sarah Johnson");
      expect(result.tagName).toBe("Yoga Client");
      expect(result.alreadyTagged).toBe(false);
      expect(mockTagsRepo.applyTagsToContact).toHaveBeenCalledWith(
        "user-123",
        "contact-123",
        ["tag-456"],
        "user-123",
      );
    });

    it("should handle already tagged contact", async () => {
      const mockContact = {
        id: "contact-123",
        displayName: "Sarah Johnson",
      };

      const mockTag = {
        id: "tag-456",
        name: "Yoga Client",
      };

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository, createTagsRepository } = await import("@repo");

      const mockContactsRepo = {
        getContactById: vi.fn().mockResolvedValue(mockContact),
      };

      const mockTagsRepo = {
        getTagById: vi.fn().mockResolvedValue(mockTag),
        getContactTags: vi.fn().mockResolvedValue([mockTag]),
        applyTagsToContact: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockContactsRepo as never);
      vi.mocked(createTagsRepository).mockReturnValue(mockTagsRepo as never);

      const result = await addContactTagHandler(
        {
          contact_id: "contact-123",
          tag_id: "tag-456",
        },
        mockContext,
      );

      expect(result.alreadyTagged).toBe(true);
      expect(mockTagsRepo.applyTagsToContact).not.toHaveBeenCalled();
    });
  });

  describe("remove_contact_tag", () => {
    it("should remove a tag from a contact", async () => {
      const mockContact = {
        id: "contact-123",
        displayName: "Sarah Johnson",
      };

      const mockTag = {
        id: "tag-456",
        name: "Yoga Client",
      };

      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository, createTagsRepository } = await import("@repo");

      const mockContactsRepo = {
        getContactById: vi.fn().mockResolvedValue(mockContact),
      };

      const mockTagsRepo = {
        getTagById: vi.fn().mockResolvedValue(mockTag),
        removeTagsFromContact: vi.fn().mockResolvedValue(1),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockContactsRepo as never);
      vi.mocked(createTagsRepository).mockReturnValue(mockTagsRepo as never);

      const result = await removeContactTagHandler(
        {
          contact_id: "contact-123",
          tag_id: "tag-456",
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.removed).toBe(true);
      expect(mockTagsRepo.removeTagsFromContact).toHaveBeenCalledWith(
        "user-123",
        "contact-123",
        ["tag-456"],
      );
    });
  });

  describe("get_contact_timeline", () => {
    it("should return contact timeline with interactions and notes", async () => {
      const mockContact = {
        id: "contact-123",
        displayName: "Sarah Johnson",
      };

      const mockInteractions = [
        {
          id: "int-1",
          occurredAt: new Date("2025-01-15T10:00:00Z"),
          type: "email",
          subject: "Session booking",
          bodyText: "Would like to book a session",
          source: "gmail",
          sourceId: "msg-123",
        },
      ];

      const mockNotes = [
        {
          id: "note-1",
          createdAt: new Date("2025-01-14T09:00:00Z"),
          contentPlain: "Client is making great progress",
          sourceType: "typed",
        },
      ];

      const { getDb } = await import("@/server/db/client");
      const {
        createContactsRepository,
        createInteractionsRepository,
        createNotesRepository,
      } = await import("@repo");

      const mockContactsRepo = {
        getContactById: vi.fn().mockResolvedValue(mockContact),
      };

      const mockInteractionsRepo = {
        listInteractions: vi.fn().mockResolvedValue({ items: mockInteractions, total: 1 }),
      };

      const mockNotesRepo = {
        getNotesByContactId: vi.fn().mockResolvedValue(mockNotes),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockContactsRepo as never);
      vi.mocked(createInteractionsRepository).mockReturnValue(mockInteractionsRepo as never);
      vi.mocked(createNotesRepository).mockReturnValue(mockNotesRepo as never);

      const result = await getContactTimelineHandler(
        {
          contact_id: "contact-123",
          limit: 50,
          include_types: ["interaction", "note"],
        },
        mockContext,
      );

      expect(result.contactName).toBe("Sarah Johnson");
      expect(result.totalEvents).toBe(2);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]?.type).toBe("interaction");
      expect(result.events[0]?.title).toBe("Session booking");
      expect(result.events[1]?.type).toBe("note");
    });

    it("should only include requested event types", async () => {
      const mockContact = {
        id: "contact-123",
        displayName: "Sarah Johnson",
      };

      const mockInteractions = [
        {
          id: "int-1",
          occurredAt: new Date("2025-01-15T10:00:00Z"),
          type: "email",
          subject: "Test",
          bodyText: null,
          source: null,
          sourceId: null,
        },
      ];

      const { getDb } = await import("@/server/db/client");
      const {
        createContactsRepository,
        createInteractionsRepository,
        createNotesRepository,
      } = await import("@repo");

      const mockContactsRepo = {
        getContactById: vi.fn().mockResolvedValue(mockContact),
      };

      const mockInteractionsRepo = {
        listInteractions: vi.fn().mockResolvedValue({ items: mockInteractions, total: 1 }),
      };

      const mockNotesRepo = {
        getNotesByContactId: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockContactsRepo as never);
      vi.mocked(createInteractionsRepository).mockReturnValue(mockInteractionsRepo as never);
      vi.mocked(createNotesRepository).mockReturnValue(mockNotesRepo as never);

      const result = await getContactTimelineHandler(
        {
          contact_id: "contact-123",
          limit: 50,
          include_types: ["interaction"],
        },
        mockContext,
      );

      expect(result.events).toHaveLength(1);
      expect(result.events[0]?.type).toBe("interaction");
      expect(mockNotesRepo.getNotesByContactId).not.toHaveBeenCalled();
    });
  });
});
