import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError } from "@/server/api/response";
import { GoogleGmailService, GmailAuthError } from "@/server/services/google-gmail.service";
import { ensureError } from "@/lib/utils/error-handler";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_refresh" },
})(async ({ userId, requestId }) => {

  try {
    // Attempt to refresh Gmail tokens
    await GoogleGmailService.getAuth(userId);

    return NextResponse.json({
      success: true,
      message: "Gmail tokens refreshed successfully",
    });
  } catch (error: unknown) {
    if (error instanceof GmailAuthError) {
      if (error.code === "not_connected") {
        return NextResponse.json({ error: "Gmail not connected" }, { status: 401 });
      }

      if (error.code === "invalid_grant") {
        return apiError(
          "Gmail authentication expired. Please reconnect your Gmail account.",
          "UNAUTHORIZED",
        );
      }

      if (error.code === "token_refresh_failed") {
        return NextResponse.json({ error: "Failed to refresh Gmail tokens. Please try again or reconnect your account." }, { status: 500 });
      }
    }

    return apiError(
      "Failed to refresh Gmail tokens",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
