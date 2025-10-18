/**
 * Comprehensive Playwright tests to analyze Gmail connection and contact sync flow issues
 *
 * This test suite identifies integration gaps between new backend APIs and existing frontend routes
 * Based on user feedback about broken flows in:
 * 1. Dashboard → Manual Sync → Generate Preview (shows 0 emails, no save button for preferences)
 * 2. Settings → Sync Preferences (old component, no update button, preview doesn't work)
 * 3. Dashboard → Connect Data → Sync Gmail (gets "google_not_connected" errors)
 */

import { test, expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

async function getCsrf(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/health");
  const setCookies = res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
  const csrfCookie = setCookies.find((v) => v.startsWith("csrf="));
  expect(csrfCookie).toBeTruthy();
  if (!csrfCookie) {
    throw new Error("CSRF cookie not found in response");
  }
  return csrfCookie.split(";")[0].split("=")[1];
}

async function authenticateTestUser(page: Page): Promise<void> {
  // Mock authentication for E2E tests
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Check if already authenticated
  const url = page.url();
  if (url.includes("/dashboard") || url.includes("/contacts")) {
    return; // Already authenticated
  }

  // Fill login form if present
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill("test-e2e@example.com");
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await passwordInput.fill("test-e2e-password-123");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForLoadState("networkidle");
  }
}

