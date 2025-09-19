/**
 * Unified Types for Omni-Clients Components
 *
 * This file consolidates all types used across the omni-clients module components.
 * It serves as the single source of truth to prevent type drift and reduce complexity.
 *
 * All omni-clients components should import types from this file instead of
 * directly from validation schemas or defining local interfaces.
 */

// Import and re-export core types from validation schemas
import type {
  OmniClientDTO,
  OmniClientWithNotesDTO,
  CreateOmniClientInput,
  UpdateOmniClientInput,
  GetOmniClientsQuery,
  OmniClientsListResponseDTO,
  OmniClientResponseDTO,
  ClientSuggestion,
  ClientSuggestionsResponse,
  ClientAIInsightsResponse,
  ClientEmailSuggestion,
  ClientNoteSuggestion,
  ClientNoteSuggestionsResponse,
  CreateNoteInput,
  UpdateNoteInput,
  CreatedAtFilter,
  BulkDeleteBody,
  // Legacy Contact types for backward compatibility
  ContactDTO,
  ContactListResponse,
  CreateContactBody,
  UpdateContactBody,
  GetContactsQuery,
  CreateContactInput,
  UpdateContactInput,
  FetchContactsParams,
} from "@/lib/validation/schemas/omniClients";

// Import additional types needed
import type { ColumnDef } from "@tanstack/react-table";

// Re-export the imported types
export type {
  OmniClientDTO,
  OmniClientWithNotesDTO,
  CreateOmniClientInput,
  UpdateOmniClientInput,
  GetOmniClientsQuery,
  OmniClientsListResponseDTO,
  OmniClientResponseDTO,
  ClientSuggestion,
  ClientSuggestionsResponse,
  ClientAIInsightsResponse,
  ClientEmailSuggestion,
  ClientNoteSuggestion,
  ClientNoteSuggestionsResponse,
  CreateNoteInput,
  UpdateNoteInput,
  CreatedAtFilter,
  BulkDeleteBody,
  // Legacy Contact types for backward compatibility
  ContactDTO,
  ContactListResponse,
  CreateContactBody,
  UpdateContactBody,
  GetContactsQuery,
  CreateContactInput,
  UpdateContactInput,
  FetchContactsParams,
};

// Re-export utility function
export { toDateRange } from "@/lib/validation/schemas/omniClients";

// Re-export Zod schemas for validation
export {
  OmniClientSchema,
  OmniClientWithNotesSchema,
  CreateOmniClientSchema,
  UpdateOmniClientSchema,
  GetOmniClientsQuerySchema,
  OmniClientsListResponseSchema,
  OmniClientResponseSchema,
  ClientSuggestionSchema,
  ClientSuggestionsResponseSchema,
  ClientAIInsightsResponseSchema,
  ClientEmailSuggestionSchema,
  ClientNoteSuggestionSchema,
  ClientNoteSuggestionsResponseSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  CreatedAtFilterSchema,
  BulkDeleteBodySchema,
  ContactDTOSchema,
  ContactListResponseSchema,
  CreateContactBodySchema,
  UpdateContactBodySchema,
  GetContactsQuerySchema,
} from "@/lib/validation/schemas/omniClients";

// --- Additional Validation Schemas for Components ---

import { z } from "zod";

/**
 * Client form validation schemas for UI components
 */
export const ClientFormSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(200, "Name too long").trim(),
  primaryEmail: z.string().email("Invalid email format").nullable().optional().or(z.literal("")),
  primaryPhone: z.string().max(50, "Phone number too long").nullable().optional().or(z.literal("")),
  source: z.enum(["manual", "gmail_import", "upload", "calendar_import"]).optional(),
  stage: z.string().max(100, "Stage too long").nullable().optional().or(z.literal("")),
  tags: z.array(z.string().max(50, "Tag too long")).max(20, "Too many tags").nullable().optional(),
});

