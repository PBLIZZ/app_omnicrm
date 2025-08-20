import { NextRequest } from "next/server";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/supabase";

// POST /api/storage/upload-url
// Body: { fileName: string; contentType: string; folderPath?: string; bucket?: string }
// Returns: { signedUrl: string | null; path: string; error?: string; details?: string }
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body: unknown = await req.json().catch(() => ({}));

    // Type guard for request body
    const isValidBody = (
      obj: unknown,
    ): obj is {
      fileName?: string;
      contentType?: string;
      folderPath?: string;
      bucket?: string;
    } => {
      return typeof obj === "object" && obj !== null;
    };

    const validBody = isValidBody(body) ? body : {};
    const fileName = typeof validBody.fileName === "string" ? validBody.fileName.trim() : "";
    const contentType =
      typeof validBody.contentType === "string" ? validBody.contentType.trim() : "";
    const folderPath = typeof validBody.folderPath === "string" ? validBody.folderPath.trim() : "";
    const bucket = typeof validBody.bucket === "string" ? validBody.bucket.trim() : "contacts";

    if (!fileName || !contentType) {
      return Response.json(
        { error: "invalid_request", details: "fileName and contentType are required" },
        { status: 400 },
      );
    }

    const path = folderPath ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${fileName}` : fileName;

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      return Response.json(
        { error: "supabase_unavailable", details: "Supabase server client not available" },
        { status: 500 },
      );
    }

    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);

    if (error) {
      return Response.json(
        { error: "failed_to_create_signed_upload_url", details: error.message },
        { status: 500 },
      );
    }

    return Response.json({ signedUrl: data?.signedUrl ?? null, path });
  } catch (err) {
    return Response.json(
      { error: "unexpected_error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
