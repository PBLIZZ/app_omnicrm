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

export async function listGmailMessageIds(gmail: GmailClient, q: string) {
  const ids: string[] = [];
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
    (res.data.messages ?? []).forEach((m) => m.id && ids.push(m.id));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return ids;
}

export async function getMessages(gmail: GmailClient, ids: string[]) {
  const out: gmail_v1.Schema$Message[] = [];
  const chunk = 25;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const results = await Promise.allSettled(
      slice.map((id) =>
        callWithRetry(
          () =>
            gmail.users.messages.get(
              {
                userId: "me",
                id,
                format: "metadata",
                metadataHeaders: [
                  "Subject",
                  "From",
                  "To",
                  "Date",
                  "Message-Id",
                  "List-Id",
                  "Delivered-To",
                  "Cc",
                ],
              },
              { timeout: 10_000 },
            ),
          "gmail.messages.get",
        ),
      ),
    );
    for (const r of results) if (r.status === "fulfilled") out.push(r.value.data);
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

// label map and transformer imported from ./constants

export async function gmailPreview(
  userId: string,
  prefs: GmailPreviewPrefs,
  injectedGmail?: GmailClient,
): Promise<GmailPreviewResult> {
  const gmail = injectedGmail ?? (await getGoogleClients(userId)).gmail;

  const q = prefs.gmailQuery;
  const includeIds = (prefs.gmailLabelIncludes ?? []).map(toLabelId).filter(Boolean);
  const excludeIds = (prefs.gmailLabelExcludes ?? []).map(toLabelId).filter(Boolean);

  const messages: Pick<gmail_v1.Schema$Message, "id">[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const params: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: "me",
      q,
      maxResults: 100,
      ...(pageToken ? { pageToken } : {}),
    };
    const listRes = await gmail.users.messages.list(params);
    messages.push(...(listRes.data.messages ?? []));
    pageToken = listRes.data.nextPageToken ?? undefined;
  } while (pageToken);
  const countByLabel: Record<string, number> = {};
  const sampleSubjects: string[] = [];

  for (const m of messages.slice(0, 50)) {
    if (!m.id) continue;
    const idVal = m.id as string; // guarded above
    const msg = await callWithRetry(
      () =>
        gmail.users.messages.get(
          {
            userId: "me",
            id: idVal,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "To", "Date"],
          },
          { timeout: 10_000 },
        ),
      "gmail.messages.get",
    );
    const payload = msg.data;
    const labelIds = payload.labelIds ?? [];

    // include filter
    if (includeIds.length > 0 && !labelIds.some((l) => includeIds.includes(l))) {
      continue;
    }
    // exclude filter
    if (excludeIds.length > 0 && labelIds.some((l) => excludeIds.includes(l))) {
      continue;
    }

    for (const l of labelIds) {
      countByLabel[l] = (countByLabel[l] ?? 0) + 1;
    }

    const subject = (payload.payload?.headers || []).find(
      (h) => h.name?.toLowerCase() === "subject",
    )?.value;
    if (subject && sampleSubjects.length < 5) sampleSubjects.push(subject);
  }

  // top 5 labels
  const topEntries = Object.entries(countByLabel)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const top: Record<string, number> = {};
  for (const [k, v] of topEntries) top[k] = v;

  return { countByLabel: top, sampleSubjects };
}

// callWithRetry shared in ./utils