export const ClientQuickAddSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(200, "Name too long").trim(),
  primaryEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  primaryPhone: z.string().max(50, "Phone number too long").optional().or(z.literal("")),
});

export const ClientSearchSchema = z.object({
  query: z.string().max(200, "Search query too long").optional(),
  sortBy: z.enum(["displayName", "createdAt", "updatedAt", "lastInteraction"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().min(1).max(1000).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
  tags: z.array(z.string()).optional(),
  stage: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  hasNotes: z.boolean().optional(),
  hasInteractions: z.boolean().optional(),
  dateRange: z
    .object({
      field: z.enum(["createdAt", "updatedAt", "lastInteraction"]),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export const ClientBulkOperationSchema = z.object({
  operation: z.enum(["delete", "enrich", "tag", "stage", "export"]),
  clientIds: z.array(z.string().uuid()).min(1, "At least one client must be selected"),
  options: z.record(z.string(), z.unknown()).optional(),
});

export const ClientTagUpdateSchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1, "At least one client must be selected"),
  action: z.enum(["add", "remove", "replace"]),
  tags: z.array(z.string().max(50, "Tag too long")).max(20, "Too many tags"),
});

export const ClientStageUpdateSchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1, "At least one client must be selected"),
  stage: z.string().max(100, "Stage too long"),
});

export const ClientExportSchema = z.object({
  format: z.enum(["csv", "excel", "json"]),
  fields: z.array(z.string()).min(1, "At least one field must be selected"),
  includeNotes: z.boolean().optional(),
  includeInteractions: z.boolean().optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
  filters: z
    .object({
      tags: z.array(z.string()).optional(),
      stage: z.array(z.string()).optional(),
      source: z.array(z.string()).optional(),
    })
    .optional(),
});

export const ClientImportSchema = z.object({
  source: z.enum(["csv", "excel", "google_contacts", "calendar"]),
  // string -> string mapping
  mapping: z.record(z.string(), z.string()).optional(),
  skipDuplicates: z.boolean().optional(),
  updateExisting: z.boolean().optional(),
  defaultTags: z.array(z.string().max(50, "Tag too long")).max(20, "Too many tags").optional(),
  defaultStage: z.string().max(100, "Stage too long").optional(),
});

export const ClientNoteFormSchema = z.object({
  title: z.string().max(200, "Title too long").optional(),
  content: z.string().min(1, "Note content is required").max(5000, "Note too long").trim(),
  category: z
    .enum([
      "session_notes",
      "wellness_goals",
      "preferences",
      "concerns",
      "treatment_plan",
      "follow_up",
      "general",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string().max(50, "Tag too long")).max(10, "Too many tags").optional(),
});

export const ClientEmailFormSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long").trim(),
  content: z.string().min(1, "Email content is required").max(10000, "Email too long").trim(),
  tone: z.enum(["professional", "friendly", "caring", "urgent"]).optional(),
  category: z.enum(["follow-up", "appointment", "wellness", "general"]).optional(),
  isTemplate: z.boolean().optional(),
  templateName: z.string().max(100, "Template name too long").optional(),
});

export const ClientSuggestionActionSchema = z.object({
  suggestionIds: z.array(z.string()).min(1, "At least one suggestion must be selected"),
  action: z.enum(["accept", "reject", "ignore"]),
  customTags: z.array(z.string().max(50, "Tag too long")).max(10, "Too many tags").optional(),
  customStage: z.string().max(100, "Stage too long").optional(),
});

