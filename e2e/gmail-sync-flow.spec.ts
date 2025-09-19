/**
 * Comprehensive Gmail Sync Flow E2E Tests
 *
 * Tests the complete Gmail sync journey through all 6 phases:
 * 1. Connection establishment and OAuth flow
 * 2. Preferences setup with step-by-step modal
 * 3. Manual sync process with real-time progress
 * 4. Data persistence and session validation
 * 5. Error handling and recovery scenarios
 * 6. Performance and reliability validation
 *
 * Critical Requirements Validated:
 * - Persistent connection status across sessions
 * - Accurate last sync dates with server-side timestamps
 * - Manual sync process (Connect → Preferences → Sync → Results)
 * - Data pipeline transparency (import vs processed counts)
 * - Optimistic UI with graceful fallbacks
 */

import { test, expect } from "@playwright/test";
import {
  authenticateTestUser,
  navigateToOmniConnect,
  getCsrfToken,
  simulateOAuthFlow,
  completePreferencesSetup,
  waitForSyncCompletion,
  waitForConnectionStatus,
  verifyEmailImport,
  verifyDataPersistence,
  validateRawEventsCount,
  validateProcessedDataCount,
  simulateNetworkError,
  testErrorRecovery,
  measureLoadTime,
  measureSyncTime,
  cleanupTestData,
  TEST_USERS,
} from "./helpers/test-utils";

