import { z } from "zod";

// Centralized environment validation. This module should be imported by
// server-only code at module load so the app fails fast when misconfigured.

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid NEXT_PUBLIC_SUPABASE_URL"),
  // Required publishable key for browser/server RLS client
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  APP_ENCRYPTION_KEY: z.string().min(1, "APP_ENCRYPTION_KEY is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  // Service-specific Google OAuth redirect URIs
  GOOGLE_GMAIL_REDIRECT_URI: z.string().url("Invalid GOOGLE_GMAIL_REDIRECT_URI").optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().url("Invalid GOOGLE_CALENDAR_REDIRECT_URI").optional(),
  // AI / Providers
  OPENROUTER_API_KEY: z.string().optional(),
  AI_MODEL_CHAT: z.string().default("openrouter/auto"),
  AI_MODEL_EMBED: z.string().default("openai/text-embedding-3-large"),
  AI_MODEL_SUMMARY: z.string().default("openrouter/auto"),
  // Optional tunables with sane defaults
  API_RATE_LIMIT_PER_MIN: z.string().optional(),
  API_MAX_JSON_BYTES: z.string().optional(),
  APP_ORIGINS: z.string().optional(),
  // Redis configuration for rate limiting
  UPSTASH_REDIS_REST_URL: z.string().url("Invalid UPSTASH_REDIS_REST_URL").optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required").optional(),
  // AWS KMS configuration for secure credential management
  AWS_REGION: z.string().default("us-east-1"),
  AWS_KMS_KEY_ID: z
    .string()
    .min(1, "AWS_KMS_KEY_ID is required for secure credential management")
    .optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),
  // Sentry configuration for error tracking
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.startsWith("https://"),
      "NEXT_PUBLIC_SENTRY_DSN must be a valid Sentry DSN URL or empty",
    ),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

export type Env = z.infer<typeof baseSchema> & {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_APP_URL: string;
  SUPABASE_SECRET_KEY: string | undefined;
};

// Type-safe global access interface
interface GlobalWithBuffer {
  Buffer?: {
    from(data: string, encoding: "base64" | "utf8"): { length: number };
  };
  atob?: (data: string) => string;
}

// Edge-safe byte length helpers (prefer Web APIs, fallback to Buffer if present)
function byteLengthBase64(v: string): number {
  try {
    // Node fallback
    const g = globalThis as GlobalWithBuffer;
    if (typeof g?.Buffer !== "undefined") return g.Buffer.from(v, "base64").length;
  } catch {
    // ignore
  }
  try {
    const g = globalThis as GlobalWithBuffer;
    if (g && typeof g.atob === "function") return g.atob(v).length;
  } catch {
    // ignore
  }
  return 0;
}

function byteLengthHex(v: string): number {
  return v.length % 2 === 0 ? v.length / 2 : 0;
}

function byteLengthUtf8(v: string): number {
  try {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(v).length;
  } catch {
    // ignore
  }
  try {
    const g = globalThis as GlobalWithBuffer;
    if (typeof g?.Buffer !== "undefined") return g.Buffer.from(v, "utf8").length;
  } catch {
    // ignore
  }
  return v.length;
}

function validateEncryptionKey(value: string): void {
  // Prefer 32-byte base64; allow hex or utf8 length >= 32 for compatibility
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0;
  if (isBase64 && byteLengthBase64(value) >= 32) return;

  const isHex = /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
  if (isHex && byteLengthHex(value) >= 32) return;

  if (byteLengthUtf8(value) >= 32) return;

  throw new Error(
    "APP_ENCRYPTION_KEY must be a 32-byte key (base64 preferred; hex or utf8 length >= 32 accepted)",
  );
}

export const env: Env = ((): Env => {
  const parsed = baseSchema.parse(process.env);

  // Publishable key resolution (single source of truth)
  const pubKey = parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  const secretKey: string | undefined = parsed.SUPABASE_SECRET_KEY;

  // Secret key required in production (server-side only)
  if (parsed.NODE_ENV === "production" && !secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required in production");
  }

  // Encryption key validation (fail-fast)
  validateEncryptionKey(parsed.APP_ENCRYPTION_KEY);

  // Runtime guard: only warn outside production if feature flags are missing
  if (parsed.NODE_ENV !== "production") {
    const gmail = process.env["FEATURE_GOOGLE_GMAIL_RO"];
    const cal = process.env["FEATURE_GOOGLE_CALENDAR_RO"];
    if (gmail == null || cal == null) {
      console.warn("[ENV] Missing FEATURE_GOOGLE_* flags:", {
        FEATURE_GOOGLE_GMAIL_RO: gmail == null,
        FEATURE_GOOGLE_CALENDAR_RO: cal == null,
      });
    }
    if (!parsed.OPENROUTER_API_KEY) {
      console.warn("[ENV] OPENROUTER_API_KEY not set; AI provider calls will be disabled");
    }
  }

  return {
    ...parsed,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pubKey,
    SUPABASE_SECRET_KEY: secretKey,
  } as Env;
})();