export const ClientWellnessProfileSchema = z.object({
  clientId: z.string().uuid(),
  goals: z.array(z.string().max(200, "Goal too long")).max(10, "Too many goals").optional(),
  preferences: z
    .array(z.string().max(200, "Preference too long"))
    .max(15, "Too many preferences")
    .optional(),
  concerns: z
    .array(z.string().max(200, "Concern too long"))
    .max(10, "Too many concerns")
    .optional(),
  treatmentHistory: z
    .array(z.string().max(500, "History entry too long"))
    .max(20, "Too many history entries")
    .optional(),
  nextSteps: z
    .array(z.string().max(200, "Next step too long"))
    .max(10, "Too many next steps")
    .optional(),
  lastAssessment: z.string().datetime().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const ClientNotificationPreferencesSchema = z.object({
  emailUpdates: z.boolean().optional(),
  smsUpdates: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  wellnessTips: z.boolean().optional(),
  followUpReminders: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  frequency: z.enum(["immediate", "daily", "weekly", "monthly"]).optional(),
});

export const ClientRelationshipSchema = z.object({
  clientId: z.string().uuid(),
  relatedClientId: z.string().uuid(),
  relationshipType: z.enum(["family", "friend", "colleague", "referral", "other"]),
  notes: z.string().max(500, "Notes too long").optional(),
});

// --- TypeScript Types for Validation Schemas ---

export type ClientFormData = z.infer<typeof ClientFormSchema>;
export type ClientQuickAddData = z.infer<typeof ClientQuickAddSchema>;
export type ClientSearchData = z.infer<typeof ClientSearchSchema>;
export type ClientBulkOperationData = z.infer<typeof ClientBulkOperationSchema>;
export type ClientTagUpdateData = z.infer<typeof ClientTagUpdateSchema>;
export type ClientStageUpdateData = z.infer<typeof ClientStageUpdateSchema>;
export type ClientExportData = z.infer<typeof ClientExportSchema>;
export type ClientImportData = z.infer<typeof ClientImportSchema>;
export type ClientNoteFormData = z.infer<typeof ClientNoteFormSchema>;
export type ClientEmailFormData = z.infer<typeof ClientEmailFormSchema>;
export type ClientSuggestionActionData = z.infer<typeof ClientSuggestionActionSchema>;
export type ClientWellnessProfileData = z.infer<typeof ClientWellnessProfileSchema>;
export type ClientNotificationPreferencesData = z.infer<typeof ClientNotificationPreferencesSchema>;
export type ClientRelationshipData = z.infer<typeof ClientRelationshipSchema>;

// --- Validation Utility Functions ---

/**
 * Validation helper functions for components
 */
export const validationHelpers = {
  /**
   * Validate client form data
   */
  validateClientForm: (data: unknown) => {
    try {
      return { success: true, data: ClientFormSchema.parse(data) };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error.issues };
      }
      return { success: false, errors: [{ message: "Validation failed" }] };
    }
  },

  /**
   * Validate client quick add data
   */
  validateClientQuickAdd: (data: unknown) => {
    try {
      return { success: true, data: ClientQuickAddSchema.parse(data) };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error.issues };
      }
      return { success: false, errors: [{ message: "Validation failed" }] };
    }
  },

  /**
   * Validate search parameters
   */
  validateSearchParams: (data: unknown) => {
    try {
      return { success: true, data: ClientSearchSchema.parse(data) };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error.issues };
      }
      return { success: false, errors: [{ message: "Validation failed" }] };
    }
  },

  /**
   * Validate note form data
   */
  validateNoteForm: (data: unknown) => {
    try {
      return { success: true, data: ClientNoteFormSchema.parse(data) };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error.issues };
      }
      return { success: false, errors: [{ message: "Validation failed" }] };
    }
  },

  /**
   * Validate email form data
   */
  validateEmailForm: (data: unknown) => {
    try {
      return { success: true, data: ClientEmailFormSchema.parse(data) };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error.issues };
      }
      return { success: false, errors: [{ message: "Validation failed" }] };
    }
  },

  /**
   * Validate bulk operation data
   */
  validateBulkOperation: (data: unknown) => {
    try {
      return { success: true, data: ClientBulkOperationSchema.parse(data) };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error.issues };
      }
      return { success: false, errors: [{ message: "Validation failed" }] };
    }
  },

  /**
   * Get field-specific error message
   */
  getFieldError: (errors: z.ZodIssue[], fieldPath: string): string | undefined => {
    const fieldError = errors.find((error) => {
      const errorPath = error.path?.join(".");
      return errorPath === fieldPath;
    });
    return fieldError?.message;
  },

  /**
   * Check if form has any errors
   */
  hasErrors: (errors: z.ZodError[]): boolean => {
    return errors.length > 0;
  },

  /**
   * Get all error messages as a flat array
   */
  getAllErrors: (errors: z.ZodError[]): string[] => {
    return errors.map((error) => error.message);
  },

  /**
   * Get errors grouped by field
   */
  getErrorsByField: (errors: z.ZodIssue[]): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};
    errors.forEach((error) => {
      const fieldPath = error.path?.join(".") ?? "unknown";
      grouped[fieldPath] ??= [];
      grouped[fieldPath]?.push(error.message);
    });
    return grouped;
  },
};

