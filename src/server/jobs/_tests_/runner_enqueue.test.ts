import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextResponse.json to return a simple object with json() method
vi.mock("next/server", () => ({
  NextResponse: { json: (data: unknown) => ({ json: async () => data }) },
}));

// DB mock with configurable queued jobs and captured SQL
let queuedJobs: unknown[] = [];
let lastSql = "";
vi.mock("@/server/db/client", () => {
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => queuedJobs,
          }),
          limit: async () => queuedJobs,
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => undefined,
      }),
    }),
    execute: async (query: { queryChunks?: Array<{ value?: string[] }> }) => {
      const chunks = query?.queryChunks ?? [];
      const sqlParts = chunks
        .filter((chunk) => chunk?.value)
        .map((chunk) => chunk.value?.join("") ?? "")
        .join(" ");
      lastSql = sqlParts;
      return { rows: [] };
    },
  };
  return { db };
});

// Auth mock
vi.mock("@/server/auth/user", () => ({
  getServerUserId: async () => "u1",
}));

// Processor mocks to verify dispatch
const runGmailSync = vi.fn(async () => {});
const runCalendarSync = vi.fn(async () => {});
const runNormalizeGoogleEmail = vi.fn(async () => {});
const runNormalizeGoogleEvent = vi.fn(async () => {});
const runEmbed = vi.fn(async () => {});
const runInsight = vi.fn(async () => {});

vi.mock("@/server/jobs/processors/sync", () => ({
  runGmailSync: (...args: unknown[]) => runGmailSync(...args),
  runCalendarSync: (...args: unknown[]) => runCalendarSync(...args),
}));
vi.mock("@/server/jobs/processors/normalize", () => ({
  runNormalizeGoogleEmail: (...args: unknown[]) => runNormalizeGoogleEmail(...args),
  runNormalizeGoogleEvent: (...args: unknown[]) => runNormalizeGoogleEvent(...args),
}));
vi.mock("@/server/jobs/processors/embed", () => ({
  runEmbed: (...args: unknown[]) => runEmbed(...args),
}));
vi.mock("@/server/jobs/processors/insight", () => ({
  runInsight: (...args: unknown[]) => runInsight(...args),
}));

// SUT imports after mocks
import { POST as runJobs } from "@/app/api/jobs/runner/route";
import { enqueue } from "@/server/jobs/enqueue";

beforeEach(() => {
  queuedJobs = [];
  lastSql = "";
  runGmailSync.mockClear();
  runCalendarSync.mockClear();
  runNormalizeGoogleEmail.mockClear();
  runNormalizeGoogleEvent.mockClear();
  runEmbed.mockClear();
  runInsight.mockClear();
});

describe("jobs runner dispatch", () => {
  it("calls the correct processor per JobKind and reports processed count", async () => {
    queuedJobs = [
      {
        id: "j1",
        userId: "u1",
        kind: "google_gmail_sync",
        payload: { batchId: "b1" },
        status: "queued",
        attempts: 0,
      },
      { id: "j2", userId: "u1", kind: "embed", payload: {}, status: "queued", attempts: 0 },
      {
        id: "j3",
        userId: "u1",
        kind: "normalize_google_event",
        payload: { batchId: "b2" },
        status: "queued",
        attempts: 0,
      },
    ];

    const res = await runJobs();
    const body = await res.json();
    expect(body.processed).toBe(3);

    expect(runGmailSync).toHaveBeenCalledTimes(1);
    expect(runEmbed).toHaveBeenCalledTimes(1);
    expect(runNormalizeGoogleEvent).toHaveBeenCalledTimes(1);
  });
});

describe("enqueue", () => {
  it("inserts a job row including batch_id when provided", async () => {
    const batchId = "11111111-1111-1111-1111-111111111111";
    await enqueue(
      "google_calendar_sync",
      { batchId },
      "00000000-0000-0000-0000-000000000001",
      batchId,
    );
    expect(lastSql).toContain("insert into jobs");
    expect(lastSql).toContain("batch_id");
  });
});
