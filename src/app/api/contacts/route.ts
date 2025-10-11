import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  GetContactsQuerySchema,
  CreateContactBodySchema,
  ContactListResponseSchema,
  ContactSchema,
  type ContactListResponse,
} from "@/server/db/business-schemas/contacts";
import { listContactsService, createContactService } from "@/server/services/contacts.service";
import { z } from "zod";

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
  async (data, userId): Promise<z.infer<typeof ContactSchema>> => {
    return await createContactService(userId, data);
  },
);
