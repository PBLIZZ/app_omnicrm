import { handleAuth } from "@/lib/api";
import { OnboardingTokenService } from "@/server/services/onboarding-token.service";
import {
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
} from "@/server/db/business-schemas";

export const POST = handleAuth(
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
  async (data, userId) => {
    // Generate onboarding token using service
    const tokenResponse = await OnboardingTokenService.generateOnboardingToken(
      userId,
      data,
    );

    return tokenResponse;
  }
);
