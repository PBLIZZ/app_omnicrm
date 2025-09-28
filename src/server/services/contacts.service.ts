/**
 * Simplified Contacts Service
 *
 * Eliminates duplication between "contacts" and "omniclients" concepts.
 * Both refer to the same database table - the difference is just in presentation.
 *
 * This replaces 6 separate service files with a single, clean service.
 */

import { ContactsRepository, NotesRepository } from "@repo";
import type { Contact, CreateContact, CreateContactInput } from "@/server/db/business-schemas";
import { CreateNoteSchema } from "@/server/db/business-schemas";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { sql, and, eq } from "drizzle-orm";
import { isErr, DbResult, Result, ok, err, isOk } from "@/lib/utils/result";
import { z } from "zod";
import { logger } from "@/lib/observability";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";

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

export interface ContactSuggestionsData {
  suggestions: any[];
}

export interface ContactsCreationData {
  success: boolean;
  createdCount: number;
  message: string;
  errors?: string[];
}

// Notes types
export interface CreateNoteRequest {
  title?: string;
  content: string;
}

export interface NoteResponse {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesListResponse {
  notes: NoteResponse[];
}

// Validation types
export interface LifecycleStageValidationResult {
  valid: boolean;
  stage?: string;
  error?: string;
}

// Avatar types
export interface AvatarData {
  photoUrl: string | null;
  displayName: string;
}

export interface AvatarResult {
  type: "redirect" | "svg";
  content: string;
  headers?: Record<string, string>;
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
export interface ContactsSummaryData {
  totalContacts: number;
  contactsWithEmail: number;
  contactsWithPhone: number;
  recentContacts: Array<{
    name: string;
    email: string | null;
    createdAt: Date;
  }>;
}

export interface SearchContactsData {
  matches: number;
  contacts: Array<{
    name: string;
    email: string | null;
    phone: string | null;
  }>;
}

export interface NotesInfoData {
  contactId?: string;
  notesCount: number;
  notes?: Array<{
    content: string;
    createdAt: Date;
  }>;
  totalNotes?: number;
  message?: string;
}

export interface FilterContactsData {
  count: number;
  description: string;
  message: string;
  contacts: Array<{
    name: string;
    email: string | null;
    phone: string | null;
  }>;
}

export interface ContactDetailsData {
  message: string;
  contact?: Contact;
}

export interface ContactNamesData {
  contacts: Array<{
    name: string;
    email: string | null;
    phone: string | null;
  }>;
  message: string;
}

export interface ContactCountData {
  count: number;
  message: string;
}

// Union type for all possible data types
export type DatabaseQueryData =
  | ContactsSummaryData
  | SearchContactsData
  | NotesInfoData
  | FilterContactsData
  | ContactDetailsData
  | ContactNamesData
  | ContactCountData;

// Service operation result types
export type ContactsServiceResult<T> = DbResult<T>;
export type QueryResult<T> = DbResult<T>;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ParamsSchema = z.object({
  clientId: z.string().uuid(),
});

// Avatar constants
const FALLBACK_COLOURS = [
  "#2563EB",
  "#7C3AED",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#10B981",
  "#14B8A6",
  "#0EA5E9",
  "#6366F1",
  "#F59E0B",
];

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
  if (isErr(result)) {
    throw new Error(`Database operation failed: ${result.error.message}`);
  }
  return (result as { success: true; data: T }).data;
}

function isValidLifecycleStage(
  value: string,
  allowedStages: readonly string[],
): value is (typeof allowedStages)[number] {
  return allowedStages.includes(value);
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

  for (const row of notesData as unknown as Array<{
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

function formatNoteResponse(note: {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): NoteResponse {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
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

  const contact = (result as { success: true; data: Contact | null }).data;

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

  const contact = (result as { success: true; data: Contact | null }).data;

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

  return (result as { success: true; data: boolean }).data;
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
): Promise<ContactsServiceResult<{ items: ContactListItem[]; total: number }>> {
  const repoParams: Parameters<typeof ContactsRepository.listContacts>[1] = {
    page: params.page,
    pageSize: params.pageSize,
  };
  if (params.search !== undefined) repoParams.search = params.search;
  if (params.sort !== undefined) repoParams.sort = params.sort;
  if (params.order !== undefined) repoParams.order = params.order;

  try {
    const repoResult = await ContactsRepository.listContacts(userId, repoParams);

    if (isErr(repoResult)) {
      return err({
        code: "CONTACTS_LIST_FAILED",
        message: "Failed to list contacts",
        details: repoResult.error,
      });
    }

    const data = (repoResult as { success: true; data: { items: Contact[]; total: number } }).data;

    const contactItems: Contact[] = Array.isArray(data.items)
      ? data.items.map((contact) => ({
          ...contact,
          createdAt: contact.createdAt || new Date(),
          updatedAt: contact.updatedAt || new Date(),
          tags: Array.isArray(contact.tags) ? contact.tags : null,
        }))
      : [];
    const total: number = typeof data.total === "number" ? data.total : 0;

    const contactIds = contactItems.map((c) => c.id);
    const notesData = await getNotesDataForContacts(userId, contactIds);

    const transformedItems: ContactListItem[] = contactItems.map((contact) => {
      const notesInfo = notesData.get(contact.id) || { count: 0, lastNote: null };

      return {
        ...contact,
        createdAt: contact.createdAt || new Date(),
        updatedAt: contact.updatedAt || new Date(),
        tags: Array.isArray(contact.tags) ? contact.tags : null,
        notesCount: notesInfo.count,
        lastNote: notesInfo.lastNote,
      };
    });

    return ok({
      items: transformedItems,
      total,
    });
  } catch (error) {
    return err({
      code: "CONTACTS_LIST_ERROR",
      message: "Error listing contacts",
      details: error,
    });
  }
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

    const contact = (result as { success: true; data: Contact | null }).data;

    if (!contact) {
      return ok(null);
    }

    return ok({
      ...contact,
      createdAt: contact.createdAt || new Date(),
      updatedAt: contact.updatedAt || new Date(),
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
): Promise<ContactsServiceResult<{ created: ContactListItem[]; duplicates: number; errors: number }>> {
  try {
    const created: ContactListItem[] = [];
    let duplicates = 0;
    let errors = 0;

    for (const contactData of contactsData) {
      try {
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
// PUBLIC API - OMNICLIENT OPERATIONS (Same data, different presentation)
// ============================================================================

/**
 * Get contact suggestions from calendar attendees
 */
export async function getContactSuggestions(
  userId: string,
): Promise<ContactsServiceResult<ContactSuggestionsData>> {
  try {
    // TODO: Implement contact suggestions service
    const suggestions: any[] = [];

    return ok({ suggestions });
  } catch (error) {
    return err({
      code: "CONTACT_SUGGESTIONS_ERROR",
      message: "Failed to fetch contact suggestions",
      details: error,
    });
  }
}

/**
 * Create contacts from approved suggestions
 */
export async function createContactsFromSuggestions(
  userId: string,
  suggestionIds: string[],
): Promise<ContactsServiceResult<ContactsCreationData>> {
  try {
    // TODO: Implement contact suggestions service
    const result = {
      success: false,
      createdCount: 0,
      message: "Contact suggestions service not implemented",
      errors: ["Service not available"],
    };

    return ok(result);
  } catch (error) {
    return err({
      code: "CONTACTS_FROM_SUGGESTIONS_ERROR",
      message: "Failed to create contacts from suggestions",
      details: error,
    });
  }
}

// ============================================================================
// PUBLIC API - NOTES OPERATIONS
// ============================================================================

/**
 * Get all notes for a specific OmniClient
 */
export async function getClientNotes(
  userId: string,
  clientId: string,
): Promise<ContactsServiceResult<NotesListResponse>> {
  try {
    const validatedParams = ParamsSchema.parse({ clientId });

    const clientNotesResult = await NotesRepository.getNotesByContactId(
      userId,
      validatedParams.clientId,
    );

    if (isErr(clientNotesResult)) {
      return err({
        code: "NOTES_GET_FAILED",
        message: "Failed to get notes",
        details: clientNotesResult.error,
      });
    }

    const clientNotes = (clientNotesResult as { success: true; data: any[] }).data;
    const formattedNotes = clientNotes.map((note) => formatNoteResponse(note));

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
 * Create a new note for a specific OmniClient
 */
export async function createClientNote(
  userId: string,
  clientId: string,
  noteData: unknown,
): Promise<ContactsServiceResult<NoteResponse>> {
  try {
    const validatedParams = ParamsSchema.parse({ clientId });
    const validatedBody = CreateNoteSchema.parse(noteData);

    const newNoteResult = await NotesRepository.createNote(userId, {
      contactId: validatedParams.clientId,
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

    const newNote = (newNoteResult as { success: true; data: any }).data;
    return ok(formatNoteResponse(newNote));
  } catch (error) {
    return err({
      code: "NOTE_CREATE_ERROR",
      message: "Error creating note",
      details: error,
    });
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate lifecycle stage value
 */
export function validateLifecycleStage(stageValue: string): LifecycleStageValidationResult {
  const allowedStages = [
    "New Client",
    "VIP Client",
    "Core Client",
    "Prospect",
    "At Risk Client",
    "Lost Client",
    "Referring Client",
  ] as const;

  if (isValidLifecycleStage(stageValue, allowedStages)) {
    return {
      valid: true,
      stage: stageValue,
    };
  }

  return {
    valid: false,
    error: `Invalid lifecycle stage: ${stageValue}`,
  };
}

// ============================================================================
// AVATAR OPERATIONS
// ============================================================================

/**
 * Get contact data for avatar generation
 */
export async function getContactAvatarData(
  clientId: string,
  userId: string,
): Promise<AvatarData | null> {
  const db = await getDb();

  const result = await db
    .select({
      photoUrl: contacts.photoUrl,
      displayName: contacts.displayName,
    })
    .from(contacts)
    .where(and(eq(contacts.id, clientId), eq(contacts.userId, userId)))
    .limit(1);

  return result[0] || null;
}

/**
 * Generate avatar result (either redirect to photo or SVG fallback)
 */
export async function generateAvatar(
  avatarData: AvatarData,
  clientId: string,
): Promise<AvatarResult> {
  const trimmedPhotoUrl = avatarData.photoUrl?.trim();

  if (trimmedPhotoUrl) {
    // Try to resolve photo URL
    const photoResult = await resolvePhotoUrl(trimmedPhotoUrl);
    if (photoResult) {
      return {
        type: "redirect",
        content: photoResult,
      };
    }
  }

  // Generate fallback SVG
  const svg = buildFallbackSvg(avatarData.displayName, clientId);
  return {
    type: "svg",
    content: svg,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  };
}

/**
 * Resolve photo URL to a valid redirect URL
 */
async function resolvePhotoUrl(photoUrl: string): Promise<string | null> {
  // Check if it's already a full HTTP URL
  if (/^https?:\/\//i.test(photoUrl)) {
    if (isAllowedOrigin(photoUrl)) {
      return photoUrl;
    }
    return null; // Unauthorized origin
  }

  // Try to resolve as Supabase storage path
  const parsedPath = parseStoragePath(photoUrl);
  const supabaseClient = supabaseServerAdmin ?? supabaseServerPublishable;

  if (parsedPath && supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from(parsedPath.bucket)
      .createSignedUrl(parsedPath.path, 60);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return null;
}

/**
 * Check if URL origin is allowed for security
 */
function isAllowedOrigin(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const allowedOrigins = [
      process.env["NEXT_PUBLIC_SUPABASE_URL"],
      process.env["VERCEL_URL"] ? `https://${process.env["VERCEL_URL"]}` : undefined,
      process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
    ].filter(Boolean);

    return allowedOrigins.some((origin) => origin && urlObj.origin === origin);
  } catch {
    return false;
  }
}

/**
 * Parse storage path for Supabase bucket and path
 */
function parseStoragePath(photoUrl: string): { bucket: string; path: string } | null {
  const normalized = photoUrl.replace(/^\/+/, "");

  // Handle case where the stored URL already includes the bucket name
  if (normalized.startsWith("client-photos/")) {
    const path = normalized.replace("client-photos/", "");
    return { bucket: "client-photos", path };
  }

  // Handle case where it's just the path within the bucket
  const [bucket, ...rest] = normalized.split("/");
  const path = rest.join("/");

  if (!bucket || !path) {
    return null;
  }

  return { bucket, path };
}

/**
 * Build fallback SVG avatar with initials and background color
 */
function buildFallbackSvg(displayName: string, seed: string): string {
  const initials = extractInitials(displayName);
  const background = pickColour(seed || displayName || initials);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${escapeXml(
    displayName || "Client",
  )}">
  <rect width="120" height="120" fill="${background}" rx="60"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="52" fill="#FFFFFF" font-weight="600">${initials}</text>
</svg>`;
}

/**
 * Extract initials from display name
 */
function extractInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0]?.slice(0, 1).toUpperCase() ?? "?";
  }

  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
}

/**
 * Pick consistent color based on seed string
 */
function pickColour(seed: string): string {
  if (!seed) {
    return FALLBACK_COLOURS[0] ?? "#2563EB";
  }

  // Use unsigned 32-bit accumulation to avoid signed overflow
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    const charCode = seed.charCodeAt(index);
    hash = (hash * 31 + charCode) >>> 0; // Use unsigned right shift to ensure unsigned 32-bit
  }

  // Compute safe index using modulo
  const safeIndex = hash % FALLBACK_COLOURS.length;
  return FALLBACK_COLOURS[safeIndex] ?? "#f0fdfa";
}

/**
 * Escape XML special characters
 */
function escapeXml(value: string): string {
  return value.replace(/["'&<>]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

// ============================================================================
// BULK DELETE OPERATIONS
// ============================================================================

/**
 * Execute bulk deletion of contacts/clients
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

    const deletedCount = (deletedCountResult as { success: true; data: number }).data;

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
    return "No clients found to delete";
  }

  const clientWord = deletedCount === 1 ? "client" : "clients";
  return `Successfully deleted ${deletedCount} ${clientWord}`;
}

/**
 * Log bulk deletion operation for audit purposes
 */
async function logBulkDeletion(
  userId: string,
  deletedCount: number,
  requestedCount: number,
): Promise<void> {
  await logger.info("Bulk deleted OmniClients", {
    operation: "omni_clients_bulk_delete",
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
      return err("Failed to fetch contacts: " + contactsResult.error.message);
    }

    const totalContacts = (contactsResult as { success: true; data: { total: number } }).data.total;
    return ok({
      count: totalContacts,
      message: `Total contacts: ${totalContacts}`,
    });
  } catch (error) {
    return err("Database error: " + (error instanceof Error ? error.message : String(error)));
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
      return err("Failed to fetch contacts: " + contactsResult.error.message);
    }

    const allContacts = (contactsResult as { success: true; data: { items: any[] } }).data.items;
    const totalContacts = allContacts.length;
    const contactsWithEmail = allContacts.filter((c) => c.primaryEmail).length;
    const contactsWithPhone = allContacts.filter((c) => c.primaryPhone).length;

    // Get recent contacts (last 10)
    const recentContacts = allContacts
      .sort((a, b) => {
        const aDate = a.createdAt || new Date(0);
        const bDate = b.createdAt || new Date(0);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 10)
      .map((contact) => ({
        name: contact.displayName,
        email: contact.primaryEmail,
        createdAt: contact.createdAt || new Date(),
      }));

    return ok({
      totalContacts,
      contactsWithEmail,
      contactsWithPhone,
      recentContacts,
    });
  } catch (error) {
    return err("Database error: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Search contacts by query string
 */
export async function searchContacts(
  userId: string,
  query: string,
): Promise<QueryResult<SearchContactsData>> {
  try {
    const contactsResult = await ContactsRepository.listContacts(userId, { search: query });
    if (isErr(contactsResult)) {
      return err("Failed to search contacts: " + contactsResult.error.message);
    }

    const matchingContacts = (
      contactsResult as { success: true; data: { items: any[] } }
    ).data.items.map((contact: any) => ({
      name: contact.displayName,
      email: contact.primaryEmail,
      phone: contact.primaryPhone,
    }));

    return ok({
      matches: matchingContacts.length,
      contacts: matchingContacts,
    });
  } catch (error) {
    return err("Database error: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Get notes information for contacts
 */
export async function getNotesInfo(
  userId: string,
  contactId?: string,
): Promise<QueryResult<NotesInfoData>> {
  try {
    if (contactId) {
      // Get notes for specific contact
      const notesResult = await NotesRepository.getNotesByContactId(userId, contactId);
      if (isErr(notesResult)) {
        return err("Failed to fetch notes: " + notesResult.error.message);
      }

      const notes = (notesResult as { success: true; data: any[] }).data.map((note: any) => ({
        content: note.content,
        createdAt: note.createdAt || new Date(),
      }));

      return ok({
        contactId,
        notesCount: notes.length,
        notes,
        message: `Found ${notes.length} notes for contact ${contactId}`,
      });
    } else {
      // Get total notes count for user
      const db = await getDb();
      const result = await db.execute(sql`
        SELECT COUNT(*) as total_notes
        FROM notes
        WHERE user_id = ${userId}
      `);

      const totalNotes = parseInt((result[0] as any)?.total_notes || "0", 10);

      return ok({
        notesCount: totalNotes,
        totalNotes,
        message: `Total notes across all contacts: ${totalNotes}`,
      });
    }
  } catch (error) {
    return err("Database error: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Filter contacts by various criteria
 */
export async function filterContacts(
  userId: string,
  query: string,
): Promise<QueryResult<FilterContactsData>> {
  try {
    const contactsResult = await ContactsRepository.listContacts(userId, { search: query });
    if (isErr(contactsResult)) {
      return err("Failed to filter contacts: " + contactsResult.error.message);
    }

    const filteredContacts = (
      contactsResult as { success: true; data: { items: any[] } }
    ).data.items.map((contact: any) => ({
      name: contact.displayName,
      email: contact.primaryEmail,
      phone: contact.primaryPhone,
    }));

    return ok({
      count: filteredContacts.length,
      description: `Contacts matching "${query}"`,
      message: `Found ${filteredContacts.length} contacts matching "${query}"`,
      contacts: filteredContacts,
    });
  } catch (error) {
    return err("Database error: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Get all contact names for a user
 */
export async function getAllContactNames(userId: string): Promise<QueryResult<ContactNamesData>> {
  try {
    const contactsResult = await ContactsRepository.listContacts(userId);
    if (isErr(contactsResult)) {
      return err("Failed to fetch contacts: " + contactsResult.error.message);
    }

    const contactNames = (
      contactsResult as { success: true; data: { items: any[] } }
    ).data.items.map((contact: any) => ({
      name: contact.displayName,
      email: contact.primaryEmail,
      phone: contact.primaryPhone,
    }));

    return ok({
      contacts: contactNames,
      message: `Retrieved ${contactNames.length} contact names`,
    });
  } catch (error) {
    return err("Database error: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Get contact details by name
 */
export async function getContactDetails(
  userId: string,
  contactName: string,
): Promise<QueryResult<ContactDetailsData>> {
  try {
    const contactsResult = await ContactsRepository.listContacts(userId, { search: contactName });
    if (isErr(contactsResult)) {
      return err("Failed to search contacts: " + contactsResult.error.message);
    }

    const matchingContacts = (
      contactsResult as { success: true; data: { items: any[] } }
    ).data.items.filter((contact: any) =>
      contact.displayName.toLowerCase().includes(contactName.toLowerCase()),
    );

    if (matchingContacts.length === 0) {
      return ok({
        message: `No contact found with name containing "${contactName}"`,
      });
    }

    if (matchingContacts.length === 1) {
      const contact = matchingContacts[0];
      return ok({
        message: `Found contact: ${contact.displayName}`,
        contact: {
          ...contact,
          createdAt: contact.createdAt || new Date(),
          updatedAt: contact.updatedAt || new Date(),
        },
      });
    }

    return ok({
      message: `Found ${matchingContacts.length} contacts with name containing "${contactName}". Please be more specific.`,
    });
  } catch (error) {
    return err("Database error: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Process database query for AI assistant (legacy compatibility)
 */
export async function processQuery(userId: string, query: string): Promise<QueryResult<DatabaseQueryData>> {
  try {
    const queryLower = query.toLowerCase();

    if (queryLower.includes("count") || queryLower.includes("total")) {
      return await getContactsCount(userId);
    }

    if (queryLower.includes("summary") || queryLower.includes("overview")) {
      return await getContactsSummary(userId);
    }

    if (queryLower.includes("search") || queryLower.includes("find")) {
      const searchTerm = query.replace(/.*?(?:search|find)\s+(.+)/i, "$1").trim();
      return await searchContacts(userId, searchTerm);
    }

    if (queryLower.includes("notes")) {
      return await getNotesInfo(userId);
    }

    if (queryLower.includes("filter") || queryLower.includes("where")) {
      const filterTerm = query.replace(/.*?(?:filter|where)\s+(.+)/i, "$1").trim();
      return await filterContacts(userId, filterTerm);
    }

    if (queryLower.includes("names") || queryLower.includes("list")) {
      return await getAllContactNames(userId);
    }

    if (queryLower.includes("details") || queryLower.includes("show")) {
      const contactName = query.replace(/.*?(?:details|show)\s+(.+)/i, "$1").trim();
      return await getContactDetails(userId, contactName);
    }

    // Default to summary if no specific query type detected
    return await getContactsSummary(userId);
  } catch (error) {
    return err({
      code: "QUERY_PROCESSING_ERROR",
      message: "Query processing error",
      details: error,
    });
  }
}
