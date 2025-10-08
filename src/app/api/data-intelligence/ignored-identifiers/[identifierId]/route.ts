import { z } from "zod";

import { handleAuthWithParams } from "@/lib/api";
import {
  IgnoredIdentifierResponseSchema,
  UpdateIgnoredIdentifierBodySchema,
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
  async (data, userId, params) => {
    const { identifierId } = ParamsSchema.parse(params);
    const item = await updateIgnoredIdentifierService(userId, identifierId, data);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params) => {
    const { identifierId } = ParamsSchema.parse(params);
    return await deleteIgnoredIdentifierService(userId, identifierId);
  },
);
