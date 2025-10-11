// ===== src/app/api/storage/file-url/route.ts =====
import { handleGetWithQueryAuth } from "@/lib/api";
import { StorageService } from "@/server/services/storage.service";
import {
  FileUrlQuerySchema,
  FileUrlResponseSchema,
  type FileUrlResponse,
} from "@/server/db/business-schemas/storage";

export const GET = handleGetWithQueryAuth(
  FileUrlQuerySchema,
  FileUrlResponseSchema,
  async (query): Promise<FileUrlResponse> => {
    const result = await StorageService.getFileSignedUrl(query.filePath);
    return { signedUrl: result.signedUrl };
  },
);
