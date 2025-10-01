import { handlePublic } from "@/lib/api-edge-cases";
import { OnboardingService } from "@/server/services/onboarding.service";
import {
  OnboardingSubmitRequestSchema,
  OnboardingSubmitResponseSchema,
} from "@/server/db/business-schemas";
import { z } from "zod";

export const POST = handlePublic(
  OnboardingSubmitRequestSchema,
  OnboardingSubmitResponseSchema,
  async (data, request): Promise<z.infer<typeof OnboardingSubmitResponseSchema>> => {
    // Debug: Log received data
    console.log("=== ONBOARDING SUBMISSION ===");
    console.log("Received data:", JSON.stringify(data, null, 2));
    
    // Rate limiting
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientId = forwardedFor ?? realIp ?? "unknown";

    const { success } = await OnboardingService.checkRateLimit(clientId);
    if (!success) {
      const error = new Error("Too many requests");
      // Type-safe extension of Error object
      Object.defineProperty(error, "status", {
        value: 429,
        writable: false,
        enumerable: true,
        configurable: false,
      });
      throw error;
    }

    // Extract client IP and user agent for consent tracking
    const clientIpData = OnboardingService.extractClientIpData({
      "x-forwarded-for": forwardedFor,
      "x-real-ip": realIp,
      "user-agent": request.headers.get("user-agent"),
    });

    // Process the onboarding submission using service
    const result = await OnboardingService.processOnboardingSubmission(data, clientIpData);

    // Handle Result type
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      data: {
        submissionId: result.data.contactId,
        status: "completed",
        message: result.data.message,
      },
    };
  },
);
