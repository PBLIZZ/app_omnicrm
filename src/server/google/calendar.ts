import type { calendar_v3 } from "googleapis";
import { getGoogleClients } from "./client";

type CalendarPreview = {
  count: number;
  sampleTitles: string[];
};

export async function calendarPreview(
  userId: string,
  prefs: {
    calendarIncludeOrganizerSelf: "true" | "false";
    calendarIncludePrivate: "true" | "false";
    calendarTimeWindowDays: number;
  },
): Promise<CalendarPreview> {
  const { calendar } = await getGoogleClients(userId);
  const now = new Date();
  const days = prefs.calendarTimeWindowDays ?? 60;
  const timeMin = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const events: any[] = [];
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
    pageToken = resp.data.nextPageToken || undefined;
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

export async function listCalendarEvents(
  cal: calendar_v3.Calendar,
  timeMin: string,
  timeMax: string,
) {
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
    const resp = await cal.events.list(params);
    items.push(...(resp.data.items ?? []));
    pageToken = resp.data.nextPageToken || undefined;
  } while (pageToken);
  return items;
}
