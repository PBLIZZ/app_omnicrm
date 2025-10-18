/**
 * Business Schemas Index
 *
 * Barrel exports for all domain-specific schemas
 */

// Task schemas
// Base types (Task, CreateTask, UpdateTask) are re-exported from schema.ts
// Note: TaskWithUI removed - UI enrichment handled in service layer
export {
  TaskSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskFiltersSchema,
  type Task,
  type CreateTask,
  type UpdateTask,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskFilters,
} from "./productivity";

// Project schemas
// Base types (Project, CreateProject, UpdateProject) are re-exported from schema.ts
// Note: ProjectWithUI removed - UI enrichment handled in service layer
export {
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectFiltersSchema,
  type Project,
  type CreateProject,
  type UpdateProject,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ProjectFilters,
} from "./productivity";

// Calendar schemas
// Note: Calendar events are now stored in raw_events with provider='calendar'
export {
  CalendarOAuthQuerySchema,
  CalendarItemSchema,
  ClientSchema,
  AppointmentSchema,
  WeeklyStatsSchema,
  type CalendarEvent,
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
  DrivePreferencesSchema,
  type DrivePreferences,
} from "./sync-progress";

// Inbox Management
// Base types (InboxItem, CreateInboxItem, UpdateInboxItem) are re-exported from schema.ts
export * from "./productivity";

// Re-export specific types for convenience
export type {
  InboxProcessingResultDTO,
  InboxProcessingContext,
  ProcessInboxItemDTO,
} from "./productivity";

// Search Functionality
export * from "./search";

// Zones Management
export * from "./productivity";

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
// Note: ZoneWithUI and ZoneWithStats removed - UI enrichment handled in service layer
export {
  ZonesQuerySchema,
  ZoneFiltersSchema,
  ZonesListResponseSchema,
  ZonesWithStatsResponseSchema,
  ZoneDetailsResponseSchema,
  type Zone,
  type CreateZone,
  type UpdateZone,
  type ZonesListResponse,
  type ZonesWithStatsResponse,
} from "./productivity";

// Health & System Monitoring
export {
  HealthResponseSchema,
  DbPingResponseSchema,
  GoogleSignInQuerySchema,
  type HealthResponse,
  type DbPingResponse,
} from "./health";

// OAuth Management
export { OAuthCallbackQuerySchema, type OAuthCallbackQuery } from "@/server/lib/oauth-validation";
export {
  OAuthRedirectResponseSchema,
  OAuthConnectionStatusSchema,
  OAuthStateSchema,
  OAuthScopesSchema,
  OAuthErrorResponseSchema,
  type OAuthRedirectResponse,
  type OAuthConnectionStatus,
  type OAuthState,
  type OAuthScopes,
  type OAuthErrorResponse,
} from "./oauth";

// Raw Events JSONB Payload Schemas
export {
  GmailMessagePayloadSchema,
  GoogleCalendarEventPayloadSchema,
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema,
  RawEventPayloadSchema,
  RawEventSourceMetaSchema,
  validateGmailPayload,
  validateCalendarPayload,
  validateGmailSourceMeta,
  validateCalendarSourceMeta,
  safeValidateRawEventPayload,
  safeValidateRawEventSourceMeta,
  isGmailPayload,
  isCalendarPayload,
  isGmailSourceMeta,
  isCalendarSourceMeta,
  type GmailMessagePayload,
  type GoogleCalendarEventPayload,
  type GmailSourceMeta,
  type CalendarSourceMeta,
  type RawEventPayload,
  type RawEventSourceMeta,
} from "./raw-events-payloads";
