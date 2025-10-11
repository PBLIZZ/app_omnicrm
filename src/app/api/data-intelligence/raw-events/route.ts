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

    const { items, total } = await listRawEventsService(userId, {
      provider,
      processingStatus,
      contactExtractionStatus,
      createdAfter,
      createdBefore,
      page,
      pageSize,
      order,
      sort,
      batchId,
    });

    return {
      items,
      pagination: buildPagination(page, pageSize, total),
    };
  },
);
