import type { calendar_v3 } from "googleapis";
import { getGoogleClients } from "./client";
import { log } from "@/server/log";

export type CalendarClient = calendar_v3.Calendar;

export interface CalendarPreviewPrefs {
  calendarIncludeOrganizerSelf: "true" | "false";
  calendarIncludePrivate: "true" | "false";
  calendarTimeWindowDays: number;
}

export interface CalendarPreviewResult {
  count: number;
  sampleTitles: string[];
}

export async function calendarPreview(
  userId: string,
  prefs: CalendarPreviewPrefs,
  injectedCalendar?: CalendarClient,
): Promise<CalendarPreviewResult> {
  const calendar = injectedCalendar ?? (await getGoogleClients(userId)).calendar;
  const now = new Date();
  const days = prefs.calendarTimeWindowDays ?? 60;
  const timeMin = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      timeMin,
      timeMax,
      maxResults: 2500,
      ...(pageToken ? { pageToken } : {}),
    };
    const resp = await calendar.events.list(params);
    events.push(...(resp.data.items ?? []));
    pageToken = resp.data.nextPageToken ?? undefined;
  } while (pageToken);
  const sampleTitles: string[] = [];
  let count = 0;

  for (const e of events.slice(0, 200)) {
    if (
      prefs.calendarIncludeOrganizerSelf === "true" &&
      e.organizer &&
      e.organizer.self === false
    ) {
      continue;
    }
    if (prefs.calendarIncludePrivate === "false" && e.visibility === "private") {
      continue;
    }
    count += 1;
    if (e.summary && sampleTitles.length < 5) sampleTitles.push(e.summary);
  }

  return { count, sampleTitles };
}

export async function listCalendarEvents(cal: CalendarClient, timeMin: string, timeMax: string) {
  const items: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      timeMin,
      timeMax,
      maxResults: 2500,
      ...(pageToken ? { pageToken } : {}),
    };
    const resp = await callWithRetry(
      () => cal.events.list(params, { timeout: 10_000 }),
      "calendar.events.list",
    );
    items.push(...(resp.data.items ?? []));
    pageToken = resp.data.nextPageToken ?? undefined;
  } while (pageToken);
  return items;
}

// Simple retry helper with jitter
async function callWithRetry<T>(fn: () => Promise<T>, op: string, max = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = Math.min(300 * 2 ** attempt, 2000) + Math.floor(Math.random() * 200);
      if (attempt < max - 1) await new Promise((r) => setTimeout(r, delay));
    }
  }
  const error = lastErr as { message?: string };
  log.warn({ op, error: String(error?.message ?? lastErr) }, "google_call_failed");
  throw lastErr;
}
