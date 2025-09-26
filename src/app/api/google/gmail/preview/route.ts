/**
 * POST /api/google/gmail/preview — Generate preview of Gmail sync data volume
 *
 * Estimates the number of emails and data size that would be synced based on user preferences.
 * Does not perform actual sync, only provides estimates for user confirmation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GmailPreviewService } from "@/server/services/gmail-preview.service";
import { ApiEnvelope } from "@/lib/utils/type-guards";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Parse request body
    const body: unknown = await request.json();

    // Generate preview using service
    const preview = await GmailPreviewService.generateGmailPreview(userId, body);

    const envelope: ApiEnvelope<typeof preview> = { ok: true, data: preview };
    return NextResponse.json(envelope);
  } catch (error: unknown) {
    console.error("POST /api/google/gmail/preview error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle specific service errors
    if (errorMessage === "Gmail not connected") {
      const envelope: ApiEnvelope = { ok: false, error: "Gmail not connected" };
      return NextResponse.json(envelope, { status: 502 });
    }

    if (errorMessage.includes("Gmail authorization expired")) {
      const envelope: ApiEnvelope = { ok: false, error: "Gmail authorization expired. Please reconnect." };
      return NextResponse.json(envelope, { status: 502 });
    }

    if (errorMessage.includes("Rate limit exceeded")) {
      const envelope: ApiEnvelope = { ok: false, error: "Rate limit exceeded. Please try again later." };
      return NextResponse.json(envelope, { status: 500 });
    }

    const envelope: ApiEnvelope = { ok: false, error: "Failed to generate Gmail sync preview" };
    return NextResponse.json(envelope, { status: 500 });
  }
}
