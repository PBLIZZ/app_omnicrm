import { NextResponse } from "next/server";
import { google } from "googleapis";
import { logSync } from "@/server/sync/audit";
import { getServerUserId } from "@/server/auth/user";

// GET /api/google/oauth?scope=gmail|calendar
export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e) {
    const status = (e as any)?.status ?? 401;
    return NextResponse.json({ error: (e as any)?.message ?? "Unauthorized" }, { status });
  }

  const scopeParam = new URL(req.url).searchParams.get("scope");
  if (!scopeParam || !["gmail", "calendar"].includes(scopeParam)) {
    return NextResponse.json({ error: "invalid scope" }, { status: 400 });
  }

  const scopes =
    scopeParam === "gmail"
      ? ["https://www.googleapis.com/auth/gmail.readonly"]
      : ["https://www.googleapis.com/auth/calendar.readonly"];

  const oauth2 = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_REDIRECT_URI"]!,
  );

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: scopes,
    state: JSON.stringify({ userId, scope: scopeParam }),
  });

  await logSync(userId, scopeParam as any, "preview", { step: "oauth_init" });
  return NextResponse.redirect(url);
}
