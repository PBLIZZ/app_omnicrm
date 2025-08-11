import { google } from "googleapis";
import { getDb } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { userIntegrations } from "@/server/db/schema";
import { decryptString, encryptString, isEncrypted } from "@/server/lib/crypto";
import type { GmailClient } from "./gmail";
import type { CalendarClient } from "./calendar";

export type GoogleApisClients = {
  oauth2: InstanceType<typeof google.auth.OAuth2>;
  gmail: GmailClient;
  calendar: CalendarClient;
};

// Factories with precise return types for DI consumers/tests
export function makeGmailClient(auth: InstanceType<typeof google.auth.OAuth2>): GmailClient {
  return google.gmail({ version: "v1", auth });
}

export function makeCalendarClient(auth: InstanceType<typeof google.auth.OAuth2>): CalendarClient {
  return google.calendar({ version: "v3", auth });
}

export async function getGoogleClients(userId: string): Promise<GoogleApisClients> {
  const dbo = await getDb();
  const rows = await dbo
    .select()
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error("google_not_connected"), { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_REDIRECT_URI"]!,
  );

  // Decrypt and backfill if previously stored in plaintext
  const decryptedAccess = isEncrypted(row.accessToken)
    ? decryptString(row.accessToken)
    : row.accessToken;
  const decryptedRefresh = row.refreshToken
    ? isEncrypted(row.refreshToken)
      ? decryptString(row.refreshToken)
      : row.refreshToken
    : null;

  // Backfill encryption once read
  if (!isEncrypted(row.accessToken) || (row.refreshToken && !isEncrypted(row.refreshToken))) {
    await dbo
      .update(userIntegrations)
      .set({
        accessToken: isEncrypted(row.accessToken)
          ? row.accessToken
          : encryptString(decryptedAccess),
        refreshToken:
          row.refreshToken == null
            ? null
            : isEncrypted(row.refreshToken)
              ? row.refreshToken
              : encryptString(decryptedRefresh as string),
        updatedAt: new Date(),
      })
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")));
  }

  oauth2Client.setCredentials({
    access_token: decryptedAccess,
    refresh_token: decryptedRefresh,
    expiry_date: row.expiryDate ? row.expiryDate.getTime() : null,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (!(tokens.access_token || tokens.refresh_token)) return;
    const dbo = await getDb();
    await dbo
      .update(userIntegrations)
      .set({
        accessToken:
          tokens.access_token != null ? encryptString(tokens.access_token) : row.accessToken,
        refreshToken:
          tokens.refresh_token != null ? encryptString(tokens.refresh_token) : row.refreshToken,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : row.expiryDate,
        updatedAt: new Date(),
      })
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")));
  });

  return {
    oauth2: oauth2Client,
    gmail: makeGmailClient(oauth2Client),
    calendar: makeCalendarClient(oauth2Client),
  };
}

// Back-compat helper with old name
export async function getGoogleClient(
  userId: string,
): Promise<Pick<GoogleApisClients, "gmail" | "calendar">> {
  const { gmail, calendar } = await getGoogleClients(userId);
  return { gmail, calendar };
}
