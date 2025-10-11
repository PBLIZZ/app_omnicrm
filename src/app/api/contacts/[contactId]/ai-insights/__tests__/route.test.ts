import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import * as contactsAIService from "@/server/services/contacts-ai.service";
import * as authUser from "@/server/auth/user";
import { createMockApiRequest } from "@/__tests__/utils/mock-request";

vi.mock("@/server/services/contacts-ai.service");
vi.mock("@/server/auth/user");

describe("GET /api/contacts/[contactId]/ai-insights", () => {
  const mockUserId = "user-123";
  const mockContactId = "contact-456";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authUser.getServerUserId).mockResolvedValue(mockUserId);
  });

  it("should return AI insights for a contact", async () => {
    const mockInsights = {
      insights: {
        wellnessGoals: ["Weight loss", "Stress management"],
        preferences: ["Morning workouts"],
        engagementLevel: "high",
        risks: [],
        opportunities: ["Referral potential"],
        nextSteps: ["Schedule follow-up"],
      },
      confidence: 0.85,
    };

    vi.mocked(contactsAIService.askAIAboutContactService).mockResolvedValue(mockInsights);

    const request = createMockApiRequest("/api/contacts/contact-456/ai-insights", {
      method: "GET",
    });

    const response = await GET(request, { params: { contactId: mockContactId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockInsights);
    expect(contactsAIService.askAIAboutContactService).toHaveBeenCalledWith(
      mockUserId,
      mockContactId,
    );
  });

  it("should handle unauthorized requests", async () => {
    vi.mocked(authUser.getServerUserId).mockRejectedValue(new Error("Unauthorized"));

    const request = createMockApiRequest("/api/contacts/contact-456/ai-insights", {
      method: "GET",
    });

    const response = await GET(request, { params: { contactId: mockContactId } });

    expect(response.status).toBe(401);
  });

  it("should handle service errors", async () => {
    vi.mocked(contactsAIService.askAIAboutContactService).mockRejectedValue(
      new Error("AI service unavailable"),
    );

    const request = createMockApiRequest("/api/contacts/contact-456/ai-insights", {
      method: "GET",
    });

    const response = await GET(request, { params: { contactId: mockContactId } });

    expect(response.status).toBe(500);
  });

  it("should validate contactId parameter", async () => {
    const request = createMockApiRequest("/api/contacts//ai-insights", {
      method: "GET",
    });

    const response = await GET(request, { params: { contactId: "" } });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});