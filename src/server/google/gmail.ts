// Pagination helpers for robustness and rate safety
import type { gmail_v1 } from "googleapis";
import type { gmail as GmailFactory } from "googleapis/build/src/apis/gmail";
import { getGoogleClients } from "./client";
import { toLabelId } from "./constants";
import { callWithRetry } from "./utils";

export type GmailClient = ReturnType<typeof GmailFactory>;

export interface GmailPreviewPrefs {
  gmailQuery: string;
  gmailLabelIncludes: string[];
  gmailLabelExcludes: string[];
}

export interface GmailPreviewResult {
  countByLabel: Record<string, number>;
  sampleSubjects: string[];
}

export async function listGmailMessageIds(
  gmail: GmailClient,
  q: string,
): Promise<{ ids: string[]; pages: number }> {
  const ids: string[] = [];
  let pages = 0;
  let pageToken: string | undefined = undefined;
  do {
    const params: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: "me",
      q,
      maxResults: 100,
      ...(pageToken ? { pageToken } : {}),
    };
    // conservative timeout + small retry budget per page
    const res = await callWithRetry(
      () => gmail.users.messages.list(params, { timeout: 10_000 }),
      "gmail.messages.list",
    );
    pages += 1;
    (res.data.messages ?? []).forEach((m) => {
      if (m.id) {
        ids.push(m.id);
      }
    });
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return { ids, pages };
}

// label map and transformer imported from ./constants

export async function gmailPreview(
  userId: string,
  prefs: GmailPreviewPrefs,
): Promise<GmailPreviewResult> {
  const { gmail } = await getGoogleClients(userId);

  // Build query with label filters
  let query = prefs.gmailQuery;
  
  // Add label includes
  if (prefs.gmailLabelIncludes.length > 0) {
    const includes = prefs.gmailLabelIncludes.map(toLabelId).join(" OR ");
    query += ` (${includes})`;
  }
  
  // Add label excludes
  if (prefs.gmailLabelExcludes.length > 0) {
    const excludes = prefs.gmailLabelExcludes.map(label => `-${toLabelId(label)}`);
    query += ` ${excludes.join(" ")}`;
  }

  const { ids: messageIds } = await listGmailMessageIds(gmail, query);
  
  // Sample first 10 messages for subjects
  const sampleIds = messageIds.slice(0, 10);
  const sampleSubjects: string[] = [];
  
  for (const id of sampleIds) {
    try {
      const msg = await callWithRetry(
        () => gmail.users.messages.get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: ["Subject"],
        }),
        "gmail.messages.get",
      );
      
      const subject = msg.data.payload?.headers?.find(h => h.name === "Subject")?.value;
      if (subject) {
        sampleSubjects.push(subject);
      }
    } catch (error) {
      console.warn(`Failed to fetch message ${id}:`, error);
    }
  }

  // Simple count by labels (this would need more sophisticated logic for real label counting)
  const countByLabel: Record<string, number> = {
    "INBOX": messageIds.length,
  };

  return {
    countByLabel,
    sampleSubjects,
  };
}

export async function getGmailMessage(
  userId: string,
  messageId: string,
): Promise<gmail_v1.Schema$Message | null> {
  try {
    const { gmail } = await getGoogleClients(userId);
    
    const res = await callWithRetry(
      () => gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      }),
      "gmail.messages.get",
    );
    
    return res.data;
  } catch (error) {
    console.error(`Failed to fetch Gmail message ${messageId}:`, error);
    return null;
  }
}