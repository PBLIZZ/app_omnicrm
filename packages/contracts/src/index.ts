/**
 * OmniCRM Contracts Package
 *
 * Centralized DTO schemas and types for all domain entities.
 * Provides stable, UI-focused contracts that are decoupled from database schema.
 */

// Contact Domain
export {
  ContactDTOSchema,
  ContactIdentityDTOSchema,
  CreateContactDTOSchema,
  UpdateContactDTOSchema,
  ContactWithNotesDTOSchema,
  type ContactDTO,
  type ContactIdentityDTO,
  type CreateContactDTO,
  type UpdateContactDTO,
  type ContactWithNotesDTO,
} from "./contact";

// Interaction Domain
export {
  InteractionDTOSchema,
  CreateInteractionDTOSchema,
  UpdateInteractionDTOSchema,
  type InteractionDTO,
  type CreateInteractionDTO,
  type UpdateInteractionDTO,
} from "./interaction";

// Note Domain
export {
  NoteDTOSchema,
  CreateNoteDTOSchema,
  UpdateNoteDTOSchema,
  type NoteDTO,
  type CreateNoteDTO,
  type UpdateNoteDTO,
} from "./note";

// Calendar Event Domain
export {
  CalendarEventDTOSchema,
  ContactTimelineDTOSchema,
  CreateCalendarEventDTOSchema,
  UpdateCalendarEventDTOSchema,
  CalendarEventFiltersSchema,
  type CalendarEventDTO,
  type ContactTimelineDTO,
  type CreateCalendarEventDTO,
  type UpdateCalendarEventDTO,
  type CalendarEventFilters,
} from "./calendar-event";

// OmniMomentum Domain (Projects, Tasks, Goals)
export {
  ProjectDTOSchema,
  TaskDTOSchema,
  TaskWithRelationsDTOSchema,
  GoalDTOSchema,
  DailyPulseLogDTOSchema,
  CreateProjectDTOSchema,
  CreateTaskDTOSchema,
  CreateGoalDTOSchema,
  CreateDailyPulseLogDTOSchema,
  UpdateProjectDTOSchema,
  UpdateTaskDTOSchema,
  UpdateGoalDTOSchema,
  UpdateDailyPulseLogDTOSchema,
  ProjectFiltersSchema,
  TaskFiltersSchema,
  GoalFiltersSchema,
  QuickTaskCreateDTOSchema,
  BulkTaskUpdateDTOSchema,
  ProjectStatusSchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  GoalTypeSchema,
  GoalStatusSchema,
  type ProjectDTO,
  type TaskDTO,
  type TaskWithRelationsDTO,
  type GoalDTO,
  type DailyPulseLogDTO,
  type CreateProjectDTO,
  type CreateTaskDTO,
  type CreateGoalDTO,
  type CreateDailyPulseLogDTO,
  type UpdateProjectDTO,
  type UpdateTaskDTO,
  type UpdateGoalDTO,
  type UpdateDailyPulseLogDTO,
  type ProjectFilters,
  type TaskFilters,
  type GoalFilters,
  type QuickTaskCreateDTO,
  type BulkTaskUpdateDTO,
  type ProjectStatus,
  type TaskStatus,
  type TaskPriority,
  type GoalType,
  type GoalStatus,
} from "./momentum";

// User Integration Domain
export {
  UserIntegrationDTOSchema,
  CreateUserIntegrationDTOSchema,
  UpdateUserIntegrationDTOSchema,
  UserSyncPrefsDTOSchema,
  UpdateUserSyncPrefsDTOSchema,
  IntegrationStatusDTOSchema,
  type UserIntegrationDTO,
  type CreateUserIntegrationDTO,
  type UpdateUserIntegrationDTO,
  type UserSyncPrefsDTO,
  type UpdateUserSyncPrefsDTO,
  type IntegrationStatusDTO,
} from "./user-integration";

// Sync Session Domain
export {
  SyncSessionDTOSchema,
  SyncAuditDTOSchema,
  CreateSyncSessionDTOSchema,
  UpdateSyncSessionDTOSchema,
  SyncSessionFiltersSchema,
  SyncProgressDTOSchema,
  type SyncSessionDTO,
  type SyncAuditDTO,
  type CreateSyncSessionDTO,
  type UpdateSyncSessionDTO,
  type SyncSessionFilters,
  type SyncProgressDTO,
} from "./sync-session";

// AI Insight Domain
export {
  AiInsightDTOSchema,
  AiUsageDTOSchema,
  AiQuotaDTOSchema,
  CreateAiInsightDTOSchema,
  type AiInsightDTO,
  type AiUsageDTO,
  type AiQuotaDTO,
  type CreateAiInsightDTO,
} from "./ai-insight";

// Job Domain
export {
  JobDTOSchema,
  CreateJobDTOSchema,
  JobQueueStatusDTOSchema,
  JobStatusResponseDTOSchema,
  DataFreshnessDTOSchema,
  ProcessingHealthDTOSchema,
  ComprehensiveJobStatusDTOSchema,
  BatchJobDTOSchema,
  type JobDTO,
  type CreateJobDTO,
  type JobQueueStatusDTO,
  type JobStatusResponseDTO,
  type DataFreshnessDTO,
  type ProcessingHealthDTO,
  type ComprehensiveJobStatusDTO,
  type BatchJobDTO,
} from "./job";

// Raw Event Domain
export {
  RawEventDTOSchema,
  CreateRawEventDTOSchema,
  RawEventErrorDTOSchema,
  CreateRawEventErrorDTOSchema,
  GmailIngestionResultDTOSchema,
  RawEventFiltersSchema,
  type RawEventDTO,
  type CreateRawEventDTO,
  type RawEventErrorDTO,
  type CreateRawEventErrorDTO,
  type GmailIngestionResultDTO,
  type RawEventFilters,
} from "./raw-event";

// Inbox Domain
export {
  InboxItemDTOSchema,
  CreateInboxItemDTOSchema,
  UpdateInboxItemDTOSchema,
  ProcessInboxItemDTOSchema,
  InboxProcessingResultDTOSchema,
  InboxItemWithSuggestionsDTOSchema,
  BulkProcessInboxDTOSchema,
  VoiceInboxCaptureDTOSchema,
  InboxFiltersSchema,
  InboxItemStatusSchema,
  type InboxItemDTO,
  type CreateInboxItemDTO,
  type UpdateInboxItemDTO,
  type ProcessInboxItemDTO,
  type InboxProcessingResultDTO,
  type InboxItemWithSuggestionsDTO,
  type BulkProcessInboxDTO,
  type VoiceInboxCaptureDTO,
  type InboxFilters,
  type InboxItemStatus,
} from "./inbox";

// Zones Domain
export {
  ZoneDTOSchema,
  CreateZoneDTOSchema,
  UpdateZoneDTOSchema,
  ZoneWithStatsDTOSchema,
  type ZoneDTO,
  type CreateZoneDTO,
  type UpdateZoneDTO,
  type ZoneWithStatsDTO,
} from "./zones";

// Common Types
export type UUID = string;
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Pagination Types
export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// Filter Types for common entities
export type ContactFilters = {
  search?: string;
  stage?: string[];
  tags?: string[];
  source?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
};

export type InteractionFilters = {
  search?: string;
  type?: string[];
  source?: string[];
  contactId?: string;
  occurredAfter?: Date;
  occurredBefore?: Date;
};

export type MomentumFilters = {
  search?: string;
  status?: string[];
  priority?: string[];
  assignee?: string[];
  projectId?: string;
  dueAfter?: Date;
  dueBefore?: Date;
};
