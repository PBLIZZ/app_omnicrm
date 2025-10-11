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
  async (_voidInput, userId, params) => {
    const { documentId } = ParamsSchema.parse(params);
    const item = await getDocumentByIdService(userId, documentId);
    return { item };
  },
);

export const PATCH = handleAuthWithParams(
  UpdateDocumentBodySchema,
  DocumentResponseSchema,
  async (data, userId, params) => {
    const { documentId } = ParamsSchema.parse(params);
    const item = await updateDocumentService(userId, documentId, data);
    return { item };
  },
);

export const DELETE = handleAuthWithParams(
  z.void(),
  DeleteResponseSchema,
  async (_voidInput, userId, params) => {
    const { documentId } = ParamsSchema.parse(params);
    return await deleteDocumentService(userId, documentId);
  },
);
