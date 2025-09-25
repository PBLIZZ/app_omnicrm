/** GET /api/google/calendar/callback — handle Calendar OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { z } from "zod";

const QuerySchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const GET = createRouteHandler({
  auth: true,
  validation: {
    query: QuerySchema,
  },
  rateLimit: { operation: "google_calendar_callback" },
})(async ({ userId, validated: { query } }, req: NextRequest) => {
  const { code, state } = query;

  const cookieValue = req.cookies.get("calendar_auth")?.value ?? "";
  if (!cookieValue) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  const result = await GoogleOAuthService.handleOAuthCallback(
    userId,
    "calendar",
    { code, state, cookieValue },
    req.url,
  );

  if (!result.success) {
    // Clear nonce cookie even on error
    const errorResponse = NextResponse.redirect(
      new URL(`/omni-rhythm?error=${encodeURIComponent(result.error)}`, req.url),
    );
    const cookieConfig = GoogleOAuthService.clearOAuthCookie("calendar");
    errorResponse.cookies.set(cookieConfig.name, "", cookieConfig.options);
    return errorResponse;
  }

  // Clear nonce cookie and redirect to Omni Rhythm for post-connect sync setup
  const response = NextResponse.redirect(
    new URL("/omni-rhythm?connected=true&step=calendar-sync", req.url),
  );
  const cookieConfig = GoogleOAuthService.clearOAuthCookie("calendar");
  response.cookies.set(cookieConfig.name, "", cookieConfig.options);

  return response;
});
