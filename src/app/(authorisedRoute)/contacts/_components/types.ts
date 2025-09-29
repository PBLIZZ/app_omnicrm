/**
 * Contact Component Types
 *
 * Clean types for contact management components using CONTACT terminology only.
 * All imports from business schemas - no local type definitions.
 */

// Import core contact types from business schemas
import type {
  Contact,
  ContactWithNotes,
  CreateContact,
  UpdateContact,
  GetContactsQuery,
  ContactListResponse,
  CreateContactBody,
  CreateContactInput,
  UpdateContactInput,
  CreatedAtFilter,
  BulkDeleteBody,
  CreateNote,
  UpdateNote,
  Note,
  ContactAIInsightsResponse,
  ContactWithNotesDTO,
  ContactSearchFilters as BusinessContactSearchFilters,
} from "@/server/db/business-schemas/contacts";

// Import additional types needed
import type { ColumnDef } from "@tanstack/react-table";

// Re-export the imported types with clean names
export type {
  Contact,
  ContactWithNotes,
  CreateContact,
  UpdateContact,
  GetContactsQuery,
  ContactListResponse,
  CreateContactBody,
  CreateContactInput,
  UpdateContactInput,
  CreatedAtFilter,
  BulkDeleteBody,
  CreateNote,
  UpdateNote,
  Note,
  ContactAIInsightsResponse,
  ContactWithNotesDTO,
};

// ============================================================================
// COMPONENT-SPECIFIC INTERFACES (Only UI-specific types, not business logic)
// ============================================================================

/**
 * Contact action handlers for table components
 */
export interface ContactActionHandlers {
  onEdit: (contact: ContactWithNotes) => void;
  onDelete: (contact: ContactWithNotes) => void;
  onViewNotes: (contact: ContactWithNotes) => void;
  onSendEmail: (contact: ContactWithNotes) => void;
  onAskAI: (contact: ContactWithNotes) => void;
  onGenerateEmail: (contact: ContactWithNotes) => void;
  onCreateNote: (contact: ContactWithNotes) => void;
}

/**
 * Bulk action handlers
 */
export interface BulkActionHandlers {
  onBulkDelete: (contactIds: string[]) => void;
  onBulkEnrich: (contactIds: string[]) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

/**
 * Table component props
 */
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
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
 * Contact statistics for dashboard cards
 */
export interface ContactStats {
  totalContacts: number;
  activeContacts: number;
  newThisWeek: number;
  totalInteractions: number;
  averageSatisfaction: number;
}

/**
 * Contact enrichment status
 */
export interface ContactEnrichmentStatus {
  contactId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  error?: string;
  lastUpdated: string;
}

/**
 * Contact AI Insights Dialog Props
 */
export interface ContactAIInsightsDialogProps {
  contact: ContactWithNotes;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insights: ContactAIInsightsResponse | null;
  isLoading: boolean;
  contactName: string;
}

/**
 * Contact Search Filters (Enhanced version with UI-specific properties)
 */
export interface ContactSearchFilters {
  search?: string;
  stage?: string[];
  tags?: string[];
  source?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  query?: string; // Alias for search
  hasNotes?: boolean;
  hasInteractions?: boolean;
  confidenceScore?: { min?: number; max?: number };
  dateRange?: { from?: Date; to?: Date };
}

/**
 * Contact Suggestion Data from Calendar Analysis
 */
export interface ContactSuggestion {
  id: string;
  displayName: string;
  primaryEmail: string;
  source: string;
  confidence: number;
  aiInsights?: {
    lifecycleStage: string;
    tags: string[];
    summary: string;
  };
  calendarEvents?: Array<{
    title: string;
    startTime: string;
    eventType: string;
  }>;
}

/**
 * Quick Add Contact Data
 */
export interface ContactQuickAddData {
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  source: string;
  lifecycleStage?: string;
  tags?: string[];
  confidenceScore?: string;
}
