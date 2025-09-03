import { google } from "googleapis";
import { getDb } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { userIntegrations } from "@/server/db/schema";
import { decryptString, encryptString, isEncrypted } from "@/lib/crypto";
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
    .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")));

  if (!rows || rows.length === 0) {
    throw Object.assign(new Error("google_not_connected"), { status: 401 });
  }

  function buildOAuthFromRow(
    r: typeof userIntegrations.$inferSelect,
  ): InstanceType<typeof google.auth.OAuth2> {
    const auth = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"]!,
      process.env["GOOGLE_CLIENT_SECRET"]!,
    );

    // Decrypt and backfill if previously stored in plaintext
    const decryptedAccess = isEncrypted(r.accessToken)
      ? decryptString(r.accessToken)
      : r.accessToken;
    const decryptedRefresh = r.refreshToken
      ? isEncrypted(r.refreshToken)
        ? decryptString(r.refreshToken)
        : r.refreshToken
      : null;

    // Backfill encryption once read (row-scoped)
    if (!isEncrypted(r.accessToken) || (r.refreshToken && !isEncrypted(r.refreshToken))) {
      void dbo
        .update(userIntegrations)
        .set({
          accessToken: isEncrypted(r.accessToken) ? r.accessToken : encryptString(decryptedAccess),
          refreshToken:
            r.refreshToken == null
              ? null
              : isEncrypted(r.refreshToken)
                ? r.refreshToken
                : encryptString(decryptedRefresh as string),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, r.service),
          ),
        );
    }

    auth.setCredentials({
      access_token: decryptedAccess,
      refresh_token: decryptedRefresh,
      expiry_date: r.expiryDate ? r.expiryDate.getTime() : null,
    });

    auth.on("tokens", async (tokens) => {
      if (!(tokens.access_token || tokens.refresh_token)) return;
      const dboInner = await getDb();
      await dboInner
        .update(userIntegrations)
        .set({
          accessToken:
            tokens.access_token != null ? encryptString(tokens.access_token) : r.accessToken,
          refreshToken:
            tokens.refresh_token != null ? encryptString(tokens.refresh_token) : r.refreshToken,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : r.expiryDate,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, r.service),
          ),
        );
    });

    return auth;
  }

  function selectServiceRowOrFallback(
    service: "gmail" | "calendar",
  ): typeof userIntegrations.$inferSelect {
    // Priority order: 1) unified (new), 2) specific service, 3) auth fallback, 4) any row
    const unified = rows.find((r) => r.service === "unified");
    const match =
      unified ??
      rows.find((r) => r.service === service) ??
      rows.find((r) => r.service === "auth") ??
      rows[0]!;
    return match;
  }

  const gmailRow = selectServiceRowOrFallback("gmail");
  const calendarRow = selectServiceRowOrFallback("calendar");

  const gmailAuth = buildOAuthFromRow(gmailRow);
  const calendarAuth = buildOAuthFromRow(calendarRow);

  return {
    oauth2: gmailAuth, // primary oauth instance (gmail-preferred for back-compat)
    gmail: makeGmailClient(gmailAuth),
    calendar: makeCalendarClient(calendarAuth),
  };
}

// Back-compat helper with old name
export async function getGoogleClient(
  userId: string,
): Promise<Pick<GoogleApisClients, "gmail" | "calendar">> {
  const { gmail, calendar } = await getGoogleClients(userId);
  return { gmail, calendar };
}
