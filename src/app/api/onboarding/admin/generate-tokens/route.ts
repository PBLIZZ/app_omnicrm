// ===== src/app/api/onboarding/admin/generate-tokens/route.ts =====
import { handleAuth } from "@/lib/api";
import { generateTokenService } from "@/server/services/onboarding.service";
import {
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
  type GenerateTokenResponse,
} from "@/server/db/business-schemas/onboarding";

export const POST = handleAuth(
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
  async (data, userId): Promise<GenerateTokenResponse> => {
    return await generateTokenService(userId, data.hoursValid, data.label);
  },
);
