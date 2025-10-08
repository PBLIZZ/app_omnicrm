import { z } from "zod";

import { handleAuthWithParams } from "@/lib/api";
import {
  ContactIdentityResponseSchema,
  UpdateContactIdentityBodySchema,
} from "@/server/db/business-schemas/contact-identities";
import {
  deleteContactIdentityService,
  updateContactIdentityService,
  type UpdateContactIdentityInput,
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
  async (data, userId, params): Promise<{ item: z.infer<typeof ContactIdentityResponseSchema>["item"] }> => {
    const { identityId } = ParamsSchema.parse(params);
    const updatePayload: UpdateContactIdentityInput = {};
    if (data.kind !== undefined) updatePayload.kind = data.kind as "email" | "phone" | "handle" | "provider_id";
    if (data.value !== undefined) updatePayload.value = data.value;
    if (data.provider !== undefined) updatePayload.provider = data.provider ?? null;
    const item = await updateContactIdentityService(userId, identityId, updatePayload);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params): Promise<{ deleted: number }> => {
    const { identityId } = ParamsSchema.parse(params);
    return await deleteContactIdentityService(userId, identityId);
  },
);
