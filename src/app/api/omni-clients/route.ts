import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  GetOmniClientsQuerySchema,
  CreateOmniClientSchema,
  ContactListResponseSchema,
  OmniClientSchema,
} from "@/server/db/business-schemas/contacts";
import { OmniClientsService } from "@/server/services/omni-clients.service";

/**
 * OmniClients API - List and Create
 *
 * UI boundary transformation: presents "OmniClients" while using "contacts" backend
 * Uses adapter pattern to transform Contact objects to OmniClient objects
 */

export const GET = handleGetWithQueryAuth(
  GetOmniClientsQuerySchema,
  ContactListResponseSchema,
  async (query, userId) => {
    return await OmniClientsService.listOmniClients(userId, query);
  }
);

export const POST = handleAuth(
  CreateOmniClientSchema,
  OmniClientSchema,
  async (data, userId) => {
    return await OmniClientsService.createOmniClient(userId, data);
  }
);
