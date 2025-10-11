import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  askAIAboutContactService,
  enrichAllContacts,
  enrichAllContactsStreaming,
  enrichContactsByIds,
  contactNeedsEnrichment,
  getEnrichmentStats,
  type EnrichmentProgress,
  type EnrichmentResult,
} from "../contacts-ai.service";
import * as generateContactInsights from "@/server/ai/contacts/generate-contact-insights";
import * as askAIAboutContact from "@/server/ai/contacts/ask-ai-about-contact";
import { ContactsRepository } from "@repo";
import * as contactsService from "@/server/services/contacts.service";
import { getDb } from "@/server/db/client";
import { logger } from "@/lib/observability";

// Mock all dependencies
vi.mock("@/server/ai/contacts/generate-contact-insights");
vi.mock("@/server/ai/contacts/ask-ai-about-contact");
vi.mock("@repo");
vi.mock("@/server/services/contacts.service");
vi.mock("@/server/db/client");
vi.mock("@/lib/observability");

describe("ContactsAIService", () => {
  const mockUserId = "user-123";
  const mockContactId = "contact-456";

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock logger to avoid noise
    vi.mocked(logger.info).mockResolvedValue();
    vi.mocked(logger.error).mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("askAIAboutContactService", () => {
    it("should successfully ask AI about a contact", async () => {
      const mockInsight = {
        insights: {
          wellnessGoals: ["Weight loss", "Stress management"],
          preferences: ["Morning workouts", "Yoga"],
          engagementLevel: "high",
          risks: [],
          opportunities: ["Referral potential"],
          nextSteps: ["Schedule follow-up"],
        },
        confidence: 0.85,
      };

      vi.mocked(askAIAboutContact.askAIAboutContact).mockResolvedValue(mockInsight);

      const result = await askAIAboutContactService(mockUserId, mockContactId);

      expect(result).toEqual(mockInsight);
      expect(askAIAboutContact.askAIAboutContact).toHaveBeenCalledWith(mockUserId, mockContactId);
    });

    it("should throw error for invalid userId", async () => {
      await expect(askAIAboutContactService("", mockContactId)).rejects.toThrow(
        "userId must be a non-empty string",
      );
    });

    it("should throw error for invalid contactId", async () => {
      await expect(askAIAboutContactService(mockUserId, "")).rejects.toThrow(
        "contactId must be a non-empty string",
      );
    });

    it("should handle AI service errors gracefully", async () => {
      const aiError = new Error("AI service unavailable");
      vi.mocked(askAIAboutContact.askAIAboutContact).mockRejectedValue(aiError);

      await expect(askAIAboutContactService(mockUserId, mockContactId)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Error asking AI about contact"),
        }),
      );
    });

    it("should validate userId is a string", async () => {
      await expect(
        askAIAboutContactService(null as any, mockContactId),
      ).rejects.toThrow("userId must be a non-empty string");
    });

    it("should validate contactId is a string", async () => {
      await expect(
        askAIAboutContactService(mockUserId, undefined as any),
      ).rejects.toThrow("contactId must be a non-empty string");
    });

    it("should trim whitespace-only userId", async () => {
      await expect(askAIAboutContactService("   ", mockContactId)).rejects.toThrow(
        "userId must be a non-empty string",
      );
    });
  });

  describe("enrichAllContacts", () => {
    const mockContacts = [
      {
        id: "contact-1",
        userId: mockUserId,
        displayName: "John Doe",
        primaryEmail: "john@example.com",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      },
      {
        id: "contact-2",
        userId: mockUserId,
        displayName: "Jane Smith",
        primaryEmail: "jane@example.com",
        lifecycleStage: "Prospect",
        tags: ["vip"],
        confidenceScore: "0.5",
      },
    ];

    beforeEach(() => {
      vi.mocked(contactsService.listContactsService).mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      vi.mocked(generateContactInsights.generateContactInsights).mockResolvedValue({
        success: true,
        data: {
          lifecycleStage: "New Client",
          tags: ["health-focused"],
          confidenceScore: 0.8,
        },
      });

      const mockDb = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
          }),
        }),
      };
      vi.mocked(getDb).mockReturnValue(mockDb as any);
    });

    it("should enrich all contacts without lifecycle stage", async () => {
      const result = await enrichAllContacts(mockUserId);

      expect(result).toMatchObject({
        enrichedCount: 1,
        totalRequested: 1,
        message: expect.stringContaining("enriched"),
      });
      expect(contactsService.listContactsService).toHaveBeenCalledWith(mockUserId, {
        page: 1,
        pageSize: 1000,
      });
    });

    it("should skip contacts that already have lifecycle stage", async () => {
      const result = await enrichAllContacts(mockUserId);

      // Only contact-1 should be enriched (contact-2 has lifecycleStage)
      expect(generateContactInsights.generateContactInsights).toHaveBeenCalledTimes(1);
      expect(generateContactInsights.generateContactInsights).toHaveBeenCalledWith(
        mockUserId,
        "contact-1",
      );
    });

    it("should handle enrichment errors gracefully", async () => {
      vi.mocked(generateContactInsights.generateContactInsights).mockResolvedValue({
        success: false,
        error: new Error("AI enrichment failed"),
      });

      const result = await enrichAllContacts(mockUserId);

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toContain("AI enrichment failed");
      expect(result.enrichedCount).toBe(0);
    });

    it("should handle database update errors", async () => {
      const mockDb = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error("DB error")),
          }),
        }),
      };
      vi.mocked(getDb).mockReturnValue(mockDb as any);

      const result = await enrichAllContacts(mockUserId);

      expect(result.errors).toBeDefined();
      expect(result.enrichedCount).toBe(0);
    });

    it("should validate lifecycle stages", async () => {
      vi.mocked(generateContactInsights.generateContactInsights).mockResolvedValue({
        success: true,
        data: {
          lifecycleStage: "InvalidStage" as any,
          tags: ["test"],
          confidenceScore: 0.7,
        },
      });

      const result = await enrichAllContacts(mockUserId);

      // Should default to "Prospect" for invalid stages
      expect(result.enrichedCount).toBe(1);
    });

    it("should handle empty contact list", async () => {
      vi.mocked(contactsService.listContactsService).mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await enrichAllContacts(mockUserId);

      expect(result).toMatchObject({
        enrichedCount: 0,
        totalRequested: 0,
        message: "No contacts need enrichment",
      });
    });

    it("should process large batches efficiently", async () => {
      const largeContactList = Array.from({ length: 50 }, (_, i) => ({
        id: `contact-${i}`,
        userId: mockUserId,
        displayName: `Contact ${i}`,
        primaryEmail: `contact${i}@example.com`,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      }));

      vi.mocked(contactsService.listContactsService).mockResolvedValue({
        items: largeContactList,
        total: largeContactList.length,
      });

      const result = await enrichAllContacts(mockUserId, { batchSize: 10, delayMs: 0 });

      expect(result.enrichedCount).toBe(largeContactList.length);
      expect(generateContactInsights.generateContactInsights).toHaveBeenCalledTimes(
        largeContactList.length,
      );
    });
  });

  describe("enrichAllContactsStreaming", () => {
    const mockContacts = [
      {
        id: "contact-1",
        userId: mockUserId,
        displayName: "John Doe",
        primaryEmail: "john@example.com",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      },
    ];

    beforeEach(() => {
      vi.mocked(contactsService.listContactsService).mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      vi.mocked(generateContactInsights.generateContactInsights).mockResolvedValue({
        success: true,
        data: {
          lifecycleStage: "New Client",
          tags: ["wellness"],
          confidenceScore: 0.85,
        },
      });

      const mockDb = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
          }),
        }),
      };
      vi.mocked(getDb).mockReturnValue(mockDb as any);
    });

    it("should stream enrichment progress events", async () => {
      const events: EnrichmentProgress[] = [];
      const stream = enrichAllContactsStreaming(mockUserId);

      for await (const event of stream) {
        events.push(event);
      }

      expect(events).toContainEqual(
        expect.objectContaining({ type: "start", total: mockContacts.length }),
      );
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "enriched",
          contactId: "contact-1",
          contactName: "John Doe",
        }),
      );
      expect(events).toContainEqual(
        expect.objectContaining({ type: "complete", enrichedCount: 1, total: 1 }),
      );
    });

    it("should stream error events for failed enrichments", async () => {
      vi.mocked(generateContactInsights.generateContactInsights).mockResolvedValue({
        success: false,
        error: new Error("Enrichment failed"),
      });

      const events: EnrichmentProgress[] = [];
      const stream = enrichAllContactsStreaming(mockUserId);

      for await (const event of stream) {
        events.push(event);
      }

      expect(events).toContainEqual(
        expect.objectContaining({
          type: "error",
          contactId: "contact-1",
          error: expect.stringContaining("Enrichment failed"),
        }),
      );
    });

    it("should stream progress events with enrichment details", async () => {
      const events: EnrichmentProgress[] = [];
      const stream = enrichAllContactsStreaming(mockUserId);

      for await (const event of stream) {
        events.push(event);
      }

      const enrichedEvent = events.find((e) => e.type === "enriched");
      expect(enrichedEvent).toMatchObject({
        type: "enriched",
        contactName: "John Doe",
        lifecycleStage: "New Client",
        tags: ["wellness"],
        confidenceScore: 0.85,
      });
    });

    it("should handle streaming with no contacts to enrich", async () => {
      vi.mocked(contactsService.listContactsService).mockResolvedValue({
        items: [],
        total: 0,
      });

      const events: EnrichmentProgress[] = [];
      const stream = enrichAllContactsStreaming(mockUserId);

      for await (const event of stream) {
        events.push(event);
      }

      expect(events).toHaveLength(2); // start and complete
      expect(events[0]).toMatchObject({ type: "start", total: 0 });
      expect(events[1]).toMatchObject({ type: "complete", enrichedCount: 0, total: 0 });
    });
  });

  describe("enrichContactsByIds", () => {
    const contactIds = ["contact-1", "contact-2"];

    beforeEach(() => {
      vi.mocked(ContactsRepository.findContactById).mockImplementation(async (userId, id) => ({
        id,
        userId,
        displayName: `Contact ${id}`,
        primaryEmail: `${id}@example.com`,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      vi.mocked(generateContactInsights.generateContactInsights).mockResolvedValue({
        success: true,
        data: {
          lifecycleStage: "New Client",
          tags: ["enriched"],
          confidenceScore: 0.8,
        },
      });

      const mockDb = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
          }),
        }),
      };
      vi.mocked(getDb).mockReturnValue(mockDb as any);
    });

    it("should enrich specific contacts by IDs", async () => {
      const result = await enrichContactsByIds(mockUserId, contactIds);

      expect(result.enrichedCount).toBe(2);
      expect(result.totalRequested).toBe(2);
      expect(ContactsRepository.findContactById).toHaveBeenCalledTimes(2);
    });

    it("should skip non-existent contacts", async () => {
      vi.mocked(ContactsRepository.findContactById).mockResolvedValueOnce(null as any);

      const result = await enrichContactsByIds(mockUserId, contactIds);

      expect(result.enrichedCount).toBe(1);
      expect(result.errors).toContainEqual(expect.stringContaining("not found"));
    });

    it("should handle empty contact IDs array", async () => {
      const result = await enrichContactsByIds(mockUserId, []);

      expect(result).toMatchObject({
        enrichedCount: 0,
        totalRequested: 0,
        message: "No contacts provided",
      });
    });

    it("should handle partial enrichment failures", async () => {
      vi.mocked(generateContactInsights.generateContactInsights)
        .mockResolvedValueOnce({
          success: true,
          data: {
            lifecycleStage: "New Client",
            tags: ["enriched"],
            confidenceScore: 0.8,
          },
        })
        .mockResolvedValueOnce({
          success: false,
          error: new Error("AI failed"),
        });

      const result = await enrichContactsByIds(mockUserId, contactIds);

      expect(result.enrichedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("contactNeedsEnrichment", () => {
    beforeEach(() => {
      vi.mocked(ContactsRepository.findContactById).mockResolvedValue({
        id: mockContactId,
        userId: mockUserId,
        displayName: "Test Contact",
        primaryEmail: "test@example.com",
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should return true for contacts without lifecycle stage", async () => {
      const result = await contactNeedsEnrichment(mockUserId, mockContactId);
      expect(result).toBe(true);
    });

    it("should return false for contacts with lifecycle stage", async () => {
      vi.mocked(ContactsRepository.findContactById).mockResolvedValue({
        id: mockContactId,
        userId: mockUserId,
        displayName: "Test Contact",
        primaryEmail: "test@example.com",
        lifecycleStage: "New Client",
        tags: ["wellness"],
        confidenceScore: "0.8",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await contactNeedsEnrichment(mockUserId, mockContactId);
      expect(result).toBe(false);
    });

    it("should return false for non-existent contacts", async () => {
      vi.mocked(ContactsRepository.findContactById).mockResolvedValue(null as any);

      const result = await contactNeedsEnrichment(mockUserId, mockContactId);
      expect(result).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(ContactsRepository.findContactById).mockRejectedValue(
        new Error("DB connection failed"),
      );

      await expect(contactNeedsEnrichment(mockUserId, mockContactId)).rejects.toThrow();
    });
  });

  describe("getEnrichmentStats", () => {
    beforeEach(() => {
      vi.mocked(contactsService.listContactsService).mockResolvedValue({
        items: [
          { lifecycleStage: "New Client" },
          { lifecycleStage: null },
          { lifecycleStage: "Prospect" },
          { lifecycleStage: null },
        ] as any,
        total: 4,
      });
    });

    it("should return enrichment statistics", async () => {
      const stats = await getEnrichmentStats(mockUserId);

      expect(stats).toMatchObject({
        total: 4,
        enriched: 2,
        needsEnrichment: 2,
        percentage: 50,
      });
    });

    it("should handle empty contact list", async () => {
      vi.mocked(contactsService.listContactsService).mockResolvedValue({
        items: [],
        total: 0,
      });

      const stats = await getEnrichmentStats(mockUserId);

      expect(stats).toMatchObject({
        total: 0,
        enriched: 0,
        needsEnrichment: 0,
        percentage: 0,
      });
    });

    it("should handle all contacts enriched", async () => {
      vi.mocked(contactsService.listContactsService).mockResolvedValue({
        items: [
          { lifecycleStage: "New Client" },
          { lifecycleStage: "Prospect" },
        ] as any,
        total: 2,
      });

      const stats = await getEnrichmentStats(mockUserId);

      expect(stats).toMatchObject({
        total: 2,
        enriched: 2,
        needsEnrichment: 0,
        percentage: 100,
      });
    });
  });
});