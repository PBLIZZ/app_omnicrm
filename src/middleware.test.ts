import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Import middleware after setting env per test to ensure it reads current env
async function loadMiddleware() {
  const mod = await import("./middleware");
  return mod.middleware as (req: NextRequest) => Promise<Response>;
}

function makeReq(path: string, opts?: { method?: string; headers?: Record<string, string> }) {
  const method = opts?.method ?? "GET";
  const headers = new Headers(opts?.headers ?? {});
  return new NextRequest(new URL(`https://example.com${path}`), { method, headers });
}

describe("middleware: API method allow-list", () => {
  beforeEach(() => {
    // Stable env each test
    process.env.NODE_ENV = "test";
  });

  it("allows POST on /api/sync/approve/* and sets Allow header for disallowed methods", async () => {
    const middleware = await loadMiddleware();
    const okReq = makeReq("/api/sync/approve/gmail", { method: "POST" });
    const okRes = await middleware(okReq);
    expect(okRes.status).toBe(200);

    const badReq = makeReq("/api/sync/approve/gmail", { method: "GET" });
    const badRes = await middleware(badReq);
    expect(badRes.status).toBe(405);
    expect(badRes.headers.get("Allow")).toBe("POST, OPTIONS");
  });

  it("allows POST on /api/sync/preview/* and rejects others with 405", async () => {
    const middleware = await loadMiddleware();
    const okReq = makeReq("/api/sync/preview/gmail", { method: "POST" });
    const okRes = await middleware(okReq);
    expect(okRes.status).toBe(200);

    const badReq = makeReq("/api/sync/preview/gmail", { method: "DELETE" });
    const badRes = await middleware(badReq);
    expect(badRes.status).toBe(405);
  });
});
