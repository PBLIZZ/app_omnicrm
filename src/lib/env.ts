import { z } from "zod";

// Centralized environment validation. This module should be imported by
// server-only code at module load so the app fails fast when misconfigured.

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: "Invalid NEXT_PUBLIC_SUPABASE_URL" }),
  // Required publishable key for browser/server RLS client
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  APP_ENCRYPTION_KEY: z.string().min(1, "APP_ENCRYPTION_KEY is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_REDIRECT_URI: z.string().url({ message: "Invalid GOOGLE_REDIRECT_URI" }),
  // Optional tunables with sane defaults
  API_RATE_LIMIT_PER_MIN: z.string().optional(),
  API_MAX_JSON_BYTES: z.string().optional(),
  APP_ORIGINS: z.string().optional(),
});

function validateEncryptionKey(value: string): void {
  // Prefer 32-byte base64; allow hex or utf8 length >= 32 for compatibility
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0;
  if (isBase64) {
    try {
      if (Buffer.from(value, "base64").length >= 32) return;
    } catch {
      // fallthrough
    }
  }
  const isHex = /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
  if (isHex && Buffer.from(value, "hex").length >= 32) return;
  if (Buffer.from(value, "utf8").length >= 32) return;
  throw new Error(
    "APP_ENCRYPTION_KEY must be a 32-byte key (base64 preferred; hex or utf8 length >= 32 accepted)",
  );
}

export type Env = z.infer<typeof baseSchema> & { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string };

export const env: Env = (() => {
  const parsed = baseSchema.parse(process.env);

  // Publishable key resolution (single source of truth)
  const pubKey = parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  const secretKey = parsed.SUPABASE_SECRET_KEY;

  // Service-role key required in production (server-side only)
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
      console.warn("Missing FEATURE_GOOGLE_* flags", {
        FEATURE_GOOGLE_GMAIL_RO: gmail == null,
        FEATURE_GOOGLE_CALENDAR_RO: cal == null,
      });
    }
  }

  return {
    ...parsed,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pubKey,
    SUPABASE_SECRET_KEY: secretKey,
  } as Env;
})();
