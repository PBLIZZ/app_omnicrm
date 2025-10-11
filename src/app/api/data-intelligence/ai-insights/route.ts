import { z } from "zod";

import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  AiInsightResponseSchema,
  AiInsightsListResponseSchema,
  AiInsightsQuerySchema,
  CreateAiInsightBodySchema,
  type AiInsightsListResponse,
} from "@/server/db/business-schemas/ai-insights";
import {
  createAiInsightService,
  listAiInsightsService,
} from "@/server/services/ai-insights.service";
import { buildPagination } from "@/app/api/data-intelligence/pagination";

export const GET = handleGetWithQueryAuth(
  AiInsightsQuerySchema,
  AiInsightsListResponseSchema,
  async (query, userId): Promise<AiInsightsListResponse> => {
    const { page, pageSize, subjectType, subjectId, kind, search, order } = query;

    const { items, total } = await listAiInsightsService(userId, {
      ...(subjectType && { subjectType }),
      ...(subjectId && { subjectId }),
      ...(kind && { kinds: kind }),
      ...(search && { search }),
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
  CreateAiInsightBodySchema,
  AiInsightResponseSchema,
  async (data, userId): Promise<{ item: z.infer<typeof AiInsightResponseSchema>["item"] }> => {
    const item = await createAiInsightService(userId, {
      subjectType: data.subjectType,
      kind: data.kind,
      content: data.content,
      ...(data.subjectId && { subjectId: data.subjectId }),
      ...(data.model && { model: data.model }),
      ...(data.fingerprint && { fingerprint: data.fingerprint }),
    });
    return { item };
  },
);
