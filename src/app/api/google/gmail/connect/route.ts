/**
 * GET /api/google/gmail/connect
 * Initiates Gmail OAuth flow (GET request - no CSRF needed)
 */
import { initializeOAuthService } from "@/server/services/oauth.service";
import { AppError } from "@/lib/errors/app-error";

export async function GET(): Promise<Response> {
  try {
    const result = await initializeOAuthService("gmail");

    if (!result.success) {
      const { error } = result;
      throw new AppError(error, "OAUTH_ERROR", "validation", false, 400);
    }

    return Response.redirect(result.authUrl);
  } catch (error) {
    // Log error with structured logging
    const { logError } = await import("@/server/lib/structured-logger");
    logError(
      "Gmail OAuth initialization error",
      {
        operation: "gmail_oauth_init",
        endpoint: "/api/google/gmail/connect",
      },
      error,
    );

    return Response.redirect(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-connect?error=oauth_init_failed`,
    );
  }
}
