// Database client and utilities
export { getDb, db, getSql, closeDb } from "@/server/db/client";
export type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Repository classes
export { AuthUserRepository } from "./auth-user.repo";
export { ContactsRepository } from "./contacts.repo";
export { InteractionsRepository } from "./interactions.repo";
export { NotesRepository } from "./notes.repo";
export { ContactIdentitiesRepository } from "./contact-identities.repo";
export { SearchRepository } from "./search.repo";
export { HealthRepository } from "./health.repo";
export { ProductivityRepository, createProductivityRepository } from "./productivity.repo";
export { UserIntegrationsRepository } from "./user-integrations.repo";
export type { UserIntegrationDTO } from "./user-integrations.repo";
export { RawEventsRepository } from "./raw-events.repo";
export type { 
  RawEventListParams, 
  RawEventListItem, 
  ProviderType,
  RawEventProcessingStatus,
  RawEventContactExtractionStatus,
} from "./raw-events.repo";
export { AiInsightsRepository } from "./ai-insights.repo";
export type { AiInsightListParams } from "./ai-insights.repo";
export { EmbeddingsRepository } from "./embeddings.repo";
export type { EmbeddingListParams } from "./embeddings.repo";
export { DocumentsRepository } from "./documents.repo";
export type { DocumentListParams } from "./documents.repo";
export { IgnoredIdentifiersRepository } from "./ignored-identifiers.repo";
export type { IgnoredIdentifierListParams } from "./ignored-identifiers.repo";
export type { ContactIdentityListParams } from "./contact-identities.repo";
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
export type { InboxFilters } from "./inbox.repo";
export { ZonesRepository } from "./zones.repo";

// Re-export database schema types for convenience
export * from "@/server/db/schema";
