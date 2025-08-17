import "@testing-library/jest-dom/vitest";
// Ensure env defaults for tests that rely on Google OAuth configuration
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test";
process.env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://example.com/callback";
// Defaults needed for env schema in unit tests
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "public-key";
process.env.APP_ENCRYPTION_KEY =
  process.env.APP_ENCRYPTION_KEY || "a_secure_but_test_only_encryption_key_32b";
