// ===== src/app/api/onboarding/public/track-access/route.ts =====
import { handlePublic } from "@/lib/api-edge-cases";
import { OnboardingService } from "@/server/services/onboarding.service";
import {
  TrackAccessRequestSchema,
  TrackAccessResponseSchema,
  type TrackAccessResponse,
} from "@/server/db/business-schemas/onboarding";

export const POST = handlePublic(
  TrackAccessRequestSchema,
  TrackAccessResponseSchema,
  async (data, request): Promise<TrackAccessResponse> => {
    const clientIpData = OnboardingService.extractClientIpData({
      "x-forwarded-for": request.headers.get("x-forwarded-for"),
      "x-real-ip": request.headers.get("x-real-ip"),
      "user-agent": request.headers.get("user-agent"),
    });

    await OnboardingService.trackAccess(data.token, clientIpData);

    return {
      success: true,
      message: "Access tracked",
    };
  },
);
