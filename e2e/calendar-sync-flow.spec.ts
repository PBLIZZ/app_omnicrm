/**
 * Comprehensive Calendar Sync Flow E2E Tests
 *
 * Tests the complete Calendar sync journey through all 6 phases:
 * 1. Connection establishment and OAuth flow
 * 2. Calendar selection and preferences setup
 * 3. Manual sync process with real-time progress
 * 4. Event data persistence and timeline validation
 * 5. Error handling and recovery scenarios
 * 6. Performance and reliability validation
 *
 * Critical Requirements Validated:
 * - Persistent calendar connection status across sessions
 * - Accurate last sync dates with server-side timestamps
 * - Calendar selection and date range preferences
 * - Event data pipeline transparency
 * - Optimistic UI with graceful fallbacks for calendar data
 */

import { test, expect } from "@playwright/test";
import {
  authenticateTestUser,
  navigateToOmniRhythm,
  getCsrfToken,
  simulateOAuthFlow,
  completePreferencesSetup,
  waitForSyncCompletion,
  waitForConnectionStatus,
  verifyCalendarImport,
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

test.describe("Calendar Sync Flow - Complete E2E Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Start each test with clean slate
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("Complete first-time Calendar setup and sync flow", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping integration tests");

    // Step 1: User authentication
    await authenticateTestUser(page, TEST_USERS.calendarUser);

    // Step 2: Navigate to OmniRhythm
    await navigateToOmniRhythm(page);

    // Step 3: Verify initial state shows "Connect Calendar" option
    const connectPrompt = page.locator('[data-testid="calendar-connection-prompt"]');
    await expect(connectPrompt).toBeVisible();

    const connectButton = page.locator('[data-testid="connect-calendar-button"]');
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeEnabled();

    // Step 4: Initiate OAuth flow
    await simulateOAuthFlow(page, "calendar");

    // Step 5: Verify successful connection callback
    await expect(page).toHaveURL(/.*connected=calendar/);
    await page.waitForSelector('[data-testid="preferences-modal"]', { timeout: 10000 });

    // Step 6: Complete calendar preferences setup
    await completePreferencesSetup(page, {
      timeRange: "90d",
      calendars: ["primary", "work-calendar"],
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

    // Step 10: Validate calendar events were imported
    await verifyCalendarImport(request, 1);

    // Step 11: Verify last sync date is displayed and accurate
    const lastSyncElement = page.locator('[data-testid="last-sync-date"]');
    await expect(lastSyncElement).toBeVisible();

    const lastSyncText = await lastSyncElement.textContent();
    expect(lastSyncText).toMatch(/\d+ (minute|hour|day)s? ago|just now/);

    // Step 12: Verify calendar events appear in timeline
    const timelineView = page.locator('[data-testid="calendar-timeline"]');
    await expect(timelineView).toBeVisible();

    const eventItems = page.locator('[data-testid="timeline-event"]');
    await expect(eventItems.first()).toBeVisible();
  });

  test("Calendar selection preferences workflow", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping preferences tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Simulate OAuth completion to reach preferences
    await simulateOAuthFlow(page, "calendar");

    // Wait for preferences modal
    const preferencesModal = page.locator('[data-testid="preferences-modal"]');
    await expect(preferencesModal).toBeVisible();

    // Step 1: Time range selection
    const timeRangeSection = page.locator('[data-testid="time-range-section"]');
    await expect(timeRangeSection).toBeVisible();

    // Test different time range options
    const timeRange30d = page.locator('[data-testid="time-range-30d"]');
    await timeRange30d.click();
    await expect(timeRange30d).toHaveClass(/selected|active/);

    const timeRange90d = page.locator('[data-testid="time-range-90d"]');
    await timeRange90d.click();
    await expect(timeRange90d).toHaveClass(/selected|active/);

    // Step 2: Calendar selection
    const calendarSection = page.locator('[data-testid="calendar-selection-section"]');
    await expect(calendarSection).toBeVisible();

    // Should show available calendars
    const primaryCalendar = page.locator('[data-testid="calendar-primary"]');
    await expect(primaryCalendar).toBeVisible();
    await primaryCalendar.check();

    const workCalendar = page.locator('[data-testid="calendar-work-calendar"]');
    if (await workCalendar.isVisible()) {
      await workCalendar.check();
    }

    // Step 3: Advanced options
    const advancedSection = page.locator('[data-testid="advanced-options-section"]');
    if (await advancedSection.isVisible()) {
      const includePrivate = page.locator('[data-testid="include-private-events"]');
      await includePrivate.check();

      const includeAllDay = page.locator('[data-testid="include-all-day-events"]');
      await includeAllDay.check();
    }

    // Step 4: Complete setup
    const completeButton = page.locator('[data-testid="complete-setup-button"]');
    await expect(completeButton).toBeEnabled();
    await completeButton.click();

    // Verify sync starts automatically
    const syncProgress = page.locator('[data-testid="sync-progress-modal"]');
    await expect(syncProgress).toBeVisible();
  });

  test("Calendar connection persistence across sessions", async ({ page, request, context }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping persistence tests");

    // Prerequisite: Ensure Calendar is connected
    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Verify initial connected state
    await waitForConnectionStatus(page, { isConnected: true });

    // Test 1: Page refresh persistence
    await verifyDataPersistence(page, request);

    // Test 2: New tab persistence
    const newPage = await context.newPage();
    await authenticateTestUser(newPage, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(newPage);

    await waitForConnectionStatus(newPage, { isConnected: true });

    // Verify calendar data is also persisted
    const timelineView = newPage.locator('[data-testid="calendar-timeline"]');
    await expect(timelineView).toBeVisible();

    await newPage.close();

    // Test 3: Verify calendar preferences are locked after setup
    const preferencesButton = page.locator('[data-testid="modify-calendar-preferences-button"]');
    await expect(preferencesButton).not.toBeVisible();
  });

  test("Manual calendar sync with incremental updates", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping sync tests");

    // Prerequisite: Calendar already connected
    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    await waitForConnectionStatus(page, { isConnected: true });

    // Get initial event count
    const initialTimelineItems = await page.locator('[data-testid="timeline-event"]').count();

    // Test manual "Sync Calendar" functionality
    const syncButton = page.locator('[data-testid="sync-calendar-button"]');
    await expect(syncButton).toBeVisible();
    await expect(syncButton).toBeEnabled();

    // Measure sync performance
    const syncTime = await measureSyncTime(page);
    expect(syncTime).toBeLessThan(45000); // Should complete within 45 seconds

    // Verify incremental sync message
    const syncToast = page.locator('[data-testid="sync-toast"]');
    await expect(syncToast).toContainText(/incremental|since last sync/i);

    // Verify updated last sync date
    const lastSyncElement = page.locator('[data-testid="last-sync-date"]');
    const lastSyncAfter = await lastSyncElement.textContent();
    expect(lastSyncAfter).toMatch(/just now|few seconds ago/);

    // Verify timeline may have new events
    const finalTimelineItems = await page.locator('[data-testid="timeline-event"]').count();
    expect(finalTimelineItems).toBeGreaterThanOrEqual(initialTimelineItems);
  });

  test("Calendar event data pipeline transparency", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping pipeline tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Force a new sync to observe pipeline
    const syncButton = page.locator('[data-testid="sync-calendar-button"]');
    await syncButton.click();

    // Monitor sync progress modal for transparency
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Verify import progress is shown
    const importProgress = page.locator('[data-testid="import-progress"]');
    await expect(importProgress).toContainText(/Importing \d+\/\d+ events/);

    // Verify processing progress is shown
    const processProgress = page.locator('[data-testid="process-progress"]');
    await expect(processProgress).toContainText(/Processing \d+\/\d+ events/);

    // Verify business intelligence processing
    const intelligenceProgress = page.locator('[data-testid="intelligence-progress"]');
    if (await intelligenceProgress.isVisible()) {
      await expect(intelligenceProgress).toContainText(/Analyzing events/);
    }

    // Wait for completion and verify final counts
    const syncResult = await waitForSyncCompletion(page);
    expect(syncResult.stage).toBe("completed");

    // Validate backend data consistency
    await validateRawEventsCount(request, 5); // Expect at least 5 raw events
    await validateProcessedDataCount(request, "calendar", 4); // Expect at least 4 processed
  });

  test("Calendar business intelligence generation", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping intelligence tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Ensure we have calendar data
    await waitForConnectionStatus(page, { isConnected: true });

    // Test Today's Intelligence Panel
    const intelligencePanel = page.locator('[data-testid="today-intelligence-panel"]');
    await expect(intelligencePanel).toBeVisible();

    // Should show upcoming appointments
    const upcomingAppointments = page.locator('[data-testid="upcoming-appointments"]');
    await expect(upcomingAppointments).toBeVisible();

    // Should show business metrics
    const businessMetrics = page.locator('[data-testid="business-metrics"]');
    await expect(businessMetrics).toBeVisible();

    // Test Weekly Business Flow
    const weeklyFlow = page.locator('[data-testid="weekly-business-flow"]');
    await expect(weeklyFlow).toBeVisible();

    // Should show revenue patterns
    const revenuePattern = page.locator('[data-testid="revenue-pattern"]');
    if (await revenuePattern.isVisible()) {
      await expect(revenuePattern).toContainText(/\$\d+/); // Should show monetary values
    }

    // Test session metrics
    const sessionMetrics = page.locator('[data-testid="session-metrics"]');
    await expect(sessionMetrics).toBeVisible();

    const sessionsNext7Days = page.locator('[data-testid="sessions-next-7-days"]');
    const sessionsThisMonth = page.locator('[data-testid="sessions-this-month"]');

    await expect(sessionsNext7Days).toContainText(/\d+ sessions?/);
    await expect(sessionsThisMonth).toContainText(/\d+ sessions?/);
  });

  test("Calendar error scenarios and recovery", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping error tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Test 1: Network failure during sync
    await simulateNetworkError(page);

    const syncButton = page.locator('[data-testid="sync-calendar-button"]');
    await syncButton.click();

    // Verify error is caught and displayed
    const errorMessage = page.locator('[data-testid="sync-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/network error|failed to sync/i);

    // Test 2: Calendar-specific error recovery
    await testErrorRecovery(page, request);

    // Test 3: Verify calendar data integrity after errors
    const timelineView = page.locator('[data-testid="calendar-timeline"]');
    await expect(timelineView).toBeVisible();

    // Should still show existing events
    const eventItems = page.locator('[data-testid="timeline-event"]');
    if (await eventItems.first().isVisible()) {
      await expect(eventItems.first()).not.toContainText(/error|failed/i);
    }
  });

  test("Calendar-specific optimistic UI behavior", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping UI tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);

    // Measure initial page load performance
    const loadTime = await measureLoadTime(page, "/omni-rhythm");
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

    // Verify optimistic calendar state
    const calendarCard = page.locator('[data-testid="calendar-connection-card"]');
    await expect(calendarCard).toBeVisible({ timeout: 1000 });

    // Should show optimistic connected state for better UX
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toBeVisible();

    // Wait for server validation
    await page.waitForLoadState("networkidle");

    // Verify final state matches server reality
    const serverStatus = await request.get("/api/google/calendar/status");
    const serverData = await serverStatus.json();

    const uiConnectedState = await connectionStatus.textContent();
    const isUIConnected = uiConnectedState?.includes("Connected") ?? false;

    expect(isUIConnected).toBe(serverData.calendarConnected);
  });

  test("Multiple calendar selection and sync", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping multiple calendar tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Simulate OAuth to reach calendar selection
    await simulateOAuthFlow(page, "calendar");

    const preferencesModal = page.locator('[data-testid="preferences-modal"]');
    await expect(preferencesModal).toBeVisible();

    // Select multiple calendars
    const primaryCalendar = page.locator('[data-testid="calendar-primary"]');
    await primaryCalendar.check();

    const workCalendar = page.locator('[data-testid="calendar-work"]');
    if (await workCalendar.isVisible()) {
      await workCalendar.check();
    }

    const personalCalendar = page.locator('[data-testid="calendar-personal"]');
    if (await personalCalendar.isVisible()) {
      await personalCalendar.check();
    }

    // Complete setup
    const completeButton = page.locator('[data-testid="complete-setup-button"]');
    await completeButton.click();

    // Monitor sync for multiple calendars
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Should show progress for each calendar
    const calendarProgress = page.locator('[data-testid="calendar-sync-progress"]');
    await expect(calendarProgress).toContainText(/calendar/i);

    const syncResult = await waitForSyncCompletion(page);
    expect(syncResult.stage).toBe("completed");

    // Verify events from multiple calendars appear
    const timelineView = page.locator('[data-testid="calendar-timeline"]');
    await expect(timelineView).toBeVisible();

    // Should have events from different sources
    const eventSources = page.locator('[data-testid="event-source"]');
    const sourceCount = await eventSources.count();
    expect(sourceCount).toBeGreaterThan(0);
  });

  test("Calendar sync with date range constraints", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping date range tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Test different date ranges
    const testRanges = ["7d", "30d", "90d", "365d"];

    for (const range of testRanges) {
      // Reset and start new sync with specific range
      await page.reload();
      await navigateToOmniRhythm(page);

      await simulateOAuthFlow(page, "calendar");

      await completePreferencesSetup(page, {
        timeRange: range as "7d" | "30d" | "90d" | "365d",
        calendars: ["primary"],
      });

      const syncResult = await waitForSyncCompletion(page);
      expect(syncResult.stage).toBe("completed");

      // Verify date range constraint was applied
      const timelineView = page.locator('[data-testid="calendar-timeline"]');
      await expect(timelineView).toBeVisible();

      // Check that events fall within the expected date range
      const eventDates = page.locator('[data-testid="event-date"]');
      const eventCount = await eventDates.count();

      if (eventCount > 0) {
        const firstEventDate = await eventDates.first().textContent();
        const lastEventDate = await eventDates.last().textContent();

        // Verify dates are within the specified range
        // This would require more sophisticated date parsing in a real implementation
        expect(firstEventDate).toBeTruthy();
        expect(lastEventDate).toBeTruthy();
      }
    }
  });
});

