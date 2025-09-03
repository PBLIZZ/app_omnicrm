/** GET /api/google/gmail/labels — fetch Gmail labels for authenticated user */

import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { userIntegrations } from "@/server/db/schema";
import { err, ok } from "@/lib/api/http";
import { toApiError } from "@/server/jobs/types";
import { decryptString } from "@/lib/crypto";
import { gmail_v1, google } from "googleapis";

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

export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

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
    return err(401, "Gmail not connected");
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
      return ok({ labels: [], totalLabels: 0 });
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

    return ok(result);
  } catch (error: unknown) {
    console.error("Gmail labels fetch failed:", error);

    if (error instanceof Error) {
      // Handle specific Google API errors
      if (error.message.includes("insufficient authentication scopes")) {
        return err(403, "Insufficient Gmail permissions. Please reconnect your Gmail account.");
      }

      if (
        error.message.includes("invalid_grant") ||
        error.message.includes("Token has been expired or revoked")
      ) {
        return err(401, "Gmail access token has expired. Please reconnect your account.");
      }
    }

    const { status, message } = toApiError(error);
    return err(status, message);
  }
}
