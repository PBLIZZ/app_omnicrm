/**
 * GET /api/google/gmail/callback
 * Handles Gmail OAuth callback
 */
import { handleOAuthCallbackService } from "@/server/services/oauth.service";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);

    const result = await handleOAuthCallbackService("gmail", query);

    return Response.redirect(result.redirectUrl);
  } catch (error) {
    // Log error with structured logging
    const { logError } = await import("@/server/lib/structured-logger");
    logError(
      "Gmail OAuth callback error",
      {
        operation: "gmail_oauth_callback",
        endpoint: "/api/google/gmail/callback",
      },
      error,
    );

    return Response.redirect(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-connect?error=oauth_failed`,
    );
  }
}
