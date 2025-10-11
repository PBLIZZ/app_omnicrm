import { z } from "zod";

import { handleAuthWithParams } from "@/lib/api";
import {
  ContactIdentityResponseSchema,
  UpdateContactIdentityBodySchema,
} from "@/server/db/business-schemas/contact-identities";
import {
  deleteContactIdentityService,
  updateContactIdentityService,
} from "@/server/services/contact-identities.service";

const ParamsSchema = z.object({
  identityId: z.string().uuid(),
});

const DeleteResponseSchema = z.object({
  deleted: z.number(),
});

export const PATCH = handleAuthWithParams(
  UpdateContactIdentityBodySchema,
  ContactIdentityResponseSchema,
  async (data, userId, params) => {
    const { identityId } = ParamsSchema.parse(params);
    const item = await updateContactIdentityService(userId, identityId, data);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params) => {
    const { identityId } = ParamsSchema.parse(params);
    return await deleteContactIdentityService(userId, identityId);
  },
);
