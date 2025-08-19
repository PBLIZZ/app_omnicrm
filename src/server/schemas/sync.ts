// Settings/sync preferences and status schemas
// Data types sourced from server/db/schema.ts (canonical database schema)
// No manual types created - all types inferred from zod schemas

import { z } from "zod";

// Settings: sync/prefs PATCH body (aligns with user_sync_prefs table)
export const UserSyncPrefsUpdateSchema = z
  .object({
    gmailQuery: z.string().min(1).max(1000).optional(),
    gmailLabelIncludes: z.array(z.string()).optional(),
    gmailLabelExcludes: z.array(z.string()).optional(),
    calendarIncludeOrganizerSelf: z.boolean().optional(),
    calendarIncludePrivate: z.boolean().optional(),
    calendarTimeWindowDays: z.number().int().min(0).max(365).optional(),
    driveIngestionMode: z.enum(["none", "picker", "folders"]).optional(),
    driveFolderIds: z.array(z.string()).optional(),
  })
  .strict();
export type UserSyncPrefsUpdate = z.infer<typeof UserSyncPrefsUpdateSchema>;

// Settings: sync/status POST body
export const SyncStatusRequestSchema = z
  .object({
    providers: z.array(z.enum(["gmail", "calendar", "drive"])).optional(),
  })
  .strict();
export type SyncStatusRequest = z.infer<typeof SyncStatusRequestSchema>;

// Sync status response (for api/settings/sync/status)
export const SyncProviderStatusSchema = z.object({
  provider: z.enum(["gmail", "calendar", "drive"]),
  connected: z.boolean(),
  lastSync: z.string().datetime().nullable(), // ISO string
  status: z.enum(["idle", "syncing", "error", "disabled"]),
  error: z.string().nullable(),
  itemCount: z.number().int().min(0).optional(),
});

export const SyncStatusResponseSchema = z.object({
  providers: z.array(SyncProviderStatusSchema),
  lastUpdated: z.string().datetime(),
});

export type SyncProviderStatus = z.infer<typeof SyncProviderStatusSchema>;
export type SyncStatusResponse = z.infer<typeof SyncStatusResponseSchema>;
