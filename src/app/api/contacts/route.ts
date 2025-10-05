import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  GetContactsQuerySchema,
  CreateContactBodySchema,
  ContactListResponseSchema,
  ContactSchema,
  type Contact,
  type ContactListResponse,
} from "@/server/db/business-schemas/contacts";
import { listContactsService, createContactService } from "@/server/services/contacts.service";

/**
 * GET /api/contacts - List contacts with pagination
 */
export const GET = handleGetWithQueryAuth(
  GetContactsQuerySchema,
  ContactListResponseSchema,
  async (query, userId): Promise<ContactListResponse> => {
    return await listContactsService(userId, query);
  },
);

/**
 * POST /api/contacts - Create new contact
 */
export const POST = handleAuth(
  CreateContactBodySchema,
  ContactSchema,
  async (data, userId): Promise<Contact> => {
    return await createContactService(userId, data);
  },
);
