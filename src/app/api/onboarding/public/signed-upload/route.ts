import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";
import {
  isValidImageType,
  isValidFileSize,
  getOptimizedExtension,
} from "@/lib/utils/photo-validation";

// Validation schema for upload request
const UploadRequestSchema = z.object({
  token: z.string().min(1, "Token is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSize: z.number().int().min(1, "File size must be positive"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = (await req.json()) as unknown;
    const { token, mimeType, fileSize } = UploadRequestSchema.parse(body);

    // Validate image type and file size
    if (!isValidImageType(mimeType)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid image type. Supported types: JPEG, PNG, WebP, GIF",
        },
        { status: 400 },
      );
    }

    if (!isValidFileSize(fileSize)) {
      return NextResponse.json(
        {
          ok: false,
          error: "File size exceeds 512KB limit",
        },
        { status: 400 },
      );
    }

    // Validate environment variables
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseSecretKey = process.env["SUPABASE_SECRET_KEY"];

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error("Missing required environment variables for Supabase client");
      return NextResponse.json(
        {
          ok: false,
          error: "Server configuration error",
        },
        { status: 500 },
      );
    }

    // Create Supabase client with service role for admin operations
    const supabase = createClient<Database>(supabaseUrl, supabaseSecretKey);

    // Validate token and get associated user
    const { data: tokenData, error: tokenError } = await supabase
      .from("onboarding_tokens")
      .select("user_id, disabled, expires_at, used_count, max_uses")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid or expired token",
        },
        { status: 403 },
      );
    }

    // Check token validity
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (tokenData.disabled || now > expiresAt || tokenData.used_count >= tokenData.max_uses) {
      return NextResponse.json(
        {
          ok: false,
          error: "Token is disabled, expired, or exhausted",
        },
        { status: 403 },
      );
    }

    // Generate unique file path with optimized extension
    const userId = tokenData.user_id;
    const fileId = randomUUID();
    const extension = getOptimizedExtension(mimeType);
    const filePath = `client-photos/${userId}/${fileId}.${extension}`;

    // Generate signed upload URL
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("client-photos")
      .createSignedUploadUrl(filePath);

    if (uploadError) {
      console.error("Storage upload URL error:", uploadError);
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to generate upload URL",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        uploadUrl: uploadData.signedUrl,
        filePath,
        token: uploadData.token,
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

    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
