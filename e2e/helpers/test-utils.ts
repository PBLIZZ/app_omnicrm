/**
 * E2E Test Utilities for Google Sync System Testing
 *
 * Provides utilities for comprehensive testing of all 6 phases of the Google Sync System:
 * - Phase 1: Stable API infrastructure with unified status
 * - Phase 2: Optimized React Query with centralized keys
 * - Phase 3: Complete preferences system with step-by-step modal
 * - Phase 4: Manual sync pipeline with blocking UI and real-time progress
 * - Phase 5: Comprehensive error tracking and recovery actions
 * - Phase 6: End-to-end integration testing (this phase)
 */

import { expect, type Page, type APIRequestContext } from "@playwright/test";
import type { Response } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  id?: string;
}

export interface SyncStatus {
  googleConnected: boolean;
  serviceTokens: {
    google?: boolean;
    gmail?: boolean;
    calendar?: boolean;
    unified?: boolean;
  };
  flags: {
    gmail: boolean;
    calendar: boolean;
  };
  lastSync: {
    gmail: string | null;
    calendar: string | null;
  };
  grantedScopes: {
    gmail: string[] | null;
    calendar: string[] | null;
  };
}

export interface SyncProgressUpdate {
  stage: "importing" | "processing" | "completed" | "error";
  imported?: number;
  total?: number;
  processed?: number;
  failed?: number;
  message?: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastSync?: string;
  emailCount?: number;
  contactCount?: number;
  error?: string;
}

/**
 * CSRF Token Management
 */
export async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/health");
  const setCookies = res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
  const csrfCookie = setCookies.find((v) => v.startsWith("csrf="));
  expect(csrfCookie).toBeTruthy();
  return csrfCookie!.split(";")[0].split("=")[1];
}

/**
 * Authentication Utilities
 */
export async function authenticateTestUser(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for successful login
  await page.waitForURL("/dashboard", { timeout: 10000 });
  await expect(page).toHaveURL(/.*\/dashboard/);
}

/**
 * Navigation Helpers
 */
export async function navigateToOmniConnect(page: Page): Promise<void> {
  await page.goto("/omni-connect");
  await page.waitForLoadState("networkidle");
}

export async function navigateToOmniRhythm(page: Page): Promise<void> {
  await page.goto("/omni-rhythm");
  await page.waitForLoadState("networkidle");
}

/**
 * Connection Status Validation
 */
export async function getConnectionStatus(request: APIRequestContext): Promise<SyncStatus> {
  const response = await request.get("/api/google/status");
  expect(response.status()).toBe(200);
  return response.json();
}

export async function waitForConnectionStatus(
  page: Page,
  expected: { isConnected: boolean },
  timeout = 30000
): Promise<void> {
  await page.waitForFunction(
    (expectedConnected) => {
      const statusCard = document.querySelector('[data-testid="connection-status-card"]');
      if (!statusCard) return false;

      const isConnected = statusCard.textContent?.includes("Connected") ?? false;
      return isConnected === expectedConnected;
    },
    expected.isConnected,
    { timeout }
  );
}

/**
 * OAuth Flow Simulation
 */
export async function simulateOAuthFlow(page: Page, service: "gmail" | "calendar"): Promise<void> {
  // Click the connect button
  const connectButton = page.locator(`[data-testid="connect-${service}-button"]`);
  await expect(connectButton).toBeVisible();
  await connectButton.click();

  // In a real test environment, we would simulate the OAuth redirect
  // For now, we'll wait for the success callback
  await page.waitForURL(/.*connected=${service}/, { timeout: 30000 });
}

/**
 * Preferences Modal Interaction
 */
export async function completePreferencesSetup(
  page: Page,
  options: {
    timeRange?: "7d" | "30d" | "90d" | "365d";
    calendars?: string[];
    includeFolders?: string[];
  } = {}
): Promise<void> {
  // Wait for preferences modal to appear
  const modal = page.locator('[data-testid="preferences-modal"]');
  await expect(modal).toBeVisible();

  // Step 1: Time range selection (if applicable)
  if (options.timeRange) {
    const timeRangeButton = page.locator(`[data-testid="time-range-${options.timeRange}"]`);
    await timeRangeButton.click();
  }

  // Step 2: Calendar/folder selection
  if (options.calendars) {
    for (const calendar of options.calendars) {
      const calendarCheckbox = page.locator(`[data-testid="calendar-${calendar}"]`);
      await calendarCheckbox.check();
    }
  }

  if (options.includeFolders) {
    for (const folder of options.includeFolders) {
      const folderCheckbox = page.locator(`[data-testid="folder-${folder}"]`);
      await folderCheckbox.check();
    }
  }

  // Complete setup
  const completeButton = page.locator('[data-testid="complete-setup-button"]');
  await expect(completeButton).toBeEnabled();
  await completeButton.click();
}

/**
 * Sync Progress Monitoring
 */