// --- Component-Specific Types ---

/**
 * Alias for backward compatibility - components can use either name
 */
export type ClientWithNotes = OmniClientWithNotesDTO;

/**
 * Exportable client data for CSV/Excel export functionality
 */
export interface ExportableClientData {
  id: string;
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: string | null;
  stage: string | null;
  tags: string[] | null;
  confidenceScore: string | null;
  notesCount: number;
  lastNote: string | null;
  interactions: number | undefined;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dialog component props
 */
export interface ClientAIInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insights: ClientAIInsightsResponse | null;
  isLoading: boolean;
  clientName: string;
}

export interface ClientEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailSuggestion: ClientEmailSuggestion | null;
  isLoading: boolean;
  clientName: string;
  clientEmail: string | undefined;
}

export interface ClientNoteSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: ClientNoteSuggestion[] | null;
  isLoading: boolean;
  clientName: string;
}

/**
 * Table component props
 */
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

/**
 * Client action handlers
 */
export interface ClientActionHandlers {
  onEdit: (client: ClientWithNotes) => void;
  onDelete: (client: ClientWithNotes) => void;
  onViewNotes: (client: ClientWithNotes) => void;
  onSendEmail: (client: ClientWithNotes) => void;
  onAskAI: (client: ClientWithNotes) => void;
  onGenerateEmail: (client: ClientWithNotes) => void;
  onCreateNote: (client: ClientWithNotes) => void;
}

/**
 * Bulk action handlers
 */
