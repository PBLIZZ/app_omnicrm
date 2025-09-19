/**
 * Performance Benchmarking and Error Scenario Tests
 *
 * Validates performance characteristics and error handling robustness
 * across all 6 phases of the Google Sync System:
 *
 * Performance Benchmarks:
 * - Initial page load times (< 3 seconds)
 * - Sync operation completion times (< 2 minutes for large datasets)
 * - UI responsiveness during operations (< 200ms interaction delays)
 * - Memory usage patterns (no memory leaks)
 * - Cache hit rates and API call optimization
 *
 * Error Scenarios:
 * - Network disconnection during sync
 * - OAuth token expiry scenarios
 * - API rate limiting and retry logic
 * - Partial sync failures and recovery
 * - Concurrent operation conflicts
 * - Memory constraints and large datasets
 */

import { test, expect, type Page } from "@playwright/test";
import {
  authenticateTestUser,
  navigateToOmniConnect,
  navigateToOmniRhythm,
  measureLoadTime,
  measureSyncTime,
  simulateNetworkError,
  testErrorRecovery,
  TEST_USERS,
} from "./helpers/test-utils";
import { createOAuthMock, GoogleOAuthMock } from "./mocks/google-oauth.mock";

interface PerformanceMetrics {
  loadTime: number;
  syncTime: number;
  interactionDelay: number;
  memoryUsage: number;
  apiCallCount: number;
}

