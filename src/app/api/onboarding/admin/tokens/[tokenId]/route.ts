// ===== src/app/api/onboarding/admin/tokens/[tokenId]/route.ts =====
import { z } from "zod";
import { handleAuthWithParams } from "@/lib/api";
import { getTokenByIdService, deleteTokenService } from "@/server/services/onboarding.service";
import {
  TokenInfoSchema,
  DeleteTokenResponseSchema,
} from "@/server/db/business-schemas/onboarding";

const ParamsSchema = z.object({
  tokenId: z.string().uuid(),
});

export const GET = handleAuthWithParams(
  z.void(),
  TokenInfoSchema,
  async (_voidInput, userId, params): Promise<z.infer<typeof TokenInfoSchema>> => {
    const { tokenId } = ParamsSchema.parse(params);
    return getTokenByIdService(userId, tokenId);
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteTokenResponseSchema,
  async (_voidInput, userId, params): Promise<z.infer<typeof DeleteTokenResponseSchema>> => {
    const { tokenId } = ParamsSchema.parse(params);
    return await deleteTokenService(userId, tokenId);
  },
);
