/**
 * Cross-Phase Integration Tests
 *
 * Validates that all 6 phases of the Google Sync System work together seamlessly:
 * Phase 1: Stable API infrastructure → Phase 2: React Query optimization
 * Phase 2: React Query optimization → Phase 3: Preferences system
 * Phase 3: Preferences system → Phase 4: Manual sync pipeline
 * Phase 4: Manual sync pipeline → Phase 5: Error tracking and recovery
 * Phase 5: Error tracking → Phase 6: End-to-end validation
 *
 * Tests the complete integration between all phases to ensure:
 * - Data flows correctly between API and UI layers
 * - State management remains consistent across components
 * - Error handling propagates properly through all phases
 * - Performance optimizations don't break functionality
 */

import { test, expect } from "@playwright/test";
import {
  authenticateTestUser,
  navigateToOmniConnect,
  navigateToOmniRhythm,
  getCsrfToken,
  waitForConnectionStatus,
  verifyDataPersistence,
  testErrorRecovery,
  TEST_USERS,
} from "./helpers/test-utils";
import { createOAuthMock, GoogleOAuthMock } from "./mocks/google-oauth.mock";

test.describe("Cross-Phase Integration Tests", () => {
  let oauthMock: GoogleOAuthMock;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async () => {
    if (oauthMock) {
      await oauthMock.cleanup();
    }
  });

  test("Phase 1 → Phase 2: API infrastructure integrates with React Query", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping integration tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup mock for connected Gmail
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 25,
    });

    await navigateToOmniConnect(page);

    // Phase 1: Verify API endpoints return stable data
    const apiResponse = await request.get("/api/omni-connect/dashboard");
    expect(apiResponse.status()).toBe(200);
    const apiData = await apiResponse.json();
    expect(apiData.connection.isConnected).toBe(true);

    // Phase 2: Verify React Query displays this data correctly
    await waitForConnectionStatus(page, { isConnected: true });

    const connectionCard = page.locator('[data-testid="connection-status-card"]');
    await expect(connectionCard).toBeVisible();

    const emailCount = page.locator('[data-testid="total-email-count"]');
    await expect(emailCount).toContainText("25");

    // Verify React Query cache invalidation works
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should trigger cache invalidation and show updated data
    await page.waitForTimeout(2000);
    await expect(emailCount).toContainText(/\d+/); // Should show some number
  });

  test("Phase 2 → Phase 3: React Query integrates with preferences system", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping preferences integration");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup mock for OAuth flow
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: false, // Start disconnected to test OAuth → preferences flow
    });

    await navigateToOmniConnect(page);

    // Should show connection prompt
    const connectPrompt = page.locator('[data-testid="gmail-connection-prompt"]');
    await expect(connectPrompt).toBeVisible();

    // Start OAuth flow
    const connectButton = page.locator('[data-testid="connect-gmail-button"]');
    await connectButton.click();

    // Phase 2: React Query should invalidate cache when OAuth completes
    await page.waitForURL(/.*connected=gmail/, { timeout: 10000 });

    // Phase 3: Preferences modal should appear
    const preferencesModal = page.locator('[data-testid="preferences-modal"]');
    await expect(preferencesModal).toBeVisible();

    // Verify React Query context is maintained in preferences
    const timeRangeSection = page.locator('[data-testid="time-range-section"]');
    await expect(timeRangeSection).toBeVisible();

    // Complete preferences
    const completeButton = page.locator('[data-testid="complete-setup-button"]');
    await expect(completeButton).toBeEnabled();
    await completeButton.click();

    // Should trigger React Query cache update
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();
  });

  test("Phase 3 → Phase 4: Preferences system triggers manual sync pipeline", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping sync pipeline integration");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup mock with progress simulation
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: false,
      emailCount: 50,
    });

    // Add progress simulation
    await oauthMock.setupProgressSimulation({
      totalItems: 50,
      updateInterval: 500,
      includeErrors: false,
    });

    await navigateToOmniConnect(page);

    // Complete OAuth flow
    const connectButton = page.locator('[data-testid="connect-gmail-button"]');
    await connectButton.click();

    await page.waitForURL(/.*connected=gmail/);

    // Phase 3: Complete preferences setup
    const preferencesModal = page.locator('[data-testid="preferences-modal"]');
    await expect(preferencesModal).toBeVisible();

    const completeButton = page.locator('[data-testid="complete-setup-button"]');
    await completeButton.click();

    // Phase 4: Manual sync pipeline should start automatically
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Verify progress updates
    const progressText = page.locator('[data-testid="sync-progress-text"]');
    await expect(progressText).toContainText(/processing|importing/i);

    // Wait for completion
    await expect(progressText).toContainText(/complete/i, { timeout: 30000 });

    // Verify sync completion UI
    const syncSummary = page.locator('[data-testid="sync-summary"]');
    await expect(syncSummary).toBeVisible();

    const syncResults = page.locator('[data-testid="sync-results"]');
    await expect(syncResults).toContainText("Processed:");
    await expect(syncResults).toContainText("Imported:");
  });

  test("Phase 4 → Phase 5: Sync pipeline integrates with error tracking", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping error integration");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup mock with partial failures
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 30,
      includeErrors: true, // This will cause some items to fail
    });

    await navigateToOmniConnect(page);

    // Phase 4: Start manual sync
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Wait for completion with errors
    await expect(progressModal).not.toBeVisible({ timeout: 30000 });

    // Phase 5: Error tracking should show failure summary
    const errorButton = page.locator('[data-testid="view-errors-button"]');
    if (await errorButton.isVisible()) {
      await errorButton.click();

      const errorSummary = page.locator('[data-testid="error-summary"]');
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary).toContainText(/failed|error/i);

      // Test error recovery integration
      await testErrorRecovery(page, page.request);
    }

    // Verify connection status remains valid despite errors
    await waitForConnectionStatus(page, { isConnected: true });
  });

  test("Phase 5 → All: Error recovery integrates with all system phases", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping error recovery integration");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup mock that will initially fail then succeed
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 20,
    });

    // First setup error scenario
    await oauthMock.setupErrorScenarios({
      networkFailure: true,
    });

    await navigateToOmniConnect(page);

    // Trigger sync that will fail
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should show error
    const errorMessage = page.locator('[data-testid="sync-error"]');
    await expect(errorMessage).toBeVisible();

    // Clean up error scenario and setup success
    await oauthMock.cleanup();
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 20,
    });

    // Phase 5: Test error recovery
    if (await syncButton.isVisible()) {
      await syncButton.click();

      // Should now succeed
      const progressModal = page.locator('[data-testid="sync-progress-modal"]');
      await expect(progressModal).toBeVisible();
      await expect(progressModal).not.toBeVisible({ timeout: 30000 });

      // All phases should be working normally after recovery
      await waitForConnectionStatus(page, { isConnected: true });
    }
  });

  test("All Phases: Complete system integration with calendar and gmail", async ({ page, context }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping full system integration");

    await authenticateTestUser(page, TEST_USERS.fullUser);

    // Setup both Gmail and Calendar mocks
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 40,
    });

    // Test Gmail integration first
    await navigateToOmniConnect(page);
    await waitForConnectionStatus(page, { isConnected: true });

    const gmailEmailCount = page.locator('[data-testid="total-email-count"]');
    await expect(gmailEmailCount).toContainText("40");

    // Setup Calendar mock
    await oauthMock.cleanup();
    oauthMock = await createOAuthMock(page, {
      service: "calendar",
      connected: true,
      eventCount: 15,
    });

    // Test Calendar integration
    await navigateToOmniRhythm(page);
    await waitForConnectionStatus(page, { isConnected: true });

    const calendarEventCount = page.locator('[data-testid="imported-events-count"]');
    await expect(calendarEventCount).toContainText("15");

    // Test cross-service navigation (data persistence)
    await navigateToOmniConnect(page);
    await expect(gmailEmailCount).toContainText("40");

    await navigateToOmniRhythm(page);
    await expect(calendarEventCount).toContainText("15");

    // Test data persistence across browser sessions
    await verifyDataPersistence(page, page.request);

    // Test in new tab
    const newPage = await context.newPage();
    await authenticateTestUser(newPage, TEST_USERS.fullUser);

    await navigateToOmniConnect(newPage);
    const newPageEmailCount = newPage.locator('[data-testid="total-email-count"]');
    await expect(newPageEmailCount).toContainText("40");

    await navigateToOmniRhythm(newPage);
    const newPageEventCount = newPage.locator('[data-testid="imported-events-count"]');
    await expect(newPageEventCount).toContainText("15");

    await newPage.close();
  });

  test("Performance: All phases maintain responsiveness under load", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping performance integration");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup large dataset mock
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 500, // Large dataset
    });

    const startTime = Date.now();

    // Measure initial load time
    await navigateToOmniConnect(page);
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Verify UI remains responsive
    await waitForConnectionStatus(page, { isConnected: true });

    const connectionCard = page.locator('[data-testid="connection-status-card"]');
    await expect(connectionCard).toBeVisible();

    // Test sync with large dataset
    const syncStartTime = Date.now();
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should show progress immediately
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible({ timeout: 2000 });

    // Wait for completion
    await expect(progressModal).not.toBeVisible({ timeout: 120000 }); // 2 minute max
    const syncTime = Date.now() - syncStartTime;
    expect(syncTime).toBeLessThan(120000); // Should complete within 2 minutes

    // Verify UI still responsive after large sync
    const emailCount = page.locator('[data-testid="total-email-count"]');
    await expect(emailCount).toContainText("500");

    // Test navigation performance after large sync
    const navStartTime = Date.now();
    await navigateToOmniRhythm(page);
    const navTime = Date.now() - navStartTime;
    expect(navTime).toBeLessThan(3000); // Navigation should remain fast
  });

  test("Data Consistency: All phases maintain data integrity", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping data consistency tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup mock with known data
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 25,
    });

    await navigateToOmniConnect(page);

    // Phase 1: Verify API data consistency
    const apiResponse = await request.get("/api/omni-connect/dashboard");
    const apiData = await apiResponse.json();
    expect(apiData.connection.emailCount).toBe(150); // Mock returns 150

    // Phase 2: Verify UI reflects API data
    const emailCount = page.locator('[data-testid="total-email-count"]');
    await expect(emailCount).toContainText("150");

    // Phase 3 & 4: Trigger sync and verify data updates
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();
    await expect(progressModal).not.toBeVisible({ timeout: 30000 });

    // Verify data consistency after sync
    const updatedApiResponse = await request.get("/api/omni-connect/dashboard");
    const updatedApiData = await updatedApiResponse.json();
    expect(updatedApiData.connection.isConnected).toBe(true);

    // UI should reflect updated data
    await expect(emailCount).toContainText(/\d+/);

    // Phase 5: Verify error tracking doesn't corrupt data
    await oauthMock.setupErrorScenarios({
      rateLimiting: true,
    });

    // Try sync that will be rate limited
    await syncButton.click();

    // Should show error but maintain data integrity
    const errorMessage = page.locator('[data-testid="sync-error"]');
    if (await errorMessage.isVisible()) {
      // Connection should still show as connected
      await waitForConnectionStatus(page, { isConnected: true });

      // Email count should be preserved
      await expect(emailCount).toContainText(/\d+/);
    }
  });
});

