import { z } from "zod";

import { handleAuthWithParams } from "@/lib/api";
import {
  IgnoredIdentifierResponseSchema,
  UpdateIgnoredIdentifierBodySchema,
  type IgnoredIdentifierResponse,
} from "@/server/db/business-schemas/ignored-identifiers";
import {
  deleteIgnoredIdentifierService,
  updateIgnoredIdentifierService,
} from "@/server/services/ignored-identifiers.service";

const ParamsSchema = z.object({
  identifierId: z.string().uuid(),
});

const DeleteResponseSchema = z.object({
  deleted: z.number(),
});

export const PATCH = handleAuthWithParams(
  UpdateIgnoredIdentifierBodySchema,
  IgnoredIdentifierResponseSchema,
  async (data, userId, params): Promise<IgnoredIdentifierResponse> => {
    const { identifierId } = ParamsSchema.parse(params);
    
    // Only pass defined properties (exactOptionalPropertyTypes requirement)
    const input: Parameters<typeof updateIgnoredIdentifierService>[2] = {};
    if (data.reason !== undefined) input.reason = data.reason;
    
    const item = await updateIgnoredIdentifierService(userId, identifierId, input);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params): Promise<{ deleted: number }> => {
    const { identifierId } = ParamsSchema.parse(params);
    return await deleteIgnoredIdentifierService(userId, identifierId);
  },
);
