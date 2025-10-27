// Database client and utilities
export { getDb, db, getSql, closeDb } from "@/server/db/client";
export type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Productivity types (explicit types to avoid Drizzle circular reference issues)
export type {
  Task,
  TaskListItem,
  TaskWithProject,
  TaskWithSubtasks,
  TaskWithRelations,
  Subtask,
  Project,
  ProjectListItem,
  ProjectWithZone,
  Zone,
  Goal,
  GoalListItem,
  DailyPulseLog,
  DailyPulseLogListItem,
  DailyPulseLogWithDetails,
  PulseDetails,
  PulseSummary,
  PulseCorrelation,
  PulseTimePattern,
  PulseAnalytics,
  InboxItem,
  InboxItemListItem,
  TaskContactTag,
  CreateTask,
  UpdateTask,
  CreateProject,
  UpdateProject,
  CreateGoal,
  UpdateGoal,
  CreateDailyPulseLog,
  UpdateDailyPulseLog,
  CreateInboxItem,
  UpdateInboxItem,
} from "./types/productivity.types";

// Habit types
export type {
  Habit,
  HabitCompletion,
  HabitType,
  HabitDetails,
  CompletionValue,
  HabitWithDetails,
  HabitCompletionWithValue,
  HabitStreak,
  HabitWithCompletions,
  HabitStats,
  HabitHeatmapDataPoint,
  HabitAnalytics,
  HabitsSummary,
  CreateHabit,
  UpdateHabit,
  CreateHabitCompletion,
  UpdateHabitCompletion,
  HabitFilters,
  HabitCompletionFilters,
  StreakMilestone,
  STREAK_MILESTONES,
} from "./types/habits.types";

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
export { TagsRepository, createTagsRepository } from "./tags.repo";
export { UserProfilesRepository, createUserProfilesRepository } from "./user-profiles.repo";

// Auth User types
export type { UserContext, UserProfile as AuthUserProfile } from "./auth-user.repo";

// Search types
export type { SearchResultDTO, TraditionalSearchParams, SemanticSearchParams } from "./search.repo";

// OmniMomentum Repository classes
export { InboxRepository, createInboxRepository } from "./inbox.repo";
export type { InboxListParams } from "./inbox.repo";
export { ZonesRepository, createZonesRepository } from "./zones.repo";
export { HabitsRepository, createHabitsRepository } from "./habits.repo";
export { CalendarRepository, createCalendarRepository } from "./calendar.repo";
export type {
  CalendarEvent,
  CalendarEventMeta,
  CreateCalendarEventData,
  UpdateCalendarEventData,
  AvailabilitySlot,
  SessionPrepData,
} from "./calendar.repo";

// Re-export database schema types for convenience
export * from "@/server/db/schema";
