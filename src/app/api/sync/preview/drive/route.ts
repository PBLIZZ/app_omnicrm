/** POST /api/sync/preview/drive — compute Drive preview (auth required). Errors: 404 not_found, 401 Unauthorized, 500 preview_failed */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { z } from "zod";

const previewBodySchema = z
  .object({
    testOnly: z.boolean().optional(),
  })
  .strict();

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "drive_preview" },
  validation: {
    body: previewBodySchema,
  },
})(async ({ requestId }) => {
  const api = new ApiResponseBuilder("sync.preview.drive", requestId);

  // If the feature is disabled, treat the route as not found regardless of auth
  if (process.env["FEATURE_GOOGLE_DRIVE"] !== "1") {
    return api.error("drive_disabled", "NOT_FOUND");
  }

  // Stub for Phase 3 shape
  return api.success({ count: 0, sampleFilenames: [] });
});
