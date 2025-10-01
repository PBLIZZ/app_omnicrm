import { handleAuthFlow } from "@/lib/api-edge-cases";
import { SupabaseAuthService } from "@/server/services/supabase-auth.service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const OAuthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const GET = handleAuthFlow(
  OAuthCallbackQuerySchema,
  async (_query, request): Promise<Response> => {
    const result = await SupabaseAuthService.handleOAuthCallback(request);

    if (result.success) {
      return result.redirectResponse;
    }
    return result.errorResponse;
  },
);
