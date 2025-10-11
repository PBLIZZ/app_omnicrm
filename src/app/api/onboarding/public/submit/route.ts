// ===== src/app/api/onboarding/public/submit/route.ts =====
import { handlePublic } from "@/lib/api-edge-cases";
import {
  checkRateLimitService,
  extractClientIpData,
  processSubmissionService,
} from "@/server/services/onboarding.service";
import {
  OnboardingSubmitRequestSchema,
  OnboardingSubmitResponseSchema,
  type OnboardingSubmitResponse,
} from "@/server/db/business-schemas/onboarding";

export const POST = handlePublic(
  OnboardingSubmitRequestSchema,
  OnboardingSubmitResponseSchema,
  async (data, request): Promise<OnboardingSubmitResponse> => {
    // Rate limiting
    const clientId =
      request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";

    const allowed = await checkRateLimitService(clientId);
    if (!allowed) {
      const error = new Error("Too many requests");
      Object.defineProperty(error, "status", { value: 429 });
      throw error;
    }

    // Extract client IP data
    const clientIpData = extractClientIpData({
      "x-forwarded-for": request.headers.get("x-forwarded-for"),
      "x-real-ip": request.headers.get("x-real-ip"),
      "user-agent": request.headers.get("user-agent"),
    });

    // Process submission
    const result = await processSubmissionService(data, clientIpData);

    return {
      success: true,
      data: {
        contactId: result.contactId,
        message: result.message,
      },
    };
  },
);
