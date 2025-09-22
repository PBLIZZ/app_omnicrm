/**
 * POST /api/google/drive/preview — Generate preview of Drive sync data volume (SCAFFOLD)
 *
 * This endpoint will estimate the size and file count for Drive folder sync.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { DrivePreferencesSchema } from "@/lib/validation/schemas/sync";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate auth but don't use userId since this is scaffolded
    await getServerUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = DrivePreferencesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: validation.error.issues
      }, { status: 400 });
    }

    // SCAFFOLD: Drive integration not yet implemented
    return NextResponse.json({ error: "Drive integration coming soon" }, { status: 500 });
  } catch (error) {
    console.error("POST /api/google/drive/preview error:", error);
    return NextResponse.json({ error: "Failed to preview Drive sync" }, { status: 500 });
  }
}
