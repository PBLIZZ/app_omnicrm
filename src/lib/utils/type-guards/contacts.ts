/**
 * Type Guards for Contacts Module
 *
 * Provides runtime type validation to replace unsafe type assertions
 */

import type { DbResult } from "@/lib/utils/result";
import type { ContactWithNotes } from "@/server/db/schema";
import type { VisibilityState } from "@tanstack/react-table";

// ============================================================================
// RESULT TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a DbResult is successful
 */
export function isSuccessResult<T>(result: DbResult<T>): result is { success: true; data: T } {
  return result.success === true && "data" in result;
}

/**
 * Type guard to check if a DbResult failed
 */
export function isErrorResult<T>(
  result: DbResult<T>,
): result is { success: false; error: { code: string; message: string; details?: unknown } } {
  return result.success === false && "error" in result;
}

/**
 * Safely unwrap a DbResult or throw an error
 */
export function unwrapResult<T>(result: DbResult<T>): T {
  if (isSuccessResult(result)) {
    return result.data;
  }

  if (isErrorResult(result)) {
    throw new Error(`Database operation failed: ${result.error.message}`);
  }

  throw new Error("Invalid DbResult state: result must have success property");
}

// ============================================================================
// DATABASE ROW TYPE GUARDS
// ============================================================================

/**
 * Generic database row from notes queries
 * Supports various note aggregation formats
 */
export interface NotesQueryRow {
  contact_id: string;
  count?: string | number;
  last_note?: string | null;
  last_note_preview?: string | null;
}

/**
 * Type guard for notes query result row
 */
export function isNotesQueryRow(row: unknown): row is NotesQueryRow {
  return (
    typeof row === "object" &&
    row !== null &&
    "contact_id" in row &&
    typeof row.contact_id === "string"
  );
}

/**
 * Validate and convert database rows to NotesQueryRow array
 */
export function validateNotesQueryRows(rows: unknown): NotesQueryRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter(isNotesQueryRow);
}

// ============================================================================
// CONTACT TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if data is ContactWithNotes (Contact with full notes array)
 */
export function isContactWithNotes(data: unknown): data is ContactWithNotes {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "string" &&
    "displayName" in data &&
    typeof data.displayName === "string" &&
    "userId" in data &&
    typeof data.userId === "string"
  );
}

/**
 * Type guard to check if generic TData is ContactWithNotes
 * Used in generic table components
 */
export function assertIsContactWithNotes<T>(
  data: T,
  errorMessage = "Data is not a valid ContactWithNotes object",
): asserts data is T & ContactWithNotes {
  if (!isContactWithNotes(data)) {
    throw new Error(errorMessage);
  }
}

// ============================================================================
// LOCALSTORAGE TYPE GUARDS
// ============================================================================

/**
 * Type guard for TanStack Table VisibilityState
 * VisibilityState is a Record<string, boolean>
 */
export function isVisibilityState(data: unknown): data is VisibilityState {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  // Check if all values are booleans
  return Object.values(data).every((value) => typeof value === "boolean");
}

/**
 * Safely parse localStorage value as VisibilityState
 */
export function parseVisibilityState(jsonString: string): VisibilityState | null {
  try {
    const parsed: unknown = JSON.parse(jsonString);

    if (isVisibilityState(parsed)) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// LIFECYCLE STAGE TYPE GUARDS
// ============================================================================

/**
 * Valid lifecycle stages for contacts
 */
export const VALID_LIFECYCLE_STAGES = [
  "Prospect",
  "New Client",
  "Core Client",
  "VIP Client",
  "Referring Client",
  "At Risk Client",
  "Lost Client",
] as const;

export type ValidLifecycleStage = (typeof VALID_LIFECYCLE_STAGES)[number];

/**
 * Type guard to check if a string is a valid lifecycle stage
 */
export function isValidLifecycleStage(value: unknown): value is ValidLifecycleStage {
  return typeof value === "string" && VALID_LIFECYCLE_STAGES.includes(value as ValidLifecycleStage);
}

/**
 * Safely convert any value to a valid lifecycle stage with fallback
 */
export function toValidLifecycleStage(
  value: unknown,
  fallback: ValidLifecycleStage = "Prospect",
): ValidLifecycleStage {
  if (isValidLifecycleStage(value)) {
    return value;
  }
  return fallback;
}
