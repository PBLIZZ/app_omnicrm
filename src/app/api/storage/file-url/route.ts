import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/db/supabase/server";
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError } from "@/server/api/response";
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

  try {
    const { filePath } = validated.query;

    // If already an absolute URL (e.g., public or already signed), just echo it back
    if (/^https?:\/\//i.test(filePath)) {
      return NextResponse.json({ signedUrl: filePath });
    }

    // Expected format: bucket/path/to/file.ext
    const normalized = filePath.replace(/^\/+/, "");
    const [bucket, ...rest] = normalized.split("/");
    const pathInBucket = rest.join("/");

    if (!bucket || !pathInBucket) {
      return apiError("filePath must be of the form 'bucket/path/to/file'", "VALIDATION_ERROR");
    }

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      return NextResponse.json({ error: "Supabase client unavailable on server" }, { status: 500 });
    }

    const { data, error } = await client.storage.from(bucket).createSignedUrl(pathInBucket, 3600);
    if (error) {
      return NextResponse.json({ error: "failed_to_create_signed_url" }, { status: 500 });
    }
    return NextResponse.json({ signedUrl: data?.signedUrl ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
});
