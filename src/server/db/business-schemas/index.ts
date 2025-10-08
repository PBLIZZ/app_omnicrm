/**
 * Business Schemas Index
 *
 * Barrel exports for all domain-specific schemas
 */

// Task schemas
// Base types (Task, CreateTask, UpdateTask) are re-exported from schema.ts
export {
  TaskWithUISchema,
  TaskFiltersSchema,
  type Task,
  type CreateTask,
  type UpdateTask,
  type TaskWithUI,
  type TaskFilters,
} from "./tasks";

// Project schemas
// Base types (Project, CreateProject, UpdateProject) are re-exported from schema.ts
export {
  ProjectWithUISchema,
  ProjectFiltersSchema,
  type Project,
  type CreateProject,
  type UpdateProject,
  type ProjectWithUI,
  type ProjectFilters,
} from "./tasks";

// Calendar schemas
// Base types (CalendarEvent, CreateCalendarEvent, UpdateCalendarEvent) are re-exported from schema.ts
export {
  CalendarEventWithUISchema,
  CalendarOAuthQuerySchema,
  CalendarItemSchema,
  ClientSchema,
  AppointmentSchema,
  WeeklyStatsSchema,
  type CalendarEvent,
  type CreateCalendarEvent,
  type UpdateCalendarEvent,
  type CalendarEventWithUI,
  type CalendarOAuthQuery,
  type CalendarItem,
  type Client,
  type Appointment,
  type WeeklyStats,
} from "./calendar";

export {
  CalendarSyncRequestSchema,
  CalendarSyncResponseSchema,
  CalendarSyncBlockingRequestSchema,
  CalendarSyncBlockingResponseSchema,
  CalendarImportRequestSchema,
  CalendarStatusResponseSchema,
  CalendarEventsQuerySchema,
  CalendarEventsResponseSchema,
  CalendarListQuerySchema,
  CalendarListResponseSchema,
  type CalendarSyncRequest,
  type CalendarSyncResponse,
  type CalendarSyncBlockingRequest,
  type CalendarSyncBlockingResponse,
  type CalendarImportRequest,
} from "./calendar";

// Google preferences schemas
export {
  GooglePrefsQuerySchema,
  GooglePrefsResponseSchema,
  GooglePrefsUpdateSchema,
  GoogleStatusQuerySchema,
  GoogleStatusResponseSchema,
  GoogleErrorCodeEnum,
  GoogleServiceErrorSchema,
  type GoogleErrorCode,
  type GoogleServiceError,
} from "./google-prefs";

// Contact schemas
export * from "./contacts";

// Note schemas
export * from "./notes";

// Data Intelligence schemas
export * from "./ai-insights";
export * from "./contact-identities";
export * from "./documents";
export * from "./embeddings";
export * from "./ignored-identifiers";
export * from "./interactions";
export * from "./raw-events";

// Gmail schemas
export * from "./gmail";
export {
  EmailClassificationSchema,
  EmailPreviewSchema,
  PreviewRangeSchema,
  ConnectConnectionStatusSchema,
  JobSchema,
  ConnectDashboardStateSchema,
  SearchResultSchema,
  ContactDataSchema,
  EmailInsightsSchema,
} from "./gmail";
export type {
  EmailClassification,
  EmailPreview,
  PreviewRange,
  ConnectConnectionStatus,
  Job,
  ConnectDashboardState,
  SearchResult,
  EmailInsights,
} from "./gmail";

// Job Processing & Background Tasks
export {
  CronJobInputSchema,
  CronJobResultSchema,
  SimpleJobProcessSchema,
  JobProcessingResultSchema,
  type CronJobInput,
  type CronJobResult,
} from "./jobs";

// Sync Progress & Session Management
export {
  SyncProgressQuerySchema,
  SyncProgressResponseSchema,
  SyncCancelResponseSchema,
  SyncSessionErrorSchema,
  UserSyncPrefsUpdateSchema,
  SyncSessionSchema,
  NewSyncSessionSchema,
} from "./sync-progress";

// Inbox Management
// Base types (InboxItem, CreateInboxItem, UpdateInboxItem) are re-exported from schema.ts
export * from "./tasks";

// Re-export specific types for convenience
export type {
  InboxProcessingResultDTO,
  InboxProcessingContext,
  ProcessInboxItemDTO,
} from "./tasks";

// Search Functionality - DEPRECATED - Moved to deprecated-search-files/
// Will be reimplemented as Spotlight-style global search

// Zones Management
export * from "./tasks";

// User Management & Admin
export {
  UserExportRequestSchema,
  UserExportResponseSchema,
  UserDeletionRequestSchema,
  UserDeletionResponseSchema,
} from "./user-management";

// Onboarding Management
export {
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
  ListTokensQuerySchema,
  ListTokensResponseSchema,
  TokenIdParamsSchema,
  TokenInfoSchema,
  DeleteTokenResponseSchema,
  TrackAccessRequestSchema,
  TrackAccessResponseSchema,
  OnboardingSubmitRequestSchema,
  OnboardingSubmitResponseSchema,
} from "./onboarding";

// Storage Management
export {
  FileUrlQuerySchema,
  FileUrlResponseSchema,
  BatchFileUrlRequestSchema,
  BatchFileUrlResponseSchema,
} from "./storage";

// Error Handling schemas have been removed as part of error tracking service simplification

// Admin Operations
export {
  EmailIntelligenceTriggerSchema,
  EmailIntelligenceResponseSchema,
  ReplayInputSchema,
  ReplayResponseSchema,
  DashboardQuerySchema,
  DashboardResponseSchema,
  type EmailIntelligenceResponse,
  type ReplayResponse,
  type DashboardResponse,
} from "./admin";

// Zone schemas
// Base types (Zone, CreateZone, UpdateZone) are re-exported from schema.ts
export {
  ZoneWithUISchema,
  ZoneWithStatsSchema,
  ZonesQuerySchema,
  ZoneFiltersSchema,
  ZonesListResponseSchema,
  ZonesWithStatsResponseSchema,
  ZoneDetailsResponseSchema,
  type Zone,
  type CreateZone,
  type UpdateZone,
  type ZoneWithUI,
  type ZoneWithStats,
  type ZonesListResponse,
  type ZonesWithStatsResponse,
} from "./tasks";

// Health & System Monitoring
export {
  HealthResponseSchema,
  DbPingResponseSchema,
  type HealthResponse,
  type DbPingResponse,
} from "./health";
