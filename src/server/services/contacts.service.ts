/**
 * Contacts Service Layer
 *
 * Business logic and orchestration.
 * - Unwraps DbResult from repos → throws AppError
 * - Data enrichment (add computed fields)
 * - Business rule validation
 */

import { createContactsRepository, createNotesRepository } from "@repo";
import type { Contact, Note } from "@/server/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/observability";
import {
  getBatchSignedUrlsService,
  logBatchPhotoAccessService,
} from "@/server/services/storage.service";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import type { ContactWithLastNote as ContactWithLastNoteType } from "@/server/db/business-schemas/contacts";
import { getContactSuggestions } from "../ai/contacts/suggest-contacts";

// ============================================================================
// SERVICE LAYER TYPES (Data enrichment)
// ============================================================================

/**
 * Contact enriched with last note preview
 * Used by list endpoint to show note snippets
 * Re-exported from business schemas for consistency
 */
export type ContactWithLastNote = ContactWithLastNoteType;

/**
 * Contact with full notes array
 * Used by detail view
 */
export type ContactWithNotes = Contact & {
  notes: Array<{
    id: string;
    userId: string;
    contactId: string | null;
    contentRich: unknown;
    contentPlain: string;
    piiEntities: unknown;
    tags: string[];
    sourceType: "typed" | "voice" | "upload";
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export type ContactListParams = {
  search?: string | undefined;
  sort?: "displayName" | "createdAt" | "updatedAt" | undefined;
  order?: "asc" | "desc" | undefined;
  page: number;
  pageSize: number;
  dateRange?: { from?: Date; to?: Date } | undefined;
};

export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkDeleteResponse {
  deleted: number;
  errors: { id: string; error: string }[];
}

// ============================================================================
// PUBLIC API - CONTACT SUGGESTIONS
// ============================================================================

/**
 * Get contact suggestions from calendar events
 * Note: Requires calendar sync to be active
 */
export async function getContactSuggestionsService(userId: string): Promise<Array<unknown>> {
  // Call AI suggestion logic directly (it returns the array, not a Result)
  const suggestions = await getContactSuggestions(userId);
  return suggestions;
}

/**
 * Count contacts for user with optional search filter
 */
export async function countContactsService(userId: string, search?: string): Promise<number> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    return await repo.countContacts(userId, search);
  } catch (_error) {
    throw new AppError("Failed to count contacts", "DB_ERROR", "database", false);
  }
}

/**
 * Create contacts from approved suggestion IDs
 *
 * Implementation:
 * 1. Get all suggestions from calendar
 * 2. Filter by provided IDs
 * 3. Transform to contact data
 * 4. Batch create contacts
 */
