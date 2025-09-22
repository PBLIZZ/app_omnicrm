import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleGmailService, GmailAuthError } from "@/server/services/google-gmail.service";

export async function POST(_: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    // Attempt to refresh Gmail tokens
    await GoogleGmailService.getAuth(userId);

    return NextResponse.json({
      success: true,
      message: "Gmail tokens refreshed successfully",
    });
  } catch (error: unknown) {
    console.error("POST /api/google/gmail/refresh error:", error);
    if (error instanceof GmailAuthError) {
      if (error.code === "not_connected") {
        return NextResponse.json({ error: "Gmail not connected" }, { status: 401 });
      }

      if (error.code === "invalid_grant") {
        return NextResponse.json(
          { error: "Gmail authentication expired. Please reconnect your Gmail account." },
          { status: 401 },
        );
      }

      if (error.code === "token_refresh_failed") {
        return NextResponse.json(
          { error: "Failed to refresh Gmail tokens. Please try again or reconnect your account." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ error: "Failed to refresh Gmail tokens" }, { status: 500 });
  }
}
