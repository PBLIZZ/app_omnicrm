/** GET /api/google/gmail/oauth — start Gmail OAuth (auth required). Errors: 401 Unauthorized */
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";

// GET /api/google/gmail/oauth - specific Gmail readonly authorization
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_gmail_oauth" },
})(async ({ userId }) => {
  const result = await GoogleOAuthService.startOAuthFlow(userId, "gmail");

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return result.response;
});
