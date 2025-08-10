import { test, expect } from "@playwright/test";

test("chat endpoint requires valid body and auth", async ({ request }) => {
  // With x-user-id but invalid body -> 400 invalid_body
  const bad = await request.post("/api/chat", {
    data: { prompt: "" },
    headers: { "x-user-id": "e2e" },
  });
  expect(bad.status()).toBe(400);
  const badJson = await bad.json();
  expect(badJson.error).toBe("invalid_body");

  // Without auth header -> 401
  const unauth = await request.post("/api/chat", { data: { prompt: "hi" } });
  expect(unauth.status()).toBe(401);
});
