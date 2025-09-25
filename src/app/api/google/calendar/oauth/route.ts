/** GET /api/google/calendar/oauth — start Calendar OAuth (auth required). Errors: 401 Unauthorized */
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";

// GET /api/google/calendar/oauth - specific Calendar full access authorization
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_calendar_oauth" },
})(async ({ userId }) => {
  const result = await GoogleOAuthService.startOAuthFlow(userId, "calendar");

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return result.response;
});
