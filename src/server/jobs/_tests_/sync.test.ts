import { describe, it, expect, vi, beforeEach } from "vitest";
import type { gmail_v1, calendar_v3 } from "googleapis";

// Hoisted shared in-memory stores for mocks
const shared = vi.hoisted(() => {
  return {
    rawEvents: [] as Array<Record<string, unknown>>,
    interactions: new Map<string, Record<string, unknown>>(),
    jobs: [] as Array<Record<string, unknown>>,
    prefsStore: [] as Array<Record<string, unknown>>,
  };
});

vi.mock("@/server/db/client", () => {
  const db = {
    select: () => ({
      from: (table: unknown) => {
        // Mock implementation acknowledges table parameter for type compliance
        void table;
        return {
          where: (cond: unknown) => {
            // Mock implementation acknowledges cond parameter for type compliance
            void cond;
            return {
              orderBy: () => ({
                limit: async () => [],
              }),
              limit: async () => {
                const first = shared.prefsStore[0];
                return first ? [first] : [];
              },
            };
          },
        };
      },
    }),
    insert: (table: unknown) => {
      // Mock implementation acknowledges table parameter for type compliance
      void table;
      return {
        values: async (row: Record<string, unknown>) => {
          if ((row as { provider?: unknown }).provider) {
            shared.rawEvents.push(row);
          } else if ((row as { kind?: unknown }).kind) {
            shared.jobs.push(row);
          }
        },
      };
    },
  } as const;
  return {
    __esModule: true,
    getDb: async () => db,
    db,
    mockDbState: {
      rawEvents: shared.rawEvents,
      jobs: shared.jobs,
      setPrefs: (p: unknown) => (shared.prefsStore[0] = p as Record<string, unknown>),
    },
  };
});

// Mock supabase admin secret key writes to push into our in-memory rawEvents
vi.mock("@/lib/supabase/admin", () => {
  function toCamelCaseKeys(row: Record<string, unknown>): Record<string, unknown> {
    const mapping: Record<string, string> = {
      user_id: "userId",
      occurred_at: "occurredAt",
      contact_id: "contactId",
      batch_id: "batchId",
      source_meta: "sourceMeta",
      source_id: "sourceId",
    };
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      out[mapping[key] ?? key] = value;
    }
    return out;
  }
  return {
    __esModule: true,
    supaAdminGuard: {
      insert: async (_table: string, values: Record<string, unknown>) => {
        shared.rawEvents.push(toCamelCaseKeys(values));
        return [] as unknown[];
      },
      upsert: async (table: string, values: Record<string, unknown>) => {
        if (table === "raw_events") {
          // For raw_events, always insert (simulate upsert behavior)
          shared.rawEvents.push(toCamelCaseKeys(values));
          return [] as unknown[];
        }
        if (table === "interactions") {
          const key = `${values["user_id"] as string}|${values["source"] as string}|${(values["source_id"] as string) ?? ""}`;
          if (shared.interactions.has(key)) {
            // conflict; ignore
            return [] as unknown[];
          }
          const row = toCamelCaseKeys(values);
          shared.interactions.set(key, row);
          return [row] as unknown[];
        }
        // default passthrough
        return [] as unknown[];
      },
      update: async () => [],
    },
  };
});

// syncModule import removed to fix unused variable warning
import { runGmailSync, runCalendarSync } from "../processors/sync";
import * as dbModule from "../../db/client";
const mockDbState = (
  dbModule as unknown as {
    mockDbState: { rawEvents: unknown[]; jobs: unknown[]; setPrefs: (p: unknown) => void };
  }
).mockDbState;

