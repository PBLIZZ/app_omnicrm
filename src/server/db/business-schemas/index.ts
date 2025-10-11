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
export {
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectFiltersSchema,
  type Project,
  type CreateProject,
  type UpdateProject,
  type ProjectFilters,
} from "./projects";

// Calendar schemas
export {
  CalendarEventSchema,
  CreateCalendarEventSchema,
  UpdateCalendarEventSchema,
  CalendarOAuthQuerySchema,
  CalendarItemSchema,
  ClientSchema,
  AppointmentSchema,
  WeeklyStatsSchema,
  type CalendarEvent,
  type CreateCalendarEvent,
  type UpdateCalendarEvent,
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
  type CalendarStatusResponse,
  type CalendarEventsQuery,
  type CalendarEventsResponse,
  type CalendarListQuery,
  type CalendarListResponse,
} from "./calendar";

// Google preferences schemas
export {
  GooglePrefsQuerySchema,
  GooglePrefsResponseSchema,
  GooglePrefsUpdateSchema,
  GoogleStatusQuerySchema,
  GoogleStatusResponseSchema,
  type GooglePrefsQuery,
  type GooglePrefsResponse,
  type GooglePrefsUpdate,
  type GoogleStatusQuery,
  type GoogleStatusResponse,
} from "./google-prefs";

// Contact schemas
export * from "./contacts";

// Note schemas
export * from "./notes";

// Interaction schemas
export {
  InteractionSchema,
  CreateInteractionSchema,
  UpdateInteractionSchema,
  type Interaction,
  type CreateInteraction,
  type UpdateInteraction,
} from "./interactions";

// AI Insights schemas
export {
  AiInsightSchema,
  CreateAiInsightSchema,
  UpdateAiInsightSchema,
  type AiInsight,
  type CreateAiInsight,
  type UpdateAiInsight,
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
  ContactData,
  EmailInsights
} from "./gmail";

// Job Processing & Background Tasks
export {
  JobStatusQuerySchema,
  ComprehensiveJobStatusDTOSchema,
  ProcessManualSchema,
  JobProcessingResultSchema,
  SimpleJobProcessSchema,
  CalendarEventsJobResultSchema,
  RawEventsJobResultSchema,
  NormalizeJobResultSchema,
  CronJobInputSchema,
  CronJobResultSchema,
  type JobStatusQuery,
  type ComprehensiveJobStatusDTO,
  type ProcessManualRequest,
  type JobProcessingResult,
  type SimpleJobProcess,
  type CalendarEventsJobResult,
  type RawEventsJobResult,
  type NormalizeJobResult,
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
  type SyncProgressQuery,
  type SyncProgressResponse,
  type SyncCancelResponse,
  type SyncSessionError,
  type UserSyncPrefsUpdate,
  type SyncSession,
  type NewSyncSession,
} from "./sync-progress";

// Inbox Management
export * from "./inbox";

// Re-export specific types for convenience
export type {
  InboxProcessingResultDTO,
  InboxProcessingContext,
  ProcessInboxItemDTO,
} from "./inbox";

// Search Functionality
export * from "./search";

// Zones Management
export * from "./zones";

// User Management & Admin
export {
  UserExportRequestSchema,
  UserExportResponseSchema,
  UserDeletionRequestSchema,
  UserDeletionResponseSchema,
  type UserExportRequest,
  type UserExportResponse,
  type UserDeletionRequest,
  type UserDeletionResponse,
} from "./user-management";

// Onboarding Management
export {
  GenerateTokenRequestSchema,
  GenerateTokenResponseSchema,
  ListTokensQuerySchema,
  ListTokensResponseSchema,
  TokenIdParamsSchema,
  DeleteTokenRequestSchema,
  DeleteTokenResponseSchema,
  TrackAccessRequestSchema,
  TrackAccessResponseSchema,
  SignedUploadRequestSchema,
  SignedUploadResponseSchema,
  OnboardingSubmitRequestSchema,
  OnboardingSubmitResponseSchema,
  type GenerateTokenRequest,
  type GenerateTokenResponse,
  type ListTokensQuery,
  type ListTokensResponse,
  type TokenIdParams,
  type DeleteTokenRequest,
  type DeleteTokenResponse,
  type TrackAccessRequest,
  type TrackAccessResponse,
  type SignedUploadRequest,
  type SignedUploadResponse,
  type OnboardingSubmitRequest,
  type OnboardingSubmitResponse,
} from "./onboarding";

// Storage Management
export {
  UploadUrlRequestSchema,
  UploadUrlResponseSchema,
  FileUrlQuerySchema,
  FileUrlResponseSchema,
  type UploadUrlRequest,
  type UploadUrlResponse,
  type FileUrlQuery,
  type FileUrlResponse,
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
  type EmailIntelligenceTrigger,
  type EmailIntelligenceResponse,
  type ReplayInput,
  type ReplayResponse,
  type DashboardQuery,
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
  type ChatRequest,
  type ChatResponse,
  type GmailSearchRequest,
  type GmailSearchResponse,
  type GmailInsightsQuery,
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
  type GoogleSignInQuery,
} from "./health";
