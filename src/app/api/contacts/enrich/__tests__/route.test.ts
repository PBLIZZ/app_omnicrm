import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import * as contactsAIService from "@/server/services/contacts-ai.service";
import * as authUser from "@/server/auth/user";

// Mock dependencies
vi.mock("@/server/services/contacts-ai.service");
vi.mock("@/server/auth/user");

describe("POST /api/contacts/enrich", () => {
  const mockUserId = "test-user-id";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authUser.getServerUserId).mockResolvedValue(mockUserId);
  });

  it("should enrich all contacts without streaming", async () => {
    const mockResult = {
      enrichedCount: 10,
      totalRequested: 10,
      errors: [],
      message: "Successfully enriched 10 contacts",
    };

    vi.mocked(contactsAIService.enrichAllContacts).mockResolvedValue(mockResult);

    const request = new Request("http://localhost:3000/api/contacts/enrich", {
      method: "POST",
    });

    const response = await POST(request as any);

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const data = await response.json();
    expect(data).toEqual(mockResult);
    expect(contactsAIService.enrichAllContacts).toHaveBeenCalledWith(mockUserId);
  });

  it("should return streaming response when stream=true", async () => {
    const request = new Request("http://localhost:3000/api/contacts/enrich?stream=true", {
      method: "POST",
    });

    const mockStreamingData = [
      { type: "start", total: 5 },
      { type: "progress", enrichedCount: 1, contactName: "John Doe" },
      { type: "complete", enrichedCount: 5 },
    ];

    // Mock the streaming generator
    async function* mockGenerator() {
      for (const item of mockStreamingData) {
        yield item;
      }
    }

    vi.mocked(contactsAIService.enrichAllContactsStreaming).mockReturnValue(
      mockGenerator() as any,
    );

    const response = await POST(request as any);

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("Connection")).toBe("keep-alive");
  });

  it("should handle authentication errors", async () => {
    vi.mocked(authUser.getServerUserId).mockRejectedValue(
      new Error("Unauthorized"),
    );

    const request = new Request("http://localhost:3000/api/contacts/enrich", {
      method: "POST",
    });

    await expect(POST(request as any)).rejects.toThrow("Unauthorized");
  });

  it("should handle enrichment service errors", async () => {
    vi.mocked(contactsAIService.enrichAllContacts).mockRejectedValue(
      new Error("Enrichment failed"),
    );

    const request = new Request("http://localhost:3000/api/contacts/enrich", {
      method: "POST",
    });

    await expect(POST(request as any)).rejects.toThrow("Enrichment failed");
  });

  it("should parse stream query parameter correctly", async () => {
    const mockResult = {
      enrichedCount: 5,
      totalRequested: 5,
      errors: [],
      message: "Success",
    };

    vi.mocked(contactsAIService.enrichAllContacts).mockResolvedValue(mockResult);

    // Test with stream=false (explicit)
    const request1 = new Request(
      "http://localhost:3000/api/contacts/enrich?stream=false",
      { method: "POST" },
    );
    const response1 = await POST(request1 as any);
    expect(response1.headers.get("Content-Type")).toBe("application/json");

    // Test with stream=0 (coerces to false)
    const request2 = new Request("http://localhost:3000/api/contacts/enrich?stream=0", {
      method: "POST",
    });
    const response2 = await POST(request2 as any);
    expect(response2.headers.get("Content-Type")).toBe("application/json");
  });

  it("should default to non-streaming when no query param", async () => {
    const mockResult = {
      enrichedCount: 5,
      totalRequested: 5,
      errors: [],
      message: "Success",
    };

    vi.mocked(contactsAIService.enrichAllContacts).mockResolvedValue(mockResult);

    const request = new Request("http://localhost:3000/api/contacts/enrich", {
      method: "POST",
    });

    const response = await POST(request as any);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("should handle partial enrichment with errors", async () => {
    const mockResult = {
      enrichedCount: 8,
      totalRequested: 10,
      errors: ["Contact A failed", "Contact B failed"],
      message: "Enriched 8 out of 10 contacts",
    };

    vi.mocked(contactsAIService.enrichAllContacts).mockResolvedValue(mockResult);

    const request = new Request("http://localhost:3000/api/contacts/enrich", {
      method: "POST",
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(data.enrichedCount).toBe(8);
    expect(data.errors).toHaveLength(2);
  });
});