import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";
import { createRouteHandler } from "@/server/lib/middleware-handler";

// Get all tokens for the authenticated user
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "admin_tokens_list" },
})(async ({ userId, requestId }, req: NextRequest) => {
  try {
    // Validate environment variables
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseSecretKey = process.env["SUPABASE_SECRET_KEY"];

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error("Missing required environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Create Supabase client with service role for admin operations
    const supabase = createClient<Database>(supabaseUrl!, supabaseSecretKey!);

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    // Validate and set safe defaults
    const limit = Math.min(
      Math.max(parseInt(limitParam || "20", 10) || 20, 1),
      100, // max limit
    );
    const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

    // Fetch tokens for the user with validated parameters
    const { data: tokens, error } = await supabase
      .from("onboarding_tokens")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        limit,
        offset,
        requestId,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch tokens",
          code: "DATABASE_ERROR",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tokens: tokens || [],
    });
  } catch (error) {
    console.error("Get tokens error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
