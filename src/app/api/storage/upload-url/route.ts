import { NextRequest } from "next/server";
import { supabaseServerAdmin, supabaseServerPublishable } from "@/server/supabase";
import { ok, err } from "@/server/lib/http";

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
      return err(400, "invalid_request", { details: "fileName and contentType are required" });
    }

    const path = folderPath ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${fileName}` : fileName;

    const client = supabaseServerAdmin ?? supabaseServerPublishable;
    if (!client) {
      return err(500, "supabase_unavailable", { details: "Supabase server client not available" });
    }

    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);

    if (error) {
      return err(500, "failed_to_create_signed_upload_url", { details: error.message });
    }

    return ok({ signedUrl: data?.signedUrl ?? null, path });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return err(500, "unexpected_error", { details: message });
  }
}
