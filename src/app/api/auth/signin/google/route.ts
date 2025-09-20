import { NextRequest, NextResponse } from "next/server";
import { SupabaseAuthService } from "@/server/services/supabase-auth.service";

export const dynamic = "force-dynamic";

// GET /auth/signin/google — starts Supabase OAuth on the server so PKCE verifier is stored in cookies
export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await SupabaseAuthService.initializeGoogleOAuth(request);

  if (result.success) {
    return result.redirectResponse;
  } else {
    return result.errorResponse;
  }
}