export interface BulkActionHandlers {
  onBulkDelete: (clientIds: string[]) => void;
  onBulkEnrich: (clientIds: string[]) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

/**
 * Search and filter state
 */
export interface SearchFilterState {
  searchQuery: string;
  sortBy: "displayName" | "createdAt";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
  showSuggestions: boolean;
}

/**
 * Client statistics for dashboard cards
 */
export interface ClientStats {
  totalClients: number;
  activeClients: number;
  newThisWeek: number;
  totalInteractions: number;
  averageSatisfaction: number;
}

/**
 * Client enrichment status
 */
export interface ClientEnrichmentStatus {
  clientId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  error?: string;
  lastUpdated: string;
}

/**
 * Client interaction history
 */
export interface ClientInteraction {
  id: string;
  type: "email" | "note" | "call" | "meeting" | "other";
  title: string;
  content: string;
  timestamp: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Client wellness profile
 */
export interface ClientWellnessProfile {
  clientId: string;
  goals: string[];
  preferences: string[];
  concerns: string[];
  treatmentHistory: string[];
  nextSteps: string[];
  lastAssessment: string;
  confidence: number; // 0-1
}

/**
 * AI-generated insights for a client
 */
export interface ClientInsights {
  wellnessGoals: string[];
  preferences: string[];
  engagementLevel: string;
  risks: string[];
  opportunities: string[];
  nextSteps: string[];
  confidence: number;
  generatedAt: string;
}

/**
 * Email template for client communication
 */
export interface ClientEmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  tone: "professional" | "friendly" | "caring" | "urgent";
  category: "follow-up" | "appointment" | "wellness" | "general";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client note categories
 */
export type NoteCategory =
  | "session_notes"
  | "wellness_goals"
  | "preferences"
  | "concerns"
  | "treatment_plan"
  | "follow_up"
  | "general";

/**
 * Client note with enhanced metadata
 */
export interface ClientNote {
  id: string;
  clientId: string;
  title: string;
  content: string;
  category: NoteCategory;
  priority: "low" | "medium" | "high";
  isPrivate: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

/**
 * Client suggestion with enhanced metadata
 */
export interface EnhancedClientSuggestion {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: "low" | "medium" | "high";
  source: "calendar_attendee" | "email_contact" | "referral" | "import";
  suggestedTags: string[];
  suggestedStage: string;
  confidenceBreakdown: {
    email: number;
    name: number;
    frequency: number;
    recency: number;
  };
  metadata: {
    sourceEventIds: string[];
    sourceEmailIds: string[];
    lastInteraction: string;
  };
}

/**
 * Client import/export options
 */
export interface ClientImportOptions {
  source: "csv" | "excel" | "google_contacts" | "calendar";
  mapping: Record<string, string>;
  skipDuplicates: boolean;
  updateExisting: boolean;
  defaultTags: string[];
  defaultStage: string;
}

export interface ClientExportOptions {
  format: "csv" | "excel" | "json";
  fields: string[];
  includeNotes: boolean;
  includeInteractions: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: {
    tags?: string[];
    stage?: string[];
    source?: string[];
  };
}

/**
 * Client search and filtering
 */
export interface ClientSearchFilters {
  query?: string;
  tags?: string[];
  stage?: string[];
  source?: string[];
  dateRange?: {
    field: "createdAt" | "updatedAt" | "lastInteraction";
    from: string;
    to: string;
  };
  hasNotes?: boolean;
  hasInteractions?: boolean;
  confidenceScore?: {
    min: number;
    max: number;
  };
}

/**
 * Client table column configuration
 */
export interface ClientColumnConfig {
  id: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  width?: number;
  align?: "left" | "center" | "right";
}

/**
 * Client bulk operations
 */
export interface ClientBulkOperation {
  type: "delete" | "enrich" | "tag" | "stage" | "export";
  clientIds: string[];
  options?: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  results?: {
    successful: string[];
    failed: string[];
    errors: Record<string, string>;
  };
  createdAt: string;
  completedAt?: string;
}

/**
 * Client notification preferences
 */
export interface ClientNotificationPreferences {
  emailUpdates: boolean;
  smsUpdates: boolean;
  appointmentReminders: boolean;
  wellnessTips: boolean;
  followUpReminders: boolean;
  marketingEmails: boolean;
  frequency: "immediate" | "daily" | "weekly" | "monthly";
}

/**
 * Client relationship mapping
 */
export interface ClientRelationship {
  id: string;
  clientId: string;
  relatedClientId: string;
  relationshipType: "family" | "friend" | "colleague" | "referral" | "other";
  notes?: string;
  createdAt: string;
  createdBy: string;
}

/**
 * Client activity timeline
 */
export interface ClientActivity {
  id: string;
  clientId: string;
  type: "created" | "updated" | "note_added" | "email_sent" | "appointment_scheduled" | "enriched";
  title: string;
  description: string;
  timestamp: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Client dashboard summary
 */
export interface ClientDashboardSummary {
  totalClients: number;
  activeClients: number;
  newThisWeek: number;
  newThisMonth: number;
  totalInteractions: number;
  averageSatisfaction: number;
  topTags: Array<{ tag: string; count: number }>;
  recentActivity: ClientActivity[];
  upcomingAppointments: number;
  pendingFollowUps: number;
  wellnessGoals: Array<{ goal: string; clients: number }>;
  riskFactors: Array<{ factor: string; clients: number }>;
}
