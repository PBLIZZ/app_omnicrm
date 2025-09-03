// Google Drive preview payload schemas
// Data types sourced from server/db/schema.ts (canonical database schema)
// No manual types created - all types inferred from zod schemas

import { z } from "zod";

// Drive preview request (for api/sync/preview/drive)
export const DrivePreviewSchema = z
  .object({
    folderIds: z.array(z.string()).min(1),
    limit: z.number().int().min(1).max(1000).default(100),
  })
  .strict();
export type DrivePreview = z.infer<typeof DrivePreviewSchema>;

// Drive file preview item (response from preview endpoint)
export const DriveFilePreviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.string().optional(), // Google returns size as string
  createdTime: z.string().datetime(),
  modifiedTime: z.string().datetime(),
  owners: z
    .array(
      z.object({
        emailAddress: z.string().email(),
        displayName: z.string().optional(),
      }),
    )
    .optional(),
  webViewLink: z.string().url().optional(),
  thumbnailLink: z.string().url().optional(),
  folderPath: z.array(z.string()).optional(), // Breadcrumb path
});

export const DrivePreviewResponseSchema = z.object({
  files: z.array(DriveFilePreviewSchema),
  stats: z.object({
    totalFiles: z.number().int().min(0),
    totalSize: z.number().int().min(0),
    fileTypes: z.record(z.string(), z.number().int().min(0)), // mimeType -> count
  }),
  batchId: z.string().uuid(),
});

export type DriveFilePreview = z.infer<typeof DriveFilePreviewSchema>;
export type DrivePreviewResponse = z.infer<typeof DrivePreviewResponseSchema>;
