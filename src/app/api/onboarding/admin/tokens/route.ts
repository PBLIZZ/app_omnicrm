// ===== src/app/api/onboarding/admin/tokens/route.ts =====
import { handleGetWithQueryAuth } from "@/lib/api";
import {
  validateListOptions,
  listTokensService,
} from "@/server/services/onboarding.service";
import {
  ListTokensQuerySchema,
  ListTokensResponseSchema,
  type ListTokensResponse,
} from "@/server/db/business-schemas/onboarding";

export const GET = handleGetWithQueryAuth(
  ListTokensQuerySchema,
  ListTokensResponseSchema,
  async (query, userId): Promise<ListTokensResponse> => {
    const options = validateListOptions(query.limit, query.offset);
    const tokens = await listTokensService(userId, options);
    return { tokens };
  },
);
