import { z } from "zod";
import { handleAuthFlow } from "@/lib/api-edge-cases";
import { handleOAuthCallbackService } from "@/server/services/supabase-auth.service";

export const dynamic = "force-dynamic";

// Supabase Auth callback schema - simpler than Google service OAuth
// Supabase handles state/CSRF internally, we just need code or error
const SupabaseAuthCallbackSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const GET = handleAuthFlow(
  SupabaseAuthCallbackSchema,
  async (_query, request): Promise<Response> => {
    const result = await handleOAuthCallbackService(request);

    if (result.success) {
      return result.redirectResponse;
    }
    return result.errorResponse;
  },
);
