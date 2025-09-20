import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError, API_ERROR_CODES } from "@/server/api/response";
import { GoogleGmailService, GmailAuthError } from "@/server/services/google-gmail.service";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_test" },
})(async ({ userId, requestId }) => {

  try {
    // Test Gmail connection
    const isConnected = await GoogleGmailService.testConnection(userId);

    return NextResponse.json({
      ok: true,
      data: {
        isConnected,
        message: isConnected ? "Gmail connection successful" : "Gmail connection failed",
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: unknown) {
    if (error instanceof GmailAuthError) {
      return NextResponse.json({
        ok: true,
        data: {
          isConnected: false,
          message: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
        }
      });
    }

    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      "Failed to test Gmail connection",
      500,
      requestId
    );
  }
});
