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
  return await createContactService(userId, data);
});
