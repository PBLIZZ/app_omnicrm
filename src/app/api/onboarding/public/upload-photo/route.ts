import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import { optimizePhoto, validatePhotoFile, getOptimizedExtension } from "@/lib/utils/photo-optimization";
import { OnboardingRepository } from "@repo";

const MAX_FILE_SIZE = 512 * 1024; // 512KB

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * POST /api/onboarding/public/upload-photo
 *
 * Handles photo upload for onboarding form:
 * 1. Validates onboarding token
 * 2. Receives raw image file (up to 512KB)
 * 3. Optimizes to WebP (~10KB target)
 * 4. Uploads to Supabase Storage
 * 5. Returns file path for database storage
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File;

    if (!token || !file) {
      return NextResponse.json(
        { error: "Missing token or file" },
        { status: 400 }
      );
    }

    // Validate token using repository
    console.log("[upload-photo] Validating token:", token.substring(0, 10) + "...");
    const tokenResult = await OnboardingRepository.validateToken(token);

    console.log("[upload-photo] Token validation result:", {
      success: tokenResult.success,
      hasData: !!tokenResult.data,
      error: tokenResult.error,
    });

    if (!tokenResult.success) {
      console.error("[upload-photo] Token validation failed:", tokenResult.error);
      return NextResponse.json(
        { error: tokenResult.error?.message || "Invalid token" },
        { status: 400 }
      );
    }

    const validation = tokenResult.data;
    console.log("[upload-photo] Validation data:", {
      isValid: validation?.isValid,
      hasUserId: !!validation?.token?.userId,
      error: validation?.error,
    });

    if (!validation?.isValid || !validation.token?.userId) {
      console.error("[upload-photo] Token not valid or missing userId:", validation);
      return NextResponse.json(
        { error: validation?.error || "Invalid token" },
        { status: 400 }
      );
    }

    const userId = validation.token.userId;

    // Validate file type and size
    const fileValidation = validatePhotoFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024}KB limit` },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer for Sharp
    const arrayBuffer = await file.arrayBuffer();

    // Optimize photo to WebP (~10KB)
    const optimizedBuffer = await optimizePhoto(arrayBuffer);

    // Generate file path
    const fileId = randomUUID();
    const timestamp = Date.now();
    const extension = getOptimizedExtension(file.type);
    const filePath = `${userId}/${timestamp}-${fileId}.${extension}`;

    // Upload to Supabase Storage
    const supabase = createClient<Database>(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SECRET_KEY")
    );

    const { error: uploadError } = await supabase.storage
      .from("client-photos")
      .upload(filePath, optimizedBuffer, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload photo to storage" },
        { status: 500 }
      );
    }

    // Return the file path and metadata (will be saved to contacts.photo_url)
    // Note: We return the FULL path including bucket name (client-photos/userId/file.webp)
    // This is what gets stored in contacts.photo_url in the database
    // The StorageService expects this format: bucket/path/to/file
    return NextResponse.json({
      success: true,
      filePath: `client-photos/${filePath}`,
      fileSize: optimizedBuffer.length,
      originalSize: arrayBuffer.byteLength,
      message: "Photo uploaded and optimized successfully",
    });

  } catch (error) {
    console.error("Photo upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
