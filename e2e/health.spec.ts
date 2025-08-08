import { test, expect } from "@playwright/test";

test("health endpoint", async ({ page }) => {
  const res = await page.request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.ok).toBe(true);
});