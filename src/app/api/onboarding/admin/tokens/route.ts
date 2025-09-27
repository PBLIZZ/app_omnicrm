import { handleGetWithQueryAuth } from "@/lib/api";
import { OnboardingTokenService } from "@/server/services/onboarding-token.service";
import {
  ListTokensQuerySchema,
  ListTokensResponseSchema,
} from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(
  ListTokensQuerySchema,
  ListTokensResponseSchema,
  async (query, userId) => {
    // Validate pagination options using service
    const listOptions = OnboardingTokenService.validateListOptions(
      query.limit,
      query.offset
    );

    // Fetch tokens using service
    const result = await OnboardingTokenService.listUserTokens(userId, listOptions);

    return {
      tokens: result.tokens,
    };
  }
);
