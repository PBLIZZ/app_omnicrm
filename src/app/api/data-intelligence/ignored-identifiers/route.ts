import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  CreateIgnoredIdentifierBodySchema,
  IgnoredIdentifierListResponseSchema,
  IgnoredIdentifierQuerySchema,
  IgnoredIdentifierResponseSchema,
  type IgnoredIdentifierListResponse,
  type IgnoredIdentifierResponse,
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

    const params: Parameters<typeof listIgnoredIdentifiersService>[1] = {
      page,
      pageSize,
      order,
    };

    // Only add optional properties if defined (exactOptionalPropertyTypes requirement)
    if (kind !== undefined) params.kinds = kind;
    if (search !== undefined) params.search = search;

    const { items, total } = await listIgnoredIdentifiersService(userId, params);

    return {
      items,
      pagination: buildPagination(page, pageSize, total),
    };
  },
);

export const POST = handleAuth(
  CreateIgnoredIdentifierBodySchema,
  IgnoredIdentifierResponseSchema,
  async (data, userId): Promise<IgnoredIdentifierResponse> => {
    const input = {
      kind: data.kind,
      value: data.value,
      ...(data.reason !== undefined && { reason: data.reason }),
    };
    const item = await createIgnoredIdentifierService(userId, input);
    return { item };
  },
);
