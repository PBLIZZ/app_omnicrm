// ===== src/app/api/onboarding/admin/generate-tokens/route.ts =====
import { handleAuth } from "@/lib/api";
import { OnboardingTokenService } from "@/server/services/onboarding.service";
import {
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
  type GenerateTokenResponse,
} from "@/server/db/business-schemas/onboarding";

export const POST = handleAuth(
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
  async (data, userId): Promise<GenerateTokenResponse> => {
    return await OnboardingTokenService.generateToken(userId, data.hoursValid, data.label);
  },
);
