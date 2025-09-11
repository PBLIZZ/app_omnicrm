// OmniClients Adapter Layer
// Transforms backend Contact objects to UI-friendly OmniClient objects
// Keeps backend as "contacts", presents "OmniClients" to the frontend

import type { Contact } from "@/server/db/schema";
import type { ContactListItem } from "@/server/repositories/omni-clients.repo";

// OmniClient - UI view-model (what the frontend sees)
export interface OmniClient {
  id: string;
  userId: string;
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: string | null;
  slug: string | null;
  stage: string | null;
  tags: unknown; // jsonb - wellness tags array
  confidenceScore: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Extended OmniClient with notes data for table view
export interface OmniClientWithNotes extends OmniClient {
  notesCount: number;
  lastNote: string | null;
  interactions?: number;
}

// Input type for creating/updating OmniClients from UI
export interface OmniClientInput {
  displayName: string;
  primaryEmail?: string | null | undefined;
  primaryPhone?: string | null | undefined;
  source?: "manual" | "gmail_import" | "upload" | "calendar_import" | undefined;
  stage?: string | null | undefined;
  tags?: unknown;
}

// Type guard for date values
function ensureDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  // Fallback to current date if invalid
  return new Date();
}

// Transform Contact to OmniClient (response transformation)
export function toOmniClient(contact: Contact): OmniClient {
  const created = ensureDate(contact.createdAt);
  const updatedRaw = contact.updatedAt ?? contact.createdAt;
  const updated = ensureDate(updatedRaw);

  return {
    id: contact.id,
    userId: contact.userId,
    displayName: contact.displayName ?? "",
    primaryEmail: contact.primaryEmail,
    primaryPhone: contact.primaryPhone,
    source: contact.source,
    slug: contact.slug,
    stage: contact.stage,
    tags: contact.tags,
    confidenceScore: contact.confidenceScore,
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
  };
}

// Transform ContactListItem (with notes) to OmniClientWithNotes
export function toOmniClientWithNotes(contact: ContactListItem): OmniClientWithNotes {
  const created = ensureDate(contact.createdAt);
  const updatedRaw = contact.updatedAt ?? contact.createdAt;
  const updated = ensureDate(updatedRaw);

  return {
    id: contact.id,
    userId: contact.userId,
    displayName: contact.displayName ?? "",
    primaryEmail: contact.primaryEmail,
    primaryPhone: contact.primaryPhone,
    source: contact.source,
    slug: contact.slug,
    stage: contact.stage,
    tags: contact.tags,
    confidenceScore: contact.confidenceScore,
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
    notesCount: contact.notesCount ?? 0,
    lastNote: contact.lastNote ?? null,
    interactions: 0, // TODO: Add interactions count to ContactListItem if needed
  };
}

// Transform OmniClient input to Contact creation input (request transformation)
export function fromOmniClientInput(input: OmniClientInput): {
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: "manual" | "gmail_import" | "upload" | "calendar_import";
} {
  return {
    displayName: input.displayName,
    primaryEmail: input.primaryEmail ?? null,
    primaryPhone: input.primaryPhone ?? null,
    source: input.source ?? "manual", // Default to manual if not specified
  };
}

// Transform arrays of contacts
export function toOmniClients(contacts: Contact[]): OmniClient[] {
  return contacts.map(toOmniClient);
}

export function toOmniClientsWithNotes(contacts: ContactListItem[]): OmniClientWithNotes[] {
  return contacts.map(toOmniClientWithNotes);
}

// Note: Adapter types are the source of truth for the interface types
// Zod types in schemas have DTO suffix to avoid confusion

// Response envelope types for consistent API responses (kept for backward compatibility)
export interface OmniClientsListResponse {
  items: OmniClientWithNotes[];
  total: number;
  nextCursor?: string | null;
}

export interface OmniClientResponse {
  item: OmniClient;
}
