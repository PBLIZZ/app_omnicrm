import type { NextRequest } from "next/server";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/supabase";
import { ok, err } from "@/server/lib/http";

// GET /api/storage/file-url?filePath=<bucket/path/to/file>
// Returns: { signedUrl: string | null }
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("filePath")?.trim();

    if (!filePath) {
      return err(400, "filePath query param is required");
    }

    // If already an absolute URL (e.g., public or already signed), just echo it back
    if (/^https?:\/\//i.test(filePath)) {
      return ok({ signedUrl: filePath });
    }

    // Expected format: bucket/path/to/file.ext
    const normalized = filePath.replace(/^\/+/, "");
    const [bucket, ...rest] = normalized.split("/");
    const pathInBucket = rest.join("/");

    if (!bucket || !pathInBucket) {
      return err(400, "filePath must be of the form 'bucket/path/to/file'");
    }

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      return err(500, "Supabase client unavailable on server");
    }

    const { data, error } = await client.storage.from(bucket).createSignedUrl(pathInBucket, 3600);
    if (error) {
      return err(500, "failed_to_create_signed_url", { details: error.message });
    }
    return ok({ signedUrl: data?.signedUrl ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return err(500, "unexpected_error", { details: message });
  }
}
