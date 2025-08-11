import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

async function getCsrf(request: APIRequestContext): Promise<string> {
  // Safe request triggers CSRF issuance in middleware
  const res = await request.get("/api/health");
  const setCookies = res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
  const csrfCookie = setCookies.find((v) => v.startsWith("csrf="));
  expect(csrfCookie).toBeTruthy();
  return csrfCookie!.split(";")[0].split("=")[1];
}

test.describe("sync endpoints (deterministic)", () => {
  test("Prefs: unauthenticated returns 401 with CSRF", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping prefs checks");
    const csrf = await getCsrf(request);
    const put = await request.put("/api/settings/sync/prefs", {
      data: {},
      headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
    });
    expect(put.status()).toBe(401);
    const get = await request.get("/api/settings/sync/prefs", {
      headers: { "x-user-id": "e2e" },
    });
    expect(get.status()).toBe(401);
  });

  test("Status: returns 401 or 404 when unauthenticated", async ({ request }) => {
    const unauth = await request.get("/api/settings/sync/status");
    expect([401, 404]).toContain(unauth.status());
  });

  test("Preview: flags OFF => 404; flags ON without Google => 401 (with CSRF)", async ({
    request,
  }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping preview checks");
    const gmailFlag = process.env["FEATURE_GOOGLE_GMAIL_RO"] === "1";
    const calFlag = process.env["FEATURE_GOOGLE_CALENDAR_RO"] === "1";
    const driveFlag = process.env["FEATURE_GOOGLE_DRIVE"] === "1";
    const csrf = await getCsrf(request);

    // Gmail
    if (!gmailFlag) {
      const r = await request.post("/api/sync/preview/gmail", {
        headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
      });
      expect(r.status()).toBe(404);
    } else {
      const r = await request.post("/api/sync/preview/gmail", {
        headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
      });
      expect(r.status()).toBe(401);
    }

    // Calendar
    if (!calFlag) {
      const r = await request.post("/api/sync/preview/calendar", {
        headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
      });
      expect(r.status()).toBe(404);
    } else {
      const r = await request.post("/api/sync/preview/calendar", {
        headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
      });
      expect(r.status()).toBe(401);
    }

    // Drive (optional)
    if (!driveFlag) {
      const r = await request.post("/api/sync/preview/drive", {
        headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
      });
      expect(r.status()).toBe(404);
    } else {
      const r = await request.post("/api/sync/preview/drive", {
        headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
      });
      expect([200, 401]).toContain(r.status());
    }
  });

  test("Approve -> Runner only with DATABASE_URL: processes >= 1 (with CSRF)", async ({
    request,
  }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping DB-coupled flow");
    const csrf = await getCsrf(request);
    // Approve Gmail if flag enabled; otherwise skip
    const approve = await request.post("/api/sync/approve/gmail", {
      headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
    });
    if (approve.status() !== 200) test.skip(true, "Approve requires auth/flag; skipping");
    const approveJson = await approve.json();
    expect(typeof approveJson.batchId).toBe("string");
    expect(approveJson.batchId.length).toBeGreaterThan(0);

    // Require a real Google connection to proceed deterministically
    const status = await request.get("/api/settings/sync/status", {
      headers: { "x-user-id": "e2e" },
    });
    expect([200, 401, 404]).toContain(status.status());
    if (status.status() !== 200) test.skip(true, "Status route missing; skipping runner assertion");
    const statusJson = await status.json();
    if (!statusJson.googleConnected)
      test.skip(true, "No Google connection; skipping runner assertion");

    // Run queued jobs
    const run = await request.post("/api/jobs/runner", {
      headers: { "x-user-id": "e2e", "x-csrf-token": csrf },
    });
    expect(run.status()).toBe(200);
    const runJson = await run.json();
    expect(runJson.processed).toBeGreaterThanOrEqual(1);
  });
});
