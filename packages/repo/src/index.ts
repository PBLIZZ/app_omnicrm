// Database client and utilities
export { getDb } from "./db";
export type { DbClient } from "./db";

// Repository classes
export { ContactsRepository } from "./contacts.repo";
export { InteractionsRepository } from "./interactions.repo";
export { NotesRepository } from "./notes.repo";
export { CalendarEventsRepository } from "./calendar-events.repo";
export { MomentumRepository } from "./momentum.repo";
export { UserIntegrationsRepository } from "./user-integrations.repo";
export { SyncSessionsRepository } from "./sync-sessions.repo";

// Re-export all contract types for convenience
export * from "@omnicrm/contracts";