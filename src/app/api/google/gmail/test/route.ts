import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { GoogleGmailService, GmailAuthError } from "@/server/services/google-gmail.service";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_test" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("gmail_test", requestId);

  try {
    // Test Gmail connection
    const isConnected = await GoogleGmailService.testConnection(userId);

    return api.success({
      isConnected,
      message: isConnected ? "Gmail connection successful" : "Gmail connection failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof GmailAuthError) {
      return api.success({
        isConnected: false,
        message: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
      });
    }

    return api.error(
      "Failed to test Gmail connection",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
