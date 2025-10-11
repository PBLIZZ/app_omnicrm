// src/server/services/contacts.service.ts
// Unified contacts service using the unified repository pattern
import { ContactsRepository } from "@repo";
import type { Contact, CreateContact } from "@/server/db/business-schemas/business-schema";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

export type ContactListParams = {
  search?: string;
  sort?: "displayName" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
  dateRange?: { from?: Date; to?: Date };
};

export type CreateContactInput = {
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  source: "manual" | "gmail_import" | "upload" | "calendar_import";
  lifecycleStage?:
    | "Prospect"
    | "New Client"
    | "Core Client"
    | "Referring Client"
    | "VIP Client"
    | "Lost Client"
    | "At Risk Client"
    | null;
  tags?: string[] | null;
  confidenceScore?: string | null;
};

// Enhanced type that includes the extra fields from omni-clients repo
export type ContactListItem = Contact & {
  notesCount: number;
  lastNote: string | null;
};

// Helper to convert empty strings to null
function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  return value;
}

// Helper to get notes data for multiple contacts efficiently
async function getNotesDataForContacts(
  userId: string,
  contactIds: string[],
): Promise<Map<string, { count: number; lastNote: string | null }>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const db = await getDb();

  // Use database-level aggregation to get count and last note for each contact
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
    // Return empty map on database error to prevent breaking the UI
    return new Map();
  }

  // Build result map from aggregated data
  const result = new Map<string, { count: number; lastNote: string | null }>();

  // Initialize all contact IDs with zero counts
  for (const contactId of contactIds) {
    result.set(contactId, { count: 0, lastNote: null });
  }

  // Update with actual data from database
  for (const row of notesData as Array<{
    contact_id: string;
    count: string | number;
    last_note: string | null;
  }>) {
    const contactId = row.contact_id;
    const count = parseInt(String(row.count), 10);
    const lastNote = row.last_note;

    result.set(contactId, { count, lastNote });
  }

  return result;
}

/**
 * List contacts with optional search filtering
 * Delegates to unified repository for core functionality
 */
export async function listContactsService(
  userId: string,
  params: ContactListParams,
): Promise<{ items: ContactListItem[]; total: number }> {
  // Use unified repo with full pagination and search support
  const repoParams: Parameters<typeof ContactsRepository.listContacts>[1] = {
    page: params.page,
    pageSize: params.pageSize,
  };
  if (params.search !== undefined) repoParams.search = params.search;
  if (params.sort !== undefined) repoParams.sort = params.sort;
  if (params.order !== undefined) repoParams.order = params.order;

  try {
    // Call repository and explicitly type the result
    const repoResult = (await ContactsRepository.listContacts(userId, repoParams)) as {
      items: Contact[];
      total: number;
    };

    // Ensure we have valid items array and total
    const contactItems: Contact[] = Array.isArray(repoResult.items) ? repoResult.items : [];
    const total: number = typeof repoResult.total === "number" ? repoResult.total : 0;

    // Get notes data for all contacts in a single query
    const contactIds = contactItems.map((c) => c.id);
    const notesData = await getNotesDataForContacts(userId, contactIds);

    // Transform each contact to include notes info
    const transformedItems: ContactListItem[] = contactItems.map((contact) => {
      const notesInfo = notesData.get(contact.id) || { count: 0, lastNote: null };

      return {
        id: contact.id,
        photoUrl: contact.photoUrl,
        userId: contact.userId,
        displayName: contact.displayName,
        primaryEmail: contact.primaryEmail,
        primaryPhone: contact.primaryPhone,
        source: contact.source,
        lifecycleStage: contact.lifecycleStage,
        tags: contact.tags,
        confidenceScore: contact.confidenceScore,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
        notesCount: notesInfo.count,
        lastNote: notesInfo.lastNote,
      };
    });

    return {
      items: transformedItems,
      total,
    };
  } catch (error) {
    console.error("Error listing contacts:", error);
    return { items: [], total: 0 };
  }
}

/**
 * Create a new contact using unified repository
 */
export async function createContactService(
  userId: string,
  input: CreateContactInput,
): Promise<ContactListItem | null> {
  const createData: CreateContact = {
    displayName: input.displayName,
    primaryEmail: emptyToNull(input.primaryEmail),
    primaryPhone: emptyToNull(input.primaryPhone),
    source: input.source,
    lifecycleStage: input.lifecycleStage ?? null,
    tags: input.tags ?? null,
    confidenceScore: input.confidenceScore ?? null,
  };

  const contact = await ContactsRepository.createContact({ ...createData, userId });

  if (!contact) {
    return null;
  }

  // Transform to ContactListItem format
  return {
    ...contact,
    notesCount: 0, // New contact has no notes
    lastNote: null, // New contact has no notes
  };
}

/**
 * Get contact by ID using unified repository
 */
export async function getContactByIdService(
  userId: string,
  contactId: string,
): Promise<Contact | null> {
  return await ContactsRepository.getContactById(userId, contactId);
}

/**
 * Update contact using unified repository
 */
export async function updateContactService(
  userId: string,
  contactId: string,
  updateData: Partial<CreateContactInput>,
): Promise<Contact | null> {
  return await ContactsRepository.updateContact(userId, contactId, updateData);
}

/**
 * Delete contact using unified repository
 */
export async function deleteContactService(userId: string, contactId: string): Promise<boolean> {
  return await ContactsRepository.deleteContact(userId, contactId);
}

/**
 * Find contact by email using unified repository
 */
export async function findContactByEmailService(
  userId: string,
  email: string,
): Promise<Contact | null> {
  return await ContactsRepository.findContactByEmail(userId, email);
}

/**
 * Batch create contacts (simplified version for now)
 */
export async function createContactsBatchService(
  userId: string,
  contactsData: Array<CreateContactInput>,
): Promise<{ created: ContactListItem[]; duplicates: number; errors: number }> {
  const created: ContactListItem[] = [];
  let duplicates = 0;
  let errors = 0;

  // Simple implementation - could be optimized in unified repo later
  for (const contactData of contactsData) {
    try {
      // Check for duplicates by email
      if (contactData.primaryEmail) {
        const existing = await ContactsRepository.findContactByEmail(
          userId,
          contactData.primaryEmail,
        );
        if (existing) {
          duplicates++;
          continue;
        }
      }

      const contact = await createContactService(userId, contactData);
      if (contact) {
        created.push(contact);
      }
    } catch (error) {
      errors++;
      console.error("Error creating contact in batch:", error);
    }
  }

  return { created, duplicates, errors };
}
