import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

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

    console.warn(
      "[DEBUG] All cookies:",
      allCookies.map((c) => c.name),
    );
    console.warn(
      "[DEBUG] Supabase cookies:",
      supabaseCookies.map((c) => c.name),
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
    console.warn(
      "[DEBUG] Auth failed, cookies available:",
      allCookies.map((c) => c.name),
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
