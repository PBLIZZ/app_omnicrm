import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignedUploadService } from "@/server/services/signed-upload.service";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = (await req.json()) as unknown;
    const uploadData = SignedUploadService.validateUploadRequest(body);

    // Process signed upload using service
    const result = await SignedUploadService.processSignedUpload(uploadData);

    return NextResponse.json({
      ok: true,
      data: {
        uploadUrl: result.uploadUrl,
        filePath: result.filePath,
        token: result.token,
      },
    });
  } catch (error) {
    console.error("Signed upload error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request data",
          details: error.message,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      // Handle specific service errors
      if (error.message.includes("Invalid image type") ||
          error.message.includes("File size exceeds") ||
          error.message.includes("Invalid token") ||
          error.message.includes("Token not found") ||
          error.message.includes("Token is disabled") ||
          error.message.includes("Token has expired") ||
          error.message.includes("Token usage limit exceeded")) {
        return NextResponse.json(
          {
            ok: false,
            error: error.message,
          },
          { status: 403 },
        );
      }

      if (error.message.includes("Failed to generate upload URL")) {
        return NextResponse.json(
          {
            ok: false,
            error: error.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
