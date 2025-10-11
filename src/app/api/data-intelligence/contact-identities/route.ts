import { z } from "zod";

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
      ...(contactId && { contactId }),
      ...(kind && { kinds: kind }),
      ...(provider?.[0] && { provider: provider[0] }),
      ...(search && { search }),
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
  async (data, userId): Promise<{ item: z.infer<typeof ContactIdentityResponseSchema>["item"] }> => {
    const item = await createContactIdentityService(userId, {
      contactId: data.contactId,
      kind: data.kind as "email" | "phone" | "handle" | "provider_id",
      value: data.value,
      ...(data.provider && { provider: data.provider }),
    });
    return { item };
  },
);
