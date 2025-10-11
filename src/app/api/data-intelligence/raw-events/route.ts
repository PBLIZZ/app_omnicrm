import { handleGetWithQueryAuth } from "@/lib/api";
import {
  RawEventListResponseSchema,
  RawEventQuerySchema,
  type RawEventListResponse,
} from "@/server/db/business-schemas/raw-events";
import { listRawEventsService } from "@/server/services/raw-events.service";
import { buildPagination } from "@/app/api/data-intelligence/pagination";

export const GET = handleGetWithQueryAuth(
  RawEventQuerySchema,
  RawEventListResponseSchema,
  async (query, userId): Promise<RawEventListResponse> => {
    const {
      page,
      pageSize,
      provider,
      processingStatus,
      contactExtractionStatus,
      createdAfter,
      createdBefore,
      order,
      sort,
      batchId,
    } = query;

    const params: Parameters<typeof listRawEventsService>[1] = {
      page,
      pageSize,
      order,
      sort,
    };
    
    // Only add optional properties if they are defined (exactOptionalPropertyTypes requirement)
    if (provider !== undefined) params.provider = provider;
    if (processingStatus !== undefined) params.processingStatus = processingStatus;
    if (contactExtractionStatus !== undefined) params.contactExtractionStatus = contactExtractionStatus;
    if (createdAfter !== undefined) params.createdAfter = createdAfter;
    if (createdBefore !== undefined) params.createdBefore = createdBefore;
    if (batchId !== undefined) params.batchId = batchId;

    const { items, total } = await listRawEventsService(userId, params);

    return {
      items,
      pagination: buildPagination(page, pageSize, total),
    };
  },
);
