import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  ContactIdentityListResponseSchema,
  ContactIdentityQuerySchema,
  ContactIdentityResponseSchema,
  CreateContactIdentityBodySchema,
  type ContactIdentityListResponse,
} from "@/server/db/business-schemas/contact-identities";
import {
  createContactIdentityService,
  listContactIdentitiesService,
} from "@/server/services/contact-identities.service";
import { buildPagination } from "@/app/api/data-intelligence/pagination";

export const GET = handleGetWithQueryAuth(
  ContactIdentityQuerySchema,
  ContactIdentityListResponseSchema,
  async (query, userId): Promise<ContactIdentityListResponse> => {
    const { page, pageSize, contactId, kind, provider, search } = query;

    const { items, total } = await listContactIdentitiesService(userId, {
      contactId,
      kinds: kind,
      provider: provider?.[0],
      search,
      page,
      pageSize,
    });

    return {
      items,
      pagination: buildPagination(page, pageSize, total),
    };
  },
);

export const POST = handleAuth(
  CreateContactIdentityBodySchema,
  ContactIdentityResponseSchema,
  async (data, userId) => {
    const item = await createContactIdentityService(userId, data);
    return { item };
  },
);