export async function waitForSyncCompletion(
  page: Page,
  timeout = 120000
): Promise<SyncProgressUpdate> {
  const progressModal = page.locator('[data-testid="sync-progress-modal"]');
  await expect(progressModal).toBeVisible();

  let lastUpdate: SyncProgressUpdate = { stage: "importing" };

  // Monitor progress updates
  await page.waitForFunction(
    () => {
      const progressText = document.querySelector('[data-testid="sync-progress-text"]')?.textContent;
      return progressText?.includes("completed") || progressText?.includes("error");
    },
    { timeout }
  );

  // Get final status
  const finalProgressText = await page.locator('[data-testid="sync-progress-text"]').textContent();

  if (finalProgressText?.includes("completed")) {
    lastUpdate.stage = "completed";
  } else if (finalProgressText?.includes("error")) {
    lastUpdate.stage = "error";
    lastUpdate.message = finalProgressText;
  }

  return lastUpdate;
}

/**
 * Data Verification Helpers
 */
export async function verifyEmailImport(
  request: APIRequestContext,
  expectedCount: number
): Promise<void> {
  const response = await request.get("/api/omni-connect/dashboard");
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data.connection.emailCount).toBeGreaterThanOrEqual(expectedCount);
}

export async function verifyCalendarImport(
  request: APIRequestContext,
  expectedCount: number
): Promise<void> {
  const response = await request.get("/api/google/calendar/events");
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data.events).toHaveLength(expectedCount);
}

export async function verifyDataPersistence(
  page: Page,
  request: APIRequestContext
): Promise<void> {
  // Refresh page
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Verify connection status persists
  const status = await getConnectionStatus(request);
  expect(status.googleConnected).toBe(true);

  // Verify UI shows connected state immediately (optimistic UI)
  const statusCard = page.locator('[data-testid="connection-status-card"]');
  await expect(statusCard).toContainText("Connected");
}

/**
 * Error Scenario Simulation
 */
export async function simulateNetworkError(page: Page): Promise<void> {
  // Simulate network failure during sync
  await page.route("**/api/google/**", (route) => {
    route.abort("failed");
  });
}

export async function simulateTokenExpiry(request: APIRequestContext): Promise<void> {
  // Simulate expired tokens by making API calls fail with 401
  // This would require backend support for testing
}

/**
 * Performance Monitoring
 */
export async function measureLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  return Date.now() - startTime;
}

export async function measureSyncTime(page: Page): Promise<number> {
  const startTime = Date.now();

  // Start sync
  const syncButton = page.locator('[data-testid="sync-now-button"]');
  await syncButton.click();

  // Wait for completion
  await waitForSyncCompletion(page);

  return Date.now() - startTime;
}

/**
 * Database State Validation
 */
export async function validateRawEventsCount(
  request: APIRequestContext,
  expectedCount: number
): Promise<void> {
  const csrf = await getCsrfToken(request);

  const response = await request.post("/api/test/raw-events-count", {
    headers: { "x-csrf-token": csrf },
  });

  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.count).toBe(expectedCount);
}

export async function validateProcessedDataCount(
  request: APIRequestContext,
  service: "gmail" | "calendar",
  expectedCount: number
): Promise<void> {
  const csrf = await getCsrfToken(request);

  const response = await request.post("/api/test/processed-data-count", {
    headers: { "x-csrf-token": csrf },
    data: { service },
  });

  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.count).toBeGreaterThanOrEqual(expectedCount);
}

/**
 * Error Recovery Testing
 */
export async function testErrorRecovery(
  page: Page,
  request: APIRequestContext
): Promise<void> {
  // Navigate to error recovery page/modal
  const errorButton = page.locator('[data-testid="view-errors-button"]');
  await errorButton.click();

  // Verify error summary is shown
  const errorSummary = page.locator('[data-testid="error-summary"]');
  await expect(errorSummary).toBeVisible();

  // Test retry functionality
  const retryButton = page.locator('[data-testid="retry-failed-button"]');
  if (await retryButton.isVisible()) {
    await retryButton.click();

    // Wait for retry completion
    await page.waitForSelector('[data-testid="retry-progress"]', { state: "hidden" });
  }

  // Test manual job processing
  const processJobsButton = page.locator('[data-testid="process-jobs-button"]');
  if (await processJobsButton.isVisible()) {
    await processJobsButton.click();

    // Verify job processing response
    await expect(page.locator('[data-testid="job-process-result"]')).toBeVisible();
  }
}

/**
 * Test Data Cleanup
 */
export async function cleanupTestData(request: APIRequestContext, userId: string): Promise<void> {
  const csrf = await getCsrfToken(request);

  await request.post("/api/test/cleanup", {
    headers: { "x-csrf-token": csrf },
    data: { userId },
  });
}

export const TEST_USERS = {
  gmailUser: {
    email: "test-gmail@example.com",
    password: "test-gmail-password-123",
  },
  calendarUser: {
    email: "test-calendar@example.com",
    password: "test-calendar-password-123",
  },
  fullUser: {
    email: "test-full@example.com",
    password: "test-full-password-123",
  },
} as const;

export const MOCK_SYNC_DATA = {
  gmail: {
    emails: Array.from({ length: 50 }, (_, i) => ({
      id: `email-${i}`,
      subject: `Test Email ${i + 1}`,
      from: `sender${i}@example.com`,
      date: new Date(Date.now() - i * 86400000).toISOString(),
    })),
  },
  calendar: {
    events: Array.from({ length: 25 }, (_, i) => ({
      id: `event-${i}`,
      title: `Test Event ${i + 1}`,
      startTime: new Date(Date.now() + i * 86400000).toISOString(),
      endTime: new Date(Date.now() + i * 86400000 + 3600000).toISOString(),
    })),
  },
} as const;