import { handlePublic } from "@/lib/api-edge-cases";
import { SignedUploadService } from "@/server/services/signed-upload.service";
import { SignedUploadRequestSchema, SignedUploadResponseSchema } from "@/server/db/business-schemas";

export const POST = handlePublic(
  SignedUploadRequestSchema,
  SignedUploadResponseSchema,
  async (uploadData) => {
    // Process signed upload using service
    const result = await SignedUploadService.processSignedUpload(uploadData);

    return {
      uploadUrl: result.uploadUrl,
      filePath: result.filePath,
      token: result.token,
    };
  }
);
