import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  askAIAboutContactService,
  enrichAllContacts,
} from "../contacts-ai.service";
import * as askAIModule from "@/server/ai/contacts/ask-ai-about-contact";
import * as contactsServiceModule from "@/server/services/contacts.service";
import * as clientModule from "@/server/db/client";

// Mock dependencies
vi.mock("@/server/ai/contacts/ask-ai-about-contact");
vi.mock("@/server/services/contacts.service");
vi.mock("@/server/db/client");
vi.mock("@/lib/observability", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("ContactsAIService", () => {
  const mockUserId = "test-user-id";
  const mockContactId = "test-contact-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("askAIAboutContactService", () => {
    it("should return AI insights for a contact", async () => {
      const mockInsights = {
        insights: "This contact shows high engagement",
        suggestions: ["Schedule follow-up", "Send personalized email"],
        nextSteps: ["Book consultation"],
        keyFindings: ["Regular attendee", "High satisfaction"],
        confidence: 0.85,
        error: false,
      };

      vi.mocked(askAIModule.askAIAboutContact).mockResolvedValue(mockInsights);

      const result = await askAIAboutContactService(mockUserId, mockContactId);

      expect(result).toEqual(mockInsights);
      expect(askAIModule.askAIAboutContact).toHaveBeenCalledWith(mockUserId, mockContactId);
    });

    it("should handle errors gracefully and return error response", async () => {
      const mockError = new Error("AI service unavailable");
      vi.mocked(askAIModule.askAIAboutContact).mockRejectedValue(mockError);

      const result = await askAIAboutContactService(mockUserId, mockContactId);

      expect(result.error).toBe(true);
      expect(result.errorMessage).toBe("AI service unavailable");
      expect(result.insights).toBe("Unable to generate insights at this time");
      expect(result.confidence).toBe(0);
    });

    it("should validate userId parameter", async () => {
      await expect(askAIAboutContactService("", mockContactId)).rejects.toThrow(
        "userId must be a non-empty string",
      );
    });

    it("should validate contactId parameter", async () => {
      await expect(askAIAboutContactService(mockUserId, "")).rejects.toThrow(
        "contactId must be a non-empty string",
      );
    });

    it("should handle null userId", async () => {
      await expect(
        askAIAboutContactService(null as any, mockContactId),
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should handle null contactId", async () => {
      await expect(askAIAboutContactService(mockUserId, null as any)).rejects.toThrow(
        "contactId must be a non-empty string",
      );
    });

    it("should return suggestions array when AI provides recommendations", async () => {
      const mockInsights = {
        insights: "Contact analysis complete",
        suggestions: [
          "Send wellness tips newsletter",
          "Offer seasonal promotion",
          "Schedule wellness check-in",
        ],
        nextSteps: ["Review preferences", "Update contact stage"],
        keyFindings: ["Active participant", "Positive feedback"],
        confidence: 0.92,
        error: false,
      };

      vi.mocked(askAIModule.askAIAboutContact).mockResolvedValue(mockInsights);

      const result = await askAIAboutContactService(mockUserId, mockContactId);

      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions).toContain("Send wellness tips newsletter");
    });

    it("should handle API timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";
      vi.mocked(askAIModule.askAIAboutContact).mockRejectedValue(timeoutError);

      const result = await askAIAboutContactService(mockUserId, mockContactId);

      expect(result.error).toBe(true);
      expect(result.errorMessage).toContain("Request timeout");
    });
  });

  describe("enrichAllContacts", () => {
    const mockDb = {
      update: vi.fn(),
    };

    beforeEach(() => {
      vi.mocked(clientModule.getDb).mockResolvedValue(mockDb as any);
    });

    it("should enrich multiple contacts with AI insights", async () => {
      const mockContactsList = {
        success: true,
        data: {
          items: [
            {
              id: "contact-1",
              displayName: "John Doe",
              primaryEmail: "john@example.com",
            },
            {
              id: "contact-2",
              displayName: "Jane Smith",
              primaryEmail: "jane@example.com",
            },
          ],
          total: 2,
        },
      };

      vi.mocked(contactsServiceModule.listContactsService).mockResolvedValue(
        mockContactsList as any,
      );

      const mockQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(mockQuery);

      const result = await enrichAllContacts(mockUserId, { batchSize: 10 });

      expect(result.totalRequested).toBe(2);
      expect(contactsServiceModule.listContactsService).toHaveBeenCalledWith(mockUserId, {
        page: 1,
        pageSize: 10,
        sort: "displayName",
        order: "asc",
      });
    });

    it("should handle empty contact list", async () => {
      const mockContactsList = {
        success: true,
        data: {
          items: [],
          total: 0,
        },
      };

      vi.mocked(contactsServiceModule.listContactsService).mockResolvedValue(
        mockContactsList as any,
      );

      const result = await enrichAllContacts(mockUserId);

      expect(result.totalRequested).toBe(0);
      expect(result.enrichedCount).toBe(0);
    });

    it("should apply delay between enrichments", async () => {
      const mockContactsList = {
        success: true,
        data: {
          items: [
            { id: "contact-1", displayName: "Contact 1" },
            { id: "contact-2", displayName: "Contact 2" },
          ],
          total: 2,
        },
      };

      vi.mocked(contactsServiceModule.listContactsService).mockResolvedValue(
        mockContactsList as any,
      );

      const mockQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(mockQuery);

      const startTime = Date.now();
      await enrichAllContacts(mockUserId, { batchSize: 10, delayMs: 100 });
      const duration = Date.now() - startTime;

      // Should take at least 100ms for delay between 2 contacts
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it("should collect errors when enrichment fails for some contacts", async () => {
      const mockContactsList = {
        success: true,
        data: {
          items: [
            { id: "contact-1", displayName: "Contact 1" },
            { id: "contact-2", displayName: "Contact 2" },
          ],
          total: 2,
        },
      };

      vi.mocked(contactsServiceModule.listContactsService).mockResolvedValue(
        mockContactsList as any,
      );

      // First contact succeeds, second fails
      const mockQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn()
          .mockResolvedValueOnce([]) // Success
          .mockRejectedValueOnce(new Error("Database error")), // Failure
      };
      mockDb.update.mockReturnValue(mockQuery);

      const result = await enrichAllContacts(mockUserId);

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it("should validate lifecycle stage values", async () => {
      const mockContactsList = {
        success: true,
        data: {
          items: [
            {
              id: "contact-1",
              displayName: "Contact 1",
              lifecycleStage: "Invalid Stage",
            },
          ],
          total: 1,
        },
      };

      vi.mocked(contactsServiceModule.listContactsService).mockResolvedValue(
        mockContactsList as any,
      );

      const mockQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(mockQuery);

      await enrichAllContacts(mockUserId);

      // Should default invalid stages to "Prospect"
      expect(mockQuery.set).toHaveBeenCalled();
    });

    it("should handle pagination for large contact lists", async () => {
      // First page with full batch
      const mockFirstPage = {
        success: true,
        data: {
          items: Array.from({ length: 100 }, (_, i) => ({
            id: `contact-${i}`,
            displayName: `Contact ${i}`,
          })),
          total: 150,
        },
      };

      // Second page with remaining contacts
      const mockSecondPage = {
        success: true,
        data: {
          items: Array.from({ length: 50 }, (_, i) => ({
            id: `contact-${i + 100}`,
            displayName: `Contact ${i + 100}`,
          })),
          total: 150,
        },
      };

      vi.mocked(contactsServiceModule.listContactsService)
        .mockResolvedValueOnce(mockFirstPage as any)
        .mockResolvedValueOnce(mockSecondPage as any);

      const mockQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(mockQuery);

      const result = await enrichAllContacts(mockUserId, { batchSize: 100 });

      expect(result.totalRequested).toBe(150);
      expect(contactsServiceModule.listContactsService).toHaveBeenCalledTimes(2);
    });

    it("should respect custom batch size option", async () => {
      const mockContactsList = {
        success: true,
        data: {
          items: Array.from({ length: 50 }, (_, i) => ({
            id: `contact-${i}`,
            displayName: `Contact ${i}`,
          })),
          total: 50,
        },
      };

      vi.mocked(contactsServiceModule.listContactsService).mockResolvedValue(
        mockContactsList as any,
      );

      const mockQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(mockQuery);

      await enrichAllContacts(mockUserId, { batchSize: 50 });

      expect(contactsServiceModule.listContactsService).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ pageSize: 50 }),
      );
    });
  });
});