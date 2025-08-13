import { NextRequest, NextResponse } from "next/server";
import "@/lib/env"; // fail-fast env validation at edge import
import { hmacSign, hmacVerify, randomNonce } from "@/server/lib/crypto-edge";

// Configurable limits (env or sane defaults)
const MAX_JSON_BYTES = Number(process.env["API_MAX_JSON_BYTES"] ?? 1_000_000); // 1MB
const RATE_LIMIT_RPM = Number(process.env["API_RATE_LIMIT_PER_MIN"] ?? 60);

// very small in-memory token bucket per process; good enough for dev/preview
const buckets = new Map<string, { count: number; resetAt: number }>();

function allowRequest(key: string): boolean {
  const now = Date.now();
  const minute = 60_000;
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + minute });
    return true;
  }
  if (bucket.count < RATE_LIMIT_RPM) {
    bucket.count++;
    return true;
  }
  return false;
}

export async function middleware(req: NextRequest) {
  // Generate a per-request nonce and forward it to the app via request headers
  const forwardHeaders = new Headers(req.headers);
  const cspNonce = randomNonce(18);
  forwardHeaders.set("x-nonce", cspNonce);
  forwardHeaders.set("x-csp-nonce", cspNonce);
  forwardHeaders.set("x-nextjs-nonce", cspNonce);
  const res = NextResponse.next({ request: { headers: forwardHeaders } });
  const requestId =
    (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2)) || "unknown";
  res.headers.set("x-request-id", requestId);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // CSP: strict in production, relaxed in development for HMR
  const isProd = process.env.NODE_ENV === "production";
  // Expose nonce on the response as well for debugging/clients if needed
  res.headers.set("x-nonce", cspNonce);
  res.headers.set("x-csp-nonce", cspNonce);
  res.headers.set("x-nextjs-nonce", cspNonce);

  function buildCsp(prod: boolean, nonce: string): string {
    const directives: Array<string> = [];
    // Baseline restrictions
    directives.push("default-src 'self'");
    directives.push("base-uri 'self'");
    directives.push("form-action 'self'");
    directives.push("object-src 'none'");
    directives.push("frame-ancestors 'none'");

    // Scripts:
    // - Development: allow eval and inline for HMR/react-refresh.
    // - Production: strict (no inline/eval); require nonce for inline and allow same-origin script elements.
    if (prod) {
      directives.push(`script-src 'self' 'nonce-${nonce}'`);
      directives.push(`script-src-elem 'self' 'nonce-${nonce}'`);
    } else {
      directives.push(
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic' 'nonce-${nonce}' blob:`,
      );
    }

    // Styles:
    // - Production: strict — require nonce on style elements, disallow style attributes.
    // - Development: allow inline for convenience.
    if (prod) {
      directives.push("style-src 'self'");
      directives.push(`style-src-elem 'self' 'nonce-${nonce}'`);
    } else {
      // In development do not require nonce on <style> elements to avoid HMR/React dev tool conflicts
      directives.push("style-src 'self' 'unsafe-inline'");
    }

    // Images and fonts
    directives.push("img-src 'self' data: blob: https:");
    directives.push("font-src 'self' data:");

    // Connections (APIs, websockets)
    const baseConnect = ["'self'", "https://*.supabase.co", "https://www.googleapis.com"];
    if (!prod) {
      baseConnect.push("http://localhost:3000", "ws://localhost:3000");
    }
    // If deployed on Vercel edge/functions that call back to *.vercel.app, retain allowlist
    baseConnect.push("https://*.vercel.app");
    directives.push(`connect-src ${[...new Set(baseConnect)].join(" ")}`);

    return directives.join("; ") + ";";
  }
  res.headers.set("Content-Security-Policy", buildCsp(isProd, cspNonce));

  const url = req.nextUrl;
  const isApi = url.pathname.startsWith("/api/");

  // Proactively issue CSRF cookies on any safe request (pages or API) if missing
  const hasCsrfEarly =
    Boolean(req.cookies.get("csrf")?.value) && Boolean(req.cookies.get("csrf_sig")?.value);
  const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (isSafeMethod && !hasCsrfEarly) {
    const nonce = randomNonce(18);
    const sig = await hmacSign(nonce);
    res.cookies.set("csrf", nonce, {
      httpOnly: false,
      sameSite: "strict",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60,
    });
    res.cookies.set("csrf_sig", sig, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60,
    });
  }

  if (!isApi) return res;

  // Method allow-list for selected API route families
  const p = url.pathname;
  const allowedByPrefix: Array<{ prefix: string; methods: string[] }> = [
    { prefix: "/api/sync/approve/", methods: ["POST", "OPTIONS"] },
    { prefix: "/api/sync/preview/", methods: ["POST", "OPTIONS"] },
  ];
  for (const rule of allowedByPrefix) {
    if (p.startsWith(rule.prefix) && !rule.methods.includes(req.method)) {
      return new NextResponse(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { "content-type": "application/json", Allow: rule.methods.join(", ") },
      });
    }
  }

  // CORS: allow only same-origin or configured origins
  const origin = req.headers.get("origin");
  const appOrigins = (process.env["APP_ORIGINS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowOrigin = !origin || origin === url.origin || appOrigins.includes(origin);
  if (!allowOrigin && req.method !== "OPTIONS") {
    return new NextResponse("", { status: 403 });
  }
  if (origin) {
    res.headers.set("Vary", "Origin");
    if (allowOrigin) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-csrf-token, x-requested-with",
      );
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    }
    if (req.method === "OPTIONS") return res;
  }

  // Rate limit by IP + user if available (via Supabase cookie presence is opaque; key by IP+cookie length)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    (req as NextRequest & { ip?: string }).ip ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const sessionLen = (req.cookies.get("sb:token")?.value ?? "").length;
  const key = `${ip}:${sessionLen}`;
  if (!allowRequest(key)) {
    return new NextResponse(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }

  // Body size cap for JSON
  const ct = req.headers.get("content-type") || "";
  if (/application\/json/i.test(ct)) {
    const len = Number(req.headers.get("content-length") || 0);
    if (len > MAX_JSON_BYTES) {
      return new NextResponse(JSON.stringify({ error: "payload_too_large" }), {
        status: 413,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // Proactively issue CSRF cookies on safe requests if missing
  const hasCsrf =
    Boolean(req.cookies.get("csrf")?.value) && Boolean(req.cookies.get("csrf_sig")?.value);
  const isUnsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (!isUnsafe && !hasCsrf) {
    const nonce = randomNonce(18);
    const sig = await hmacSign(nonce);
    res.cookies.set("csrf", nonce, {
      httpOnly: false,
      sameSite: "strict",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60,
    });
    res.cookies.set("csrf_sig", sig, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60,
    });
  }

  // CSRF: for mutating requests from browsers, require custom header with signed token
  // In unit tests, skip CSRF enforcement; end-to-end tests cover it explicitly.
  if (isUnsafe && process.env.NODE_ENV !== "test") {
    const nonceCookie = req.cookies.get("csrf")?.value;
    const sigCookie = req.cookies.get("csrf_sig")?.value;
    const csrfHeader = req.headers.get("x-csrf-token") || "";
    if (!nonceCookie || !sigCookie) {
      // issue tokens to be used on next request (double-submit cookie)
      const nonce = randomNonce(18);
      const sig = await hmacSign(nonce);
      // Create the actual response to return and attach cookies to it
      const out = new NextResponse(JSON.stringify({ error: "missing_csrf" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
      out.cookies.set("csrf", nonce, {
        httpOnly: false,
        sameSite: "strict",
        secure: isProd,
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });
      out.cookies.set("csrf_sig", sig, {
        httpOnly: true,
        sameSite: "strict",
        secure: isProd,
        path: "/",
        maxAge: 60 * 60,
      });
      return out;
    } else {
      if (
        !csrfHeader ||
        csrfHeader !== nonceCookie ||
        !(await hmacVerify(nonceCookie, sigCookie))
      ) {
        return new NextResponse(JSON.stringify({ error: "invalid_csrf" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
    }
  }

  return res;
}
