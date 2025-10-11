import { z } from "zod";

import { handleAuthWithParams } from "@/lib/api";
import {
  DocumentResponseSchema,
  UpdateDocumentBodySchema,
} from "@/server/db/business-schemas/documents";
import {
  deleteDocumentService,
  getDocumentByIdService,
  updateDocumentService,
} from "@/server/services/documents.service";

const ParamsSchema = z.object({
  documentId: z.string().uuid(),
});

const DeleteResponseSchema = z.object({
  deleted: z.number(),
});

export const GET = handleAuthWithParams(
  z.void(),
  DocumentResponseSchema,
  async (_voidInput, userId, params): Promise<{ item: z.infer<typeof DocumentResponseSchema>["item"] }> => {
    const { documentId } = ParamsSchema.parse(params);
    const item = await getDocumentByIdService(userId, documentId);
    return { item };
  },
);

export const PATCH = handleAuthWithParams(
  UpdateDocumentBodySchema,
  DocumentResponseSchema,
  async (data, userId, params): Promise<{ item: z.infer<typeof DocumentResponseSchema>["item"] }> => {
    const { documentId } = ParamsSchema.parse(params);
    const updatePayload = {
      ...(data.ownerContactId !== undefined && { ownerContactId: data.ownerContactId ?? null }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.text !== undefined && { text: data.text }),
      ...(data.mime !== undefined && { mime: data.mime }),
      ...(data.meta !== undefined && { meta: data.meta }),
    };
    const item = await updateDocumentService(userId, documentId, updatePayload);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params): Promise<{ deleted: number }> => {
    const { documentId } = ParamsSchema.parse(params);
    return await deleteDocumentService(userId, documentId);
  },
);
