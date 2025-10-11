import { handlePublic } from "@/lib/api-edge-cases";
import { OnboardingTrackingService } from "@/server/services/onboarding-tracking.service";
import {
  TrackAccessRequestSchema,
  TrackAccessResponseSchema,
} from "@/server/db/business-schemas";

export const POST = handlePublic(
  TrackAccessRequestSchema,
  TrackAccessResponseSchema,
  async (data, request) => {
    // Extract client IP data from headers
    const clientIpData = OnboardingTrackingService.extractClientIpData({
      "x-forwarded-for": request.headers.get("x-forwarded-for"),
      "x-real-ip": request.headers.get("x-real-ip"),
      "user-agent": request.headers.get("user-agent"),
    });

    // Track access using service
    const result = await OnboardingTrackingService.trackTokenAccess(data, clientIpData);

    return {
      message: result.message,
    };
  }
);
