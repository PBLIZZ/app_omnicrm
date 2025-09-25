import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";

// Validation schema for access tracking
const TrackAccessSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = (await req.json()) as unknown;
    const { token } = TrackAccessSchema.parse(body);

    // Get client IP for tracking
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    let ip = "unknown";
    if (forwardedFor) {
      const ips = forwardedFor
        .split(",")
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);
      if (ips.length > 0) {
        ip = ips[0]!;
      }
    } else if (realIp) {
      ip = realIp.trim();
    }

    // Clean up IP address
    const _ip = ip.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
    const _userAgent = req.headers.get("user-agent") || "unknown";

    // Create Supabase client with service role for admin operations
    const supabase = createClient<Database>(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );

    // Update access tracking for the token
    const { error: updateError } = await supabase
      .from("onboarding_tokens")
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq("token", token)
      .eq("disabled", false);

    if (updateError) {
      console.error("Failed to update last_accessed_at:", updateError);
    }

    // Increment access count using RPC
    const { error: rpcError } = await supabase.rpc("increment_access_count", {
      token_value: token,
    });

    if (rpcError) {
      console.error("Failed to increment access count:", rpcError);
    }

    // Don't fail the request if tracking fails - just log the errors

    return NextResponse.json({
      ok: true,
      message: "Access tracked",
    });
  } catch (error) {
    console.error("Track access error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request data",
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
