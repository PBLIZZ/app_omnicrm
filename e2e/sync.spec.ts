import { test, expect } from "@playwright/test";

test.describe("sync endpoints (deterministic)", () => {
  test("Prefs: PUT defaults, GET roundtrip 200", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping prefs roundtrip");
    const defaults = {
      gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
      gmailLabelIncludes: [],
      gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      calendarIncludeOrganizerSelf: "true",
      calendarIncludePrivate: "false",
      calendarTimeWindowDays: 60,
      driveIngestionMode: "none",
      driveFolderIds: [],
    };
    const put = await request.put("/api/settings/sync/prefs", {
      data: defaults,
      headers: { "x-user-id": "e2e" },
    });
    expect(put.status()).toBe(200);
    const get = await request.get("/api/settings/sync/prefs", {
      headers: { "x-user-id": "e2e" },
    });
    expect(get.status()).toBe(200);
    const body = await get.json();
    // Check a couple fields to confirm roundtrip
    expect(body.gmailQuery).toBe(defaults.gmailQuery);
    expect(body.calendarTimeWindowDays).toBe(defaults.calendarTimeWindowDays);
  });

  test("Status: returns 200/401 deterministically", async ({ request }) => {
    const unauth = await request.get("/api/settings/sync/status");
    expect([401, 404]).toContain(unauth.status());
    if (process.env["DATABASE_URL"]) {
      const authed = await request.get("/api/settings/sync/status", {
        headers: { "x-user-id": "e2e" },
      });
      expect([200, 404]).toContain(authed.status());
    }
  });

  test("Preview: flags OFF => 404; flags ON without Google => 401", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping preview checks");
    const gmailFlag = process.env["FEATURE_GOOGLE_GMAIL_RO"] === "1";
    const calFlag = process.env["FEATURE_GOOGLE_CALENDAR_RO"] === "1";
    const driveFlag = process.env["FEATURE_GOOGLE_DRIVE"] === "1";

    // Gmail
    if (!gmailFlag) {
      const r = await request.post("/api/sync/preview/gmail", { headers: { "x-user-id": "e2e" } });
      expect(r.status()).toBe(404);
    } else {
      const r = await request.post("/api/sync/preview/gmail", { headers: { "x-user-id": "e2e" } });
      expect(r.status()).toBe(401);
    }

    // Calendar
    if (!calFlag) {
      const r = await request.post("/api/sync/preview/calendar", {
        headers: { "x-user-id": "e2e" },
      });
      expect(r.status()).toBe(404);
    } else {
      const r = await request.post("/api/sync/preview/calendar", {
        headers: { "x-user-id": "e2e" },
      });
      expect(r.status()).toBe(401);
    }

    // Drive (optional)
    if (!driveFlag) {
      const r = await request.post("/api/sync/preview/drive", { headers: { "x-user-id": "e2e" } });
      expect(r.status()).toBe(404);
    } else {
      const r = await request.post("/api/sync/preview/drive", { headers: { "x-user-id": "e2e" } });
      expect([200, 401]).toContain(r.status());
    }
  });

  test("Approve -> Runner only with DATABASE_URL: processes >= 1", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping DB-coupled flow");

    // Approve Gmail if flag enabled; otherwise skip
    const approve = await request.post("/api/sync/approve/gmail", {
      headers: { "x-user-id": "e2e" },
    });
    if (approve.status() === 404) test.skip(true, "Gmail flag off; skipping");
    expect(approve.status()).toBe(200);
    const approveJson = await approve.json();
    expect(typeof approveJson.batchId).toBe("string");
    expect(approveJson.batchId.length).toBeGreaterThan(0);

    // Require a real Google connection to proceed deterministically
    const status = await request.get("/api/settings/sync/status", {
      headers: { "x-user-id": "e2e" },
    });
    expect([200, 404]).toContain(status.status());
    if (status.status() !== 200) test.skip(true, "Status route missing; skipping runner assertion");
    const statusJson = await status.json();
    if (!statusJson.googleConnected)
      test.skip(true, "No Google connection; skipping runner assertion");

    // Run queued jobs
    const run = await request.post("/api/jobs/runner", {
      headers: { "x-user-id": "e2e" },
    });
    expect(run.status()).toBe(200);
    const runJson = await run.json();
    expect(runJson.processed).toBeGreaterThanOrEqual(1);
  });
});
