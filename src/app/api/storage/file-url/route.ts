import type { NextRequest } from "next/server";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/supabase";

// GET /api/storage/file-url?filePath=<bucket/path/to/file>
// Returns: { signedUrl: string | null }
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("filePath")?.trim();

    if (!filePath) {
      return Response.json({ error: "filePath query param is required" }, { status: 400 });
    }

    // If already an absolute URL (e.g., public or already signed), just echo it back
    if (/^https?:\/\//i.test(filePath)) {
      return Response.json({ signedUrl: filePath }, { status: 200 });
    }

    // Expected format: bucket/path/to/file.ext
    const normalized = filePath.replace(/^\/+/, "");
    const [bucket, ...rest] = normalized.split("/");
    const pathInBucket = rest.join("/");

    if (!bucket || !pathInBucket) {
      return Response.json(
        { error: "filePath must be of the form 'bucket/path/to/file'" },
        { status: 400 },
      );
    }

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      return Response.json({ error: "Supabase client unavailable on server" }, { status: 500 });
    }

    const { data, error } = await client.storage.from(bucket).createSignedUrl(pathInBucket, 3600);
    if (error) {
      return Response.json(
        { error: "failed_to_create_signed_url", details: error.message },
        { status: 500 },
      );
    }
    return Response.json({ signedUrl: data?.signedUrl ?? null });
  } catch (err) {
    return Response.json(
      { error: "unexpected_error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
