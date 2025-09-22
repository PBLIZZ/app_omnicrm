/** GET /api/google/gmail/callback — handle Gmail OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { z } from "zod";

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = callbackQuerySchema.parse(queryParams);
    const { code, state } = validatedQuery;

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state parameter" }, { status: 400 });
  }

  const cookieValue = request.cookies.get("gmail_auth")?.value ?? "";
  if (!cookieValue) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  const result = await GoogleOAuthService.handleOAuthCallback(
    userId,
    "gmail",
    { code, state, cookieValue },
    request.url,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Clear nonce cookie and redirect to sync setup step
  const response = NextResponse.redirect(new URL(result.redirectUrl, request.url));
  const cookieConfig = GoogleOAuthService.clearOAuthCookie("gmail");
  response.cookies.set(cookieConfig.name, "", cookieConfig.options);

  return response;
  } catch (error) {
    console.error("GET /api/google/gmail/callback error:", error);
    return NextResponse.json(
      { error: "Failed to handle Gmail OAuth callback" },
      { status: 500 }
    );
  }
}
