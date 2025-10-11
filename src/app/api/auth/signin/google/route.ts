import { handleAuthFlow } from "@/lib/api-edge-cases";
import { SupabaseAuthService } from "@/server/services/supabase-auth.service";
import {
  GoogleSignInQuerySchema
} from "@/server/db/business-schemas";

export const dynamic = "force-dynamic";

// GET /auth/signin/google — starts Supabase OAuth on the server so PKCE verifier is stored in cookies
export const GET = handleAuthFlow(
  GoogleSignInQuerySchema,
  async (_query, request): Promise<Response> => {
    const result = await SupabaseAuthService.initializeGoogleOAuth(request);

    if (result.success) {
      return result.redirectResponse;
    } else {
      return result.errorResponse;
    }
  }
);
