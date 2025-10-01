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
  const result = await createContactService(userId, contactData);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
});
