import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  GetContactsQuerySchema,
  CreateContactBodySchema,
  ContactListResponseSchema,
  ContactSchema,
} from "@/server/db/business-schemas/contacts";
import { listContactsService, createContactService } from "@/server/services/contacts.service";

/**
 * Contacts API - List and Create
 */

export const GET = handleGetWithQueryAuth(
  GetContactsQuerySchema,
  ContactListResponseSchema,
  async (query, userId) => {
    return await listContactsService(userId, query);
  },
);

export const POST = handleAuth(CreateContactBodySchema, ContactSchema, async (data, userId) => {
  // Merge userId with the request data
  const contactData = { ...data, userId };

  console.log("Creating contact with data:", contactData);
  const result = await createContactService(userId, contactData);

  if (!result.success) {
    console.error("Create contact failed:", result.error);
    throw new Error(result.error.message);
  }

  console.log("Contact created successfully:", result.data.id);

  // Extract just the Contact data (remove notesCount and lastNote added by service)
  const { notesCount: _notesCount, lastNote: _lastNote, ...contact } = result.data;
  return contact;
});
