import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";
import { jwtVerify } from "jose";

interface RouteParams {
  params: {
    tokenId: string;
  };
}

// Delete a specific token
export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { tokenId } = params;

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID is required" }, { status: 400 });
    }

    // Validate environment variables
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
    const supabaseJwtSecret = process.env["SUPABASE_JWT_SECRET"];

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing required environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Create Supabase client with anon key for user-scoped operations
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

    // Get user from session with proper JWT validation
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify JWT token with proper validation
    if (!supabaseJwtSecret) {
      console.error("Missing SUPABASE_JWT_SECRET for JWT verification");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    try {
      const secret = new TextEncoder().encode(supabaseJwtSecret);
      const { payload } = await jwtVerify(token, secret, {
        issuer: "https://supabase.io/auth",
        audience: "authenticated",
      });

      const userId = payload.sub;
      if (!userId) {
        return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
      }

      // Verify user exists
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (authError || !user || user.id !== userId) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }

      // Delete the token (only if it belongs to the user) - use select to get deleted rows
      const { data: deletedRows, error: deleteError } = await supabase
        .from("onboarding_tokens")
        .delete()
        .eq("id", tokenId)
        .eq("user_id", user.id)
        .select();

      if (deleteError) {
        console.error("Database error:", deleteError);
        return NextResponse.json({ error: "Failed to delete token" }, { status: 500 });
      }

      if (!deletedRows || deletedRows.length === 0) {
        return NextResponse.json({ error: "Token not found" }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        message: "Token deleted successfully",
      });
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
  } catch (error) {
    console.error("Delete token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
