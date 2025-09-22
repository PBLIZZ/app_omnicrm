/** GET /api/google/gmail/labels — fetch Gmail labels for authenticated user */

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { gmail_v1, google } from "googleapis";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
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

export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    // Get authenticated OAuth2 client using the new service
    const oauth2Client = await GoogleGmailService.getAuth(userId);

    // Create Gmail client
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Fetch labels
    const response = await gmail.users.labels.list({
      userId: "me",
    });

    if (!response.data.labels) {
      return NextResponse.json({ labels: [], totalLabels: 0 });
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

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET /api/google/gmail/labels error:", error);

    // Try to get userId for logging, but don't fail if we can't
    let userIdForLogging = "unknown";
    try {
      const userId = await getServerUserId();
      userIdForLogging = userId.slice(0, 8) + "...";
    } catch (_) {
      // Ignore auth errors in error handler
    }

    await logger.error(
      "Gmail labels fetch failed",
      {
        operation: "api.google.gmail.labels",
        additionalData: {
          userId: userIdForLogging,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );

    if (error instanceof Error) {
      // Handle specific Google API errors
      if (error.message.includes("insufficient authentication scopes")) {
        return NextResponse.json(
          { error: "Insufficient Gmail permissions. Please reconnect your Gmail account." },
          { status: 403 },
        );
      }

      if (
        error.message.includes("invalid_grant") ||
        error.message.includes("Token has been expired or revoked")
      ) {
        return NextResponse.json(
          { error: "Gmail access token has expired. Please reconnect your account." },
          { status: 401 },
        );
      }
    }

    return NextResponse.json({ error: "Failed to fetch Gmail labels" }, { status: 500 });
  }
}
