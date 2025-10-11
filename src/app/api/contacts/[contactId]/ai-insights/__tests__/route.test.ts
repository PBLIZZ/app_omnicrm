import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import * as contactsAIService from "@/server/services/contacts-ai.service";
import * as authUser from "@/server/auth/user";

// Mock dependencies
vi.mock("@/server/services/contacts-ai.service");
vi.mock("@/server/auth/user");

describe("GET /api/contacts/[contactId]/ai-insights", () => {
  const mockUserId = "test-user-id";
  const mockContactId = "test-contact-id";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authUser.getServerUserId).mockResolvedValue(mockUserId);
  });

  it("should return AI insights for a specific contact", async () => {
    const mockInsights = {
      insights: "This contact is a regular wellness practitioner client",
      suggestions: [
        "Schedule quarterly wellness check-in",
        "Offer advanced wellness package",
      ],
      nextSteps: ["Review wellness goals", "Update treatment plan"],
      keyFindings: ["Consistent attendance", "Positive feedback"],
      confidence: 0.88,
      error: false,
    };

    vi.mocked(contactsAIService.askAIAboutContactService).mockResolvedValue(
      mockInsights,
    );

    const request = new Request(
      `http://localhost:3000/api/contacts/${mockContactId}/ai-insights`,
      { method: "GET" },
    );

    const response = await GET(request as any, {
      params: { contactId: mockContactId },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual(mockInsights);
    expect(contactsAIService.askAIAboutContactService).toHaveBeenCalledWith(
      mockUserId,
      mockContactId,
    );
  });

  it("should handle errors gracefully", async () => {
    const mockError = {
      insights: "Unable to generate insights at this time",
      suggestions: [],
      nextSteps: [],
      keyFindings: [],
      confidence: 0,
      error: true,
      errorMessage: "AI service temporarily unavailable",
    };

    vi.mocked(contactsAIService.askAIAboutContactService).mockResolvedValue(
      mockError,
    );

    const request = new Request(
      `http://localhost:3000/api/contacts/${mockContactId}/ai-insights`,
      { method: "GET" },
    );

    const response = await GET(request as any, {
      params: { contactId: mockContactId },
    });

    const data = await response.json();
    expect(data.error).toBe(true);
    expect(data.insights).toContain("Unable to generate insights");
  });

  it("should require authentication", async () => {
    vi.mocked(authUser.getServerUserId).mockRejectedValue(
      new Error("Unauthorized"),
    );

    const request = new Request(
      `http://localhost:3000/api/contacts/${mockContactId}/ai-insights`,
      { method: "GET" },
    );

    await expect(
      GET(request as any, { params: { contactId: mockContactId } }),
    ).rejects.toThrow("Unauthorized");
  });

  it("should return insights with multiple suggestions", async () => {
    const mockInsights = {
      insights: "Contact shows strong engagement across multiple wellness areas",
      suggestions: [
        "Introduce to advanced meditation techniques",
        "Recommend yoga teacher training program",
        "Invite to exclusive wellness retreat",
        "Schedule nutrition consultation",
      ],
      nextSteps: ["Update contact preferences", "Send personalized wellness plan"],
      keyFindings: [
        "Attends weekly yoga sessions",
        "Active in community events",
        "Refers friends regularly",
      ],
      confidence: 0.95,
      error: false,
    };

    vi.mocked(contactsAIService.askAIAboutContactService).mockResolvedValue(
      mockInsights,
    );

    const request = new Request(
      `http://localhost:3000/api/contacts/${mockContactId}/ai-insights`,
      { method: "GET" },
    );

    const response = await GET(request as any, {
      params: { contactId: mockContactId },
    });

    const data = await response.json();
    expect(data.suggestions).toHaveLength(4);
    expect(data.keyFindings).toHaveLength(3);
    expect(data.confidence).toBe(0.95);
  });

  it("should handle contact with minimal data", async () => {
    const mockInsights = {
      insights: "Limited data available for this contact",
      suggestions: ["Add more interaction history", "Schedule initial consultation"],
      nextSteps: ["Gather contact preferences"],
      keyFindings: [],
      confidence: 0.3,
      error: false,
    };

    vi.mocked(contactsAIService.askAIAboutContactService).mockResolvedValue(
      mockInsights,
    );

    const request = new Request(
      `http://localhost:3000/api/contacts/${mockContactId}/ai-insights`,
      { method: "GET" },
    );

    const response = await GET(request as any, {
      params: { contactId: mockContactId },
    });

    const data = await response.json();
    expect(data.confidence).toBeLessThan(0.5);
    expect(data.keyFindings).toHaveLength(0);
  });

  it("should return appropriate response format", async () => {
    const mockInsights = {
      insights: "Test insights",
      suggestions: ["Test suggestion"],
      nextSteps: ["Test next step"],
      keyFindings: ["Test finding"],
      confidence: 0.75,
      error: false,
    };

    vi.mocked(contactsAIService.askAIAboutContactService).mockResolvedValue(
      mockInsights,
    );

    const request = new Request(
      `http://localhost:3000/api/contacts/${mockContactId}/ai-insights`,
      { method: "GET" },
    );

    const response = await GET(request as any, {
      params: { contactId: mockContactId },
    });

    expect(response.headers.get("Content-Type")).toContain("application/json");
  });

  it("should handle different contactId formats", async () => {
    const uuidContactId = "550e8400-e29b-41d4-a716-446655440000";

    const mockInsights = {
      insights: "Test",
      suggestions: [],
      nextSteps: [],
      keyFindings: [],
      confidence: 0.5,
      error: false,
    };

    vi.mocked(contactsAIService.askAIAboutContactService).mockResolvedValue(
      mockInsights,
    );

    const request = new Request(
      `http://localhost:3000/api/contacts/${uuidContactId}/ai-insights`,
      { method: "GET" },
    );

    const response = await GET(request as any, {
      params: { contactId: uuidContactId },
    });

    expect(contactsAIService.askAIAboutContactService).toHaveBeenCalledWith(
      mockUserId,
      uuidContactId,
    );
  });

  it("should handle service timeout gracefully", async () => {
    vi.mocked(contactsAIService.askAIAboutContactService).mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Service timeout")), 100);
        }),
    );

    const request = new Request(
      `http://localhost:3000/api/contacts/${mockContactId}/ai-insights`,
      { method: "GET" },
    );

    await expect(
      GET(request as any, { params: { contactId: mockContactId } }),
    ).rejects.toThrow("Service timeout");
  });
});