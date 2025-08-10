import { describe, it, expect, vi, beforeEach } from "vitest";
import type { gmail_v1, calendar_v3 } from "googleapis";

vi.mock("@/server/db/client", () => {
  const rawEvents: unknown[] = [];
  const jobs: unknown[] = [];
  const prefsStore: unknown[] = [];
  const db = {
    select: () => ({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: (_table: unknown) => ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        where: (_cond: unknown) => ({
          orderBy: () => ({
            limit: async () => [],
          }),
          limit: async () => {
            return prefsStore.length ? [prefsStore[0]] : [];
          },
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    insert: (_table: unknown) => ({
      values: async (row: Record<string, unknown>) => {
        if (row && row.provider) {
          rawEvents.push(row);
        } else if (row && row.kind) {
          jobs.push(row);
        }
      },
    }),
  } as const;
  return {
    __esModule: true,
    db,
    mockDbState: { rawEvents, jobs, setPrefs: (p: unknown) => (prefsStore[0] = p) },
  };
});

import * as syncModule from "../processors/sync";
import { runGmailSync, runCalendarSync } from "../processors/sync";
import * as dbModule from "@/server/db/client";
const mockDbState = (
  dbModule as {
    mockDbState: { rawEvents: unknown[]; jobs: unknown[]; setPrefs: (p: unknown) => void };
  }
).mockDbState;

describe("sync processors with injected clients", () => {
  beforeEach(() => {
    mockDbState.rawEvents.length = 0;
    mockDbState.jobs.length = 0;
  });

  it("gmail: applies include/exclude filters, paginates, writes raw_events and follow-up job", async () => {
    mockDbState.setPrefs({
      userId: "u1",
      gmailQuery: "newer_than:30d",
      gmailLabelIncludes: ["Primary"], // maps to CATEGORY_PERSONAL
      gmailLabelExcludes: ["Promotions"],
    });

    vi.spyOn(syncModule, "lastEventTimestamp").mockResolvedValueOnce(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );

    // Fake Gmail client
    const listCalls: gmail_v1.Params$Resource$Users$Messages$List[] = [];
    const gmail = {
      users: {
        messages: {
          list: async (params: gmail_v1.Params$Resource$Users$Messages$List) => {
            listCalls.push(params);
            if (!params.pageToken) {
              return { data: { messages: [{ id: "1" }, { id: "2" }], nextPageToken: "p2" } };
            }
            return { data: { messages: [{ id: "3" }] } };
          },
          get: async (params: gmail_v1.Params$Resource$Users$Messages$Get) => {
            const nowMs = Date.now();
            if (params.id === "1") {
              return {
                data: {
                  id: "1",
                  labelIds: ["CATEGORY_PERSONAL"],
                  internalDate: String(nowMs),
                },
              };
            }
            if (params.id === "2") {
              return {
                data: {
                  id: "2",
                  labelIds: ["CATEGORY_PROMOTIONS"],
                  internalDate: String(nowMs),
                },
              };
            }
            return {
              data: {
                id: "3",
                labelIds: ["CATEGORY_PERSONAL"],
                internalDate: String(nowMs - 90 * 24 * 60 * 60 * 1000), // too old
              },
            };
          },
        },
      },
    } as gmail_v1.Gmail;

    await runGmailSync({ payload: { batchId: "B" } } as { payload: { batchId: string } }, "u1", {
      gmail,
    });

    // list called twice for pagination
    expect(listCalls.length).toBe(2);
    // rawEvents wrote only message 1
    expect(mockDbState.rawEvents.length).toBe(1);
    expect(mockDbState.rawEvents[0].provider).toBe("gmail");
    expect(mockDbState.rawEvents[0].batchId).toBe("B");
    expect(mockDbState.rawEvents[0].sourceMeta.matchedQuery).toBe("newer_than:30d");
    // follow-up job enqueued
    expect(mockDbState.jobs.at(-1)?.kind).toBe("normalize_google_email");
  });

  it("calendar: applies organizer/private filters, paginates, writes raw_events and follow-up job", async () => {
    mockDbState.setPrefs({
      userId: "u1",
      calendarIncludeOrganizerSelf: "true",
      calendarIncludePrivate: "false",
      calendarTimeWindowDays: 60,
    });

    // Fake Calendar client
    const listCalls: calendar_v3.Params$Resource$Events$List[] = [];
    const calendar = {
      events: {
        list: async (params: calendar_v3.Params$Resource$Events$List) => {
          listCalls.push(params);
          if (!params.pageToken) {
            return {
              data: {
                items: [
                  {
                    id: "e1",
                    organizer: { self: true },
                    visibility: "public",
                    start: { dateTime: new Date().toISOString() },
                    summary: "A",
                  },
                  {
                    id: "e2",
                    organizer: { self: false },
                    visibility: "public",
                    start: { dateTime: new Date().toISOString() },
                    summary: "B",
                  },
                ],
                nextPageToken: "p2",
              },
            };
          }
          return {
            data: {
              items: [
                {
                  id: "e3",
                  organizer: { self: true },
                  visibility: "private",
                  start: { dateTime: new Date().toISOString() },
                  summary: "C",
                },
                {
                  id: "e4",
                  organizer: { self: true },
                  visibility: "public",
                  start: { dateTime: new Date().toISOString() },
                  summary: "D",
                },
              ],
            },
          };
        },
      },
    } as calendar_v3.Calendar;

    await runCalendarSync(
      { payload: { batchId: "CB" } } as { payload: { batchId: string } },
      "u1",
      { calendar },
    );

    expect(listCalls.length).toBe(2);
    // e1 and e4 should be inserted; e2 excluded (organizer.self false), e3 excluded (private)
    expect(mockDbState.rawEvents.length).toBe(2);
    expect(mockDbState.rawEvents[0].provider).toBe("calendar");
    expect(mockDbState.rawEvents[0].batchId).toBe("CB");
    expect(mockDbState.jobs.at(-1)?.kind).toBe("normalize_google_event");
  });
});
