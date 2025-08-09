import { test, expect } from "@playwright/test";

test("chat endpoint validation", async ({ page }) => {
  const res = await page.request.post("/api/chat", {
    data: { prompt: "" },
    headers: { "x-user-id": "e2e" },
  });
  expect(res.status()).toBe(400);
  const json = await res.json();
  expect(json.error).toBe("invalid_body");
});