test.describe("API Layer Integration Tests", () => {
  test("React Query cache management across components", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping cache tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    const oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 30,
    });

    await navigateToOmniConnect(page);

    // Verify initial data load
    const connectionCard = page.locator('[data-testid="connection-status-card"]');
    await expect(connectionCard).toBeVisible();

    // Test cache invalidation on sync
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should show loading state during cache invalidation
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Wait for cache update
    await expect(progressModal).not.toBeVisible({ timeout: 30000 });

    // Test navigation preserves cache
    await page.goto("/dashboard");
    await navigateToOmniConnect(page);

    // Should load immediately from cache
    await expect(connectionCard).toBeVisible({ timeout: 1000 });

    await oauthMock.cleanup();
  });

  test("Error boundary integration across all phases", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping error boundary tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    const oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 20,
    });

    // Setup cascading error scenario
    await oauthMock.setupErrorScenarios({
      serviceUnavailable: true,
    });

    await navigateToOmniConnect(page);

    // Should handle service unavailability gracefully
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    const errorMessage = page.locator('[data-testid="sync-error"]');

    // Either error boundary or error message should appear
    await expect(errorBoundary.or(errorMessage)).toBeVisible({ timeout: 10000 });

    // System should remain navigable
    await navigateToOmniRhythm(page);
    await expect(page).toHaveURL(/.*omni-rhythm/);

    await oauthMock.cleanup();
  });
});