test.describe("Gmail Integration Analysis - Broken Existing Flows", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page);
  });

  test("Dashboard Manual Sync - Documents broken flow", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping manual sync tests");

    await page.goto("/dashboard/manual-sync");
    await page.waitForLoadState("networkidle");

    // Check page loads correctly
    await expect(page.getByRole("heading", { name: "Manual Sync" })).toBeVisible();

    // Check Gmail scope controls
    const gmailSwitch = page.locator("#gmail-switch");
    await expect(gmailSwitch).toBeVisible();

    // Test Generate Preview functionality
    const generatePreviewButton = page.getByRole("button", { name: "Generate Preview" });
    await expect(generatePreviewButton).toBeVisible();

    // Enable Gmail and try to generate preview
    if (await gmailSwitch.isEnabled()) {
      await gmailSwitch.click();
      await generatePreviewButton.click();

      // Wait for preview response and check for issues
      await page.waitForTimeout(3000);

      // Look for error indicators or empty results
      const errorMessages = page.locator('[role="alert"], .text-red-500, .text-destructive');
      const previewSection = page.locator(
        '[data-testid="preview"], .space-y-4:has-text("Preview")',
      );

      // Document the state
      const hasError = (await errorMessages.count()) > 0;
      const hasPreview = await previewSection.isVisible();

      console.log(`Manual Sync Preview Test Results:
        - Error messages found: ${hasError}
        - Preview section visible: ${hasPreview}
        - Gmail switch enabled: ${await gmailSwitch.isEnabled()}
      `);

      // Check for specific issues mentioned in user feedback
      const emailCount = await page.locator('text~="\\d+ emails"').count();
      if (emailCount === 0) {
        console.log("Issue confirmed: Shows 0 emails in preview");
      }
    } else {
      console.log("Gmail switch is disabled - likely no Google connection");
    }

    // Check for preferences save functionality
    const saveButton = page.getByRole("button", { name: /save|update/i });
    const saveButtonExists = (await saveButton.count()) > 0;
    console.log(`Save button for preferences exists: ${saveButtonExists}`);
  });

  test("Settings Sync Preferences - Documents old component issues", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping sync preferences tests");

    await page.goto("/settings/sync-preferences");
    await page.waitForLoadState("networkidle");

    // Check page loads correctly
    await expect(page.getByRole("heading", { name: "Sync Settings" })).toBeVisible();

    // Check for connection status
    const connectionCard = page.locator(
      '[data-testid="connection-status"], .space-y-3:has-text("Google Connected")',
    );
    await expect(connectionCard).toBeVisible();

    // Check for configuration sections
    const gmailSection = page.locator('[data-testid="gmail-config"], .space-y-4:has-text("Gmail")');
    const calendarSection = page.locator(
      '[data-testid="calendar-config"], .space-y-4:has-text("Calendar")',
    );

    // Test preview functionality
    const previewButton = page.getByRole("button", { name: /preview|generate/i });
    const updateButton = page.getByRole("button", { name: /update|save/i });

    console.log(`Sync Preferences Test Results:
      - Gmail section visible: ${await gmailSection.isVisible()}
      - Calendar section visible: ${await calendarSection.isVisible()}
      - Preview button exists: ${(await previewButton.count()) > 0}
      - Update button exists: ${(await updateButton.count()) > 0}
    `);

    // Try to test preview if button exists
    if ((await previewButton.count()) > 0) {
      await previewButton.click();
      await page.waitForTimeout(2000);

      // Check for preview results or errors
      const errorMessages = page.locator('[role="alert"], .text-red-500, .text-destructive');
      const hasErrors = (await errorMessages.count()) > 0;

      if (hasErrors) {
        const errorText = await errorMessages.first().textContent();
        console.log(`Preview error detected: ${errorText}`);
      }
    }
  });

  test("Dashboard Connect Data - Documents google_not_connected errors", async ({ page }) => {
    await page.goto("/dashboard/connect");
    await page.waitForLoadState("networkidle");

    // Check page loads correctly
    await expect(page.getByRole("heading", { name: "Connect Data Sources" })).toBeVisible();

    // Find Gmail sync button
    const gmailCard = page.locator(
      '.space-y-6:has-text("Email Integration"), .hover\\:shadow-md:has-text("Gmail")',
    );
    await expect(gmailCard).toBeVisible();

    // Look for sync button
    const syncButton = gmailCard.getByRole("button", { name: /sync gmail|sync now/i });

    if ((await syncButton.count()) > 0) {
      // Try to click sync and capture errors
      await syncButton.click();
      await page.waitForTimeout(2000);

      // Check for dialog or errors
      const errorDialog = page.locator('[role="dialog"], .fixed:has-text("error")');
      const errorToast = page.locator("[data-sonner-toast], .bg-destructive, .text-red-500");

      const hasDialog = (await errorDialog.count()) > 0;
      const hasToast = (await errorToast.count()) > 0;

      console.log(`Connect Data Sync Test Results:
        - Sync button clicked: true
        - Error dialog appeared: ${hasDialog}
        - Error toast appeared: ${hasToast}
      `);

      // Look for specific "google_not_connected" error
      const allErrors = page.locator('text~="google_not_connected|not connected|unauthorized"');
      const hasConnectionError = (await allErrors.count()) > 0;

      if (hasConnectionError) {
        const errorText = await allErrors.first().textContent();
        console.log(`Connection error detected: ${errorText}`);
      }
    } else {
      // Check connection status indicators
      const setupButton = gmailCard.getByRole("button", { name: /set up|connect/i });
      const statusBadge = gmailCard.locator(
        ".bg-green-50, .bg-red-50, .text-green-700, .text-red-700",
      );

      console.log(`Gmail not ready for sync:
        - Setup button exists: ${(await setupButton.count()) > 0}
        - Status badge exists: ${(await statusBadge.count()) > 0}
      `);
    }
  });
});

test.describe("Gmail Integration Analysis - New Unified OAuth Endpoints", () => {
  test("New unified OAuth endpoint /api/google/connect", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping OAuth tests");

    // Test the new unified OAuth endpoint
    const connectResponse = await request.get("/api/google/connect");

    console.log(`Unified OAuth Test Results:
      - Status: ${connectResponse.status()}
      - Headers: ${JSON.stringify(connectResponse.headers(), null, 2)}
    `);

    if (connectResponse.status() === 302) {
      const location = connectResponse.headers()["location"];
      console.log(`OAuth redirect URL: ${location}`);

      // Verify it's a Google OAuth URL
      expect(location).toContain("accounts.google.com");
      expect(location).toContain("oauth2");
    } else if (connectResponse.status() === 401) {
      console.log("OAuth endpoint requires authentication (expected)");
    }
  });

  test("OAuth callback endpoint /api/google/connect/callback", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping OAuth callback tests");

    // Test callback without parameters (should fail gracefully)
    const callbackResponse = await request.get("/api/google/connect/callback");

    console.log(`OAuth Callback Test Results:
      - Status: ${callbackResponse.status()}
      - Expected: 400 (missing code or state)
    `);

    expect(callbackResponse.status()).toBe(400);
    const errorBody = await callbackResponse.text();
    expect(errorBody).toContain("missing_code_or_state");
  });

  test("Check service type 'unified' in database integration", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping database tests");

    // This would need to be tested with actual authentication
    // For now, document the expected behavior
    console.log(`Unified Service Type Test:
      - New OAuth flow should create userIntegrations with service='unified'
      - Old flow uses service='gmail' and service='calendar' separately
      - This may cause compatibility issues with existing frontend code
    `);
  });
});

