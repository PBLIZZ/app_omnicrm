/**
 * Notes Service Layer
 *
 * Business logic and orchestration for notes.
 * - PII redaction before storage
 * - Unwraps DbResult from repos → throws AppError
 * - Data validation orchestration
 * - Business rule enforcement
 */

import { createNotesRepository } from "@repo";
import type { Note } from "@/server/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { redactPII } from "@/server/lib/pii-detector";
import { getDb } from "@/server/db/client";

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

export interface CreateNoteInput {
  contentPlain: string;
  contentRich?: unknown;
  contactId: string;
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
  const db = await getDb();
  const repo = createNotesRepository(db);
  const { contactId, search } = params;

  try {
    // Use search if provided, otherwise list by contactId
    const notes = search
      ? await repo.searchNotes(userId, search)
      : await repo.listNotes(userId, contactId);

    return notes;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list notes",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get a single note by ID
 */
export async function getNoteByIdService(userId: string, noteId: string): Promise<Note> {
  const db = await getDb();
  const repo = createNotesRepository(db);

  try {
    const note = await repo.getNoteById(userId, noteId);

    if (!note) {
      throw new AppError("Note not found", "NOTE_NOT_FOUND", "validation", false);
    }

    return note;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get note",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get notes for a specific contact
 */
export async function getNotesByContactIdService(
  userId: string,
  contactId: string,
): Promise<Note[]> {
  const db = await getDb();
  const repo = createNotesRepository(db);

  try {
    const notes = await repo.getNotesByContactId(userId, contactId);
    return notes;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get notes by contact",
      "DB_ERROR",
      "database",
      false,
    );
  }
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
  const db = await getDb();
  const repo = createNotesRepository(db);

  // Validate required fields
  if (!input.contentPlain || input.contentPlain.trim().length === 0) {
    throw new AppError("Note content is required", "VALIDATION_ERROR", "validation", false);
  }

  if (!input.contactId) {
    throw new AppError("Contact ID is required", "VALIDATION_ERROR", "validation", false);
  }

  // Reject dummy/invalid contact IDs
  if (input.contactId === "00000000-0000-0000-0000-000000000000") {
    throw new AppError("Please select a valid contact", "VALIDATION_ERROR", "validation", false);
  }

  // Business logic: Redact PII from content
  const redactionResult = redactPII(input.contentPlain);

  // Log if PII was detected and redacted (but don't block the save)
  if (redactionResult.hasRedactions) {
    console.warn("PII detected and redacted in note content", {
      userId,
      contactId: input.contactId,
      entityTypes: [...new Set(redactionResult.entities.map((e) => e.type))],
    });
  }

  try {
    // Call repository with sanitized data
    const note = await repo.createNote({
      userId,
      contactId: input.contactId,
      contentPlain: redactionResult.sanitizedText,
      contentRich: input.contentRich ?? {},
      tags: input.tags ?? [],
      piiEntities: redactionResult.entities,
      sourceType: input.sourceType ?? "typed",
    });

    return note;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create note",
      "DB_ERROR",
      "database",
      false,
    );
  }
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

    // Log if PII was detected and redacted (but don't block the update)
    if (redactionResult.hasRedactions) {
      console.warn("PII detected and redacted in note update", {
        userId,
        noteId,
        entityTypes: [...new Set(redactionResult.entities.map((e) => e.type))],
      });
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

  const db = await getDb();
  const repo = createNotesRepository(db);

  try {
    // Call repository
    const note = await repo.updateNote(userId, noteId, updateData);

    if (!note) {
      throw new AppError("Note not found", "NOTE_NOT_FOUND", "validation", false);
    }

    return note;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update note",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// DELETE OPERATION
// ============================================================================

/**
 * Delete a note
 */
export async function deleteNoteService(userId: string, noteId: string): Promise<void> {
  const db = await getDb();
  const repo = createNotesRepository(db);

  try {
    const deleted = await repo.deleteNote(userId, noteId);

    if (!deleted) {
      throw new AppError("Note not found", "NOTE_NOT_FOUND", "validation", false);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete note",
      "DB_ERROR",
      "database",
      false,
    );
  }
}
