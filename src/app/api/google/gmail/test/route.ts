import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleGmailService, GmailAuthError } from "@/server/services/google-gmail.service";
import { ApiEnvelope } from "@/lib/utils/type-guards";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    // Test Gmail connection
    const isConnected = await GoogleGmailService.testConnection(userId);

    const data = {
      isConnected,
      message: isConnected ? "Gmail connection successful" : "Gmail connection failed",
      timestamp: new Date().toISOString(),
    };

    const envelope: ApiEnvelope<typeof data> = { ok: true, data };
    return NextResponse.json(envelope);
  } catch (error: unknown) {
    console.error("GET /api/google/gmail/test error:", error);
    if (error instanceof GmailAuthError) {
      const data = {
        isConnected: false,
        message: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
      };
      const envelope: ApiEnvelope<typeof data> = { ok: true, data };
      return NextResponse.json(envelope);
    }

    const envelope: ApiEnvelope = { ok: false, error: "Failed to test Gmail connection" };
    return NextResponse.json(envelope, { status: 500 });
  }
}
