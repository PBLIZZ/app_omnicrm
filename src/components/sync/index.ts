// Sync preferences components
export { PreferencesModal } from "./PreferencesModal";
export { GmailPreferences } from "./GmailPreferences";
export { CalendarPreferences } from "./CalendarPreferences";
export { DrivePreferences } from "./DrivePreferences";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Branded type for ISO 8601 date strings (YYYY-MM-DDTHH:mm:ss.sssZ format)
 * Provides type safety for date strings while maintaining string compatibility
 */
export type ISODateString = string & { __isoDate: void };

/**
 * Ensure a string is a strict ISO 8601 UTC timestamp and return it typed as `ISODateString`.
 *
 * @param value - The date-time string to validate (expected format: `YYYY-MM-DDTHH:mm:ss.sssZ`)
 * @returns The same input string cast to `ISODateString`
 * @throws Error if `value` is not a valid date or does not exactly match `Date.prototype.toISOString()` (strict ISO 8601 format)
 */
export function toISODateString(value: string): ISODateString {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${value}`);
  }

  // Check that the date string matches the exact ISO format by round-tripping
  if (date.toISOString() !== value) {
    throw new Error(`Date string must be in strict ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ): ${value}`);
  }

  return value as ISODateString;
}

/**
 * Gmail sync preferences configuration
 */
export type GmailPreferencesType = {
  gmailQuery?: string;
  gmailLabelIncludes?: string[];
  gmailLabelExcludes?: string[];
  gmailTimeRangeDays?: number;
};

/**
 * Calendar sync preferences configuration
 */
export type CalendarPreferencesType = {
  calendarIds?: string[];
  calendarIncludeOrganizerSelf?: boolean;
  calendarIncludePrivate?: boolean;
  calendarTimeWindowDays?: number;
  calendarFutureDays?: number;
};

/**
 * Drive sync preferences configuration
 */
export type DrivePreferencesType = {
  driveIngestionMode?: "none" | "picker" | "folders";
  driveFolderIds?: string[];
  driveMaxSizeMB?: number;
};

/**
 * Sync preview response from API endpoints
 * Contains metadata about what would be synced during initial setup
 */
// Supported sync services
export type SyncService = "google" | "dropbox" | "onedrive";

export type SyncPreviewResponse = {
  /** Total number of items found that match sync criteria */
  itemsFound: number;
  /** Estimated size of data to be synced in MB */
  estimatedSizeMB: number;
  /** Service type (e.g., "google", "dropbox", "onedrive") */
  service?: SyncService;
  /** Date range for the sync operation */
  dateRange?: {
    /** Start date in ISO 8601 format (e.g., "2023-01-01T00:00:00.000Z") */
    from: ISODateString;
    /** End date in ISO 8601 format (e.g., "2023-12-31T23:59:59.999Z") */
    to: ISODateString;
  };
  /** Error message if preview generation failed */
  error?: string;
  /** Additional service-specific details (e.g., calendar information) */
  details?: {
    /** Calendar items for calendar sync preview */
    calendars?: Array<{
      id: string;
      summary: string;
      primary: boolean;
      accessRole: string;
    }>;
  };
  /** Warning messages for potential issues */
  warnings?: string[];
};

/**
 * Complete sync preferences setup for all services
 */
export type SyncPreferencesSetup = {
  gmail?: GmailPreferencesType;
  calendar?: CalendarPreferencesType;
  drive?: DrivePreferencesType;
};