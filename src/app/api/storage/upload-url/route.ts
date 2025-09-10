import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  folderPath: z.string().optional(),
  bucket: z.string().default("contacts"),
});

// POST /api/storage/upload-url
// Body: { fileName: string; contentType: string; folderPath?: string; bucket?: string }
// Returns: { signedUrl: string | null; path: string; error?: string; details?: string }
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "storage_upload_url" },
  validation: {
    body: uploadUrlSchema,
  },
})(async ({ validated, requestId }) => {
  const api = new ApiResponseBuilder("storage.upload_url", requestId);

  try {
    const { fileName, folderPath, bucket } = validated.body;

    const path = folderPath ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${fileName}` : fileName;

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      return api.error("Supabase server client not available", "INTERNAL_ERROR");
    }

    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);

    if (error) {
      return api.error("Failed to create signed upload URL", "INTERNAL_ERROR", {
        details: error.message,
      });
    }

    return api.success({ signedUrl: data?.signedUrl ?? null, path });
  } catch (error: unknown) {
    return api.error(
      "Unexpected error creating upload URL",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
