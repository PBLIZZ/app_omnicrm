import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { logSync } from "@/server/sync/audit";
import { and, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  if (!code || !stateRaw)
    return NextResponse.json({ error: "missing code/state" }, { status: 400 });
  const state = JSON.parse(stateRaw);
  const userId: string = state.userId;

  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_REDIRECT_URI"]!,
  );

  const { tokens } = await oauth2Client.getToken(code);
  const accessToken = tokens.access_token!;
  const refreshToken = tokens.refresh_token ?? null;
  const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  // upsert by (userId, provider)
  const exists = await db
    .select()
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")))
    .limit(1);

  if (exists[0]) {
    await db
      .update(userIntegrations)
      .set({
        accessToken,
        refreshToken: refreshToken ?? exists[0].refreshToken,
        expiryDate,
        updatedAt: new Date(),
      })
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")));
  } else {
    await db.insert(userIntegrations).values({
      userId,
      provider: "google",
      accessToken,
      refreshToken,
      expiryDate,
    });
  }

  await logSync(userId, state.scope, "approve", { grantedScopes: tokens.scope });

  return NextResponse.redirect(new URL("/settings/sync?connected=google", req.url));
}
