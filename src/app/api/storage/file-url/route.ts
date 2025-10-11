import { handleGetWithQueryAuth } from "@/lib/api";
import { StorageService } from "@/server/services/storage.service";
import {
  FileUrlQuerySchema,
  FileUrlResponseSchema,
} from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(
  FileUrlQuerySchema,
  FileUrlResponseSchema,
  async (query, userId) => {
    const { filePath } = query;

    const result = await StorageService.getFileSignedUrl(filePath);

    if (result.error) {
      throw new Error(result.error);
    }

    return { signedUrl: result.signedUrl };
  }
);
