// Pagination helpers for robustness and rate safety
import type { gmail_v1 } from "googleapis";
import type { gmail as GmailFactory } from "googleapis/build/src/apis/gmail";
import { getGoogleClients } from "./client";
import { toLabelId } from "./constants";
import { callWithRetry } from "./utils";
import { withRateLimit } from "./rate-limiter";

export type GmailClient = ReturnType<typeof GmailFactory>;

export interface GmailPreviewPrefs {
  gmailQuery: string;
  gmailLabelIncludes: string[];
  gmailLabelExcludes: string[];
}

export interface GmailPreviewResult {
  sampleEmails: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    hasAttachments: boolean;
    labels: string[];
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

export async function listGmailMessageIds(
  gmail: GmailClient,
  q: string,
  userId: string,
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

    // conservative timeout + small retry budget per page with rate limiting
    const res = await withRateLimit(userId, "gmail_metadata", 1, () =>
      callWithRetry(
        () => gmail.users.messages.list(params, { timeout: 10_000 }),
        "gmail.messages.list",
      ),
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

  // Build query with label filters - PREVIEW should show ALL matching emails, not incremental
  let query = prefs.gmailQuery;

  // Add label includes
  if (prefs.gmailLabelIncludes.length > 0) {
    const includes = prefs.gmailLabelIncludes.map(toLabelId).join(" OR ");
    query += ` (${includes})`;
  }

  // Add label excludes
  if (prefs.gmailLabelExcludes.length > 0) {
    const excludes = prefs.gmailLabelExcludes.map((label) => `-${toLabelId(label)}`);
    query += ` ${excludes.join(" ")}`;
  }

  // console.log(`Gmail preview: Using query "${query}" (no incremental filtering for preview)`);
  const { ids: messageIds } = await listGmailMessageIds(gmail, query, userId);

  // Helpers
  const getHeader = (
    headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
    name: string,
  ): string | undefined => {
    const lower = name.toLowerCase();
    return headers?.find((h) => (h.name ?? "").toLowerCase() === lower)?.value ?? undefined;
  };

  const payloadHasAttachments = (payload: gmail_v1.Schema$MessagePart | undefined): boolean => {
    if (!payload) return false;
    if ((payload.filename ?? "").length > 0) return true;
    const parts = payload.parts ?? [];
    for (const p of parts) {
      if ((p.filename ?? "").length > 0) return true;
      if (payloadHasAttachments(p)) return true;
    }
    return false;
  };

  // Sample first 10 messages for richer preview
  const sampleIds = messageIds.slice(0, 10);
  const sampleEmails: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    hasAttachments: boolean;
    labels: string[];
  }> = [];

  let minDateMs: number | null = null;
  let maxDateMs: number | null = null;

  for (const id of sampleIds) {
    try {
      const msg = await withRateLimit(userId, "gmail_read", 1, () =>
        callWithRetry(
          () =>
            gmail.users.messages.get({
              userId: "me",
              id,
              format: "full",
            }),
          "gmail.messages.get",
        ),
      );

      const headers = msg.data.payload?.headers ?? [];
      const subject = getHeader(headers, "Subject");
      const from = getHeader(headers, "From");
      const dateHeader = getHeader(headers, "Date");

      const internalDateMs = msg.data.internalDate ? Number(msg.data.internalDate) : undefined;
      const parsedHeaderMs = dateHeader ? Date.parse(dateHeader) : undefined;
      const effectiveMs =
        typeof internalDateMs === "number" && !Number.isNaN(internalDateMs)
          ? internalDateMs
          : typeof parsedHeaderMs === "number" && !Number.isNaN(parsedHeaderMs)
            ? parsedHeaderMs
            : Date.now();
      const dateISO = new Date(effectiveMs).toISOString();

      // Track date range
      if (minDateMs === null || effectiveMs < minDateMs) minDateMs = effectiveMs;
      if (maxDateMs === null || effectiveMs > maxDateMs) maxDateMs = effectiveMs;

      if (subject) {
        sampleEmails.push({
          id,
          subject: subject ?? "(no subject)",
          from: from ?? "Unknown Sender",
          date: dateISO,
          snippet: msg.data.snippet ?? "",
          hasAttachments: payloadHasAttachments(msg.data.payload),
          labels: msg.data.labelIds ?? [],
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch message ${id}:`, error);
    }
  }

  const dateRange =
    minDateMs !== null && maxDateMs !== null
      ? { from: new Date(minDateMs).toISOString(), to: new Date(maxDateMs).toISOString() }
      : {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        };

  return {
    sampleEmails,
    dateRange,
  };
}

export async function getGmailMessage(
  userId: string,
  messageId: string,
): Promise<gmail_v1.Schema$Message | null> {
  try {
    const { gmail } = await getGoogleClients(userId);

    const res = await withRateLimit(userId, "gmail_read", 1, () =>
      callWithRetry(
        () =>
          gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          }),
        "gmail.messages.get",
      ),
    );

    return res.data;
  } catch (error) {
    console.error(`Failed to fetch Gmail message ${messageId}:`, error);
    return null;
  }
}
