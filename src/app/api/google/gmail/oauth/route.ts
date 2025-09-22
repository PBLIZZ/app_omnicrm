/** GET /api/google/gmail/oauth — start Gmail OAuth (auth required). Errors: 401 Unauthorized */
import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";

// GET /api/google/gmail/oauth - specific Gmail readonly authorization
export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
  const result = await GoogleOAuthService.startOAuthFlow(userId, "gmail");

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return result.response;
  } catch (error) {
    console.error("GET /api/google/gmail/oauth error:", error);
    return NextResponse.json(
      { error: "Failed to start Gmail OAuth flow" },
      { status: 500 }
    );
  }
}
