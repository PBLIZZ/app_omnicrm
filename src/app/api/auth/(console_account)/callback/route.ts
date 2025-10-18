import { handleAuthFlow } from "@/lib/api-edge-cases";
import { handleOAuthCallbackService } from "@/server/services/supabase-auth.service";
import { OAuthCallbackQuerySchema } from "@/server/lib/oauth-validation";

export const dynamic = "force-dynamic";

export const GET = handleAuthFlow(
  OAuthCallbackQuerySchema,
  async (_query, request): Promise<Response> => {
    const result = await handleOAuthCallbackService(request);

    if (result.success) {
      return result.redirectResponse;
    }
    return result.errorResponse;
  },
);
