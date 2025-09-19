import { z } from "zod";

/**
 * User Integration DTO Schema
 *
 * Stable UI-focused contract for user integration data.
 * Handles OAuth tokens and external service connections.
 */
export const UserIntegrationDTOSchema = z.object({
  provider: z.enum(["google"]),
  service: z.enum(["auth", "gmail", "calendar", "drive"]).default("auth"),
  hasValidToken: z.boolean(), // Derived field - whether tokens are valid and non-expired
  expiryDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UserIntegrationDTO = z.infer<typeof UserIntegrationDTOSchema>;

/**
 * Create User Integration DTO Schema
 *
 * Schema for creating new user integrations
 */
export const CreateUserIntegrationDTOSchema = z.object({
  provider: z.enum(["google"]),
  service: z.enum(["auth", "gmail", "calendar", "drive"]).default("auth"),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiryDate: z.coerce.date().optional(),
});

export type CreateUserIntegrationDTO = z.infer<typeof CreateUserIntegrationDTOSchema>;

/**
 * Update User Integration DTO Schema
 *
 * Schema for updating user integrations (all fields optional)
 */
export const UpdateUserIntegrationDTOSchema = CreateUserIntegrationDTOSchema.partial();

export type UpdateUserIntegrationDTO = z.infer<typeof UpdateUserIntegrationDTOSchema>;

/**
 * User Sync Preferences DTO Schema
 *
 * Configuration for data synchronization across services
 */
export const UserSyncPrefsDTOSchema = z.object({
  // Gmail Sync Preferences
  gmailQuery: z.string().default("category:primary -in:chats -in:drafts newer_than:30d"),
  gmailLabelIncludes: z.array(z.string()).default([]),
  gmailLabelExcludes: z.array(z.string()).default(["Promotions", "Social", "Forums", "Updates"]),
  gmailTimeRangeDays: z.number().int().positive().default(365),

  // Calendar Sync Preferences
  calendarIncludeOrganizerSelf: z.boolean().default(true),
  calendarIncludePrivate: z.boolean().default(false),
  calendarTimeWindowDays: z.number().int().positive().default(60),
  calendarIds: z.array(z.string()).default([]),
  calendarFutureDays: z.number().int().positive().default(90),

  // Drive Sync Preferences
  driveIngestionMode: z.enum(["none", "picker", "folders"]).default("none"),
  driveFolderIds: z.array(z.string()).default([]),
  driveMaxSizeMB: z.number().int().positive().default(5),

  // Sync Status
  initialSyncCompleted: z.boolean().default(false),
  initialSyncDate: z.coerce.date().nullable(),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UserSyncPrefsDTO = z.infer<typeof UserSyncPrefsDTOSchema>;

/**
 * Update User Sync Preferences DTO Schema
 *
 * Schema for updating sync preferences (all fields optional)
 */
export const UpdateUserSyncPrefsDTOSchema = UserSyncPrefsDTOSchema.omit({
  createdAt: true,
  updatedAt: true,
}).partial();

export type UpdateUserSyncPrefsDTO = z.infer<typeof UpdateUserSyncPrefsDTOSchema>;

/**
 * Integration Status DTO Schema
 *
 * Combined status information for all user integrations
 */
export const IntegrationStatusDTOSchema = z.object({
  google: z.object({
    isConnected: z.boolean(),
    services: z.object({
      auth: UserIntegrationDTOSchema.optional(),
      gmail: UserIntegrationDTOSchema.optional(),
      calendar: UserIntegrationDTOSchema.optional(),
      drive: UserIntegrationDTOSchema.optional(),
    }),
    lastSyncDate: z.coerce.date().nullable(),
    syncInProgress: z.boolean().default(false),
  }),
});

export type IntegrationStatusDTO = z.infer<typeof IntegrationStatusDTOSchema>;