#!/usr/bin/env tsx
// E2E test authentication setup script
// Creates real test user and OAuth tokens for e2e tests

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { setupTestOAuthTokens } from "../src/server/test/setup-oauth";
import { logSync } from "../src/lib/api/sync-audit";
import { appendFileSync } from "fs";

// Load environment variables from .env.local
config({ path: ".env.local" });

function logToFile(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] E2E Setup: ${message}\n`;
  appendFileSync("log.txt", logMessage);
}

const E2E_USER_ID = "3550f627-dbd7-4c5f-a13f-e59295c14676";
const E2E_USER_EMAIL = "test-e2e@example.com";
const E2E_USER_PASSWORD = "test-e2e-password-123";

async function setupE2EAuth(): Promise<void> {
  logToFile("Starting E2E authentication setup");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    const error = "Missing Supabase configuration";
    logToFile(`Error: ${error}`);
    throw new Error(error);
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

    logToFile(`Test user ready: ${E2E_USER_EMAIL}`);

    // Set up OAuth tokens if provided
    if (process.env.E2E_GOOGLE_ACCESS_TOKEN) {
      await setupTestOAuthTokens(E2E_USER_ID);
      // Log the OAuth setup for audit trail
      await logSync(E2E_USER_ID, "gmail", "preview", { step: "e2e_test_setup" });
      logToFile("OAuth tokens configured");
    } else {
      logToFile("No OAuth tokens provided");
    }

    logToFile("E2E authentication setup completed successfully");

    return {
      success: true,
      userId: E2E_USER_ID,
      email: E2E_USER_EMAIL,
      hasOAuth: !!process.env.E2E_GOOGLE_ACCESS_TOKEN,
    };
  } catch (error) {
    const errorMessage = `Failed to setup E2E auth: ${error instanceof Error ? error.message : String(error)}`;
    logToFile(`Error: ${errorMessage}`);
    throw new Error(errorMessage);
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