test.describe("Gmail Sync Flow - Complete E2E Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Start each test with clean slate
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("Complete first-time Gmail setup and sync flow", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping integration tests");

    // Step 1: User authentication
    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Step 2: Navigate to OmniConnect
    await navigateToOmniConnect(page);

    // Step 3: Verify initial state shows "Connect Gmail" option
    const connectPrompt = page.locator('[data-testid="gmail-connection-prompt"]');
    await expect(connectPrompt).toBeVisible();

    const connectButton = page.locator('[data-testid="connect-gmail-button"]');
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeEnabled();

    // Step 4: Initiate OAuth flow
    await simulateOAuthFlow(page, "gmail");

    // Step 5: Verify successful connection callback
    await expect(page).toHaveURL(/.*connected=gmail/);
    await page.waitForSelector('[data-testid="preferences-modal"]', { timeout: 10000 });

    // Step 6: Complete preferences setup
    await completePreferencesSetup(page, {
      timeRange: "365d",
    });

    // Step 7: Monitor sync progress
    const syncResult = await waitForSyncCompletion(page);
    expect(syncResult.stage).toBe("completed");

    // Step 8: Verify sync completion UI
    const syncSummary = page.locator('[data-testid="sync-summary"]');
    await expect(syncSummary).toBeVisible();
    await expect(syncSummary).toContainText("successfully imported");

    // Step 9: Verify dashboard shows connected state
    await waitForConnectionStatus(page, { isConnected: true });

    // Step 10: Validate data was imported
    await verifyEmailImport(request, 1);

    // Step 11: Verify last sync date is displayed and accurate
    const lastSyncElement = page.locator('[data-testid="last-sync-date"]');
    await expect(lastSyncElement).toBeVisible();

    const lastSyncText = await lastSyncElement.textContent();
    expect(lastSyncText).toMatch(/\d+ (minute|hour|day)s? ago|just now/);
  });

  test("Connection status persistence across browser sessions", async ({ page, request, context }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping persistence tests");

    // Prerequisite: Ensure Gmail is connected (use existing connection or create new)
    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Verify initial connected state
    await waitForConnectionStatus(page, { isConnected: true });

    // Test 1: Page refresh persistence
    await verifyDataPersistence(page, request);

    // Test 2: New tab persistence
    const newPage = await context.newPage();
    await authenticateTestUser(newPage, TEST_USERS.gmailUser);
    await navigateToOmniConnect(newPage);

    await waitForConnectionStatus(newPage, { isConnected: true });
    await newPage.close();

    // Test 3: Browser context restart simulation
    await context.close();
    const newContext = await page.context().browser()!.newContext();
    const newPageAfterRestart = await newContext.newPage();

    await authenticateTestUser(newPageAfterRestart, TEST_USERS.gmailUser);
    await navigateToOmniConnect(newPageAfterRestart);

    // Should still show connected (from database state)
    await waitForConnectionStatus(newPageAfterRestart, { isConnected: true });

    await newContext.close();
  });

  test("Manual sync process with incremental updates", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping sync tests");

    // Prerequisite: Gmail already connected
    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    await waitForConnectionStatus(page, { isConnected: true });

    // Test manual "Sync Now" functionality
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await expect(syncButton).toBeVisible();
    await expect(syncButton).toBeEnabled();

    // Measure sync performance
    const syncTime = await measureSyncTime(page);
    expect(syncTime).toBeLessThan(60000); // Should complete within 60 seconds

    // Verify incremental sync message
    const syncToast = page.locator('[data-testid="sync-toast"]');
    await expect(syncToast).toContainText("incremental sync");

    // Verify updated last sync date
    const lastSyncElement = page.locator('[data-testid="last-sync-date"]');
    const lastSyncAfter = await lastSyncElement.textContent();
    expect(lastSyncAfter).toMatch(/just now|few seconds ago/);
  });

  test("Data pipeline transparency - import vs processed counts", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping pipeline tests");

    // Start fresh sync to monitor pipeline
    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Force a new sync to observe pipeline
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Monitor sync progress modal for transparency
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Verify import progress is shown
    const importProgress = page.locator('[data-testid="import-progress"]');
    await expect(importProgress).toContainText(/Importing \d+\/\d+/);

    // Verify processing progress is shown
    const processProgress = page.locator('[data-testid="process-progress"]');
    await expect(processProgress).toContainText(/Processing \d+\/\d+/);

    // Wait for completion and verify final counts
    const syncResult = await waitForSyncCompletion(page);
    expect(syncResult.stage).toBe("completed");

    // Validate backend data consistency
    await validateRawEventsCount(request, 10); // Expect at least 10 raw events
    await validateProcessedDataCount(request, "gmail", 8); // Expect at least 8 processed
  });

  test("Error scenarios and recovery mechanisms", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping error tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Test 1: Network failure during sync
    await simulateNetworkError(page);

    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Verify error is caught and displayed
    const errorMessage = page.locator('[data-testid="sync-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/network error|failed to sync/i);

    // Test 2: Error recovery workflow
    await testErrorRecovery(page, request);

    // Test 3: Verify system remains in usable state after errors
    const connectionStatus = page.locator('[data-testid="connection-status-card"]');
    await expect(connectionStatus).toContainText("Connected");
  });

  test("Optimistic UI with graceful fallbacks", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping UI tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Measure initial page load performance
    const loadTime = await measureLoadTime(page, "/omni-connect");
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

    // Verify optimistic loading state
    // UI should show "Connected" state immediately, then validate against server
    const connectionCard = page.locator('[data-testid="connection-status-card"]');

    // Should show optimistic state quickly
    await expect(connectionCard).toBeVisible({ timeout: 1000 });

    // But ultimately reflect true server state
    await page.waitForLoadState("networkidle");

    // Verify final state matches server reality
    const serverStatus = await request.get("/api/google/status");
    const serverData = await serverStatus.json();

    const uiConnectedState = await connectionCard.textContent();
    const isUIConnected = uiConnectedState?.includes("Connected") ?? false;

    expect(isUIConnected).toBe(serverData.googleConnected);
  });

  test("Sync preferences cannot be modified after initial setup", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping preferences tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Verify connected state (preferences should be locked)
    await waitForConnectionStatus(page, { isConnected: true });

    // Try to access preferences - should not be available
    const preferencesButton = page.locator('[data-testid="modify-preferences-button"]');
    await expect(preferencesButton).not.toBeVisible();

    // Settings panel should not show preference modification options
    const settingsPanel = page.locator('[data-testid="settings-panel"]');
    if (await settingsPanel.isVisible()) {
      await expect(settingsPanel).not.toContainText("time range");
      await expect(settingsPanel).not.toContainText("folder selection");
    }
  });

  test("Token auto-refresh functionality", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping token tests");
    test.skip(!process.env["FEATURE_TOKEN_REFRESH"], "Token refresh testing not enabled");

    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Simulate expired token scenario
    // This would require backend support to artificially expire tokens
    const csrf = await getCsrfToken(request);

    await request.post("/api/test/expire-tokens", {
      headers: { "x-csrf-token": csrf },
      data: { service: "gmail" },
    });

    // Trigger operation that requires valid token
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should automatically refresh token and continue
    const syncResult = await waitForSyncCompletion(page);
    expect(syncResult.stage).toBe("completed");

    // Verify no error state in UI
    const errorMessage = page.locator('[data-testid="sync-error"]');
    await expect(errorMessage).not.toBeVisible();
  });

  test("Large dataset sync performance", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping performance tests");
    test.skip(!process.env["FEATURE_LARGE_SYNC_TEST"], "Large sync testing not enabled");

    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Configure for large dataset sync (requires test data setup)
    const csrf = await getCsrfToken(request);

    await request.post("/api/test/setup-large-dataset", {
      headers: { "x-csrf-token": csrf },
      data: { emailCount: 1000 },
    });

    // Start sync and monitor performance
    const startTime = Date.now();
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Monitor progress updates
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Verify progress increments smoothly
    let lastProgress = 0;
    await page.waitForFunction(
      (lastProg) => {
        const progressText = document.querySelector('[data-testid="import-progress"]')?.textContent;
        const match = progressText?.match(/(\d+)\/(\d+)/);
        if (!match) return false;

        const currentProgress = parseInt(match[1], 10);
        const isProgressing = currentProgress > lastProg;
        lastProg = currentProgress;
        return isProgressing;
      },
      lastProgress,
      { timeout: 30000 }
    );

    // Wait for completion
    const syncResult = await waitForSyncCompletion(page, 300000); // 5 minute timeout
    expect(syncResult.stage).toBe("completed");

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(300000); // Should complete within 5 minutes

    // Verify all data was processed
    await validateProcessedDataCount(request, "gmail", 950); // Expect 95% success rate
  });
});

