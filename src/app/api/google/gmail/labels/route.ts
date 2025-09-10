/** GET /api/google/gmail/labels — fetch Gmail labels for authenticated user */

import { createRouteHandler } from "@/server/api/handler";
import { getDb } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { userIntegrations } from "@/server/db/schema";
import { ApiResponseBuilder } from "@/server/api/response";
import { decryptString } from "@/server/utils/crypto";
import { gmail_v1, google } from "googleapis";
import { logger } from "@/lib/observability";

interface GmailLabel {
  id: string;
  name: string;
  type: "user" | "system";
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

interface GmailLabelsResponse {
  labels: GmailLabel[];
  totalLabels: number;
}

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_labels" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("google.gmail.labels", requestId);

  const dbo = await getDb();

  // Get Gmail-specific OAuth integration
  const [integration] = await dbo
    .select()
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, "google"),
        eq(userIntegrations.service, "gmail"),
      ),
    )
    .limit(1);

  if (!integration) {
    return api.error("Gmail not connected", "UNAUTHORIZED");
  }

  try {
    // Decrypt the stored tokens
    const accessToken = decryptString(integration.accessToken);
    const refreshToken = integration.refreshToken ? decryptString(integration.refreshToken) : null;

    // Create OAuth2 client with Gmail redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
      process.env["GOOGLE_GMAIL_REDIRECT_URI"],
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken ?? null,
      expiry_date: integration.expiryDate?.getTime() ?? null,
    });

    // Set up automatic token refresh
    oauth2Client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        // In production, you'd update the database with new tokens
        // TODO: Implement token refresh in database
      }
    });

    // Create Gmail client
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Fetch labels
    const response = await gmail.users.labels.list({
      userId: "me",
    });

    if (!response.data.labels) {
      return api.success({ labels: [], totalLabels: 0 });
    }

    // Transform labels to our format
    const labels: GmailLabel[] = response.data.labels.map((label: gmail_v1.Schema$Label) => {
      const gmailLabel: GmailLabel = {
        id: label.id ?? "",
        name: label.name ?? "",
        type: label.type === "user" ? "user" : "system",
      };

      if (label.messagesTotal) {
        gmailLabel.messagesTotal = parseInt(String(label.messagesTotal), 10);
      }
      if (label.messagesUnread) {
        gmailLabel.messagesUnread = parseInt(String(label.messagesUnread), 10);
      }
      if (label.threadsTotal) {
        gmailLabel.threadsTotal = parseInt(String(label.threadsTotal), 10);
      }
      if (label.threadsUnread) {
        gmailLabel.threadsUnread = parseInt(String(label.threadsUnread), 10);
      }

      return gmailLabel;
    });

    // Sort labels: system labels first, then user labels alphabetically
    labels.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "system" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const result: GmailLabelsResponse = {
      labels,
      totalLabels: labels.length,
    };

    return api.success(result);
  } catch (error: unknown) {
    await logger.error(
      "Gmail labels fetch failed",
      {
        operation: "api.google.gmail.labels",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          hasIntegration: !!integration,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );

    if (error instanceof Error) {
      // Handle specific Google API errors
      if (error.message.includes("insufficient authentication scopes")) {
        return api.error(
          "Insufficient Gmail permissions. Please reconnect your Gmail account.",
          "FORBIDDEN",
        );
      }

      if (
        error.message.includes("invalid_grant") ||
        error.message.includes("Token has been expired or revoked")
      ) {
        return api.error(
          "Gmail access token has expired. Please reconnect your account.",
          "UNAUTHORIZED",
        );
      }
    }

    return api.error(
      "Failed to fetch Gmail labels",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});
