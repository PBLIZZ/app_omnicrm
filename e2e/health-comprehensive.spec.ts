import { test, expect } from "@playwright/test";

test.describe("Health Endpoint E2E", () => {
  test("returns OK path with correct envelope and timestamp format", async ({ request }) => {
    const res = await request.get("/api/health");

    // Should always return 200 for health checks
    expect(res.status()).toBe(200);

    const json = await res.json();

    // Verify envelope structure
    expect(json.ok).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.ts).toBeDefined();
    expect(typeof json.data.ts).toBe("string");

    // Verify timestamp is valid ISO string
    const timestamp = json.data.ts;
    const parsedDate = new Date(timestamp);
    expect(parsedDate.toISOString()).toBe(timestamp);

    // Timestamp should be recent (within last 10 seconds)
    const now = new Date();
    const timeDiff = now.getTime() - parsedDate.getTime();
    expect(timeDiff).toBeLessThan(10000); // 10 seconds

    // Database status should be boolean or undefined
    if (json.data.db !== undefined) {
      expect(typeof json.data.db).toBe("boolean");
    }
  });

  test("includes proper security headers", async ({ request }) => {
    const res = await request.get("/api/health");

    // Verify security headers are present
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["referrer-policy"]).toBe("no-referrer");

    // Verify CSP header is present and contains key directives
    const csp = res.headers()["content-security-policy"] || "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("includes request ID header", async ({ request }) => {
    const res = await request.get("/api/health");

    const reqId = res.headers()["x-request-id"];
    expect(typeof reqId).toBe("string");
    expect(reqId.length).toBeGreaterThan(0);
  });

  test("rejects non-GET methods with 403/405", async ({ request }) => {
    // Test POST method - middleware may return 403 or Next.js may return 405
    const postRes = await request.post("/api/health", {
      data: { test: "data" },
    });
    expect([403, 405]).toContain(postRes.status());

    // Test PUT method
    const putRes = await request.put("/api/health", {
      data: { test: "data" },
    });
    expect([403, 405]).toContain(putRes.status());

    // Test DELETE method
    const deleteRes = await request.delete("/api/health");
    expect([403, 405]).toContain(deleteRes.status());

    // Test PATCH method
    const patchRes = await request.patch("/api/health", {
      data: { test: "data" },
    });
    expect([403, 405]).toContain(patchRes.status());
  });

  test("handles concurrent requests properly", async ({ request }) => {
    // Fire multiple concurrent requests
    const promises = Array.from({ length: 5 }, () => request.get("/api/health"));
    const responses = await Promise.all(promises);

    // All should return 200
    responses.forEach((res) => {
      expect(res.status()).toBe(200);
    });

    // All should have valid envelope structure
    const jsonPromises = responses.map((res) => res.json());
    const jsonResponses = await Promise.all(jsonPromises);

    jsonResponses.forEach((json) => {
      expect(json.ok).toBe(true);
      expect(json.data.ts).toBeDefined();
      expect(typeof json.data.ts).toBe("string");
    });
  });

  test("response time is under performance threshold", async ({ request }) => {
    const startTime = Date.now();
    const res = await request.get("/api/health");
    const endTime = Date.now();

    expect(res.status()).toBe(200);

    // Health endpoint should respond quickly (under 2 seconds for CI environment)
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(2000);
  });

  test("maintains consistent response format across multiple calls", async ({ request }) => {
    // Make multiple calls and verify consistency
    const responses = [];
    for (let i = 0; i < 3; i++) {
      const res = await request.get("/api/health");
      expect(res.status()).toBe(200);
      responses.push(await res.json());
    }

    // All responses should have the same structure
    responses.forEach((json) => {
      expect(json.ok).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.ts).toBeDefined();
      expect(typeof json.data.ts).toBe("string");

      // Database field should be consistent type (if present)
      const dbField = json.data.db;
      if (dbField !== undefined) {
        expect(typeof dbField).toBe("boolean");
      }
    });
  });

  // This test simulates a database failure scenario
  // In a real environment, this would require mocking or test database manipulation
  test("handles database connection issues gracefully", async ({ request }) => {
    // This is a placeholder test - in a real scenario you would:
    // 1. Mock the database connection to fail
    // 2. Or use a test database that can be controlled
    // 3. Or use environment variables to simulate failure

    const res = await request.get("/api/health");
    expect(res.status()).toBe(200); // Should always return 200

    const json = await res.json();
    expect(json.ok).toBe(true); // Should always have ok: true envelope
    expect(json.data.ts).toBeDefined();

    // Database field might be false in case of connection issues
    if (json.data.db === false) {
      // This is acceptable - health endpoint should not fail even if DB is down
      expect(typeof json.data.db).toBe("boolean");
    }
  });
});
