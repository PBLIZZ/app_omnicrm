import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  CreateIgnoredIdentifierBodySchema,
  IgnoredIdentifierListResponseSchema,
  IgnoredIdentifierQuerySchema,
  IgnoredIdentifierResponseSchema,
  type IgnoredIdentifierListResponse,
} from "@/server/db/business-schemas/ignored-identifiers";
import {
  createIgnoredIdentifierService,
  listIgnoredIdentifiersService,
} from "@/server/services/ignored-identifiers.service";
import { buildPagination } from "@/app/api/data-intelligence/pagination";

export const GET = handleGetWithQueryAuth(
  IgnoredIdentifierQuerySchema,
  IgnoredIdentifierListResponseSchema,
  async (query, userId): Promise<IgnoredIdentifierListResponse> => {
    const { page, pageSize, kind, search, order } = query;

    const { items, total } = await listIgnoredIdentifiersService(userId, {
      kinds: kind,
      search,
      page,
      pageSize,
      order,
    });

    return {
      items,
      pagination: buildPagination(page, pageSize, total),
    };
  },
);

export const POST = handleAuth(
  CreateIgnoredIdentifierBodySchema,
  IgnoredIdentifierResponseSchema,
  async (data, userId) => {
    const item = await createIgnoredIdentifierService(userId, data);
    return { item };
  },
);
