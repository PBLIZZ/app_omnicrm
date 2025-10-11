import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import * as contactsAIService from "@/server/services/contacts-ai.service";
import * as authUser from "@/server/auth/user";
import { createMockApiRequest } from "@/__tests__/utils/mock-request";

vi.mock("@/server/services/contacts-ai.service");
vi.mock("@/server/auth/user");

describe("POST /api/contacts/enrich", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authUser.getServerUserId).mockResolvedValue(mockUserId);
  });

  describe("Standard enrichment (non-streaming)", () => {
    it("should enrich all contacts", async () => {
      const mockResult = {
        enrichedCount: 5,
        totalRequested: 10,
        message: "Successfully enriched 5 contacts",
      };

      vi.mocked(contactsAIService.enrichAllContacts).mockResolvedValue(mockResult);

      const request = createMockApiRequest("/api/contacts/enrich?stream=false", {
        method: "POST",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(contactsAIService.enrichAllContacts).toHaveBeenCalledWith(mockUserId);
    });

    it("should handle enrichment errors", async () => {
      vi.mocked(contactsAIService.enrichAllContacts).mockRejectedValue(
        new Error("Enrichment failed"),
      );

      const request = createMockApiRequest("/api/contacts/enrich", {
        method: "POST",
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe("Streaming enrichment", () => {
    it("should stream enrichment progress", async () => {
      const mockEvents = [
        { type: "start", total: 2 },
        { type: "enriched", contactId: "contact-1", enrichedCount: 1 },
        { type: "complete", enrichedCount: 1, total: 2 },
      ];

      async function* mockStream() {
        for (const event of mockEvents) {
          yield event;
        }
      }

      vi.mocked(contactsAIService.enrichAllContactsStreaming).mockReturnValue(
        mockStream() as any,
      );

      const request = createMockApiRequest("/api/contacts/enrich?stream=true", {
        method: "POST",
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    });

    it("should handle streaming errors", async () => {
      async function* mockStreamWithError() {
        yield { type: "start", total: 1 };
        throw new Error("Stream error");
      }

      vi.mocked(contactsAIService.enrichAllContactsStreaming).mockReturnValue(
        mockStreamWithError() as any,
      );

      const request = createMockApiRequest("/api/contacts/enrich?stream=true", {
        method: "POST",
      });

      const response = await POST(request);

      expect(response.status).toBe(200); // Stream starts successfully
    });
  });

  it("should require authentication", async () => {
    vi.mocked(authUser.getServerUserId).mockRejectedValue(new Error("Unauthorized"));

    const request = createMockApiRequest("/api/contacts/enrich", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});