/**
 * Simplified Contacts Service
 */

import { ContactsRepository, NotesRepository } from "@repo";
import type { Contact, CreateContact, CreateContactInput } from "@/server/db/business-schemas";
import { CreateNoteSchema } from "@/server/db/business-schemas";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { isErr, DbResult, ok, err, isOk } from "@/lib/utils/result";
import { z } from "zod";
import { logger } from "@/lib/observability";
import {
  unwrapResult,
  isSuccessResult,
  validateNotesCountRows,
} from "@/lib/utils/type-guards/contacts";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ContactListParams = {
  search?: string;
  sort?: "displayName" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
  dateRange?: { from?: Date; to?: Date };
};

export type ContactListItem = Contact & {
  notesCount: number;
  lastNote: string | null;
};

interface ContactSuggestion {
  id: string;
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: string | null;
  confidenceScore: number;
  reason: string;
}

// Removed unused interfaces

// Notes types

export interface NoteResponse {
  id: string;
  content: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  contactId: string | null;
}

export interface NotesListResponse {
  notes: NoteResponse[];
}

// Validation types
export interface LifecycleStageValidationResult {
  isValid: boolean;
  normalizedStage: string | null;
  error?: string;
}

// Avatar types
export interface AvatarData {
  url: string;
  fileName: string;
}

export interface AvatarResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Bulk delete types
export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkDeleteResponse {
  deleted: number;
  message: string;
}

// Database query types for AI assistant
export interface ContactSuggestionsData {
  suggestions: ContactSuggestion[];
}

export interface ContactsCreationData {
  created: number;
  contacts: Contact[];
}

export interface ContactCountData {
  count: number;
}

export interface ContactsSummaryData {
  totalContacts: number;
  byStage: Record<string, number>;
  bySource: Record<string, number>;
  recentContacts: Contact[];
}

export interface SearchContactsData {
  results: Contact[];
  total: number;
}

export interface NotesInfoData {
  totalNotes: number;
  recentNotes: NoteResponse[];
}

export interface FilterContactsData {
  contacts: Contact[];
  total: number;
}

export interface ContactNamesData {
  contacts: Array<{ id: string; displayName: string }>;
}

export interface ContactDetailsData {
  contact: Contact;
  notes: NoteResponse[];
  interactions: unknown[];
}

export interface DatabaseQueryData {
  result: unknown;
}

// Union type for all possible data types

// Service operation result types
export type ContactsServiceResult<T> = DbResult<T>;
export type QueryResult<T> = DbResult<T>;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ParamsSchema = z.object({
  contactId: z.string().uuid(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function emptyToNull(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null || value.trim() === "") {
    return undefined;
  }
  return value;
}

function unwrapDbResult<T>(result: DbResult<T>): T {
  return unwrapResult(result);
}

// ============================================================================
// NOTES HELPER FUNCTIONS
// ============================================================================

async function getNotesDataForContacts(
  userId: string,
  contactIds: string[],
): Promise<Map<string, { count: number; lastNote: string | null }>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const db = await getDb();

  const uuidArray = sql`ARRAY[${sql.join(
    contactIds.map((id) => sql`${id}`),
    sql`, `,
  )}]::uuid[]`;

  let notesData;
  try {
    notesData = await db.execute(sql`
      SELECT 
        contact_id,
        COUNT(*) as count,
        (SELECT content FROM notes n2 
         WHERE n2.contact_id = n.contact_id 
         AND n2.user_id = ${userId}
         ORDER BY n2.created_at DESC 
         LIMIT 1) as last_note
      FROM notes n
      WHERE user_id = ${userId} 
      AND contact_id = ANY(${uuidArray})
      GROUP BY contact_id
    `);
  } catch (error) {
    console.error("Database error in getNotesCounts:", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      contactIds: contactIds.length,
    });
    return new Map();
  }

  const result = new Map<string, { count: number; lastNote: string | null }>();

  for (const contactId of contactIds) {
    result.set(contactId, { count: 0, lastNote: null });
  }

  // Validate and process database rows with type guard
  const validatedRows = validateNotesCountRows(notesData);

  for (const row of validatedRows) {
    const contactId = row.contact_id;
    const count = parseInt(String(row.count), 10);
    const lastNote = row.last_note;

    result.set(contactId, { count, lastNote });
  }

  return result;
}

