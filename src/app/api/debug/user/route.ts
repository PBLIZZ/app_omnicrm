import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  try {
    // Debug: Show what cookies we have
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      (c) => c.name.includes("sb") || c.name.includes("supabase"),
    );

    logger.warn(
      "[DEBUG] All cookies",
      { cookieNames: allCookies.map((c) => c.name) },
      "api/debug/user/GET",
    );
    logger.warn(
      "[DEBUG] Supabase cookies",
      { cookieNames: supabaseCookies.map((c) => c.name) },
      "api/debug/user/GET",
    );

    const userId = await getServerUserId();
    return NextResponse.json({
      ok: true,
      userId,
      debug: {
        totalCookies: allCookies.length,
        supabaseCookies: supabaseCookies.length,
        cookieNames: allCookies.map((c) => c.name),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = (error as { status?: number })?.status || 500;

    // Debug info only in non-production environments
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    logger.warn(
      "[DEBUG] Auth failed, cookies available",
      { cookieNames: allCookies.map((c) => c.name) },
      "api/debug/user/GET",
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
        debug: {
          totalCookies: allCookies.length,
          cookieNames: allCookies.map((c) => c.name),
        },
      },
      { status },
    );
  }
}
