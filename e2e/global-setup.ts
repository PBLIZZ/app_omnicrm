import { request } from "@playwright/test";

export default async function globalSetup() {
  // Give the dev server a moment to boot, then poll /api/health
  const baseURL = process.env["PLAYWRIGHT_TEST_BASE_URL"] ?? "http://localhost:3000";
  const healthUrl = `${baseURL}/api/health`;
  const ctx = await request.newContext();
  const deadline = Date.now() + 60_000;

  // Poll until 200 or 404 (404 means route not present; skip waiting)
  // If server not up yet, continue retrying until deadline
  while (Date.now() < deadline) {
    try {
      const res = await ctx.get(healthUrl, { timeout: 2_000 });
      const status = res.status();
      if (status === 200) return; // healthy
      if (status === 404) return; // no health route; do not block
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}
