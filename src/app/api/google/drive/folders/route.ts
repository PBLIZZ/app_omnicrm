/**
 * GET /api/google/drive/folders — List Google Drive folders for selection (SCAFFOLD)
 *
 * This endpoint will list folders in Google Drive for user selection.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { handleGet } from "@/lib/api";
import { z } from "zod";

const DriveFoldersResponseSchema = z.object({
  error: z.string(),
  timestamp: z.string(),
});

export const GET = handleGet(
  DriveFoldersResponseSchema,
  async (): Promise<z.infer<typeof DriveFoldersResponseSchema>> => {
    // SCAFFOLD: Drive integration not yet implemented
    return {
      error: "Drive integration coming soon",
      timestamp: new Date().toISOString(),
    };
  }
);