function formatNoteResponse(note: {
  id: string;
  title: string | null;
  content: string;
  userId?: string;
  contactId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): NoteResponse {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    userId: note.userId || "",
    contactId: note.contactId || null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

// ============================================================================
// CORE CONTACT OPERATIONS (Single source of truth)
// ============================================================================

/**
 * Create a contact in the database
 */
async function createContactInDB(
  userId: string,
  input: CreateContactInput,
): Promise<ContactListItem | null> {
  const createData: CreateContact = {
    userId,
    displayName: input.displayName,
    primaryEmail: emptyToNull(input.primaryEmail),
    primaryPhone: emptyToNull(input.primaryPhone),
    source: input.source,
    lifecycleStage: input.lifecycleStage ?? undefined,
    tags: input.tags ?? undefined,
    confidenceScore: input.confidenceScore ?? undefined,
    dateOfBirth: input.dateOfBirth ?? undefined,
    emergencyContactName: input.emergencyContactName ?? undefined,
    emergencyContactPhone: input.emergencyContactPhone ?? undefined,
    clientStatus: input.clientStatus ?? undefined,
    referralSource: input.referralSource ?? undefined,
    address: input.address ?? undefined,
    healthContext: input.healthContext ?? undefined,
    preferences: input.preferences ?? undefined,
    photoUrl: input.photoUrl ?? undefined,
  };

  const contactResult = await ContactsRepository.createContact({ ...createData, userId });
  const contact = unwrapDbResult(contactResult);

  return {
    ...contact,
    createdAt: contact.createdAt || new Date(),
    updatedAt: contact.updatedAt || new Date(),
    tags: Array.isArray(contact.tags) ? contact.tags : null,
    notesCount: 0,
    lastNote: null,
  };
}

/**
 * Get a contact from the database
 */
async function getContactFromDB(userId: string, contactId: string): Promise<Contact | null> {
  const result = await ContactsRepository.getContactById(userId, contactId);

  if (isErr(result)) {
    return null;
  }

  if (!isSuccessResult(result)) {
    return null;
  }

  const contact = result.data;

  if (!contact) {
    return null;
  }

  return {
    ...contact,
    createdAt: contact.createdAt || new Date(),
    updatedAt: contact.updatedAt || new Date(),
    tags: Array.isArray(contact.tags) ? contact.tags : null,
  };
}

/**
 * Update a contact in the database
 */
async function updateContactInDB(
  userId: string,
  contactId: string,
  updateData: Partial<CreateContactInput>,
): Promise<Contact | null> {
  const result = await ContactsRepository.updateContact(userId, contactId, updateData);

  if (isErr(result)) {
    return null;
  }

  if (!isSuccessResult(result)) {
    return null;
  }

  const contact = result.data;

  if (!contact) {
    return null;
  }

  return {
    ...contact,
    createdAt: contact.createdAt || new Date(),
    updatedAt: contact.updatedAt || new Date(),
    tags: Array.isArray(contact.tags) ? contact.tags : null,
  };
}

/**
 * Delete a contact from the database
 */
async function deleteContactFromDB(userId: string, contactId: string): Promise<boolean> {
  const result = await ContactsRepository.deleteContact(userId, contactId);

  if (isErr(result)) {
    return false;
  }

  if (!isSuccessResult(result)) {
    return false;
  }

  return result.data;
}

// ============================================================================
// PUBLIC API - CONTACT OPERATIONS
// ============================================================================

/**
 * List contacts with optional search filtering
 */
export async function listContactsService(
  userId: string,
  params: ContactListParams,
): Promise<{ items: ContactListItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }> {
  const repoParams: Parameters<typeof ContactsRepository.listContacts>[1] = {
    page: params.page,
    pageSize: params.pageSize,
  };
  if (params.search !== undefined) repoParams.search = params.search;
  if (params.sort !== undefined) repoParams.sort = params.sort;
  if (params.order !== undefined) repoParams.order = params.order;

  const repoResult = await ContactsRepository.listContacts(userId, repoParams);

  if (isErr(repoResult)) {
    throw new Error(repoResult.error.message || "Failed to list contacts");
  }

  if (!isOk(repoResult)) {
    throw new Error("Invalid result state");
  }
  const data = repoResult.data;

  const contactItems: Contact[] = Array.isArray(data.items)
    ? data.items.map((contact) => ({
        ...contact,
        createdAt: contact.createdAt ?? new Date(),
        updatedAt: contact.updatedAt ?? new Date(),
        tags: Array.isArray(contact.tags) ? contact.tags : null,
      }))
    : [];
  const total: number = typeof data.total === "number" ? data.total : 0;

  const contactIds = contactItems.map((c) => c.id);
  const notesData = await getNotesDataForContacts(userId, contactIds);

  const transformedItems: ContactListItem[] = contactItems.map((contact) => {
    const notesInfo = notesData.get(contact.id) ?? { count: 0, lastNote: null };

    return {
      ...contact,
      createdAt: contact.createdAt ?? new Date(),
      updatedAt: contact.updatedAt ?? new Date(),
      tags: Array.isArray(contact.tags) ? contact.tags : null,
      notesCount: notesInfo.count,
      lastNote: notesInfo.lastNote,
    };
  });

  const totalPages = Math.ceil(total / params.pageSize);
  
  return {
    items: transformedItems,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Create a new contact
 */
export async function createContactService(
  userId: string,
  input: CreateContactInput,
): Promise<ContactsServiceResult<ContactListItem>> {
  try {
    const contact = await createContactInDB(userId, input);
    if (!contact) {
      return err({
        code: "CONTACT_CREATE_FAILED",
        message: "Failed to create contact",
      });
    }
    return ok(contact);
  } catch (error) {
    return err({
      code: "CONTACT_CREATE_ERROR",
      message: "Error creating contact",
      details: error,
    });
  }
}

/**
 * Get contact by ID
 */
export async function getContactByIdService(
  userId: string,
  contactId: string,
): Promise<ContactsServiceResult<Contact>> {
  try {
    const contact = await getContactFromDB(userId, contactId);
    if (!contact) {
      return err({
        code: "CONTACT_NOT_FOUND",
        message: "Contact not found",
      });
    }
    return ok(contact);
  } catch (error) {
    return err({
      code: "CONTACT_GET_ERROR",
      message: "Error retrieving contact",
      details: error,
    });
  }
}

/**
 * Update contact
 */
export async function updateContactService(
  userId: string,
  contactId: string,
  updateData: Partial<CreateContactInput>,
): Promise<ContactsServiceResult<Contact>> {
  try {
    const contact = await updateContactInDB(userId, contactId, updateData);
    if (!contact) {
      return err({
        code: "CONTACT_UPDATE_FAILED",
        message: "Failed to update contact",
      });
    }
    return ok(contact);
  } catch (error) {
    return err({
      code: "CONTACT_UPDATE_ERROR",
      message: "Error updating contact",
      details: error,
    });
  }
}

/**
 * Delete contact
 */
export async function deleteContactService(
  userId: string,
  contactId: string,
): Promise<ContactsServiceResult<boolean>> {
  try {
    const deleted = await deleteContactFromDB(userId, contactId);
    return ok(deleted);
  } catch (error) {
    return err({
      code: "CONTACT_DELETE_ERROR",
      message: "Error deleting contact",
      details: error,
    });
  }
}

/**
 * Find contact by email
 */
export async function findContactByEmailService(
  userId: string,
  email: string,
): Promise<ContactsServiceResult<Contact | null>> {
  try {
    const result = await ContactsRepository.findContactByEmail(userId, email);

    if (isErr(result)) {
      return err({
        code: "CONTACT_EMAIL_SEARCH_FAILED",
        message: "Failed to search contact by email",
        details: result.error,
      });
    }

    if (!isSuccessResult(result)) {
      return ok(null);
    }

    const contact = result.data;

    if (!contact) {
      return ok(null);
    }

    return ok({
      ...contact,
      createdAt: contact.createdAt ?? new Date(),
      updatedAt: contact.updatedAt ?? new Date(),
      tags: Array.isArray(contact.tags) ? contact.tags : null,
    });
  } catch (error) {
    return err({
      code: "CONTACT_EMAIL_SEARCH_ERROR",
      message: "Error searching contact by email",
      details: error,
    });
  }
}

/**
 * Batch create contacts
 */
export async function createContactsBatchService(
  userId: string,
  contactsData: Array<CreateContactInput>,
): Promise<
  ContactsServiceResult<{ created: ContactListItem[]; duplicates: number; errors: number }>
> {
  try {
    const created: ContactListItem[] = [];
    let duplicates = 0;
    let errors = 0;

    for (const contactData of contactsData) {
      try {
        if (contactData.primaryEmail) {
          const existingResult = await ContactsRepository.findContactByEmail(
            userId,
            contactData.primaryEmail,
          );
          if (existingResult.success && existingResult.data) {
            duplicates++;
            continue;
          }
          // If lookup failed, log error but continue with creation
          if (!existingResult.success) {
            console.error("Failed to check for existing contact:", existingResult.error);
          }
        }

        const contact = await createContactInDB(userId, contactData);
        if (contact) {
          created.push(contact);
        }
      } catch (error) {
        errors++;
        console.error("Error creating contact in batch:", error);
      }
    }

    return ok({ created, duplicates, errors });
  } catch (error) {
    return err({
      code: "BATCH_CREATE_ERROR",
      message: "Error in batch contact creation",
      details: error,
    });
  }
}

// ============================================================================
// PUBLIC API - NOTES OPERATIONS
// ============================================================================

/**
 * Get all notes for a specific Contact
 */
export async function getContactNotes(
  userId: string,
  contactId: string,
): Promise<ContactsServiceResult<NotesListResponse>> {
  try {
    const validatedParams = ParamsSchema.parse({ contactId });

    const contactNotesResult = await NotesRepository.getNotesByContactId(
      userId,
      validatedParams.contactId,
    );

    if (isErr(contactNotesResult)) {
      return err({
        code: "NOTES_GET_FAILED",
        message: "Failed to get notes",
        details: contactNotesResult.error,
      });
    }

    if (!isOk(contactNotesResult)) {
      return err({
        code: "NOTES_GET_FAILED",
        message: "Invalid result state",
        details: "Unexpected result state",
      });
    }

    const contactNotes = contactNotesResult.data;
    const formattedNotes = contactNotes.map((note) =>
      formatNoteResponse({
        ...note,
        createdAt: note.createdAt ?? new Date(),
        updatedAt: note.updatedAt ?? new Date(),
      }),
    );

    return ok({ notes: formattedNotes });
  } catch (error) {
    return err({
      code: "NOTES_GET_ERROR",
      message: "Error getting notes",
      details: error,
    });
  }
}

/**
 * Create a new note for a specific Contact
 */
export async function createContactNote(
  userId: string,
  contactId: string,
  noteData: unknown,
): Promise<ContactsServiceResult<NoteResponse>> {
  try {
    const validatedParams = ParamsSchema.parse({ contactId });
    const validatedBody = CreateNoteSchema.parse(noteData);

    const newNoteResult = await NotesRepository.createNote(userId, {
      contactId: validatedParams.contactId,
      title: validatedBody.title,
      content: validatedBody.content,
    });

    if (isErr(newNoteResult)) {
      return err({
        code: "NOTE_CREATE_FAILED",
        message: "Failed to create note",
        details: newNoteResult.error,
      });
    }

    if (!isOk(newNoteResult)) {
      return err({
        code: "NOTE_CREATE_FAILED",
        message: "Invalid result state",
        details: "Unexpected result state",
      });
    }

    const newNote = newNoteResult.data;
    return ok(
      formatNoteResponse({
        ...newNote,
        createdAt: newNote.createdAt ?? new Date(),
        updatedAt: newNote.updatedAt ?? new Date(),
      }),
    );
  } catch (error) {
    return err({
      code: "NOTE_CREATE_ERROR",
      message: "Error creating note",
      details: error,
    });
  }
}

// ============================================================================
// BULK DELETE OPERATIONS
// ============================================================================

/**
 * Execute bulk deletion of contacts
 */
export async function deleteContactsBulk(
  userId: string,
  request: BulkDeleteRequest,
): Promise<ContactsServiceResult<BulkDeleteResponse>> {
  try {
    const { ids } = request;

    // Execute bulk deletion via repository
    const deletedCountResult = await ContactsRepository.deleteContactsByIds(userId, ids);

    if (isErr(deletedCountResult)) {
      return err({
        code: "BULK_DELETE_FAILED",
        message: "Failed to delete contacts",
        details: deletedCountResult.error,
      });
    }

    if (!isSuccessResult(deletedCountResult)) {
      return err({
        code: "BULK_DELETE_FAILED",
        message: "Invalid result state from delete operation",
      });
    }

    const deletedCount = deletedCountResult.data;

    // Generate appropriate response message
    const message = generateBulkDeleteResponseMessage(deletedCount);

    // Log successful bulk deletion operation
    await logBulkDeletion(userId, deletedCount, ids.length);

    return ok({
      deleted: deletedCount,
      message,
    });
  } catch (error) {
    return err({
      code: "BULK_DELETE_ERROR",
      message: "Error in bulk delete operation",
      details: error,
    });
  }
}

/**
 * Generate user-friendly response message based on deletion results
 */
function generateBulkDeleteResponseMessage(deletedCount: number): string {
  if (deletedCount === 0) {
    return "No contacts found to delete";
  }

  const contactWord = deletedCount === 1 ? "contact" : "contacts";
  return `Successfully deleted ${deletedCount} ${contactWord}`;
}

/**
 * Log bulk deletion operation for audit purposes
 */
async function logBulkDeletion(
  userId: string,
  deletedCount: number,
  requestedCount: number,
): Promise<void> {
  await logger.info("Bulk deleted Contacts", {
    operation: "contacts_bulk_delete",
    additionalData: {
      userId: userId.slice(0, 8) + "...",
      deletedCount,
      requestedIds: requestedCount,
    },
  });
}

// ============================================================================
// DATABASE QUERY OPERATIONS (AI Assistant)
// ============================================================================

/**
 * Get the total number of contacts for a user
 */
export async function getContactsCount(userId: string): Promise<QueryResult<ContactCountData>> {
  try {
    const contactsResult = await ContactsRepository.listContacts(userId);
    if (isErr(contactsResult)) {
      return err({
        code: "CONTACTS_COUNT_FAILED",
        message: "Failed to fetch contacts for count",
        details: contactsResult.error,
      });
    }

    if (!isSuccessResult(contactsResult)) {
      return err({
        code: "CONTACTS_COUNT_FAILED",
        message: "Invalid result state",
      });
    }

    const totalContacts = contactsResult.data.total;
    return ok({
      count: totalContacts,
      message: `Total contacts: ${totalContacts}`,
    });
  } catch (error) {
    return err({
      code: "CONTACTS_COUNT_ERROR",
      message: "Error getting contacts count",
      details: error,
    });
  }
}

/**
 * Get comprehensive contacts summary for a user
 */
export async function getContactsSummary(
  userId: string,
): Promise<QueryResult<ContactsSummaryData>> {
  try {
    const contactsResult = await ContactsRepository.listContacts(userId);
    if (isErr(contactsResult)) {
      return err({
        code: "CONTACTS_SUMMARY_FAILED",
        message: "Failed to fetch contacts for summary",
        details: contactsResult.error,
      });
    }

    if (!isSuccessResult(contactsResult)) {
      return err({
        code: "CONTACTS_SUMMARY_FAILED",
        message: "Invalid result state",
      });
    }

    const allContacts = contactsResult.data.items;
    return ok({
      contacts: allContacts,
      total: allContacts.length,
    });
  } catch (error) {
    return err({
      code: "CONTACTS_SUMMARY_ERROR",
      message: "Error getting contacts summary",
      details: error,
    });
  }
}