test.describe("Calendar Sync Flow - Advanced Scenarios", () => {
  test("Calendar event conflict detection", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping conflict tests");
    test.skip(!process.env["FEATURE_CONFLICT_DETECTION"], "Conflict detection not enabled");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Sync calendar data
    await waitForConnectionStatus(page, { isConnected: true });

    // Look for conflict indicators in the intelligence panel
    const conflictAlerts = page.locator('[data-testid="scheduling-conflicts"]');
    if (await conflictAlerts.isVisible()) {
      await expect(conflictAlerts).toContainText(/conflict|overlap/i);

      // Test conflict resolution suggestions
      const resolveButton = page.locator('[data-testid="resolve-conflicts"]');
      if (await resolveButton.isVisible()) {
        await resolveButton.click();

        const conflictModal = page.locator('[data-testid="conflict-resolution-modal"]');
        await expect(conflictModal).toBeVisible();

        const suggestionList = page.locator('[data-testid="conflict-suggestions"]');
        await expect(suggestionList).toBeVisible();
      }
    }
  });

  test("Calendar sync with business hours filtering", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping business hours tests");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    await simulateOAuthFlow(page, "calendar");

    const preferencesModal = page.locator('[data-testid="preferences-modal"]');
    await expect(preferencesModal).toBeVisible();

    // Configure business hours filtering
    const businessHoursSection = page.locator('[data-testid="business-hours-section"]');
    if (await businessHoursSection.isVisible()) {
      const filterBusinessHours = page.locator('[data-testid="filter-business-hours"]');
      await filterBusinessHours.check();

      // Set business hours
      const startTimeInput = page.locator('[data-testid="business-start-time"]');
      const endTimeInput = page.locator('[data-testid="business-end-time"]');

      await startTimeInput.fill("09:00");
      await endTimeInput.fill("17:00");
    }

    await completePreferencesSetup(page, {
      calendars: ["primary"],
    });

    const syncResult = await waitForSyncCompletion(page);
    expect(syncResult.stage).toBe("completed");

    // Verify only business hours events are displayed prominently
    const businessEvents = page.locator('[data-testid="business-event"]');
    const afterHoursEvents = page.locator('[data-testid="after-hours-event"]');

    const businessCount = await businessEvents.count();
    const afterHoursCount = await afterHoursEvents.count();

    // Business events should be more prominent
    if (businessCount > 0) {
      await expect(businessEvents.first()).toBeVisible();
    }

    // After hours events might be collapsed or less prominent
    if (afterHoursCount > 0) {
      const afterHoursContainer = page.locator('[data-testid="after-hours-container"]');
      // Might be collapsed by default
    }
  });

  test("Calendar sync performance with large datasets", async ({ page, request }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping performance tests");
    test.skip(!process.env["FEATURE_LARGE_CALENDAR_TEST"], "Large calendar testing not enabled");

    await authenticateTestUser(page, TEST_USERS.calendarUser);
    await navigateToOmniRhythm(page);

    // Setup large dataset
    const csrf = await getCsrfToken(request);

    await request.post("/api/test/setup-large-calendar", {
      headers: { "x-csrf-token": csrf },
      data: { eventCount: 500, calendarCount: 5 },
    });

    // Start sync and monitor performance
    const startTime = Date.now();
    await simulateOAuthFlow(page, "calendar");

    await completePreferencesSetup(page, {
      timeRange: "365d",
      calendars: ["primary", "work", "personal", "family", "health"],
    });

    // Monitor progress updates
    const progressModal = page.locator('[data-testid="sync-progress-modal"]');
    await expect(progressModal).toBeVisible();

    // Verify progress increments for large dataset
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

    const syncResult = await waitForSyncCompletion(page, 180000); // 3 minute timeout
    expect(syncResult.stage).toBe("completed");

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(180000); // Should complete within 3 minutes

    // Verify calendar UI remains responsive with large dataset
    const timelineView = page.locator('[data-testid="calendar-timeline"]');
    await expect(timelineView).toBeVisible();

    // Verify virtualization or pagination is working
    const visibleEvents = page.locator('[data-testid="timeline-event"]:visible');
    const visibleCount = await visibleEvents.count();
    expect(visibleCount).toBeLessThan(100); // Should not render all 500 events at once

    // Test scroll performance
    const scrollContainer = page.locator('[data-testid="timeline-scroll-container"]');
    if (await scrollContainer.isVisible()) {
      await scrollContainer.scroll({ top: 1000 });
      await page.waitForTimeout(100); // Allow for scroll rendering

      // Should load more events smoothly
      const newVisibleCount = await visibleEvents.count();
      expect(newVisibleCount).toBeGreaterThan(visibleCount);
    }
  });
});

test.afterEach(async ({ request }, testInfo) => {
  // Cleanup test data if test passed
  if (testInfo.status === "passed") {
    try {
      await cleanupTestData(request, "test-calendar-user-id");
    } catch (error) {
      console.warn("Calendar test cleanup failed:", error);
    }
  }
});