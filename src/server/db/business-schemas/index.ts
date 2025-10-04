/**
 * Business Schemas Index
 *
 * Barrel exports for all domain-specific schemas
 */

// Task schemas
export {
  TaskSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskFiltersSchema,
  type Task,
  type CreateTask,
  type UpdateTask,
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
} from "./projects";

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

// Interaction schemas
// Base types (Interaction, CreateInteraction, UpdateInteraction) are re-exported from schema.ts
export {
  InteractionWithUISchema,
  type Interaction,
  type CreateInteraction,
  type UpdateInteraction,
  type InteractionWithUI,
} from "./interactions";

// AI Insights schemas
// Base types (AiInsight, CreateAiInsight, UpdateAiInsight) are re-exported from schema.ts
export {
  AiInsightWithUISchema,
  type AiInsight,
  type CreateAiInsight,
  type UpdateAiInsight,
  type AiInsightWithUI,
} from "./ai-insights";

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
  EmailInsightsSchema
} from "./gmail";
export type {
  EmailClassification,
  EmailPreview,
  PreviewRange,
  ConnectConnectionStatus,
  Job,
  ConnectDashboardState,
  SearchResult,
  EmailInsights
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
export * from "./inbox";

// Re-export specific types for convenience
export type {
  InboxProcessingResultDTO,
  InboxProcessingContext,
  ProcessInboxItemDTO,
} from "./inbox";

// Search Functionality - DEPRECATED - Moved to deprecated-search-files/
// Will be reimplemented as Spotlight-style global search

// Zones Management
export * from "./zones";

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
  DeleteTokenRequestSchema,
  DeleteTokenResponseSchema,
  TrackAccessRequestSchema,
  TrackAccessResponseSchema,
  SignedUploadRequestSchema,
  SignedUploadResponseSchema,
  OnboardingSubmitRequestSchema,
  OnboardingSubmitResponseSchema,
} from "./onboarding";

// Storage Management
export {
  UploadUrlRequestSchema,
  UploadUrlResponseSchema,
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

// Chat & AI Features
export {
  ChatRequestSchema,
  ChatResponseSchema,
  GmailSearchRequestSchema,
  GmailSearchResponseSchema,
  GmailInsightsQuerySchema,
  GmailInsightsResponseSchema,
  GmailIngestTestInputSchema,
  type ChatResponse,
  type GmailSearchResponse,
  type GmailInsightsResponse,
  type GmailIngestTestInput,
} from "./chat";

// Health & System Monitoring
export {
  HealthResponseSchema,
  DbPingResponseSchema,
  GoogleSignInQuerySchema,
  type HealthResponse,
  type DbPingResponse,
} from "./health";