export async function createContactsFromSuggestionsService(
  userId: string,
  suggestionIds: string[],
): Promise<{ createdCount: number; contacts: Contact[] }> {
  // 1. Get all suggestions
  const allSuggestions = await getContactSuggestions(userId);

  // 2. Filter to only requested IDs
  const selectedSuggestions = allSuggestions.filter((s) => suggestionIds.includes(s.id));

  if (selectedSuggestions.length === 0) {
    return { createdCount: 0, contacts: [] };
  }

  // 3. Transform suggestions to contact data
  const contactsData = selectedSuggestions.map((suggestion) => ({
    displayName: suggestion.displayName,
    primaryEmail: suggestion.email,
    source: suggestion.source,
    lifecycleStage: "Prospect",
    tags: ["calendar_import"],
  }));

  // 4. Batch create contacts
  const batchResult = await createContactsBatchService(userId, contactsData);

  return {
    createdCount: batchResult.created.length,
    contacts: batchResult.created,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get last note preview (first 500 chars) for each contact
 */
async function getLastNotePreviewForContacts(
  userId: string,
  contactIds: string[],
): Promise<Map<string, string | null>> {
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
      SELECT DISTINCT ON (contact_id)
        contact_id,
        LEFT(content_plain, 500) as last_note_preview
      FROM notes
      WHERE user_id = ${userId} 
      AND contact_id = ANY(${uuidArray})
      ORDER BY contact_id, created_at DESC
    `);
  } catch (error) {
    console.error("Database error in getLastNotePreview:", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      contactIds: contactIds.length,
    });
    return new Map();
  }

  const result = new Map<string, string | null>();

  // Initialize all contacts with null
  for (const contactId of contactIds) {
    result.set(contactId, null);
  }

  // Validate and process database rows
  const validatedRows = extractNotesQueryRows(notesData);
  for (const row of validatedRows) {
    const preview = typeof row.last_note_preview === "string" ? row.last_note_preview : null;
    result.set(row.contact_id, preview);
  }

  return result;
}

// ============================================================================
// CONTACT CRUD OPERATIONS
// ============================================================================

/**
 * List contacts with pagination and enrichment
 */
export async function listContactsService(
  userId: string,
  params: ContactListParams,
): Promise<{
  items: ContactWithLastNote[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    // 1. Get contacts from repo
    const { items: contacts, total } = await repo.listContacts(userId, {
      page: params.page,
      pageSize: params.pageSize,
      ...(params.search !== undefined && { search: params.search }),
      ...(params.sort !== undefined && { sort: params.sort }),
      ...(params.order !== undefined && { order: params.order }),
    });

    // 2. Enrich with last notes
    const contactIds = contacts.map((c) => c.id);
    const lastNotePreviews = await getLastNotePreviewForContacts(userId, contactIds);

    // 3. Batch generate signed URLs for photos
    const photoPaths = contacts.filter((c) => c.photoUrl).map((c) => c.photoUrl as string);

    let photoUrls: Record<string, string | null> = {};
    if (photoPaths.length > 0) {
      const batchResult = await getBatchSignedUrlsService(photoPaths, 14400); // 4 hours
      photoUrls = batchResult.urls;

      // Log photo access for HIPAA/GDPR compliance (best-effort)
      const contactPhotos = contacts
        .filter((c) => c.photoUrl)
        .map((c) => ({ contactId: c.id, photoPath: c.photoUrl as string }));

      await logBatchPhotoAccessService(userId, contactPhotos);
    }

    // 4. Transform with enrichments
    const itemsWithEnrichments: ContactWithLastNote[] = contacts.map((contact) => ({
      ...contact,
      lastNote: lastNotePreviews.get(contact.id) ?? null,
      photoUrl: contact.photoUrl ? (photoUrls[contact.photoUrl] ?? contact.photoUrl) : null,
    }));

    // 5. Calculate pagination
    const totalPages = Math.ceil(total / params.pageSize);

    return {
      items: itemsWithEnrichments,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list contacts",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get single contact by ID
 */
export async function getContactByIdService(userId: string, contactId: string): Promise<Contact> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    const contact = await repo.getContactById(userId, contactId);

    if (!contact) {
      throw new AppError("contact not found", "CONTACT_NOT_FOUND", "validation", false);
    }

    return normalizeContactNulls(contact);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get contact",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get contact with all notes
 * Replaces repo.getContactWithNotes - composed from two repo calls
 */
export async function getContactWithNotesService(
  userId: string,
  contactId: string,
): Promise<ContactWithNotes> {
  const db = await getDb();
  const repo = createContactsRepository(db);
  const notesRepo = createNotesRepository(db);

  try {
    // 1. Get contact
    const contact = await repo.getContactById(userId, contactId);

    if (!contact) {
      throw new AppError("Contact not found", "CONTACT_NOT_FOUND", "validation", false);
    }

    // 2. Get notes separately
    let notes: Note[] = [];
    try {
      notes = await notesRepo.listNotes(userId, contactId);
    } catch (error) {
      // Notes fetch failed - return contact with empty notes rather than error
      console.warn("Failed to fetch notes for contact:", error);
      notes = [];
    }

    // 3. Combine
    return {
      ...contact,
      notes,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get contact with notes",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Create new contact
 */
export async function createContactService(
  userId: string,
  input: {
    displayName: string;
    primaryEmail?: string | undefined;
    primaryPhone?: string | undefined;
    photoUrl?: string | undefined;
    source?: string | undefined;
    lifecycleStage?: string | undefined;
    tags?: string[] | undefined;
    confidenceScore?: string | undefined;
    dateOfBirth?: string | undefined;
    emergencyContactName?: string | undefined;
    emergencyContactPhone?: string | undefined;
    clientStatus?: string | undefined;
    referralSource?: string | undefined;
    address?: unknown;
    healthContext?: unknown;
    preferences?: unknown;
  },
): Promise<Contact> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    const contact = await repo.createContact({
      userId,
      displayName: input.displayName,
      primaryEmail: input.primaryEmail ?? null,
      primaryPhone: input.primaryPhone ?? null,
      photoUrl: input.photoUrl ?? null,
      source: input.source ?? null,
      lifecycleStage: input.lifecycleStage ?? null,
      tags: input.tags ?? null,
      confidenceScore: input.confidenceScore ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      clientStatus: input.clientStatus ?? null,
      referralSource: input.referralSource ?? null,
      address: input.address ?? null,
      healthContext: input.healthContext ?? null,
      preferences: input.preferences ?? null,
    });

    // Transform null to undefined for exactOptionalPropertyTypes compatibility
    return normalizeContactNulls(contact);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create contact",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Helper: Convert null values to undefined for schema compatibility
 * Required because exactOptionalPropertyTypes treats null and undefined as distinct
 */
function normalizeContactNulls(contact: Contact): Contact {
  return {
    ...contact,
    primaryEmail: contact.primaryEmail ?? undefined,
    primaryPhone: contact.primaryPhone ?? undefined,
    photoUrl: contact.photoUrl ?? undefined,
    source: contact.source ?? undefined,
    lifecycleStage: contact.lifecycleStage ?? undefined,
    clientStatus: contact.clientStatus ?? undefined,
    referralSource: contact.referralSource ?? undefined,
    confidenceScore: contact.confidenceScore ?? undefined,
    dateOfBirth: contact.dateOfBirth ?? undefined,
    emergencyContactName: contact.emergencyContactName ?? undefined,
    emergencyContactPhone: contact.emergencyContactPhone ?? undefined,
    address: contact.address ?? undefined,
    healthContext: contact.healthContext ?? undefined,
    preferences: contact.preferences ?? undefined,
    tags: contact.tags ?? undefined,
  } as Contact;
}

/**
 * Update contact
 */
export async function updateContactService(
  userId: string,
  contactId: string,
  updates: {
    displayName?: string | undefined;
    primaryEmail?: string | null | undefined;
    primaryPhone?: string | null | undefined;
    photoUrl?: string | null | undefined;
    source?: string | null | undefined;
    lifecycleStage?: string | null | undefined;
    tags?: string[] | null | undefined;
    confidenceScore?: string | null | undefined;
    dateOfBirth?: string | null | undefined;
    emergencyContactName?: string | null | undefined;
    emergencyContactPhone?: string | null | undefined;
    clientStatus?: string | null | undefined;
    referralSource?: string | null | undefined;
    address?: unknown;
    healthContext?: unknown;
    preferences?: unknown;
  },
): Promise<Contact> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    ) as Partial<typeof updates>;
    const contact = await repo.updateContact(userId, contactId, cleanUpdates);

    if (!contact) {
      throw new AppError("Contact not found", "CONTACT_NOT_FOUND", "validation", false);
    }

    return normalizeContactNulls(contact);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update contact",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Delete contact
 */
export async function deleteContactService(userId: string, contactId: string): Promise<boolean> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    return await repo.deleteContact(userId, contactId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete contact",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Find contact by email
 */
export async function findContactByEmailService(
  userId: string,
  email: string,
): Promise<Contact | null> {
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    const contact = await repo.findContactByEmail(userId, email);
    return contact ? normalizeContactNulls(contact) : null;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to find contact by email",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk delete contacts
 */
export async function deleteContactsBulk(
  userId: string,
  request: BulkDeleteRequest,
): Promise<BulkDeleteResponse> {
  const { ids } = request;
  const db = await getDb();
  const repo = createContactsRepository(db);

  try {
    const deletedCount = await repo.deleteContactsByIds(userId, ids);

    // Log for audit
    await logger.info("Bulk deleted contacts", {
      operation: "contacts_bulk_delete",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        deletedCount,
        requestedIds: ids.length,
      },
    });

    return {
      deleted: deletedCount,
      errors: [],
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to bulk delete contacts",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Batch create contacts
 */
export async function createContactsBatchService(
  userId: string,
  contactsData: Array<{
    displayName: string;
    primaryEmail?: string;
    primaryPhone?: string;
    source?: string;
    lifecycleStage?: string;
    tags?: string[];
  }>,
): Promise<{
  created: Contact[];
  duplicates: number;
  errors: number;
}> {
  const created: Contact[] = [];
  let duplicates = 0;
  let errors = 0;

  for (const contactData of contactsData) {
    try {
      // Check for duplicates by email
      if (contactData.primaryEmail) {
        const existing = await findContactByEmailService(userId, contactData.primaryEmail);
        if (existing) {
          duplicates++;
          continue;
        }
      }

      const contact = await createContactService(userId, contactData);
      created.push(contact);
    } catch (error) {
      errors++;
      console.error("Error creating contact in batch:", error);
    }
  }

  return { created, duplicates, errors };
}
