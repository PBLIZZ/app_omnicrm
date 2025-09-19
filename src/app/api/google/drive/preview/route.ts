/**
 * POST /api/google/drive/preview — Generate preview of Drive sync data volume (SCAFFOLD)
 *
 * This endpoint will estimate the size and file count for Drive folder sync.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { DrivePreferencesSchema } from "@/lib/validation/schemas/sync";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "drive_preview" },
  validation: {
    body: DrivePreferencesSchema,
  },
})(async ({ requestId }) => {
  const api = new ApiResponseBuilder("google.drive.preview", requestId);

  // SCAFFOLD: Drive integration not yet implemented
  return api.error(
    "Drive integration coming soon",
    "INTERNAL_ERROR",
    "Drive sync preview will be available in a future update"
  );
});