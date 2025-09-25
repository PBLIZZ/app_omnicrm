// OmniClients Adapter Layer
// Transforms backend Contact objects to UI-friendly OmniClient objects
// Keeps backend as "contacts", presents "OmniClients" to the frontend

import type { Contact } from "@/server/db/types";
import type {
  ContactDTO,
  ContactWithNotesDTO,
  CreateContactDTO,
  UpdateContactDTO,
} from "@omnicrm/contracts";
import { isValidSource, isValidStage, normalizeTags } from "@/lib/utils/validation-helpers";

// Re-export unified types for backward compatibility
export type OmniClient = ContactDTO;
export type OmniClientWithNotes = ContactWithNotesDTO;
export type OmniClientInput = CreateContactDTO;
export type OmniClientUpdate = UpdateContactDTO;

type ContactWithOptionalNotes<T> = T & {
  notesCount?: number;
  lastNote?: string | null;
  notes?: Array<{
    id: string;
    userId: string;
    contactId: string | null;
    title: string | null;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

type ContactInput = ContactWithOptionalNotes<Contact | ContactDTO>;

function isDatabaseContact(contact: ContactInput): contact is ContactWithOptionalNotes<Contact> {
  return "display_name" in contact;
}

function ensureValidSource(value: unknown): ContactDTO["source"] {
  return isValidSource(value) ? value : "manual";
}

function ensureValidStage(value: unknown): ContactDTO["lifecycleStage"] {
  return isValidStage(value) ? value : null;
}

function coerceDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

// Transform Contact to ContactDTO
export function toContactDTO(contact: ContactInput): ContactDTO {
  if (isDatabaseContact(contact)) {
    const createdAt = new Date(contact.created_at);
    const updatedAt = new Date(contact.updated_at ?? contact.created_at);

    return {
      id: contact.id,
      userId: contact.user_id,
      displayName: contact.display_name ?? "",
      primaryEmail: contact.primary_email,
      primaryPhone: contact.primary_phone,
      photoUrl: contact.photo_url,
      source: ensureValidSource(contact.source),
      lifecycleStage: ensureValidStage(contact.lifecycle_stage),
      tags: normalizeTags(contact.tags),
      confidenceScore: contact.confidence_score,
      createdAt,
      updatedAt,
    };
  }

  const createdAt = coerceDate(contact.createdAt, new Date());
  const updatedAt = coerceDate(contact.updatedAt ?? contact.createdAt, createdAt);

  return {
    id: contact.id,
    userId: contact.userId,
    displayName: contact.displayName ?? "",
    primaryEmail: contact.primaryEmail ?? null,
    primaryPhone: contact.primaryPhone ?? null,
    photoUrl: contact.photoUrl ?? null,
    source: ensureValidSource(contact.source),
    lifecycleStage: ensureValidStage(contact.lifecycleStage),
    tags: normalizeTags(contact.tags),
    confidenceScore: contact.confidenceScore ?? null,
    createdAt,
    updatedAt,
  };
}

// Transform Contact with notes data to ContactWithNotesDTO
export function toContactWithNotesDTO(
  contact: Contact & {
    notesCount?: number;
    lastNote?: string | null;
    notes?: Array<{
      id: string;
      userId: string;
      contactId: string | null;
      title: string | null;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  },
): ContactWithNotesDTO {
  const baseContact = toContactDTO(contact);

  const notes = contact.notes ?? [];

  return {
    ...baseContact,
    notes: notes.map((note) => ({
      id: note.id,
      userId: note.userId,
      contactId: note.contactId,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  };
}

// Transform CreateContactDTO to database Contact input (matches service interface)
export function fromCreateContactDTO(input: CreateContactDTO): {
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
} {
  return {
    displayName: input.displayName,
    primaryEmail: input.primaryEmail ?? null,
    primaryPhone: input.primaryPhone ?? null,
    source: input.source ?? "manual",
    lifecycleStage: input.lifecycleStage ?? null,
    tags: normalizeTags(input.tags),
    confidenceScore: input.confidenceScore ?? null,
  };
}

// Transform arrays of contacts
export function toContactDTOs(contacts: Contact[]): ContactDTO[] {
  return contacts.map(toContactDTO);
}

export function toContactWithNotesDTOs<
  T extends Contact & {
    notes?: Array<{
      id: string;
      userId: string;
      contactId: string | null;
      title: string | null;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  },
>(contacts: T[]): ContactWithNotesDTO[] {
  return contacts.map(toContactWithNotesDTO);
}

// Backward compatibility aliases
export const toOmniClient = toContactDTO;
export const toOmniClientWithNotes = toContactWithNotesDTO;
export const toOmniClients = toContactDTOs;
export const toOmniClientsWithNotes = toContactWithNotesDTOs;
export const fromOmniClientInput = fromCreateContactDTO;

// Response envelope types (deprecated - use unified types)
export interface OmniClientsListResponse {
  items: ContactWithNotesDTO[];
  total: number;
  nextCursor?: string | null;
}

export interface OmniClientResponse {
  item: ContactDTO;
}
