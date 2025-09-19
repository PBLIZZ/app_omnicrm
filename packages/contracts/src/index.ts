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

// Momentum Domain
export {
  MomentumWorkspaceDTOSchema,
  MomentumProjectDTOSchema,
  MomentumDTOSchema,
  MomentumActionDTOSchema,
  CreateMomentumWorkspaceDTOSchema,
  CreateMomentumProjectDTOSchema,
  CreateMomentumDTOSchema,
  CreateMomentumActionDTOSchema,
  UpdateMomentumWorkspaceDTOSchema,
  UpdateMomentumProjectDTOSchema,
  UpdateMomentumDTOSchema,
  // Legacy aliases
  WorkspaceDTOSchema,
  ProjectDTOSchema,
  type MomentumWorkspaceDTO,
  type MomentumProjectDTO,
  type MomentumDTO,
  type MomentumActionDTO,
  type CreateMomentumWorkspaceDTO,
  type CreateMomentumProjectDTO,
  type CreateMomentumDTO,
  type CreateMomentumActionDTO,
  type UpdateMomentumWorkspaceDTO,
  type UpdateMomentumProjectDTO,
  type UpdateMomentumDTO,
  // Legacy aliases
  type WorkspaceDTO,
  type ProjectDTO,
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
  JobStatusDTOSchema,
  BatchJobDTOSchema,
  type JobDTO,
  type CreateJobDTO,
  type JobStatusDTO,
  type BatchJobDTO,
} from "./job";

// Common Types
export type UUID = string;
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

// API Response Envelopes
export type OkEnvelope<T> = {
  ok: true;
  data: T;
};

export type ErrorEnvelope = {
  ok: false;
  error: string;
  details?: unknown;
};

export type ApiResponse<T> = OkEnvelope<T> | ErrorEnvelope;

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
  workspaceId?: string;
  projectId?: string;
  dueAfter?: Date;
  dueBefore?: Date;
};