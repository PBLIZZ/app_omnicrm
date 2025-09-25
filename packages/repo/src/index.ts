// Database client and utilities
export { getDb } from "./db";
export type { DbClient } from "./db";

// Repository classes
export { ContactsRepository } from "./contacts.repo";
export { InteractionsRepository } from "./interactions.repo";
export { NotesRepository } from "./notes.repo";
export { CalendarEventsRepository } from "./calendar-events.repo";
export { MomentumRepository, momentumRepository } from "./momentum.repo";
export { UserIntegrationsRepository } from "./user-integrations.repo";
export { SyncSessionsRepository } from "./sync-sessions.repo";
export { RawEventsRepository } from "./raw-events.repo";
export { JobsRepository } from "./jobs.repo";

// OmniMomentum Repository classes
export { InboxRepository } from "./inbox.repo";
export { ZonesRepository } from "./zones.repo";

// Re-export all contract types for convenience
export * from "@omnicrm/contracts";