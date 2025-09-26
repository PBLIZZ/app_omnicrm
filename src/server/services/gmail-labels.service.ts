import { GoogleGmailService } from "@/server/services/google-gmail.service";
import { google, gmail_v1 } from "googleapis";

export interface GmailLabel {
  id: string;
  name: string;
  type: "user" | "system";
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface GmailLabelsResponse {
  labels: GmailLabel[];
  totalLabels: number;
}

export class GmailLabelsService {
  /**
   * Fetch and process Gmail labels for a user
   *
   * @param userId - The authenticated user ID
   * @returns Promise<GmailLabelsResponse> - Processed labels with metadata
   */
  static async getUserLabels(userId: string): Promise<GmailLabelsResponse> {
    // Get authenticated OAuth2 client
    const oauth2Client = await GoogleGmailService.getAuth(userId);

    // Create Gmail client
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Fetch labels from Gmail API
    const response = await gmail.users.labels.list({
      userId: "me",
    });

    if (!response.data.labels) {
      return { labels: [], totalLabels: 0 };
    }

    // Transform and process labels
    const labels = this.transformLabels(response.data.labels);

    // Sort labels by business logic
    const sortedLabels = this.sortLabels(labels);

    return {
      labels: sortedLabels,
      totalLabels: sortedLabels.length,
    };
  }

  /**
   * Transform Gmail API labels to our format
   *
   * @param rawLabels - Raw labels from Gmail API
   * @returns GmailLabel[] - Transformed labels
   */
  private static transformLabels(rawLabels: gmail_v1.Schema$Label[]): GmailLabel[] {
    return rawLabels.map((label: gmail_v1.Schema$Label) => {
      const gmailLabel: GmailLabel = {
        id: label.id ?? "",
        name: label.name ?? "",
        type: label.type === "user" ? "user" : "system",
      };

      // Parse numeric fields safely
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
  }

  /**
   * Sort labels according to business rules
   * System labels first, then user labels alphabetically
   *
   * @param labels - Labels to sort
   * @returns GmailLabel[] - Sorted labels
   */
  private static sortLabels(labels: GmailLabel[]): GmailLabel[] {
    return labels.sort((a, b) => {
      // System labels first
      if (a.type !== b.type) {
        return a.type === "system" ? -1 : 1;
      }
      // Then alphabetical by name
      return a.name.localeCompare(b.name);
    });
  }
}