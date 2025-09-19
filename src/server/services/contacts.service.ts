// src/server/services/contacts.service.ts
// ContactsRepository import removed - using dynamic imports for omni-clients.repo
// CreateContactDTO type removed - using CreateContactValues from omni-clients.repo
import type { ContactListItem } from "@/server/repositories/omni-clients.repo";

export type ContactListParams = {
  search?: string;
  sort?: "displayName" | "createdAt";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
  dateRange?: { from?: Date; to?: Date };
};

// ContactListItem is imported from omni-clients.repo

export async function listContactsService(
  userId: string,
  params: ContactListParams,
): Promise<{ items: ContactListItem[]; total: number }> {
  // Use omni-clients repository which includes notes count and last note
  const { listContacts } = await import("@/server/repositories/omni-clients.repo");
  const { items, total } = await listContacts(userId, {
    search: params.search ?? "",
    page: params.page,
    pageSize: params.pageSize,
  });

  return {
    items,
    total,
  };
}

export type CreateContactInput = {
  displayName: string;
  primaryEmail?: string | null | undefined;
  primaryPhone?: string | null | undefined;
  source: "manual" | "gmail_import" | "upload" | "calendar_import";
};

export async function createContactService(
  userId: string,
  input: CreateContactInput,
): Promise<ContactListItem | null> {
  // Convert to repository format (string | null)
  const toRepositoryFormat = (v: string | null | undefined): string | null => {
    if (typeof v === "string" && v.trim().length === 0) return null;
    return v ?? null;
  };

  // Create repository values
  const createData = {
    displayName: input.displayName,
    primaryEmail: toRepositoryFormat(input.primaryEmail),
    primaryPhone: toRepositoryFormat(input.primaryPhone),
    source: input.source,
  };

  // Pass data with userId to repository
  const { createContact } = await import("@/server/repositories/omni-clients.repo");
  const row = await createContact(userId, createData);

  return row;
}
