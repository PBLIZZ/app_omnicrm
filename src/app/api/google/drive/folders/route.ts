/**
 * GET /api/google/drive/folders — List Google Drive folders for selection (SCAFFOLD)
 *
 * This endpoint will list folders in Google Drive for user selection.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";

export async function GET(): Promise<NextResponse> {
  try {
    // Validate auth but don't use userId since this is scaffolded
    await getServerUserId();

    // SCAFFOLD: Drive integration not yet implemented
    return NextResponse.json({ error: "Drive integration coming soon" }, { status: 500 });
  } catch (error) {
    console.error("GET /api/google/drive/folders error:", error);
    return NextResponse.json({ error: "Failed to list Drive folders" }, { status: 500 });
  }
}
