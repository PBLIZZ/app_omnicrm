import { test, expect } from "@playwright/test";

test("chat endpoint requires CSRF and auth", async ({ request }) => {
  // Missing CSRF for unsafe method -> 403 and CSRF cookies issued
  const first = await request.post("/api/chat", { data: { prompt: "hi" } });
  expect(first.status()).toBe(403);

  // Extract csrf cookie from Set-Cookie headers
  const setCookies = first
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
  const csrfCookie = setCookies.find((v) => v.startsWith("csrf="));
  expect(csrfCookie).toBeTruthy();
  if (!csrfCookie) {
    throw new Error("CSRF cookie not found in response");
  }
  const csrf = csrfCookie.split(";")[0].split("=")[1];

  // With CSRF but no auth -> 401
  const unauth = await request.post("/api/chat", {
    data: { prompt: "hi" },
    headers: { "x-csrf-token": csrf },
  });
  expect(unauth.status()).toBe(401);
});
