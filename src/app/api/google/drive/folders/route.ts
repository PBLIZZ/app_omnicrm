/**
 * GET /api/google/drive/folders — List Google Drive folders for selection (SCAFFOLD)
 *
 * This endpoint will list folders in Google Drive for user selection.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "drive_folders" },
})(async ({ requestId }) => {

  // SCAFFOLD: Drive integration not yet implemented
  return NextResponse.json({ error: "Drive integration coming soon" }, { status: 500 });
});