test.describe("Gmail Sync Flow - Error Recovery and Edge Cases", () => {
  test("Partial sync failure recovery", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping error recovery tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Simulate partial failure scenario
    const csrf = await getCsrfToken(request);

    await request.post("/api/test/setup-partial-failure", {
      headers: { "x-csrf-token": csrf },
      data: { failureRate: 0.3 }, // 30% failure rate
    });

    // Start sync
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Wait for completion with mixed results
    const syncResult = await waitForSyncCompletion(page);

    // Should complete but show some failures
    expect(syncResult.stage).toBe("completed");
    expect(syncResult.failed).toBeGreaterThan(0);

    // Verify error recovery options are available
    const viewErrorsButton = page.locator('[data-testid="view-errors-button"]');
    await expect(viewErrorsButton).toBeVisible();

    // Test retry functionality
    await viewErrorsButton.click();

    const retryButton = page.locator('[data-testid="retry-failed-button"]');
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // Monitor retry progress
    const retryProgress = page.locator('[data-testid="retry-progress"]');
    await expect(retryProgress).toBeVisible();
    await expect(retryProgress).not.toBeVisible({ timeout: 30000 });

    // Verify improved results after retry
    const finalErrorCount = page.locator('[data-testid="error-count"]');
    const finalCount = await finalErrorCount.textContent();
    expect(parseInt(finalCount || "999", 10)).toBeLessThan(syncResult.failed || 999);
  });

  test("Concurrent sync attempt handling", async ({ page, context }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping concurrency tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Open second tab
    const secondPage = await context.newPage();
    await authenticateTestUser(secondPage, TEST_USERS.gmailUser);
    await navigateToOmniConnect(secondPage);

    // Start sync in first tab
    const syncButton1 = page.locator('[data-testid="sync-now-button"]');
    await syncButton1.click();

    // Try to start sync in second tab (should be prevented)
    const syncButton2 = secondPage.locator('[data-testid="sync-now-button"]');
    await expect(syncButton2).toBeDisabled();

    // Should show blocking message
    const blockingMessage = secondPage.locator('[data-testid="sync-blocking-message"]');
    await expect(blockingMessage).toBeVisible();
    await expect(blockingMessage).toContainText(/sync in progress/i);

    // Wait for first sync to complete
    await waitForSyncCompletion(page);

    // Second tab should now allow sync
    await expect(syncButton2).toBeEnabled();

    await secondPage.close();
  });

  test("OAuth token corruption recovery", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping token corruption tests");
    test.skip(!process.env["FEATURE_TOKEN_CORRUPTION_TEST"], "Token corruption testing not enabled");

    await authenticateTestUser(page, TEST_USERS.gmailUser);
    await navigateToOmniConnect(page);

    // Simulate corrupted tokens
    const csrf = await getCsrfToken(request);

    await request.post("/api/test/corrupt-tokens", {
      headers: { "x-csrf-token": csrf },
      data: { service: "gmail" },
    });

    // Try to sync with corrupted tokens
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should detect token corruption and prompt for re-authentication
    const reauthPrompt = page.locator('[data-testid="reauth-prompt"]');
    await expect(reauthPrompt).toBeVisible();

    const reconnectButton = page.locator('[data-testid="reconnect-gmail-button"]');
    await expect(reconnectButton).toBeVisible();

    // Re-authenticate
    await reconnectButton.click();
    await simulateOAuthFlow(page, "gmail");

    // Should now be able to sync successfully
    await waitForSyncCompletion(page);

    // Verify connection is restored
    await waitForConnectionStatus(page, { isConnected: true });
  });
});

test.afterEach(async ({ request }, testInfo) => {
  // Cleanup test data if test passed
  if (testInfo.status === "passed") {
    try {
      await cleanupTestData(request, "test-user-id");
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  }
});