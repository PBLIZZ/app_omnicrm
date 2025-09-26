import { NextRequest, NextResponse } from "next/server";
import { SupabaseAuthService } from "@/server/services/supabase-auth.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await SupabaseAuthService.handleOAuthCallback(request);

  if (result.success) {
    return result.redirectResponse;
  } else {
    return result.errorResponse;
  }
}
