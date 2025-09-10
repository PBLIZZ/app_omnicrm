import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { z } from "zod";

const querySchema = z.object({
  filePath: z.string().min(1),
});

// GET /api/storage/file-url?filePath=<bucket/path/to/file>
// Returns: { signedUrl: string | null }
export const GET = createRouteHandler({
  rateLimit: { operation: "storage_file_url" },
  validation: { query: querySchema },
})(async ({ validated, requestId }) => {
  const api = new ApiResponseBuilder("storage.file_url", requestId);

  try {
    const { filePath } = validated.query;

    // If already an absolute URL (e.g., public or already signed), just echo it back
    if (/^https?:\/\//i.test(filePath)) {
      return api.success({ signedUrl: filePath });
    }

    // Expected format: bucket/path/to/file.ext
    const normalized = filePath.replace(/^\/+/, "");
    const [bucket, ...rest] = normalized.split("/");
    const pathInBucket = rest.join("/");

    if (!bucket || !pathInBucket) {
      return api.error("filePath must be of the form 'bucket/path/to/file'", "VALIDATION_ERROR");
    }

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      return api.error("Supabase client unavailable on server", "INTERNAL_ERROR");
    }

    const { data, error } = await client.storage.from(bucket).createSignedUrl(pathInBucket, 3600);
    if (error) {
      return api.error("failed_to_create_signed_url", "INTERNAL_ERROR", { details: error.message });
    }
    return api.success({ signedUrl: data?.signedUrl ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return api.error(
      "unexpected_error",
      "INTERNAL_ERROR",
      { details: message },
      error instanceof Error ? error : undefined,
    );
  }
});
