import { z } from "zod";

import { handleAuthWithParams } from "@/lib/api";
import {
  RawEventResponseSchema,
  type RawEventResponse,
} from "@/server/db/business-schemas/raw-events";
import { getRawEventByIdService } from "@/server/services/raw-events.service";

const ParamsSchema = z.object({
  rawEventId: z.string().uuid(),
});

export const GET = handleAuthWithParams(
  z.void(),
  RawEventResponseSchema,
  async (_voidInput, userId, params): Promise<RawEventResponse> => {
    const { rawEventId } = ParamsSchema.parse(params);
    const item = await getRawEventByIdService(userId, rawEventId);
    // The response schema will validate and transform the data (e.g., null processingStatus -> "pending")
    return { item } as RawEventResponse;
  },
);
