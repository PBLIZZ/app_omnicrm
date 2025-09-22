import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleGmailService, GmailAuthError } from "@/server/services/google-gmail.service";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    // Test Gmail connection
    const isConnected = await GoogleGmailService.testConnection(userId);

    return NextResponse.json({
      isConnected,
      message: isConnected ? "Gmail connection successful" : "Gmail connection failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("GET /api/google/gmail/test error:", error);
    if (error instanceof GmailAuthError) {
      return NextResponse.json({
        isConnected: false,
        message: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Failed to test Gmail connection" }, { status: 500 });
  }
}