test.describe("Performance Benchmarks", () => {
  let oauthMock: GoogleOAuthMock;
  let performanceMetrics: PerformanceMetrics[] = [];

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Start performance monitoring
    await page.evaluate(() => {
      performance.mark("test-start");
    });
  });

  test.afterEach(async ({ page }) => {
    if (oauthMock) {
      await oauthMock.cleanup();
    }

    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      performance.mark("test-end");
      performance.measure("test-duration", "test-start", "test-end");

      const entries = performance.getEntriesByType("measure");
      const testDuration = entries.find(entry => entry.name === "test-duration");

      return {
        testDuration: testDuration ? testDuration.duration : 0,
        navigationEntries: performance.getEntriesByType("navigation"),
        resourceEntries: performance.getEntriesByType("resource"),
        memoryInfo: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        } : null,
      };
    });

    console.log("Performance Metrics:", JSON.stringify(metrics, null, 2));
  });

  test("Initial page load performance - OmniConnect", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping performance tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup mock for optimal performance test
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 100,
    });

    // Measure load time
    const loadTime = await measureLoadTime(page, "/omni-connect");

    // Assertions
    expect(loadTime).toBeLessThan(3000); // Must load within 3 seconds
    console.log(`OmniConnect load time: ${loadTime}ms`);

    // Verify optimistic UI loads quickly
    const connectionCard = page.locator('[data-testid="connection-status-card"]');
    const optimisticLoadTime = await page.evaluate(async () => {
      const start = performance.now();
      while (performance.now() - start < 5000) {
        if (document.querySelector('[data-testid="connection-status-card"]')) {
          return performance.now() - start;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return 5000;
    });

    expect(optimisticLoadTime).toBeLessThan(1000); // Optimistic UI should appear within 1 second
    console.log(`Optimistic UI load time: ${optimisticLoadTime}ms`);

    // Test interaction responsiveness
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    if (await syncButton.isVisible()) {
      const interactionStart = Date.now();
      await syncButton.click();
      const progressModal = page.locator('[data-testid="sync-progress-modal"]');
      await expect(progressModal).toBeVisible({ timeout: 1000 });
      const interactionTime = Date.now() - interactionStart;

      expect(interactionTime).toBeLessThan(500); // Interactions should respond within 500ms
      console.log(`Interaction response time: ${interactionTime}ms`);
    }
  });

  test("Initial page load performance - OmniRhythm", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping performance tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);

    // Setup mock for calendar
    oauthMock = await createOAuthMock(page, {
      service: "calendar",
      connected: true,
      eventCount: 50,
    });

    // Measure load time
    const loadTime = await measureLoadTime(page, "/omni-rhythm");

    // Assertions
    expect(loadTime).toBeLessThan(3000); // Must load within 3 seconds
    console.log(`OmniRhythm load time: ${loadTime}ms`);

    // Verify calendar-specific components load efficiently
    const calendarCard = page.locator('[data-testid="calendar-connection-card"]');
    await expect(calendarCard).toBeVisible({ timeout: 2000 });

    const intelligencePanel = page.locator('[data-testid="today-intelligence-panel"]');
    await expect(intelligencePanel).toBeVisible({ timeout: 2000 });

    // Test calendar sync responsiveness
    const syncButton = page.locator('[data-testid="sync-calendar-button"]');
    if (await syncButton.isVisible()) {
      const syncStart = Date.now();
      await syncButton.click();
      const progressModal = page.locator('[data-testid="sync-progress-modal"]');
      await expect(progressModal).toBeVisible({ timeout: 1000 });
      const syncResponseTime = Date.now() - syncStart;

      expect(syncResponseTime).toBeLessThan(500);
      console.log(`Calendar sync response time: ${syncResponseTime}ms`);
    }
  });

  test("Large dataset sync performance", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping large dataset tests");
    test.skip(!process.env["FEATURE_LARGE_SYNC_TEST"], "Large sync testing not enabled");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup large dataset mock
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 1000, // Large dataset
    });

    await navigateToOmniConnect(page);

    // Measure sync performance with large dataset
    const syncTime = await measureSyncTime(page);

    // Assertions for large datasets
    expect(syncTime).toBeLessThan(120000); // Must complete within 2 minutes
    console.log(`Large dataset sync time: ${syncTime}ms for 1000 emails`);

    // Calculate throughput
    const throughput = 1000 / (syncTime / 1000); // emails per second
    expect(throughput).toBeGreaterThan(8); // Minimum 8 emails per second
    console.log(`Sync throughput: ${throughput.toFixed(2)} emails/second`);

    // Verify UI remains responsive during large sync
    await page.waitForSelector('[data-testid="sync-progress-modal"]', { state: "hidden" });

    const finalEmailCount = page.locator('[data-testid="total-email-count"]');
    await expect(finalEmailCount).toContainText(/\d+/);

    // Test navigation performance after large sync
    const navStart = Date.now();
    await navigateToOmniRhythm(page);
    const navTime = Date.now() - navStart;

    expect(navTime).toBeLessThan(3000); // Navigation should remain fast
    console.log(`Post-sync navigation time: ${navTime}ms`);
  });

  test("Memory usage patterns and leak detection", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping memory tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 200,
    });

    await navigateToOmniConnect(page);

    // Measure initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Perform multiple sync operations
    for (let i = 0; i < 3; i++) {
      const syncButton = page.locator('[data-testid="sync-now-button"]');
      if (await syncButton.isVisible()) {
        await syncButton.click();
        const progressModal = page.locator('[data-testid="sync-progress-modal"]');
        await expect(progressModal).toBeVisible();
        await expect(progressModal).not.toBeVisible({ timeout: 30000 });
      }

      // Force garbage collection if possible
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      await page.waitForTimeout(1000);
    }

    // Measure final memory usage
    const finalMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      console.log(`Memory usage: ${initialMemory} → ${finalMemory} bytes`);
      console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(1)}%)`);

      // Memory should not increase by more than 50% after multiple operations
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });

  test("Concurrent operation handling", async ({ page, context }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping concurrency tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 50,
    });

    await navigateToOmniConnect(page);

    // Open multiple tabs
    const secondPage = await context.newPage();
    await authenticateTestUser(secondPage, TEST_USERS.gmailUser);
    await navigateToOmniConnect(secondPage);

    // Try to start sync in both tabs simultaneously
    const syncButton1 = page.locator('[data-testid="sync-now-button"]');
    const syncButton2 = secondPage.locator('[data-testid="sync-now-button"]');

    const syncPromise1 = syncButton1.click();
    const syncPromise2 = syncButton2.click();

    await Promise.all([syncPromise1, syncPromise2]);

    // One should succeed, the other should show blocking message
    const progressModal1 = page.locator('[data-testid="sync-progress-modal"]');
    const progressModal2 = secondPage.locator('[data-testid="sync-progress-modal"]');
    const blockingMessage2 = secondPage.locator('[data-testid="sync-blocking-message"]');

    // At least one should show progress or blocking message
    const modal1Visible = await progressModal1.isVisible();
    const modal2Visible = await progressModal2.isVisible();
    const blockingVisible = await blockingMessage2.isVisible();

    expect(modal1Visible || modal2Visible || blockingVisible).toBe(true);

    console.log(`Concurrent sync handling: modal1=${modal1Visible}, modal2=${modal2Visible}, blocking=${blockingVisible}`);

    await secondPage.close();
  });

  test("API call optimization and caching", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping API optimization tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 30,
    });

    // Monitor API calls
    const apiCalls: string[] = [];
    await page.route("**/api/**", async (route) => {
      apiCalls.push(route.request().url());
      await route.continue();
    });

    await navigateToOmniConnect(page);

    // Count initial API calls
    const initialCallCount = apiCalls.length;
    console.log(`Initial API calls: ${initialCallCount}`);

    // Navigate away and back - should use cache
    await navigateToOmniRhythm(page);
    await navigateToOmniConnect(page);

    const finalCallCount = apiCalls.length;
    const additionalCalls = finalCallCount - initialCallCount;

    console.log(`Additional API calls after navigation: ${additionalCalls}`);

    // Should make minimal additional calls due to caching
    expect(additionalCalls).toBeLessThan(5);

    // Test cache invalidation on sync
    const preSync = apiCalls.length;
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForSelector('[data-testid="sync-progress-modal"]', { state: "hidden", timeout: 30000 });
    }

    const postSync = apiCalls.length;
    const syncCalls = postSync - preSync;

    console.log(`API calls during sync: ${syncCalls}`);

    // Should make appropriate number of calls for sync operation
    expect(syncCalls).toBeGreaterThan(1);
    expect(syncCalls).toBeLessThan(20); // But not excessive
  });
});

test.describe("Error Scenario Tests", () => {
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

  test("Network disconnection during sync operation", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping network error tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 40,
    });

    await navigateToOmniConnect(page);

    // Start sync
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Simulate network failure mid-sync
    await simulateNetworkError(page);

    // Should handle network error gracefully
    const errorMessage = page.locator('[data-testid="sync-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText(/network|connection|failed/i);

    // System should remain usable
    const connectionCard = page.locator('[data-testid="connection-status-card"]');
    await expect(connectionCard).toBeVisible();

    // Error recovery should be available
    await testErrorRecovery(page, page.request);
  });

  test("OAuth token expiry during operation", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping token expiry tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 25,
    });

    await navigateToOmniConnect(page);

    // Setup token expiry scenario
    await oauthMock.setupErrorScenarios({
      tokenExpiry: true,
    });

    // Try to sync with expired token
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should detect token expiry and show appropriate error
    const tokenError = page.locator('[data-testid="sync-error"]');
    await expect(tokenError).toBeVisible({ timeout: 10000 });
    await expect(tokenError).toContainText(/token|expired|authentication/i);

    // Should offer reconnection option
    const reconnectButton = page.locator('[data-testid="reconnect-gmail-button"]');
    if (await reconnectButton.isVisible()) {
      expect(await reconnectButton.isEnabled()).toBe(true);
    }
  });

  test("API rate limiting and retry logic", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping rate limit tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 30,
    });

    await navigateToOmniConnect(page);

    // Setup rate limiting scenario
    await oauthMock.setupErrorScenarios({
      rateLimiting: true,
    });

    // Try sync that will be rate limited
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should show rate limit error
    const rateLimitError = page.locator('[data-testid="sync-error"]');
    await expect(rateLimitError).toBeVisible({ timeout: 10000 });
    await expect(rateLimitError).toContainText(/rate limit|too many requests/i);

    // Should maintain connection status despite rate limiting
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toContainText("Connected");

    // Clean up rate limiting and test retry
    await oauthMock.cleanup();
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 30,
    });

    // Retry should now work
    await syncButton.click();
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();
  });

  test("Partial sync failures and error tracking", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping partial failure tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 50,
      includeErrors: true, // This will cause 20% failure rate
    });

    await navigateToOmniConnect(page);

    // Start sync that will have partial failures
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();
    await expect(progressModal).not.toBeVisible({ timeout: 60000 });

    // Should show completion with error summary
    const syncSummary = page.locator('[data-testid="sync-summary"]');
    const syncResults = page.locator('[data-testid="sync-results"]');

    if (await syncSummary.isVisible()) {
      await expect(syncResults).toContainText(/Errors: [1-9]/); // Should show some errors

      // Error recovery options should be available
      const viewErrorsButton = page.locator('[data-testid="view-errors-button"]');
      if (await viewErrorsButton.isVisible()) {
        await viewErrorsButton.click();

        const errorSummary = page.locator('[data-testid="error-summary"]');
        await expect(errorSummary).toBeVisible();

        const retryButton = page.locator('[data-testid="retry-failed-button"]');
        if (await retryButton.isVisible()) {
          await retryButton.click();

          // Should attempt to retry failed items
          const retryProgress = page.locator('[data-testid="retry-progress"]');
          await expect(retryProgress).toBeVisible();
        }
      }
    }
  });

  test("Service unavailability handling", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping service unavailability tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 20,
    });

    await navigateToOmniConnect(page);

    // Setup service unavailability
    await oauthMock.setupErrorScenarios({
      serviceUnavailable: true,
    });

    // Try operation when service is unavailable
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    // Should show service unavailable error
    const serviceError = page.locator('[data-testid="sync-error"]');
    await expect(serviceError).toBeVisible({ timeout: 10000 });
    await expect(serviceError).toContainText(/unavailable|service/i);

    // Should maintain stable UI state
    const connectionCard = page.locator('[data-testid="connection-status-card"]');
    await expect(connectionCard).toBeVisible();

    // Navigation should continue to work
    await navigateToOmniRhythm(page);
    await expect(page).toHaveURL(/.*omni-rhythm/);
  });

  test("Memory constraints with large datasets", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping memory constraint tests");
    test.skip(!process.env["FEATURE_MEMORY_STRESS_TEST"], "Memory stress testing not enabled");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    // Setup very large dataset to test memory handling
    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 5000, // Very large dataset
    });

    await navigateToOmniConnect(page);

    // Monitor memory during large operation
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    // Start large sync operation
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    await syncButton.click();

    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Monitor memory during operation
    let maxMemoryUsage = initialMemory;
    const memoryCheckInterval = setInterval(async () => {
      const currentMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      maxMemoryUsage = Math.max(maxMemoryUsage, currentMemory);
    }, 1000);

    // Wait for completion or timeout
    await expect(progressModal).not.toBeVisible({ timeout: 300000 }); // 5 minute timeout
    clearInterval(memoryCheckInterval);

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    if (initialMemory > 0) {
      const memoryIncrease = maxMemoryUsage - initialMemory;
      const memoryGrowthFactor = maxMemoryUsage / initialMemory;

      console.log(`Memory usage: ${initialMemory} → ${maxMemoryUsage} → ${finalMemory}`);
      console.log(`Memory growth factor: ${memoryGrowthFactor.toFixed(2)}x`);

      // Memory growth should be reasonable even for large datasets
      expect(memoryGrowthFactor).toBeLessThan(10); // Should not grow by more than 10x
    }

    // UI should remain responsive after large operation
    const emailCount = page.locator('[data-testid="total-email-count"]');
    await expect(emailCount).toBeVisible();
  });

  test("Browser compatibility and error handling", async ({ page, browserName }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping browser compatibility tests");

    await authenticateTestUser(page, TEST_USERS.gmailUser);

    oauthMock = await createOAuthMock(page, {
      service: "gmail",
      connected: true,
      emailCount: 25,
    });

    await navigateToOmniConnect(page);

    // Test basic functionality across browsers
    const connectionCard = page.locator('[data-testid="connection-status-card"]');
    await expect(connectionCard).toBeVisible();

    console.log(`Testing on browser: ${browserName}`);

    // Test feature detection and graceful degradation
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    });

    const hasLocalStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    });

    console.log(`Browser capabilities: WebGL=${hasWebGL}, localStorage=${hasLocalStorage}`);

    // Functionality should work regardless of feature availability
    const syncButton = page.locator('[data-testid="sync-now-button"]');
    if (await syncButton.isVisible()) {
      await syncButton.click();
      const progressModal = page.locator('[data-testid="sync-progress-modal"]');
      await expect(progressModal).toBeVisible();
    }
  });
});