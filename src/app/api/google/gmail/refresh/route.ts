import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { GoogleGmailService, GmailAuthError } from "@/server/services/google-gmail.service";
import { ensureError } from "@/lib/utils/error-handler";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_refresh" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("gmail_refresh", requestId);

  try {
    // Attempt to refresh Gmail tokens
    await GoogleGmailService.getAuth(userId);

    return api.success({
      success: true,
      message: "Gmail tokens refreshed successfully",
    });
  } catch (error: unknown) {
    if (error instanceof GmailAuthError) {
      if (error.code === "not_connected") {
        return api.error("Gmail not connected", "UNAUTHORIZED");
      }

      if (error.code === "invalid_grant") {
        return api.error(
          "Gmail authentication expired. Please reconnect your Gmail account.",
          "UNAUTHORIZED",
        );
      }

      if (error.code === "token_refresh_failed") {
        return api.error(
          "Failed to refresh Gmail tokens. Please try again or reconnect your account.",
          "INTERNAL_ERROR",
        );
      }
    }

    return api.error(
      "Failed to refresh Gmail tokens",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
