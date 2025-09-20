/** GET /api/google/gmail/callback — handle Gmail OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { z } from "zod";

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_gmail_callback" },
  validation: {
    query: callbackQuerySchema,
  },
})(async ({ userId, validated, requestId }, req: NextRequest) => {
  const { code, state } = validated.query;

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state parameter" }, { status: 400 });
  }

  const cookieValue = req.cookies.get("gmail_auth")?.value ?? "";
  if (!cookieValue) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  const result = await GoogleOAuthService.handleOAuthCallback(
    userId,
    "gmail",
    { code, state, cookieValue },
    req.url
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  // Clear nonce cookie and redirect to sync setup step
  const response = NextResponse.redirect(new URL(result.redirectUrl, req.url));
  const cookieConfig = GoogleOAuthService.clearOAuthCookie("gmail");
  response.cookies.set(cookieConfig.name, "", cookieConfig.options);

  return response;
});
