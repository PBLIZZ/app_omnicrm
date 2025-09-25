import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";
import { createRouteHandler } from "@/server/lib/middleware-handler";

// Validation schema for token generation request
const GenerateTokenSchema = z.object({
  hoursValid: z.number().int().min(1).max(168).default(72), // 1 hour to 1 week
  maxUses: z.number().int().min(1).max(10).default(1),
  label: z.string().min(1, "Label is required").max(100, "Label too long").optional(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "onboarding_generate_token" },
  validation: {
    body: GenerateTokenSchema,
  },
})(async ({ userId, validated }) => {
  try {
    const { hoursValid, maxUses, label } = validated.body;

    // Create Supabase client with service role for admin operations
    const supabase = createClient<Database>(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SECRET_KEY"]!,
    );

    // Generate secure token
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + hoursValid * 3600 * 1000);

    // Insert token into database
    const { data, error } = await supabase
      .from("onboarding_tokens")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        created_by: userId,
        label: label || null,
      })
      .select("token, expires_at, max_uses, created_at, label")
      .single();

    if (error) {
      console.error("Token creation error:", error);
      return NextResponse.json({ error: "Failed to create onboarding token" }, { status: 500 });
    }

    // Generate public URL
    const publicUrl = `${process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000"}/onboard/${token}`;

    // Debug: Log the actual data being returned
    console.log("API Response data:", {
      token: data.token,
      expires_at: data.expires_at,
      expires_at_type: typeof data.expires_at,
      max_uses: data.max_uses,
    });

    return NextResponse.json({
      token: data.token,
      onboardingUrl: publicUrl,
      expiresAt: data.expires_at,
      maxUses: data.max_uses,
      label: data.label,
    });
  } catch (error) {
    console.error("Generate token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
