import { google } from "googleapis";
import { createUserIntegrationsRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { decryptString, encryptString, isEncrypted } from "@/server/utils/crypto";
import type { GmailClient } from "./gmail";

type CalendarClient = ReturnType<typeof google.calendar>;

export type GoogleApisClients = {
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

// Type for OAuth row that buildOAuthFromRow expects
type OAuthRow = {
  userId: string;
  provider: string;
  service: string;
  accessToken: string;
  refreshToken: string | null;
  expiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper to safely extract OAuth row data
function extractOAuthRow(row: {
  userId: string;
  provider: string;
  service: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiryDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}): OAuthRow {
  if (row.service === null) {
    throw new Error("Service cannot be null");
  }

  if (row.createdAt === null) {
    throw new Error("Created date cannot be null");
  }

  if (row.updatedAt === null) {
    throw new Error("Updated date cannot be null");
  }

  return {
    userId: row.userId,
    provider: row.provider,
    service: row.service, // Now we know it's not null
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiryDate: row.expiryDate,
    createdAt: row.createdAt, // Now we know it's not null
    updatedAt: row.updatedAt, // Now we know it's not null
  };
}

export async function getGoogleClients(userId: string): Promise<GoogleApisClients> {
  const db = await getDb();
  const userIntegrationsRepo = createUserIntegrationsRepository(db);
  const rows = await userIntegrationsRepo.getRawIntegrationData(userId, "google");

  console.warn(
    `getGoogleClients: Found ${rows?.length || 0} Google integrations for user ${userId}`,
  );

  if (!rows || rows.length === 0) {
    console.error(`getGoogleClients: No Google integrations found for user ${userId}`);
    throw Object.assign(new Error("google_not_connected"), { status: 401 });
  }

  async function buildOAuthFromRow(r: {
    userId: string;
    provider: string;
    service: string;
    accessToken: string;
    refreshToken: string | null;
    expiryDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<InstanceType<typeof google.auth.OAuth2>> {
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
      try {
        await userIntegrationsRepo.updateRawTokens(userId, "google", r.service, {
          accessToken: isEncrypted(r.accessToken) ? r.accessToken : encryptString(decryptedAccess),
          refreshToken: isEncrypted(r.refreshToken) ? r.refreshToken : (r.refreshToken ? encryptString(r.refreshToken) : null),
        });
      } catch (error) {
        // Fail fast - encryption backfill failures should not be ignored
        console.error(
          `Failed to backfill encryption for user ${userId}, service ${r.service}:`,
          error,
        );
        throw new Error(
          `Encryption backfill failed for user ${userId}, service ${r.service}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    auth.setCredentials({
      access_token: decryptedAccess,
      refresh_token: decryptedRefresh,
      expiry_date: r.expiryDate ? r.expiryDate.getTime() : null,
    });

    auth.on("tokens", async (tokens) => {
      if (!(tokens.access_token || tokens.refresh_token)) return;
      await userIntegrationsRepo.updateRawTokens(userId, "google", r.service, {
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
  const gmailRow = rows.find((r) => r.service === "gmail");
  const calendarRow = rows.find((r) => r.service === "calendar");

  if (!gmailRow) {
    throw Object.assign(new Error("Gmail access not approved by user"), { status: 403 });
  }

  if (!calendarRow) {
    throw Object.assign(new Error("Calendar access not approved by user"), { status: 403 });
  }

  const [gmailAuth, calendarAuth] = await Promise.all([
    buildOAuthFromRow(extractOAuthRow(gmailRow)),
    buildOAuthFromRow(extractOAuthRow(calendarRow)),
  ]);

  return {
    gmail: makeGmailClient(gmailAuth),
    calendar: makeCalendarClient(calendarAuth),
  };
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
    console.error(`getGoogleGmailClient: Failed to get Gmail client for user ${userId}:`, error);
    return null;
  }
}
