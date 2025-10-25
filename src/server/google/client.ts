import { google } from "googleapis";
import { createUserIntegrationsRepository, UserIntegrationsRepository } from "@repo";
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

/**
 * Create a Google Calendar API client configured with the provided OAuth2 credentials.
 *
 * @param auth - An OAuth2 client whose credentials will be used to authenticate API requests
 * @returns A Google Calendar API client instance bound to `auth`
 */
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

/**
 * Validate and normalize a raw integration row into an OAuthRow with guaranteed non-null service and timestamps.
 *
 * @param row - Raw integration row from storage; may contain nullable `service`, `createdAt`, and `updatedAt` fields.
 * @returns An `OAuthRow` where `service`, `createdAt`, and `updatedAt` are non-null.
 * @throws Error if `service`, `createdAt`, or `updatedAt` is null.
 */
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

/**
 * Proactively refresh tokens for a service if they are expired or about to expire.
 * This ensures tokens are always fresh before making API calls.
 *
 * @param userId - The user identifier
 * @param service - The Google service ('gmail' or 'calendar')
 * @param integration - The integration data from database
 * @param repo - The user integrations repository
 * @returns true if tokens were refreshed, false otherwise
 */
async function refreshTokenIfNeeded(
  userId: string,
  service: string,
  integration: {
    accessToken: string;
    refreshToken: string | null;
    expiryDate: Date | null;
  },
  repo: UserIntegrationsRepository,
): Promise<boolean> {
  // Skip if no expiry date (shouldn't happen, but handle gracefully)
  if (!integration.expiryDate) {
    return false;
  }

  // Skip if no refresh token
  if (!integration.refreshToken) {
    console.warn(`refreshTokenIfNeeded: No refresh token for ${service}, cannot refresh`);
    return false;
  }

  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer
  const expiryWithBuffer = new Date(integration.expiryDate.getTime() - bufferMs);

  // Check if token is expired or about to expire
  if (now < expiryWithBuffer) {
    return false; // Token is still valid
  }

  console.warn(
    `refreshTokenIfNeeded: Token for ${service} is expired or expiring soon, refreshing...`,
  );

  try {
    if (!process.env["GOOGLE_CLIENT_ID"] || !process.env["GOOGLE_CLIENT_SECRET"]) {
      throw new Error("Missing Google OAuth configuration");
    }

    const auth = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
    );

    // Decrypt the refresh token
    const decryptedRefresh = isEncrypted(integration.refreshToken)
      ? await decryptString(integration.refreshToken)
      : integration.refreshToken;

    auth.setCredentials({
      refresh_token: decryptedRefresh,
    });

    // Manually trigger token refresh
    const { credentials } = await auth.refreshAccessToken();

    console.warn(
      `refreshTokenIfNeeded: Successfully refreshed token for ${service}, new expiry: ${credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'none'}`,
    );

    // Encrypt and save new tokens
    const encryptedAccess = credentials.access_token
      ? await encryptString(credentials.access_token)
      : integration.accessToken;

    const encryptedRefresh = credentials.refresh_token
      ? await encryptString(credentials.refresh_token)
      : integration.refreshToken;

    await repo.updateRawTokens(userId, "google", service, {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
    });

    return true;
  } catch (error) {
    console.error(`refreshTokenIfNeeded: Failed to refresh token for ${service}:`, error);
    throw error;
  }
}

/**
 * Builds authenticated Gmail and Calendar API clients for the given user.
 * Proactively refreshes expired tokens before creating clients.
 *
 * @param userId - The identifier of the user whose stored Google integration tokens will be used
 * @returns An object with `gmail` and `calendar` API clients authenticated for the user
 * @throws If no Google integrations exist for the user (error with status 401)
 * @throws If Gmail or Calendar access has not been approved by the user (error with status 403)
 * @throws If Google OAuth client credentials are missing or if token encryption/backfill fails
 */
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
      ? await decryptString(r.accessToken)
      : r.accessToken;
    const decryptedRefresh = r.refreshToken
      ? isEncrypted(r.refreshToken)
        ? await decryptString(r.refreshToken)
        : r.refreshToken
      : null;

    // Backfill encryption once read (row-scoped)
    if (!isEncrypted(r.accessToken) || (r.refreshToken && !isEncrypted(r.refreshToken))) {
      try {
        await userIntegrationsRepo.updateRawTokens(userId, "google", r.service, {
          accessToken: isEncrypted(r.accessToken)
            ? r.accessToken
            : await encryptString(decryptedAccess),
          refreshToken: isEncrypted(r.refreshToken)
            ? r.refreshToken
            : r.refreshToken
              ? await encryptString(r.refreshToken)
              : null,
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
      const updatedAccessToken =
        tokens.access_token != null ? await encryptString(tokens.access_token) : r.accessToken;
      const updatedRefreshToken =
        tokens.refresh_token != null ? await encryptString(tokens.refresh_token) : r.refreshToken;

      await userIntegrationsRepo.updateRawTokens(userId, "google", r.service, {
        accessToken: updatedAccessToken,
        refreshToken: updatedRefreshToken,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : r.expiryDate,
      });
    });

    return auth;
  }

  // Proactively refresh expired tokens before creating OAuth clients
  const gmailRow = rows.find((r) => r.service === "gmail");
  const calendarRow = rows.find((r) => r.service === "calendar");

  // Refresh tokens if needed
  if (gmailRow) {
    try {
      await refreshTokenIfNeeded(userId, "gmail", gmailRow, userIntegrationsRepo);
    } catch (error) {
      console.error("Failed to refresh Gmail token:", error);
      // Continue with existing token - OAuth client will handle refresh on next API call
    }
  }

  if (calendarRow) {
    try {
      await refreshTokenIfNeeded(userId, "calendar", calendarRow, userIntegrationsRepo);
    } catch (error) {
      console.error("Failed to refresh Calendar token:", error);
      // Continue with existing token - OAuth client will handle refresh on next API call
    }
  }

  // Re-fetch rows after potential refresh to get updated tokens
  const refreshedRows = await userIntegrationsRepo.getRawIntegrationData(userId, "google");
  const refreshedGmailRow = refreshedRows.find((r) => r.service === "gmail");
  const refreshedCalendarRow = refreshedRows.find((r) => r.service === "calendar");

  // Strict service-specific token enforcement - no fallbacks

  if (!refreshedGmailRow) {
    throw Object.assign(new Error("Gmail access not approved by user"), { status: 403 });
  }

  if (!refreshedCalendarRow) {
    throw Object.assign(new Error("Calendar access not approved by user"), { status: 403 });
  }

  const [gmailAuth, calendarAuth] = await Promise.all([
    buildOAuthFromRow(extractOAuthRow(refreshedGmailRow)),
    buildOAuthFromRow(extractOAuthRow(refreshedCalendarRow)),
  ]);

  return {
    gmail: makeGmailClient(gmailAuth),
    calendar: makeCalendarClient(calendarAuth),
  };
}

/**
 * Retrieve the authenticated Google Calendar client for the given user.
 *
 * @param userId - The application's user identifier for which to load Google credentials
 * @returns The authenticated Calendar client for the user, or `null` if a client could not be obtained
 */
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

/**
 * Retrieve the Gmail API client for the specified user.
 *
 * @returns The Gmail API client for the user, or `null` if a client couldn't be obtained.
 */
export async function getGoogleGmailClient(userId: string): Promise<GmailClient | null> {
  try {
    const { gmail } = await getGoogleClients(userId);
    return gmail;
  } catch (error) {
    console.error(`getGoogleGmailClient: Failed to get Gmail client for user ${userId}:`, error);
    return null;
  }
}