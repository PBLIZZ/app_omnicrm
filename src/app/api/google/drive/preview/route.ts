/**
 * POST /api/google/drive/preview — Generate preview of Drive sync data volume (SCAFFOLD)
 *
 * This endpoint will estimate the size and file count for Drive folder sync.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { DrivePreviewService } from "@/server/services/drive-preview.service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    // Generate preview using service (currently scaffolded)
    const preview = await DrivePreviewService.generateDrivePreview(userId, body);

    return NextResponse.json(preview);
  } catch (error) {
    console.error("POST /api/google/drive/preview error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    if (errorMessage === "Drive integration coming soon") {
      return NextResponse.json({ error: "Drive integration coming soon" }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to preview Drive sync" }, { status: 500 });
  }
}