test.describe("Gmail Integration Analysis - SSE Streaming Endpoints", () => {
  test("SSE contacts stream endpoint /api/contacts/stream", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping SSE tests");

    const streamResponse = await request.get("/api/contacts/stream");

    console.log(`SSE Stream Test Results:
      - Status: ${streamResponse.status()}
      - Content-Type: ${streamResponse.headers()["content-type"]}
    `);

    if (streamResponse.status() === 401) {
      console.log("SSE endpoint requires authentication (expected)");
    } else if (streamResponse.status() === 200) {
      const contentType = streamResponse.headers()["content-type"];
      expect(contentType).toContain("text/event-stream");
      console.log("SSE endpoint is properly configured");
    }
  });

  test("Frontend SSE integration test", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping frontend SSE tests");

    await authenticateTestUser(page);

    // Check if any page uses SSE for real-time updates
    await page.goto("/dashboard/connect");

    // Look for EventSource usage in the page
    const hasEventSource = await page.evaluate(() => {
      return typeof window.EventSource !== "undefined";
    });

    console.log(`Frontend SSE Integration:
      - EventSource available: ${hasEventSource}
      - Need to check if any components use SSE for real-time contact updates
    `);
  });
});

test.describe("Gmail Integration Analysis - Contact Preview and Sync APIs", () => {
  test("Gmail preview API functionality", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping preview API tests");

    const csrf = await getCsrf(request);

    const previewResponse = await request.post("/api/sync/preview/gmail", {
      headers: { "x-csrf-token": csrf },
      data: {},
    });

    console.log(`Gmail Preview API Test Results:
      - Status: ${previewResponse.status()}
      - Expected: 401 (no auth) or 200 (with auth)
    `);

    if (previewResponse.status() === 401) {
      console.log("Preview API requires authentication (expected)");
    } else if (previewResponse.status() === 200) {
      const previewData = await previewResponse.json();
      console.log(`Preview data structure: ${JSON.stringify(previewData, null, 2)}`);
    }
  });

  test("Gmail approval and sync API functionality", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping approval API tests");

    const csrf = await getCsrf(request);

    const approvalResponse = await request.post("/api/sync/approve/gmail", {
      headers: { "x-csrf-token": csrf },
      data: {},
    });

    console.log(`Gmail Approval API Test Results:
      - Status: ${approvalResponse.status()}
      - Expected: 401 (no auth) or 200 (with auth) or error if no Google connection
    `);

    if (approvalResponse.status() === 200) {
      const approvalData = await approvalResponse.json();
      console.log(`Approval response: ${JSON.stringify(approvalData, null, 2)}`);

      // Test job runner
      const runnerResponse = await request.post("/api/jobs/runner", {
        headers: { "x-csrf-token": csrf },
        data: {},
      });

      console.log(`Job Runner API Test Results:
        - Status: ${runnerResponse.status()}
        - Expected: 200 with processed count
      `);
    }
  });

  test("Calendar preview and sync APIs", async ({ request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping calendar API tests");

    const csrf = await getCsrf(request);

    // Test calendar preview
    const calendarPreviewResponse = await request.post("/api/sync/preview/calendar", {
      headers: { "x-csrf-token": csrf },
      data: {},
    });

    console.log(`Calendar Preview API Test Results:
      - Status: ${calendarPreviewResponse.status()}
    `);

    // Test calendar approval
    const calendarApprovalResponse = await request.post("/api/sync/approve/calendar", {
      headers: { "x-csrf-token": csrf },
      data: {},
    });

    console.log(`Calendar Approval API Test Results:
      - Status: ${calendarApprovalResponse.status()}
    `);
  });
});

