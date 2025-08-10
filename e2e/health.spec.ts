import { test, expect } from "@playwright/test";

test("health endpoint", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 404]).toContain(res.status());
  if (res.status() === 200) {
    const json = await res.json();
    expect(json.ok).toBe(true);
    const reqId = res.headers()["x-request-id"];
    expect(typeof reqId).toBe("string");
    expect(reqId.length).toBeGreaterThan(0);
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["referrer-policy"]).toBe("no-referrer");
  }
});
