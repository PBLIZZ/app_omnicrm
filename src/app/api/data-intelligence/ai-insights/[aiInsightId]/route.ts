import { z } from "zod";

import { handleAuthWithParams } from "@/lib/api";
import {
  AiInsightResponseSchema,
  UpdateAiInsightBodySchema,
} from "@/server/db/business-schemas/ai-insights";
import {
  deleteAiInsightService,
  getAiInsightByIdService,
  updateAiInsightService,
} from "@/server/services/ai-insights.service";

const ParamsSchema = z.object({
  aiInsightId: z.string().uuid(),
});

const DeleteResponseSchema = z.object({
  deleted: z.number(),
});

export const GET = handleAuthWithParams(
  z.void(),
  AiInsightResponseSchema,
  async (_voidInput, userId, params) => {
    const { aiInsightId } = ParamsSchema.parse(params);
    const item = await getAiInsightByIdService(userId, aiInsightId);
    return { item };
  },
);

export const PATCH = handleAuthWithParams(
  UpdateAiInsightBodySchema,
  AiInsightResponseSchema,
  async (data, userId, params) => {
    const { aiInsightId } = ParamsSchema.parse(params);
    const item = await updateAiInsightService(userId, aiInsightId, data);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params) => {
    const { aiInsightId } = ParamsSchema.parse(params);
    return await deleteAiInsightService(userId, aiInsightId);
  },
);