test.describe("Gmail Integration Analysis - Integration Gap Identification", () => {
  test("Document service token compatibility", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping compatibility tests");

    await authenticateTestUser(page);

    // Check sync status API
    const statusResponse = await request.get("/api/settings/sync/status");

    if (statusResponse.status() === 200) {
      const statusData = await statusResponse.json();

      console.log(`Service Token Compatibility Analysis:
        - Google Connected: ${statusData.googleConnected}
        - Service Tokens: ${JSON.stringify(statusData.serviceTokens, null, 2)}
        - Flags: ${JSON.stringify(statusData.flags, null, 2)}
        - Granted Scopes: ${JSON.stringify(statusData.grantedScopes, null, 2)}
      `);

      // Key integration gaps to identify:
      console.log(`
      INTEGRATION GAPS IDENTIFIED:
      
      1. Service Token Structure Mismatch:
         - New OAuth creates 'unified' service
         - Frontend expects 'gmail' and 'calendar' services
         - Status API may not recognize 'unified' tokens
      
      2. Frontend Component Issues:
         - Manual sync page expects specific service flags
         - Sync preferences page may not load with 'unified' tokens
         - Connect page relies on serviceTokens.gmail boolean
      
      3. API Integration Issues:
         - Preview APIs may check for specific service tokens
         - Approval APIs may not work with 'unified' service
         - Job processing may expect separate service configurations
      
      4. Missing Frontend Updates:
         - No integration of new /api/google/connect OAuth flow
         - No SSE integration for real-time contact updates
         - No proper error handling for new unified flow
      `);
    }
  });

  test("Frontend component service detection", async ({ page }) => {
    await authenticateTestUser(page);

    // Test each problematic page and document issues
    const testPages = [
      "/dashboard/manual-sync",
      "/settings/sync-preferences",
      "/dashboard/connect",
    ];

    for (const pagePath of testPages) {
      await page.goto(pagePath);
      await page.waitForLoadState("networkidle");

      // Check for JavaScript errors
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      await page.waitForTimeout(2000);

      console.log(`Page Analysis - ${pagePath}:
        - JavaScript errors: ${errors.length > 0 ? errors.join(", ") : "None"}
        - Page loaded successfully: ${page.url().includes(pagePath)}
      `);
    }
  });

  test("End-to-end flow gaps summary", async ({ page, request }) => {
    // This test documents the complete flow that needs to work
    console.log(`
    REQUIRED END-TO-END FLOW:
    
    1. User goes to "Connect Gmail"
       Current Issue: Multiple entry points with different behaviors
       Solution Needed: Single, consistent OAuth flow
    
    2. User completes OAuth and gets redirected back
       Current Issue: New unified OAuth not integrated with existing UI
       Solution Needed: Update frontend to use /api/google/connect
    
    3. User sees "Gmail Connected" status
       Current Issue: Frontend doesn't recognize 'unified' service tokens
       Solution Needed: Update status checks to handle unified tokens
    
    4. User can preview contacts before sync
       Current Issue: Preview APIs may not work with unified tokens
       Solution Needed: Backend compatibility for unified service type
    
    5. User starts sync and sees real-time progress
       Current Issue: No SSE integration for real-time updates
       Solution Needed: Frontend SSE integration with contact stream
    
    6. User sees contacts created in real-time
       Current Issue: Jobs may fail with "google_not_connected"
       Solution Needed: Job processors must handle unified tokens
    
    SPECIFIC FIXES NEEDED:
    
    Backend:
    - Update sync status API to recognize 'unified' service tokens
    - Update preview/approval APIs to work with unified tokens  
    - Update job processors to use unified Google credentials
    
    Frontend:
    - Replace old OAuth buttons with new /api/google/connect flow
    - Update service token checks to handle 'unified' type
    - Add SSE integration for real-time contact creation
    - Improve error handling for connection issues
    
    Integration:
    - Create migration path from old service tokens to unified
    - Test complete flow from OAuth to contact creation
    - Ensure consistent UX across all entry points
    `);
  });
});
