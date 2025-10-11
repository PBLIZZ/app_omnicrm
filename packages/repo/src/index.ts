// Database client and utilities
export { getDb, db, getSql, closeDb } from "@/server/db/client";
export type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Repository classes
export { AuthUserRepository } from "./auth-user.repo";
export { ContactsRepository } from "./contacts.repo";
export { InteractionsRepository } from "./interactions.repo";
export { NotesRepository } from "./notes.repo";
export { CalendarEventsRepository } from "./calendar-events.repo";
export { IdentitiesRepository } from "./identities.repo";
export { SearchRepository } from "./search.repo";
export { MomentumRepository, momentumRepository } from "./momentum.repo";
export { UserIntegrationsRepository } from "./user-integrations.repo";
export { SyncSessionsRepository } from "./sync-sessions.repo";
export { RawEventsRepository } from "./raw-events.repo";
export type { RawEventListParams, RawEventListItem } from "./raw-events.repo";
export { JobsRepository } from "./jobs.repo";
export { OnboardingRepository } from "./onboarding.repo";
export type {
  OnboardingToken,
  CreateOnboardingToken,
  ClientData,
  ConsentData,
  TokenValidationResult,
} from "./onboarding.repo";

// Auth User types
export type { UserContext, UserProfile } from "./auth-user.repo";

// Search types
export type { SearchResultDTO, TraditionalSearchParams, SemanticSearchParams } from "./search.repo";

// OmniMomentum Repository classes
export { InboxRepository } from "./inbox.repo";
export { ZonesRepository } from "./zones.repo";

// Re-export database schema types for convenience
export * from "@/server/db/schema";
