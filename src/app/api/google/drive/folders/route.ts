/**
 * GET /api/google/drive/folders — List Google Drive folders for selection (SCAFFOLD)
 *
 * This endpoint will list folders in Google Drive for user selection.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "drive_folders" },
})(async ({ requestId }) => {
  const api = new ApiResponseBuilder("google.drive.folders", requestId);

  // SCAFFOLD: Drive integration not yet implemented
  return api.error(
    "Drive integration coming soon",
    "INTERNAL_ERROR",
    "Drive folder browsing will be available in a future update"
  );
});