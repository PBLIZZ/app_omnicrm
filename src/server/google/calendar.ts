import type { calendar_v3 } from "googleapis";
import { getGoogleClients } from "./client";
import { callWithRetry } from "./utils";

export type CalendarClient = calendar_v3.Calendar;

export interface CalendarPreviewPrefs {
  calendarIncludeOrganizerSelf: boolean; // was string, now boolean
  calendarIncludePrivate: boolean; // was string, now boolean
  calendarTimeWindowDays: number;
}

export interface CalendarPreviewResult {
  count: number;
  sampleTitles: string[];
  pages?: number;
  durationMs?: number;
  itemsFiltered?: number;
}

export async function calendarPreview(
  userId: string,
  prefs: CalendarPreviewPrefs,
  injectedCalendar?: CalendarClient,
): Promise<CalendarPreviewResult> {
  const calendar = injectedCalendar ?? (await getGoogleClients(userId)).calendar;
  const startedAt = Date.now();
  const now = new Date();
  const days = prefs.calendarTimeWindowDays ?? 60;
  const timeMin = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined = undefined;
  let pages = 0;
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
      () => calendar.events.list(params, { timeout: 10_000 }),
      "calendar.events.list",
    );
    pages += 1;
    events.push(...(resp.data.items ?? []));
    pageToken = resp.data.nextPageToken ?? undefined;
  } while (pageToken);
  const sampleTitles: string[] = [];
  let count = 0;
  let itemsFiltered = 0;

  for (const e of events.slice(0, 200)) {
    if (prefs.calendarIncludeOrganizerSelf === true && e.organizer && e.organizer.self === false) {
      itemsFiltered += 1;
      continue;
    }
    if (prefs.calendarIncludePrivate === false && e.visibility === "private") {
      itemsFiltered += 1;
      continue;
    }
    count += 1;
    if (e.summary && sampleTitles.length < 5) sampleTitles.push(e.summary);
  }

  const durationMs = Date.now() - startedAt;
  return { count, sampleTitles, pages, durationMs, itemsFiltered };
}

export async function listCalendarEvents(
  cal: CalendarClient,
  timeMin: string,
  timeMax: string,
): Promise<{ items: calendar_v3.Schema$Event[]; pages: number }> {
  const items: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined = undefined;
  let pages = 0;
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
    pages += 1;
    items.push(...(resp.data.items ?? []));
    pageToken = resp.data.nextPageToken ?? undefined;
  } while (pageToken);
  return { items, pages };
}

// callWithRetry shared in ./utils
