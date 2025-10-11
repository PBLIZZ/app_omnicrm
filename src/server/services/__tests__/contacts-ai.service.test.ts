/**
 * Unit tests for Contacts AI Service
 * - askAIAboutContactService validation and error handling
 * - enrichAllContacts & streaming variants
 * - enrichContactsByIds, contactNeedsEnrichment, getEnrichmentStats
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  askAIAboutContactService,
  enrichAllContacts,
  enrichAllContactsStreaming,
  enrichContactsByIds,
  contactNeedsEnrichment,
  getEnrichmentStats,
} from "../contacts-ai.service";
import { ok, err } from "@/lib/utils/result";

// Mocks
vi.mock("@/server/ai/contacts/ask-ai-about-contact", () => ({
  askAIAboutContact: vi.fn(),
}));

vi.mock("@/server/ai/contacts/generate-contact-insights", () => ({
  generateContactInsights: vi.fn(),
}));

vi.mock("@/server/services/contacts.service", () => ({
  listContactsService: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("@repo", () => ({
  ContactsRepository: {
    getContactsByIds: vi.fn(),
    getContactById: vi.fn(),
    updateContact: vi.fn(),
  },
}));

describe("Contacts AI Service", () => {
  const userId = "user-123";
  const contactId = "contact-abc";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("askAIAboutContactService", () => {
    it("throws when userId is empty", async () => {
      await expect(askAIAboutContactService("", "id")).rejects.toThrow(
        "userId must be a non-empty string",
      );
    });

    it("throws when contactId is empty", async () => {
      await expect(askAIAboutContactService("user", " ")).rejects.toThrow(
        "contactId must be a non-empty string",
      );
    });

    it("returns fallback error object when underlying call fails", async () => {
      const { askAIAboutContact } = await import("@/server/ai/contacts/ask-ai-about-contact");
      vi.mocked(askAIAboutContact).mockRejectedValue(new Error("LLM failure"));

      const resp = await askAIAboutContactService(userId, contactId);
      expect(resp.error).toBe(true);
      expect(resp.errorMessage).toContain("LLM failure");
      expect(resp.confidence).toBe(0);
      expect(Array.isArray(resp.suggestions)).toBe(true);
    });
  });

  describe("enrichAllContacts", () => {
    it("returns early when no contacts found", async () => {
      const { listContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(listContactsService).mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      } as any);

      const res = await enrichAllContacts(userId);
      expect(res.enrichedCount).toBe(0);
      expect(res.totalRequested).toBe(0);
      expect(res.message).toContain("No contacts");
    });

    it("enriches contacts with emails and skips those without", async () => {
      const { listContactsService } = await import("@/server/services/contacts.service");
      // Two pages with batchSize=2 => first page 2 items, second page 1 item (stop)
      vi.mocked(listContactsService)
        .mockResolvedValueOnce({
          success: true,
          data: {
            items: [
              { id: "c1", displayName: "Alice", primaryEmail: "alice@example.com" },
              { id: "c2", displayName: "Bob", primaryEmail: null },
            ],
            total: 2,
          },
        } as any)
        .mockResolvedValueOnce({
          success: true,
          data: { items: [{ id: "c3", displayName: "Carol", primaryEmail: "carol@ex.co" }], total: 1 },
        } as any);

      const { generateContactInsights } = await import(
        "@/server/ai/contacts/generate-contact-insights"
      );
      vi.mocked(generateContactInsights).mockResolvedValue({
        lifecycleStage: "VIP Client",
        tags: ["Yoga"],
        confidenceScore: 0.91,
      } as any);

      const { getDb } = await import("@/server/db/client");
      const chain = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: "ok" }]),
      };
      vi.mocked(getDb).mockResolvedValue(chain as any);

      const res = await enrichAllContacts(userId, { batchSize: 2, delayMs: 0 });
      expect(res.totalRequested).toBe(3);
      expect(res.enrichedCount).toBe(2); // Alice + Carol
      expect((res.errors ?? []).length).toBeGreaterThanOrEqual(1); // Bob missing email
    });
  });

  describe("enrichAllContactsStreaming", () => {
    it("yields start, progress, enriched/error, complete events", async () => {
      const { listContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(listContactsService).mockResolvedValue({
        success: true,
        data: {
          items: [
            { id: "c1", displayName: "Alice", primaryEmail: "alice@example.com" },
            { id: "c2", displayName: "Bob", primaryEmail: null },
          ],
          total: 2,
        },
      } as any);

      const { generateContactInsights } = await import(
        "@/server/ai/contacts/generate-contact-insights"
      );
      vi.mocked(generateContactInsights).mockResolvedValue({
        lifecycleStage: "Core Client",
        tags: ["Meditation"],
        confidenceScore: 0.8,
      } as any);

      const { getDb } = await import("@/server/db/client");
      const chain = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: "ok" }]),
      };
      vi.mocked(getDb).mockResolvedValue(chain as any);

      const events: string[] = [];
      for await (const ev of enrichAllContactsStreaming(userId, { delayMs: 0 })) {
        events.push(ev.type);
      }

      expect(events[0]).toBe("start");
      expect(events).toContain("progress");
      expect(events).toContain("enriched");
      expect(events).toContain("error"); // Bob missing email
      expect(events[events.length - 1]).toBe("complete");
    });
  });

  describe("enrichContactsByIds", () => {
    it("enriches contacts by IDs and updates repository", async () => {
      const { ContactsRepository } = await import("@repo");
      vi.mocked(ContactsRepository.getContactsByIds).mockResolvedValue(
        ok([
          { id: "c1", displayName: "Alice", primaryEmail: "a@ex.com" },
          { id: "c2", displayName: "Bob", primaryEmail: null },
        ]) as any,
      );

      const { generateContactInsights } = await import(
        "@/server/ai/contacts/generate-contact-insights"
      );
      vi.mocked(generateContactInsights).mockResolvedValue({
        lifecycleStage: "New Client",
        tags: ["Wellness"],
        confidenceScore: 0.7,
      } as any);

      vi.mocked(ContactsRepository.updateContact).mockResolvedValue(undefined as any);

      const res = await enrichContactsByIds(userId, ["c1", "c2"], { delayMs: 0 });
      expect(res.totalRequested).toBe(2);
      expect(res.enrichedCount).toBe(1);
      expect(ContactsRepository.updateContact).toHaveBeenCalledTimes(1);
    });
  });

  describe("contactNeedsEnrichment", () => {
    it("returns true when key fields are missing", async () => {
      const { ContactsRepository } = await import("@repo");
      vi.mocked(ContactsRepository.getContactById).mockResolvedValue(
        ok({ id: contactId, lifecycleStage: null, tags: null, confidenceScore: null }) as any,
      );

      expect(await contactNeedsEnrichment(userId, contactId)).toBe(true);
    });

    it("returns false when all fields present", async () => {
      const { ContactsRepository } = await import("@repo");
      vi.mocked(ContactsRepository.getContactById).mockResolvedValue(
        ok({
          id: contactId,
          lifecycleStage: "VIP Client",
          tags: ["Yoga"],
          confidenceScore: "0.9",
        }) as any,
      );
      expect(await contactNeedsEnrichment(userId, contactId)).toBe(false);
    });

    it("returns false when repository errors", async () => {
      const { ContactsRepository } = await import("@repo");
      vi.mocked(ContactsRepository.getContactById).mockResolvedValue(
        err({ code: "DB", message: "down" }) as any,
      );
      expect(await contactNeedsEnrichment(userId, contactId)).toBe(false);
    });
  });

  describe("getEnrichmentStats", () => {
    it("computes enrichment percentages", async () => {
      const { listContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(listContactsService).mockResolvedValue({
        success: true,
        data: {
          items: [
            // enriched
            { id: "1", lifecycleStage: "VIP Client", tags: ["A"], confidenceScore: "0.9" },
            // needs enrichment
            { id: "2", lifecycleStage: null, tags: null, confidenceScore: null },
            // partially enriched (missing confidence)
            { id: "3", lifecycleStage: "Core Client", tags: ["B"], confidenceScore: null },
          ],
          total: 3,
        },
      } as any);

      const stats = await getEnrichmentStats(userId);
      expect(stats.totalContacts).toBe(3);
      expect(stats.enrichedContacts).toBe(1);
      expect(stats.needsEnrichment).toBe(2);
      expect(stats.enrichmentPercentage).toBe(Math.round((1 / 3) * 100));
    });

    it("returns zeros when listContactsService is not success", async () => {
      const { listContactsService } = await import("@/server/services/contacts.service");
      vi.mocked(listContactsService).mockResolvedValue({ success: false, error: { message: "x" } } as any);

      const stats = await getEnrichmentStats(userId);
      expect(stats.totalContacts).toBe(0);
      expect(stats.enrichedContacts).toBe(0);
      expect(stats.needsEnrichment).toBe(0);
      expect(stats.enrichmentPercentage).toBe(0);
    });
  });
});