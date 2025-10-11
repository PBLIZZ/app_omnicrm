/**
 * Notes Service Layer
 *
 * Business logic and orchestration for notes.
 * - PII redaction before storage
 * - Unwraps DbResult from repos → throws AppError
 * - Data validation orchestration
 * - Business rule enforcement
 */

import { NotesRepository } from "@repo";
import type { Note } from "@/server/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { redactPII } from "@/server/lib/pii-detector";

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

export interface CreateNoteInput {
  contentPlain: string;
  contentRich?: unknown;
  contactId?: string | undefined;
  tags?: string[] | undefined;
  sourceType?: "typed" | "voice" | "upload" | undefined;
}

export interface UpdateNoteInput {
  contentPlain?: string | undefined;
  contentRich?: unknown;
  tags?: string[] | undefined;
}

export interface ListNotesParams {
  contactId?: string | undefined;
  search?: string | undefined;
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

/**
 * List notes for a user with optional filtering
 */
export async function listNotesService(
  userId: string,
  params: ListNotesParams = {},
): Promise<Note[]> {
  const { contactId, search } = params;

  // Use search if provided, otherwise list by contactId
  const result = search
    ? await NotesRepository.searchNotes(userId, search)
    : await NotesRepository.listNotes(userId, contactId);

  if (!result.success) {
    throw new AppError(result.error.message, result.error.code, "database", false);
  }

  return result.data;
}

/**
 * Get a single note by ID
 */
export async function getNoteByIdService(userId: string, noteId: string): Promise<Note> {
  const result = await NotesRepository.getNoteById(userId, noteId);

  if (!result.success) {
    throw new AppError(result.error.message, result.error.code, "database", false);
  }

  if (!result.data) {
    throw new AppError("Note not found", "NOTE_NOT_FOUND", "validation", false);
  }

  return result.data;
}

/**
 * Get notes for a specific contact
 */
export async function getNotesByContactIdService(
  userId: string,
  contactId: string,
): Promise<Note[]> {
  const result = await NotesRepository.getNotesByContactId(userId, contactId);

  if (!result.success) {
    throw new AppError(result.error.message, result.error.code, "database", false);
  }

  return result.data;
}

// ============================================================================
// CREATE OPERATION
// ============================================================================

/**
 * Create a new note with PII redaction
 *
 * Business logic:
 * - Redacts PII from contentPlain before storage
 * - Stores redaction metadata in piiEntities
 * - Validates required fields
 */
export async function createNoteService(userId: string, input: CreateNoteInput): Promise<Note> {
  // Validate required fields
  if (!input.contentPlain || input.contentPlain.trim().length === 0) {
    throw new AppError("Note content is required", "VALIDATION_ERROR", "validation", false);
  }

  // Business logic: Redact PII from content
  const redactionResult = redactPII(input.contentPlain);

  if (redactionResult.hasRedactions) {
    throw new AppError("PII detected in note content", "VALIDATION_ERROR", "validation", false);
  }

  // Call repository with sanitized data
  const result = await NotesRepository.createNote({
    userId,
    contactId: input.contactId ?? null,
    contentPlain: redactionResult.sanitizedText,
    contentRich: input.contentRich ?? {},
    tags: input.tags ?? [],
    piiEntities: redactionResult.entities,
    sourceType: input.sourceType ?? "typed",
  });

  if (!result.success) {
    throw new AppError(result.error.message, result.error.code, "database", false);
  }

  return result.data;
}

// ============================================================================
// UPDATE OPERATION
// ============================================================================

/**
 * Update an existing note with PII redaction
 *
 * Business logic:
 * - If contentPlain is updated, redacts PII
 * - Updates piiEntities metadata
 * - Preserves existing data for fields not provided
 */
export async function updateNoteService(
  userId: string,
  noteId: string,
  input: UpdateNoteInput,
): Promise<Note> {
  // Validate at least one field is provided
  if (!input.contentPlain && !input.contentRich && !input.tags) {
    throw new AppError(
      "At least one field must be provided for update",
      "VALIDATION_ERROR",
      "validation",
      false,
    );
  }

  // Build update data with PII redaction if contentPlain is updated
  const updateData: {
    contentPlain?: string;
    contentRich?: unknown;
    tags?: string[];
    piiEntities?: unknown;
  } = {};

  if (input.contentPlain !== undefined) {
    if (input.contentPlain.trim().length === 0) {
      throw new AppError("Note content cannot be empty", "VALIDATION_ERROR", "validation", false);
    }

    // Business logic: Redact PII from updated content
    const redactionResult = redactPII(input.contentPlain);

    if (redactionResult.hasRedactions) {
      throw new AppError("PII detected in note content", "VALIDATION_ERROR", "validation", false);
    }

    updateData.contentPlain = redactionResult.sanitizedText;
    updateData.piiEntities = redactionResult.entities;
  }

  if (input.contentRich !== undefined) {
    updateData.contentRich = input.contentRich;
  }

  if (input.tags !== undefined) {
    updateData.tags = input.tags;
  }

  // Call repository
  const result = await NotesRepository.updateNote(userId, noteId, updateData);

  if (!result.success) {
    throw new AppError(result.error.message, result.error.code, "database", false);
  }

  if (!result.data) {
    throw new AppError("Note not found", "NOTE_NOT_FOUND", "validation", false);
  }

  return result.data;
}

// ============================================================================
// DELETE OPERATION
// ============================================================================

/**
 * Delete a note
 */
export async function deleteNoteService(userId: string, noteId: string): Promise<void> {
  const result = await NotesRepository.deleteNote(userId, noteId);

  if (!result.success) {
    throw new AppError(result.error.message, result.error.code, "database", false);
  }

  if (!result.data) {
    throw new AppError("Note not found", "NOTE_NOT_FOUND", "validation", false);
  }
}
