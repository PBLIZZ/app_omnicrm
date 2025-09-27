/**
 * POST /api/google/drive/preview — Generate preview of Drive sync data volume (SCAFFOLD)
 *
 * This endpoint will estimate the size and file count for Drive folder sync.
 * Currently scaffolded for future implementation - Drive sync is not yet implemented.
 */

import { handleAuth } from "@/lib/api";
import { DrivePreviewService } from "@/server/services/drive-preview.service";
import { z } from "zod";

const DrivePreviewRequestSchema = z.object({
  folderId: z.string().optional(),
  includeSubfolders: z.boolean().optional().default(true),
});

const DrivePreviewResponseSchema = z.object({
  error: z.string().optional(),
  fileCount: z.number().optional(),
  totalSize: z.number().optional(),
  timestamp: z.string(),
});

export const POST = handleAuth(
  DrivePreviewRequestSchema,
  DrivePreviewResponseSchema,
  async (data, userId): Promise<z.infer<typeof DrivePreviewResponseSchema>> => {
    // Generate preview using service (currently scaffolded)
    const preview = await DrivePreviewService.generateDrivePreview(userId, data);
    return {
      ...preview,
      timestamp: new Date().toISOString(),
    };
  }
);
