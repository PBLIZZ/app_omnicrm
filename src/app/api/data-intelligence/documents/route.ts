import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  CreateDocumentBodySchema,
  DocumentListResponseSchema,
  DocumentQuerySchema,
  DocumentResponseSchema,
  type DocumentListResponse,
} from "@/server/db/business-schemas/documents";
import {
  createDocumentService,
  listDocumentsService,
} from "@/server/services/documents.service";
import { buildPagination } from "@/app/api/data-intelligence/pagination";

export const GET = handleGetWithQueryAuth(
  DocumentQuerySchema,
  DocumentListResponseSchema,
  async (query, userId): Promise<DocumentListResponse> => {
    const { page, pageSize, order, ownerContactId, search, mime } = query;

    const { items, total } = await listDocumentsService(userId, {
      ownerContactId,
      mimeTypes: mime,
      search,
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
  CreateDocumentBodySchema,
  DocumentResponseSchema,
  async (data, userId) => {
    const item = await createDocumentService(userId, data);
    return { item };
  },
);
