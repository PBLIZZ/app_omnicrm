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
    gmailTimeRangeDays: z.number().int().min(1).max(365).optional(), // New: initial Gmail sync time range (max 365 days)
    calendarIncludeOrganizerSelf: z.boolean().optional(),
    calendarIncludePrivate: z.boolean().optional(),
    calendarTimeWindowDays: z.number().int().min(0).max(365).optional(),
    calendarIds: z.array(z.string()).optional(), // New: selected calendar IDs for sync
    calendarFutureDays: z.number().int().min(0).max(90).optional(), // New: future days for calendar sync (max 90)
    driveIngestionMode: z.enum(["none", "picker", "folders"]).optional(),
    driveFolderIds: z.array(z.string()).optional(),
    driveMaxSizeMB: z.number().int().min(1).max(5).optional(), // New: drive sync size limit (max 5MB)
    initialSyncCompleted: z.boolean().optional(), // New: track if initial sync is done (prevents re-modification)
    initialSyncDate: z.string().datetime().optional(), // New: when initial sync was completed
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

// Gmail preferences setup schema
export const GmailPreferencesSchema = z.object({
  timeRangeDays: z.number().int().min(1).max(365).default(365),
  importEverything: z.boolean().default(true), // Import all emails (inbox, sent, drafts, etc.)
});
export type GmailPreferences = z.infer<typeof GmailPreferencesSchema>;

// Calendar preferences setup schema
export const CalendarPreferencesSchema = z.object({
  selectedCalendarIds: z.array(z.string()).min(1, "At least one calendar must be selected"),
  pastDays: z.number().int().min(1).max(365).default(365),
  futureDays: z.number().int().min(0).max(90).default(90),
  includePrivate: z.boolean().default(false),
  includeOrganizerSelf: z.boolean().default(true),
});
export type CalendarPreferences = z.infer<typeof CalendarPreferencesSchema>;

// Drive preferences setup schema (scaffold)
export const DrivePreferencesSchema = z.object({
  selectedFolderId: z.string().min(1, "A folder must be selected"),
  maxSizeMB: z.number().int().min(1).max(5).default(5),
});
export type DrivePreferences = z.infer<typeof DrivePreferencesSchema>;

// Complete preferences setup schema
export const SyncPreferencesSetupSchema = z.object({
  service: z.enum(["gmail", "calendar", "drive"]),
  gmail: GmailPreferencesSchema.optional(),
  calendar: CalendarPreferencesSchema.optional(),
  drive: DrivePreferencesSchema.optional(),
});
export type SyncPreferencesSetup = z.infer<typeof SyncPreferencesSetupSchema>;

// Preview request schema
export const SyncPreviewRequestSchema = z.object({
  service: z.enum(["gmail", "calendar", "drive"]),
  preferences: z.union([GmailPreferencesSchema, CalendarPreferencesSchema, DrivePreferencesSchema]),
});
export type SyncPreviewRequest = z.infer<typeof SyncPreviewRequestSchema>;

// Preview response schema
export const SyncPreviewResponseSchema = z.object({
  service: z.enum(["gmail", "calendar", "drive"]),
  estimatedItems: z.number().int().min(0),
  estimatedSizeMB: z.number().min(0),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  details: z.object({
    calendars: z.array(z.object({
      id: z.string(),
      name: z.string(),
      eventCount: z.number().int().min(0),
    })).optional(),
    folders: z.array(z.object({
      id: z.string(),
      name: z.string(),
      fileSizeMB: z.number().min(0),
    })).optional(),
    emailCount: z.number().int().min(0).optional(),
  }),
  warnings: z.array(z.string()).default([]),
});
export type SyncPreviewResponse = z.infer<typeof SyncPreviewResponseSchema>;
