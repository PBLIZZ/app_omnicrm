import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NextResponse.json to return a proper response object
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown) => ({
      json: async () => data,
      headers: new Map(),
    }),
  },
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
          limit: async () => [], // enqueue duplicate check expects empty array
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (data: unknown) => {
        lastSql = `insert into jobs (kind, payload, user_id, status${
          (data as { batchId?: string } | null)?.batchId ? ", batch_id" : ""
        })`;
        return Promise.resolve([{ id: "new-job-id" }]);
      },
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: "claimed" }],
        }),
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
  return { getDb: async () => db, db };
});

// Auth mock
vi.mock("@/server/auth/user", () => ({
  getServerUserId: async () => "u1",
}));

// Mock the job processing service to return expected results
vi.mock("@/server/services/job-processing.service", () => ({
  processUserSpecificJobsService: vi.fn().mockResolvedValue({
    processed: 3,
    succeeded: 3,
    failed: 0,
    errors: [],
  }),
}));

// Mock Next.js cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

// Processor mocks to verify dispatch (use hoisted vars to satisfy Vitest hoisting)
const mocks = vi.hoisted(() => {
  return {
    runGmailSync: vi.fn(async () => {}),
    runCalendarSync: vi.fn(async () => {}),
    runNormalizeGoogleEmail: vi.fn(async () => {}),
    runNormalizeGoogleEvent: vi.fn(async () => {}),
    runEmbed: vi.fn(async () => {}),
    runInsight: vi.fn(async () => {}),
  };
});
const {
  runGmailSync,
  runCalendarSync,
  runNormalizeGoogleEmail,
  runNormalizeGoogleEvent,
  runEmbed,
  runInsight,
} = mocks;
vi.mock("@/server/jobs/processors/sync", () => ({
  runGmailSync: mocks.runGmailSync,
  runCalendarSync: mocks.runCalendarSync,
}));
vi.mock("@/server/jobs/processors/normalize", () => ({
  runNormalizeGoogleEmail: mocks.runNormalizeGoogleEmail,
  runNormalizeGoogleEvent: mocks.runNormalizeGoogleEvent,
}));
vi.mock("@/server/jobs/processors/embed", () => ({
  runEmbed: mocks.runEmbed,
}));
vi.mock("@/server/jobs/processors/insight", () => ({
  runInsight: mocks.runInsight,
}));

// SUT imports after mocks
import { POST as runJobs } from "../../../app/api/jobs/runner/route";
import { enqueue } from "../../../server/jobs/enqueue";

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

    // Mock request with headers for CSRF token and proper body
    const mockRequest = new Request("http://localhost/api/jobs/runner", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "test-token",
      },
      body: JSON.stringify({}), // Empty object to satisfy SimpleJobProcessSchema
    });

    const res = await runJobs(mockRequest, { params: Promise.resolve({}) });
    const body = await res.json();
    expect(body.processed).toBe(3);
    expect(body.succeeded).toBe(3);
    expect(body.failed).toBe(0);
    expect(body.message).toBe("Processed 3 jobs: 3 succeeded, 0 failed");
    expect(body.runner).toBe("job_runner");
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
