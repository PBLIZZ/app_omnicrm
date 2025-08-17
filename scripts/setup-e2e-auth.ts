#!/usr/bin/env tsx
// E2E test authentication setup script
// Creates real test user and OAuth tokens for e2e tests

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { setupTestOAuthTokens } from "../src/server/test/setup-oauth";

// Load environment variables from .env.local
config({ path: ".env.local" });

const E2E_USER_ID = "3550f627-dbd7-4c5f-a13f-e59295c14676";
const E2E_USER_EMAIL = "test-e2e@example.com";
const E2E_USER_PASSWORD = "test-e2e-password-123";

async function setupE2EAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }

  // Use service role client to create test user
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Create or update test user
    const { error: userError } = await supabase.auth.admin.createUser({
      user_id: E2E_USER_ID,
      email: E2E_USER_EMAIL,
      password: E2E_USER_PASSWORD,
      email_confirm: true,
    });

    if (
      userError &&
      !userError.message.includes("already registered") &&
      userError.code !== "email_exists"
    ) {
      throw userError;
    }

    // Set up OAuth tokens if provided
    if (process.env.E2E_GOOGLE_ACCESS_TOKEN) {
      await setupTestOAuthTokens(E2E_USER_ID);
    }

    return {
      success: true,
      userId: E2E_USER_ID,
      email: E2E_USER_EMAIL,
      hasOAuth: !!process.env.E2E_GOOGLE_ACCESS_TOKEN,
    };
  } catch (error) {
    throw new Error(
      `Failed to setup E2E auth: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

setupE2EAuth()
  .then((result) => {
    if (result.success) {
      process.stdout.write(`✓ E2E auth setup complete\n`);
      process.stdout.write(`  User: ${result.email}\n`);
      process.stdout.write(`  OAuth: ${result.hasOAuth ? "configured" : "not provided"}\n`);
    }
  })
  .catch((error) => {
    process.stderr.write(`❌ ${error.message}\n`);
    process.exit(1);
  });
