// Sync preferences components
export { PreferencesModal } from "./PreferencesModal";
export { GmailPreferences } from "./GmailPreferences";
export { CalendarPreferences } from "./CalendarPreferences";
export { DrivePreferences } from "./DrivePreferences";

// Types re-exported for convenience
export type {
  GmailPreferences as GmailPreferencesType,
  CalendarPreferences as CalendarPreferencesType,
  DrivePreferences as DrivePreferencesType,
  SyncPreferencesSetup,
  SyncPreviewResponse,
} from "@/lib/validation/schemas/sync";