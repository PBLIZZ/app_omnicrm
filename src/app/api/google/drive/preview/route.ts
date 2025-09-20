/**
 * POST /api/google/drive/preview — Generate preview of Drive sync data volume (SCAFFOLD)
 *
 * This endpoint will estimate the size and file count for Drive folder sync.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { DrivePreferencesSchema } from "@/lib/validation/schemas/sync";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "drive_preview" },
  validation: {
    body: DrivePreferencesSchema,
  },
})(async ({ requestId }) => {

  // SCAFFOLD: Drive integration not yet implemented
  return NextResponse.json({ error: "Drive integration coming soon" }, { status: 500 });
});