// Database client and utilities
export { getDb, db, getSql, closeDb } from "@/server/db/client";
export type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Repository classes
export { AuthUserRepository, createAuthUserRepository } from "./auth-user.repo";
export { ContactsRepository, createContactsRepository } from "./contacts.repo";
export { InteractionsRepository, createInteractionsRepository } from "./interactions.repo";
export type { InteractionListParams } from "./interactions.repo";
export { NotesRepository, createNotesRepository } from "./notes.repo";
export {
  ContactIdentitiesRepository,
  createContactIdentitiesRepository,
} from "./contact-identities.repo";
export { SearchRepository, createSearchRepository } from "./search.repo";
export { HealthRepository } from "./health.repo";
export { createHealthRepository } from "./health.repo";
export { ProductivityRepository, createProductivityRepository } from "./productivity.repo";
export {
  UserIntegrationsRepository,
  createUserIntegrationsRepository,
} from "./user-integrations.repo";
export { ChatRepository, createChatRepository } from "./chat.repo";
export type { UserIntegrationDTO } from "./user-integrations.repo";
export { RawEventsRepository, createRawEventsRepository } from "./raw-events.repo";
export type {
  RawEventListParams,
  RawEventListItem,
  ProviderType,
  RawEventProcessingStatus,
  RawEventContactExtractionStatus,
} from "./raw-events.repo";
export { AiInsightsRepository, createAiInsightsRepository } from "./ai-insights.repo";
export type { AiInsightListParams } from "./ai-insights.repo";
export { EmbeddingsRepository, createEmbeddingsRepository } from "./embeddings.repo";
export type { EmbeddingListParams } from "./embeddings.repo";
export { DocumentsRepository, createDocumentsRepository } from "./documents.repo";
export type { DocumentListParams } from "./documents.repo";
export {
  IgnoredIdentifiersRepository,
  createIgnoredIdentifiersRepository,
} from "./ignored-identifiers.repo";
export type { IgnoredIdentifierListParams } from "./ignored-identifiers.repo";
export type { ContactIdentityListParams } from "./contact-identities.repo";
export { JobsRepository, createJobsRepository } from "./jobs.repo";
export { OnboardingRepository, createOnboardingRepository } from "./onboarding.repo";
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
export { InboxRepository, createInboxRepository } from "./inbox.repo";
export type { InboxFilters } from "./inbox.repo";
export { ZonesRepository, createZonesRepository } from "./zones.repo";

// Re-export database schema types for convenience
export * from "@/server/db/schema";