describe("sync processors with injected clients", () => {
  beforeEach(() => {
    mockDbState.rawEvents.length = 0;
    mockDbState.jobs.length = 0;
    shared.interactions.clear();
  });

  it("gmail: applies include/exclude filters, paginates, writes raw_events and follow-up job", async () => {
    mockDbState.setPrefs({
      userId: "u1",
      gmailQuery: "newer_than:30d",
      gmailLabelIncludes: ["Primary"], // maps to CATEGORY_PERSONAL
      gmailLabelExcludes: ["Promotions"],
    });

    // Note: lastEventTimestamp function doesn't exist in sync module

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
    expect(shared.rawEvents.length).toBe(1);
    expect((shared.rawEvents[0] as { provider: string }).provider).toBe("gmail");
    expect((shared.rawEvents[0] as { batchId: string }).batchId).toBe("B");
    expect(
      (shared.rawEvents[0] as { sourceMeta: { matchedQuery: string } }).sourceMeta.matchedQuery,
    ).toBe("newer_than:30d");
    // follow-up job enqueued
    expect((mockDbState.jobs.at(-1) as { kind: string } | undefined)?.kind).toBe(
      "normalize_google_email",
    );
  });

  it("calendar: applies organizer/private filters, paginates, writes raw_events and follow-up job", async () => {
    mockDbState.setPrefs({
      userId: "u1",
      calendarIncludeOrganizerSelf: true,
      calendarIncludePrivate: false,
      calendarTimeWindowDays: 60,
    });

    // Fake Calendar client
    const listCalls: calendar_v3.Params$Resource$Events$List[] = [];
    const calendar = {
      calendarList: {
        list: async () => ({
          data: {
            items: [
              {
                id: "primary",
                summary: "Primary Calendar",
                primary: true,
              },
            ],
          },
        }),
      },
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
    expect(shared.rawEvents.length).toBe(2);
    expect((shared.rawEvents[0] as { provider: string }).provider).toBe("calendar");
    expect((shared.rawEvents[0] as { batchId: string }).batchId).toBe("CB");
    expect((mockDbState.jobs.at(-1) as { kind: string } | undefined)?.kind).toBe(
      "normalize_google_event",
    );
  });

  it("emits structured logs including requestId, userId, and batchId for gmail and calendar processors", async () => {
    const logCalls: Array<{ bindings: Record<string, unknown>; message?: string }> = [];
    // Mock the logger module used by the processors
    vi.resetModules();
    vi.doMock("@/server/log", () => {
      return {
        __esModule: true,
        log: {
          info: (bindings?: Record<string, unknown>, message?: string) => {
            logCalls.push({ bindings: bindings ?? {}, message: message ?? undefined });
          },
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      };
    });

    const { runGmailSync: gmailRunner, runCalendarSync: calendarRunner } = await import(
      "../processors/sync"
    );

    // Gmail
    mockDbState.setPrefs({
      userId: "u1",
      gmailQuery: "newer_than:30d",
      gmailLabelIncludes: [],
      gmailLabelExcludes: [],
    });
    const gmail = {
      users: {
        messages: {
          list: async () => ({ data: { messages: [{ id: "1" }] } }),
          get: async () => ({
            data: {
              id: "1",
              labelIds: ["CATEGORY_PERSONAL"],
              internalDate: String(Date.now()),
            },
          }),
        },
      },
    } as unknown as import("googleapis").gmail_v1.Gmail;
    await gmailRunner(
      { id: "jg", payload: { batchId: "BG" } } as unknown as {
        id: string;
        payload: { batchId: string };
      },
      "u1",
      { gmail },
    );

    // Calendar
    mockDbState.setPrefs({
      userId: "u1",
      calendarIncludeOrganizerSelf: true,
      calendarIncludePrivate: false,
      calendarTimeWindowDays: 1,
    });
    const calendar = {
      calendarList: {
        list: async () => ({
          data: {
            items: [
              {
                id: "primary",
                summary: "Primary Calendar",
                primary: true,
              },
            ],
          },
        }),
      },
      events: {
        list: async () => ({
          data: {
            items: [
              {
                id: "e1",
                organizer: { self: true },
                visibility: "public",
                start: { dateTime: new Date().toISOString() },
              },
            ],
          },
        }),
      },
    } as unknown as import("googleapis").calendar_v3.Calendar;
    await calendarRunner(
      { id: "jc", payload: { batchId: "BC" } } as unknown as {
        id: string;
        payload: { batchId: string };
      },
      "u1",
      { calendar },
    );

    // Assertions: at least one log per provider with keys present
    const hasGmailLog = logCalls.some((c) => {
      const b = c.bindings;
      return (
        b["provider"] === "gmail" &&
        b["userId"] === "u1" &&
        b["batchId"] === "BG" &&
        Object.prototype.hasOwnProperty.call(b, "requestId")
      );
    });
    expect(hasGmailLog).toBe(true);

    const hasCalendarLog = logCalls.some((c) => {
      const b = c.bindings;
      return (
        b["provider"] === "calendar" &&
        b["userId"] === "u1" &&
        b["batchId"] === "BC" &&
        Object.prototype.hasOwnProperty.call(b, "requestId")
      );
    });
    expect(hasCalendarLog).toBe(true);
  });
});
