// src/server/services/contacts.service.ts
import type { ContactListItem, ContactListParams } from "@/server/repositories/contacts.repo";
import { createContact, listContacts } from "@/server/repositories/contacts.repo";

export async function listContactsService(
  userId: string,
  params: ContactListParams,
): Promise<{ items: ContactListItem[]; total: number }> {
  return listContacts(userId, params);
}

export type CreateContactInput = {
  displayName: string;
  primaryEmail?: string | null | undefined;
  primaryPhone?: string | null | undefined;
  source: "manual";
};

export async function createContactService(
  userId: string,
  input: CreateContactInput,
): Promise<ContactListItem | null> {
  const toNull = (v: string | null | undefined): string | null => {
    if (typeof v === "string" && v.trim().length === 0) return null;
    return v ?? null;
  };

  const row = await createContact(userId, {
    displayName: input.displayName,
    primaryEmail: toNull(input.primaryEmail),
    primaryPhone: toNull(input.primaryPhone),
    source: input.source,
  });

  return row;
}
