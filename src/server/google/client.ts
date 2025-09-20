import { google } from "googleapis";
import { UserIntegrationsRepository } from "@repo";
import { decryptString, encryptString, isEncrypted } from "@/server/utils/crypto";
import type { GmailClient } from "./gmail";

type CalendarClient = ReturnType<typeof google.calendar>;

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
  const rows = await UserIntegrationsRepository.getRawIntegrationData(userId, "google");

  console.warn(
    `getGoogleClients: Found ${rows?.length || 0} Google integrations for user ${userId}`,
  );

  if (!rows || rows.length === 0) {
    console.error(`getGoogleClients: No Google integrations found for user ${userId}`);
    throw Object.assign(new Error("google_not_connected"), { status: 401 });
  }

  function buildOAuthFromRow(
    r: {
      userId: string;
      provider: string;
      service: string;
      accessToken: string;
      refreshToken: string | null;
      expiryDate: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ): InstanceType<typeof google.auth.OAuth2> {
    console.warn(`buildOAuthFromRow: Creating OAuth client for service ${r.service}`);

    if (!process.env["GOOGLE_CLIENT_ID"] || !process.env["GOOGLE_CLIENT_SECRET"]) {
      console.error("buildOAuthFromRow: Missing Google OAuth credentials");
      throw new Error("Missing Google OAuth configuration");
    }

    const clientId = process.env["GOOGLE_CLIENT_ID"];
    const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth credentials in environment variables");
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret);

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
      void UserIntegrationsRepository.updateRawTokens(userId, "google", r.service, {
        accessToken: isEncrypted(r.accessToken) ? r.accessToken : encryptString(decryptedAccess),
        refreshToken:
          r.refreshToken == null
            ? null
            : isEncrypted(r.refreshToken)
              ? r.refreshToken
              : encryptString(decryptedRefresh as string),
      });
    }

    auth.setCredentials({
      access_token: decryptedAccess,
      refresh_token: decryptedRefresh,
      expiry_date: r.expiryDate ? r.expiryDate.getTime() : null,
    });

    auth.on("tokens", async (tokens) => {
      if (!(tokens.access_token || tokens.refresh_token)) return;
      await UserIntegrationsRepository.updateRawTokens(userId, "google", r.service, {
        accessToken:
          tokens.access_token != null ? encryptString(tokens.access_token) : r.accessToken,
        refreshToken:
          tokens.refresh_token != null ? encryptString(tokens.refresh_token) : r.refreshToken,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : r.expiryDate,
      });
    });

    return auth;
  }

  // Strict service-specific token enforcement - no fallbacks
  const gmailRow = rows.find((r: { service: string }) => r.service === "gmail");
  const calendarRow = rows.find((r: { service: string }) => r.service === "calendar");

  if (!gmailRow) {
    throw Object.assign(new Error("Gmail access not approved by user"), { status: 403 });
  }

  if (!calendarRow) {
    throw Object.assign(new Error("Calendar access not approved by user"), { status: 403 });
  }

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

// Specific helper for calendar client
export async function getGoogleCalendarClient(userId: string): Promise<CalendarClient | null> {
  try {
    const { calendar } = await getGoogleClients(userId);
    return calendar;
  } catch (error) {
    console.error(
      `getGoogleCalendarClient: Failed to get calendar client for user ${userId}:`,
      error,
    );
    return null;
  }
}

// Specific helper for Gmail client
export async function getGoogleGmailClient(userId: string): Promise<GmailClient | null> {
  try {
    const { gmail } = await getGoogleClients(userId);
    return gmail;
  } catch (error) {
    console.error(
      `getGoogleGmailClient: Failed to get Gmail client for user ${userId}:`,
      error,
    );
    return null;
  }
}
