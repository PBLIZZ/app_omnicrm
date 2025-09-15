import { google } from "googleapis";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { decryptString, encryptString } from "@/server/utils/crypto";
import { logger } from "@/lib/observability";

// Type alias for OAuth2 client
type OAuth2Type = InstanceType<typeof google.auth.OAuth2>;

// Custom error class for Gmail authentication errors
export class GmailAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean,
  ) {
    super(message);
    this.name = "GmailAuthError";
  }
}

export class GoogleGmailService {
  /**
   * Get OAuth2 client for a user with automatic token refresh
   */
  public static async getAuth(userId: string): Promise<OAuth2Type> {
    const db = await getDb();

    // Get user integration using Drizzle ORM - check both gmail-specific and unified
    const [gmailResult, unifiedResult] = await Promise.all([
      db
        .select({
          accessToken: userIntegrations.accessToken,
          refreshToken: userIntegrations.refreshToken,
          expiryDate: userIntegrations.expiryDate,
          service: userIntegrations.service,
        })
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "gmail"),
          ),
        )
        .limit(1),
      db
        .select({
          accessToken: userIntegrations.accessToken,
          refreshToken: userIntegrations.refreshToken,
          expiryDate: userIntegrations.expiryDate,
          service: userIntegrations.service,
        })
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "unified"),
          ),
        )
        .limit(1),
    ]);

    // Use unified integration if available, otherwise use gmail-specific
    const integration = unifiedResult[0] ?? gmailResult[0];

    if (!integration) {
      throw new GmailAuthError("Gmail not connected for user", "not_connected", false);
    }

    const redirectUri = process.env["GOOGLE_GMAIL_REDIRECT_URI"];
    if (!redirectUri) {
      throw new GmailAuthError(
        "Gmail OAuth not configured - missing GOOGLE_GMAIL_REDIRECT_URI",
        "config_error",
        false,
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
      redirectUri,
    );

    // Type guard to ensure we have the required fields
    if (!integration.accessToken) {
      throw new GmailAuthError("Invalid access token in database", "invalid_token", false);
    }

    const refreshToken = integration.refreshToken ? decryptString(integration.refreshToken) : null;

    const expiryDate: number | null = integration.expiryDate
      ? new Date(integration.expiryDate).getTime()
      : null;

    oauth2Client.setCredentials({
      access_token: decryptString(integration.accessToken),
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    });

    // Check if token is near expiry and refresh if needed
    const now = Date.now();
    const tokenExpiresIn = expiryDate ? expiryDate - now : 0;

    // Refresh if token expires within 5 minutes (300000ms)
    if (tokenExpiresIn < 300000 && refreshToken) {
      try {
        await logger.info("Refreshing Gmail token", {
          operation: "oauth",
          additionalData: {
            op: "gmail.token_refresh",
            userId,
            service: integration.service,
            expiresIn: tokenExpiresIn,
          },
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

        if (credentials.access_token) {
          // Update database with new tokens
          await db
            .update(userIntegrations)
            .set({
              accessToken: encryptString(credentials.access_token),
              expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(userIntegrations.userId, userId),
                eq(userIntegrations.provider, "google"),
                eq(userIntegrations.service, integration.service),
              ),
            );

          oauth2Client.setCredentials(credentials);

          await logger.info("Successfully refreshed Gmail token", {
            operation: "oauth",
            additionalData: {
              op: "gmail.token_refreshed",
              userId,
              service: integration.service,
            },
          });
        }
      } catch (refreshError: unknown) {
        const refreshMsg =
          refreshError instanceof Error ? refreshError.message : String(refreshError);
        await logger.error(
          "Failed to refresh Gmail token",
          {
            operation: "oauth",
            additionalData: {
              op: "gmail.token_refresh_failed",
              userId,
              service: integration.service,
              error: refreshMsg,
            },
          },
          refreshError instanceof Error ? refreshError : undefined,
        );

        // Check for specific auth errors
        if (refreshMsg.includes("invalid_grant") || refreshMsg.includes("refresh_token_expired")) {
          // Clear invalid tokens
          await this.clearInvalidTokens(userId, integration.service);
          throw new GmailAuthError(
            "Gmail authentication expired. Please reconnect your Gmail.",
            "invalid_grant",
            false,
          );
        }

        throw new GmailAuthError("Failed to refresh Gmail token", "token_refresh_failed", true);
      }
    }

    return oauth2Client;
  }

  /**
   * Clear invalid tokens from the database
   */
  private static async clearInvalidTokens(userId: string, service: string): Promise<void> {
    try {
      const db = await getDb();
      await db
        .delete(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, service),
          ),
        );

      await logger.info("Cleared invalid Gmail tokens", {
        operation: "oauth",
        additionalData: {
          op: "gmail.tokens_cleared",
          userId,
          service,
        },
      });
    } catch (error) {
      await logger.error(
        "Failed to clear invalid Gmail tokens",
        {
          operation: "oauth",
          additionalData: {
            op: "gmail.tokens_clear_failed",
            userId,
            service,
          },
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Test Gmail connection by making a simple API call
   */
  public static async testConnection(userId: string): Promise<boolean> {
    try {
      const auth = await this.getAuth(userId);
      const gmail = google.gmail({ version: "v1", auth });

      // Make a simple API call to test the connection
      await gmail.users.getProfile({ userId: "me" });

      return true;
    } catch (error) {
      await logger.warn("Gmail connection test failed", {
        operation: "gmail_test",
        additionalData: {
          op: "gmail.connection_test_failed",
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return false;
    }
  }
}
