/**
 * Unit tests for ClientEnrichmentService
 * 
 * Tests comprehensive client enrichment functionality including:
 * - Individual client enrichment
 * - Bulk client enrichment
 * - Streaming enrichment with progress updates
 * - Enrichment statistics and health checks
 * - Error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ClientEnrichmentService } from "./client-enrichment.service";
import { ContactsRepository } from "@repo";
import { makeOmniClientWithNotes, makeBatch } from "@packages/testing";

// Mock dependencies
vi.mock("@/server/ai/clients/generate-contact-insights");
vi.mock("@/server/services/contacts.service");
vi.mock("@/server/db/client");
vi.mock("@/lib/observability");
vi.mock("@repo", () => ({
  ContactsRepository: {
    getContactsByIds: vi.fn(),
    getContactById: vi.fn(),
    updateContact: vi.fn(),
  },
}));

const mockGenerateContactInsights = vi.fn();
const mockListContactsService = vi.fn();
const mockGetDb = vi.fn();
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe("ClientEnrichmentService", () => {
  const testUserId = "test-user-123";
  const testContactId = "test-contact-456";

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup mocks
    let { generateContactInsights } = await import("@/server/ai/clients/generate-contact-insights");
    (generateContactInsights as any) = mockGenerateContactInsights;
    
    let { listContactsService } = await import("@/server/services/contacts.service");
    (listContactsService as any) = mockListContactsService;
    
    let { getDb } = await import("@/server/db/client");
    (getDb as any) = mockGetDb;
    
    const { logger } = await import("@/lib/observability");
    Object.assign(logger, mockLogger);

    // Default mock database
    mockGetDb.mockResolvedValue({
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("enrichAllClients", () => {
    it("should successfully enrich all clients with AI insights", async () => {
      const mockContacts = makeBatch(() => 
        makeOmniClientWithNotes({
          userId: testUserId,
          primaryEmail: "test@example.com",
        }), 
        3
      );

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      mockGenerateContactInsights.mockResolvedValue({
        lifecycleStage: "Core Client",
        tags: ["wellness", "regular"],
        confidenceScore: 85,
      });

      const result = await ClientEnrichmentService.enrichAllClients(testUserId, {
        delayMs: 0, // No delay for tests
      });

      expect(result.enrichedCount).toBe(3);
      expect(result.totalRequested).toBe(3);
      expect(result.message).toContain("Successfully enriched 3 of 3 contacts");
      expect(mockGenerateContactInsights).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Client enrichment completed",
        expect.objectContaining({
          operation: "client_enrichment_all",
        })
      );
    });

    it("should skip contacts without email addresses", async () => {
      const mockContacts = [
        makeOmniClientWithNotes({ userId: testUserId, primaryEmail: "test@example.com" }),
        makeOmniClientWithNotes({ userId: testUserId, primaryEmail: null }),
      ];

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      mockGenerateContactInsights.mockResolvedValue({
        lifecycleStage: "Prospect",
        tags: ["new"],
        confidenceScore: 50,
      });

      const result = await ClientEnrichmentService.enrichAllClients(testUserId, {
        delayMs: 0,
      });

      expect(result.enrichedCount).toBe(1);
      expect(result.totalRequested).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toContain("No email address to analyze");
      expect(mockGenerateContactInsights).toHaveBeenCalledTimes(1);
    });

    it("should handle errors during individual enrichment", async () => {
      const mockContacts = makeBatch(() =>
        makeOmniClientWithNotes({
          userId: testUserId,
          primaryEmail: "test@example.com",
        }),
        2
      );

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      mockGenerateContactInsights
        .mockResolvedValueOnce({
          lifecycleStage: "New Client",
          tags: ["engaged"],
          confidenceScore: 70,
        })
        .mockRejectedValueOnce(new Error("AI service unavailable"));

      const result = await ClientEnrichmentService.enrichAllClients(testUserId, {
        delayMs: 0,
      });

      expect(result.enrichedCount).toBe(1);
      expect(result.totalRequested).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toContain("AI service unavailable");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should return appropriate message when no clients found", async () => {
      mockListContactsService.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await ClientEnrichmentService.enrichAllClients(testUserId);

      expect(result.enrichedCount).toBe(0);
      expect(result.totalRequested).toBe(0);
      expect(result.message).toBe("No clients found to enrich");
      expect(mockGenerateContactInsights).not.toHaveBeenCalled();
    });

    it("should validate and normalize lifecycle stages", async () => {
      const mockContacts = [
        makeOmniClientWithNotes({ userId: testUserId, primaryEmail: "test@example.com" }),
      ];

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: 1,
      });

      // Return an invalid stage that should default to "Prospect"
      mockGenerateContactInsights.mockResolvedValue({
        lifecycleStage: "Invalid Stage",
        tags: ["test"],
        confidenceScore: 60,
      });

      const db = await mockGetDb();
      const updateSpy = vi.spyOn(db, "update");

      await ClientEnrichmentService.enrichAllClients(testUserId, { delayMs: 0 });

      expect(updateSpy).toHaveBeenCalled();
      // Should normalize invalid stage to "Prospect"
      const setCall = updateSpy.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycleStage: "Prospect",
        })
      );
    });

    it("should respect batch size option", async () => {
      const mockContacts = makeBatch(() =>
        makeOmniClientWithNotes({ userId: testUserId, primaryEmail: "test@example.com" }),
        10
      );

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      mockGenerateContactInsights.mockResolvedValue({
        lifecycleStage: "Prospect",
        tags: [],
        confidenceScore: 50,
      });

      await ClientEnrichmentService.enrichAllClients(testUserId, {
        batchSize: 500,
        delayMs: 0,
      });

      expect(mockListContactsService).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          pageSize: 500,
        })
      );
    });
  });

  describe("enrichAllClientsStreaming", () => {
    it("should yield progress updates during streaming enrichment", async () => {
      const mockContacts = makeBatch(() =>
        makeOmniClientWithNotes({
          userId: testUserId,
          primaryEmail: "test@example.com",
          displayName: "Test Client",
        }),
        2
      );

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      mockGenerateContactInsights.mockResolvedValue({
        lifecycleStage: "Core Client",
        tags: ["active"],
        confidenceScore: 90,
      });

      const generator = ClientEnrichmentService.enrichAllClientsStreaming(testUserId, {
        delayMs: 0,
      });

      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }

      // Should have: start, progress (x2), enriched (x2), complete
      expect(events.length).toBeGreaterThanOrEqual(5);
      expect(events[0].type).toBe("start");
      expect(events[0].total).toBe(2);
      expect(events[events.length - 1].type).toBe("complete");
      expect(events[events.length - 1].enrichedCount).toBe(2);

      // Should have enriched events
      const enrichedEvents = events.filter(e => e.type === "enriched");
      expect(enrichedEvents).toHaveLength(2);
      expect(enrichedEvents[0]).toHaveProperty("lifecycleStage");
      expect(enrichedEvents[0]).toHaveProperty("tags");
      expect(enrichedEvents[0]).toHaveProperty("confidenceScore");
    });

    it("should yield error events for failed enrichments during streaming", async () => {
      const mockContacts = makeBatch(() =>
        makeOmniClientWithNotes({
          userId: testUserId,
          primaryEmail: "test@example.com",
        }),
        2
      );

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      mockGenerateContactInsights
        .mockResolvedValueOnce({
          lifecycleStage: "New Client",
          tags: ["test"],
          confidenceScore: 60,
        })
        .mockRejectedValueOnce(new Error("Enrichment failed"));

      const generator = ClientEnrichmentService.enrichAllClientsStreaming(testUserId, {
        delayMs: 0,
      });

      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }

      const errorEvents = events.filter(e => e.type === "error");
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0].error).toContain("Enrichment failed");
    });

    it("should handle empty contact list in streaming mode", async () => {
      mockListContactsService.mockResolvedValue({
        items: [],
        total: 0,
      });

      const generator = ClientEnrichmentService.enrichAllClientsStreaming(testUserId);

      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe("start");
      expect(events[1].type).toBe("complete");
      expect(events[1].message).toContain("No clients found");
    });

    it("should yield error event if streaming fails completely", async () => {
      mockListContactsService.mockRejectedValue(new Error("Database connection failed"));

      const generator = ClientEnrichmentService.enrichAllClientsStreaming(testUserId);

      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("error");
      expect(events[0].error).toContain("Database connection failed");
    });
  });

  describe("enrichClientsByIds", () => {
    it("should enrich specific clients by their IDs", async () => {
      const clientIds = ["client-1", "client-2"];
      const mockClients = clientIds.map(id =>
        makeOmniClientWithNotes({
          id,
          userId: testUserId,
          primaryEmail: "test@example.com",
        })
      );

      vi.mocked(ContactsRepository.getContactsByIds).mockResolvedValue(mockClients as any);

      mockGenerateContactInsights.mockResolvedValue({
        lifecycleStage: "VIP Client",
        tags: ["high-value"],
        confidenceScore: 95,
      });

      const result = await ClientEnrichmentService.enrichClientsByIds(
        testUserId,
        clientIds,
        { delayMs: 0 }
      );

      expect(result.enrichedCount).toBe(2);
      expect(result.totalRequested).toBe(2);
      expect(ContactsRepository.getContactsByIds).toHaveBeenCalledWith(testUserId, clientIds);
      expect(ContactsRepository.updateContact).toHaveBeenCalledTimes(2);
    });

    it("should handle clients not found scenario", async () => {
      const clientIds = ["non-existent-1", "non-existent-2"];

      vi.mocked(ContactsRepository.getContactsByIds).mockResolvedValue([]);

      const result = await ClientEnrichmentService.enrichClientsByIds(
        testUserId,
        clientIds,
        { delayMs: 0 }
      );

      expect(result.enrichedCount).toBe(0);
      expect(result.totalRequested).toBe(2);
      expect(result.message).toContain("No clients found");
    });

    it("should skip clients without email in bulk enrichment", async () => {
      const clientIds = ["client-1", "client-2"];
      const mockClients = [
        makeOmniClientWithNotes({
          id: "client-1",
          userId: testUserId,
          primaryEmail: "test@example.com",
        }),
        makeOmniClientWithNotes({
          id: "client-2",
          userId: testUserId,
          primaryEmail: null,
        }),
      ];

      vi.mocked(ContactsRepository.getContactsByIds).mockResolvedValue(mockClients as any);

      mockGenerateContactInsights.mockResolvedValue({
        lifecycleStage: "New Client",
        tags: [],
        confidenceScore: 60,
      });

      const result = await ClientEnrichmentService.enrichClientsByIds(
        testUserId,
        clientIds,
        { delayMs: 0 }
      );

      expect(result.enrichedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toContain("No email address");
    });

    it("should handle partial enrichment failures gracefully", async () => {
      const clientIds = ["client-1", "client-2"];
      const mockClients = clientIds.map(id =>
        makeOmniClientWithNotes({
          id,
          userId: testUserId,
          primaryEmail: "test@example.com",
        })
      );

      vi.mocked(ContactsRepository.getContactsByIds).mockResolvedValue(mockClients as any);

      mockGenerateContactInsights
        .mockResolvedValueOnce({
          lifecycleStage: "Core Client",
          tags: ["active"],
          confidenceScore: 80,
        })
        .mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const result = await ClientEnrichmentService.enrichClientsByIds(
        testUserId,
        clientIds,
        { delayMs: 0 }
      );

      expect(result.enrichedCount).toBe(1);
      expect(result.totalRequested).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("clientNeedsEnrichment", () => {
    it("should return true when client is missing AI fields", async () => {
      const mockClient = makeOmniClientWithNotes({
        userId: testUserId,
        lifecycleStage: null,
        tags: null,
        confidenceScore: null,
      });

      vi.mocked(ContactsRepository.getContactById).mockResolvedValue(mockClient as any);

      const result = await ClientEnrichmentService.clientNeedsEnrichment(testUserId, testContactId);

      expect(result).toBe(true);
    });

    it("should return false when client has all AI fields", async () => {
      const mockClient = makeOmniClientWithNotes({
        userId: testUserId,
        lifecycleStage: "Core Client",
        tags: ["active"],
        confidenceScore: "85",
      });

      vi.mocked(ContactsRepository.getContactById).mockResolvedValue(mockClient as any);

      const result = await ClientEnrichmentService.clientNeedsEnrichment(testUserId, testContactId);

      expect(result).toBe(false);
    });

    it("should return false when client not found", async () => {
      vi.mocked(ContactsRepository.getContactById).mockResolvedValue(null);

      const result = await ClientEnrichmentService.clientNeedsEnrichment(testUserId, testContactId);

      expect(result).toBe(false);
    });

    it("should handle errors gracefully and return false", async () => {
      vi.mocked(ContactsRepository.getContactById).mockRejectedValue(
        new Error("Database error")
      );

      const result = await ClientEnrichmentService.clientNeedsEnrichment(testUserId, testContactId);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe("getEnrichmentStats", () => {
    it("should calculate enrichment statistics correctly", async () => {
      const mockContacts = [
        makeOmniClientWithNotes({
          userId: testUserId,
          lifecycleStage: "Core Client",
          tags: ["active"],
          confidenceScore: "85",
        }),
        makeOmniClientWithNotes({
          userId: testUserId,
          lifecycleStage: "New Client",
          tags: ["recent"],
          confidenceScore: "70",
        }),
        makeOmniClientWithNotes({
          userId: testUserId,
          lifecycleStage: null,
          tags: null,
          confidenceScore: null,
        }),
      ];

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      const result = await ClientEnrichmentService.getEnrichmentStats(testUserId);

      expect(result.totalClients).toBe(3);
      expect(result.enrichedClients).toBe(2);
      expect(result.needsEnrichment).toBe(1);
      expect(result.enrichmentPercentage).toBe(67);
    });

    it("should handle empty client list", async () => {
      mockListContactsService.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await ClientEnrichmentService.getEnrichmentStats(testUserId);

      expect(result.totalClients).toBe(0);
      expect(result.enrichedClients).toBe(0);
      expect(result.needsEnrichment).toBe(0);
      expect(result.enrichmentPercentage).toBe(0);
    });

    it("should return zero stats on error", async () => {
      mockListContactsService.mockRejectedValue(new Error("Service error"));

      const result = await ClientEnrichmentService.getEnrichmentStats(testUserId);

      expect(result.totalClients).toBe(0);
      expect(result.enrichmentPercentage).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should calculate 100% when all clients are enriched", async () => {
      const mockContacts = makeBatch(() =>
        makeOmniClientWithNotes({
          userId: testUserId,
          lifecycleStage: "Core Client",
          tags: ["active"],
          confidenceScore: "85",
        }),
        5
      );

      mockListContactsService.mockResolvedValue({
        items: mockContacts,
        total: mockContacts.length,
      });

      const result = await ClientEnrichmentService.getEnrichmentStats(testUserId);

      expect(result.enrichmentPercentage).toBe(100);
      expect(result.needsEnrichment).toBe(0);
    });
  });
});