import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { StorageService } from "@/server/services/storage.service";
import { z } from "zod";

const querySchema = z.object({
  filePath: z.string().min(1),
});

// GET /api/storage/file-url?filePath=<bucket/path/to/file>
// Returns: { signedUrl: string | null }
export const GET = createRouteHandler({
  rateLimit: { operation: "storage_file_url" },
  validation: { query: querySchema },
})(async ({ validated }) => {
  const { filePath } = validated.query;

  const result = await StorageService.getFileSignedUrl(filePath);

  if (result.error) {
    const statusCode = result.error === "filePath must be of the form 'bucket/path/to/file'" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status: statusCode });
  }

  return NextResponse.json({ signedUrl: result.signedUrl });
});
