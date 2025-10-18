/**
 * Contact Component Types
 *
 * Clean types for contact management components using CONTACT terminology only.
 * All imports from business schemas - no local type definitions.
 */

// Import core contact types from business schemas
import type {
  Contact,
  CreateContact,
  UpdateContact,
  UpdateContactBody,
  GetContactsQuery,
  ContactListResponse,
  CreateContactBody,
  ContactAIInsightsResponse,
} from "@/server/db/business-schemas/contacts";
import type { ContactWithNotes } from "@/server/db/schema";

// Import additional types needed
import type { ColumnDef } from "@tanstack/react-table";

// Re-export the imported types with clean names
export type {
  Contact,
  CreateContact,
  UpdateContact,
  GetContactsQuery,
  ContactListResponse,
  CreateContactBody,
  UpdateContactBody,
  ContactAIInsightsResponse,
  ContactWithNotes,
};

// ============================================================================
// EDIT CLIENT TYPES (Component-specific)
// ============================================================================

/**
 * Edit Contact Data - For contact editing
 */
export interface EditContactData {
  displayName?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  lifecycleStage?: string;
  tags?: string[];
  dateOfBirth?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  clientStatus?: string | null;
  referralSource?: string | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } | null;
  healthContext?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    notes?: string;
  } | null;
  preferences?: {
    communication?: string[];
    sessionType?: string[];
    practitioner?: string;
    notes?: string;
  } | null;
}

/**
 * Update Contact Response - API response when updating a contact
 */
export interface UpdateContactResponse {
  ok: boolean;
  data?: Contact;
  error?: string;
}

// ============================================================================
// COMPONENT-SPECIFIC INTERFACES (Only UI-specific types, not business logic)
// ============================================================================

/**
 * Table component props
 */
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
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
  lifecycleStage?: string[];
  tags?: string[];
  source?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasNotes?: boolean;
  hasInteractions?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  query?: string; // Alias for search
  dateRange?: { from?: Date; to?: Date };
  confidenceScore?: "high" | "medium" | "low";
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
