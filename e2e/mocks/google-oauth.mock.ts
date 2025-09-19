/**
 * Google OAuth Mock Service for E2E Testing
 *
 * Provides mock implementations of Google OAuth flow for testing
 * the complete Google Sync System without requiring real OAuth tokens.
 */

import { Page, Route } from "@playwright/test";

export interface MockOAuthConfig {
  service: "gmail" | "calendar" | "unified";
  shouldSucceed: boolean;
  redirectDelay?: number;
  mockTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export class GoogleOAuthMock {
  private page: Page;
  private routes: Route[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Setup mock OAuth flow for Gmail or Calendar
   */
  async setupOAuthMock(config: MockOAuthConfig): Promise<void> {
    const { service, shouldSucceed, redirectDelay = 1000, mockTokens } = config;

    // Mock the OAuth initiation redirect
    const initiationRoute = await this.page.route(`**/api/google/${service}/oauth`, async (route) => {
      if (shouldSucceed) {
        // Simulate successful OAuth redirect
        setTimeout(() => {
          void this.page.goto(`/omni-${service === "calendar" ? "rhythm" : "connect"}?connected=${service}`);
        }, redirectDelay);
      } else {
        // Simulate OAuth failure
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "oauth_failed",
            message: "OAuth authorization failed",
          }),
        });
      }
    });

    this.routes.push(initiationRoute);

    // Mock the OAuth callback
    const callbackRoute = await this.page.route(`**/api/google/connect/callback*`, async (route) => {
      if (shouldSucceed) {
        await route.fulfill({
          status: 302,
          headers: {
            Location: `/omni-${service === "calendar" ? "rhythm" : "connect"}?step=${service}-sync`,
          },
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "invalid_grant",
            message: "OAuth callback failed",
          }),
        });
      }
    });

    this.routes.push(callbackRoute);

    // Mock token storage endpoint
    if (mockTokens) {
      const tokenRoute = await this.page.route(`**/api/google/store-tokens`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            tokens: mockTokens,
          }),
        });
      });

      this.routes.push(tokenRoute);
    }
  }

  /**
   * Setup mock Google API responses for sync operations
   */
  async setupGoogleAPIMock(config: {
    service: "gmail" | "calendar";
    emailCount?: number;
    eventCount?: number;
    shouldFail?: boolean;
    partialFailure?: boolean;
  }): Promise<void> {
    const { service, emailCount = 50, eventCount = 25, shouldFail = false, partialFailure = false } = config;

    if (service === "gmail") {
      // Mock Gmail API responses
      const gmailSyncRoute = await this.page.route(`**/api/google/gmail/sync*`, async (route) => {
        if (shouldFail) {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: "api_error",
              message: "Gmail API request failed",
            }),
          });
          return;
        }

        const successCount = partialFailure ? Math.floor(emailCount * 0.8) : emailCount;
        const failureCount = partialFailure ? emailCount - successCount : 0;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Gmail sync completed",
            stats: {
              totalFound: emailCount,
              processed: successCount,
              inserted: successCount,
              errors: failureCount,
              batchId: `mock-batch-${Date.now()}`,
            },
          }),
        });
      });

      this.routes.push(gmailSyncRoute);

      // Mock Gmail messages endpoint
      const messagesRoute = await this.page.route(`**/api/google/gmail/messages*`, async (route) => {
        const mockMessages = Array.from({ length: emailCount }, (_, i) => ({
          id: `mock-message-${i}`,
          threadId: `mock-thread-${Math.floor(i / 3)}`,
          snippet: `Mock email message ${i + 1} content snippet...`,
          payload: {
            headers: [
              { name: "From", value: `sender${i}@example.com` },
              { name: "To", value: "test@example.com" },
              { name: "Subject", value: `Test Email ${i + 1}` },
              { name: "Date", value: new Date(Date.now() - i * 86400000).toISOString() },
            ],
          },
        }));

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            messages: mockMessages,
            nextPageToken: null,
          }),
        });
      });

      this.routes.push(messagesRoute);
    }

    if (service === "calendar") {
      // Mock Calendar API responses
      const calendarSyncRoute = await this.page.route(`**/api/google/calendar/sync*`, async (route) => {
        if (shouldFail) {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: "api_error",
              message: "Calendar API request failed",
            }),
          });
          return;
        }

        const successCount = partialFailure ? Math.floor(eventCount * 0.8) : eventCount;
        const failureCount = partialFailure ? eventCount - successCount : 0;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Calendar sync completed",
            stats: {
              totalFound: eventCount,
              processed: successCount,
              inserted: successCount,
              errors: failureCount,
              batchId: `mock-calendar-batch-${Date.now()}`,
            },
          }),
        });
      });

      this.routes.push(calendarSyncRoute);

      // Mock Calendar events endpoint
      const eventsRoute = await this.page.route(`**/api/google/calendar/events*`, async (route) => {
        const mockEvents = Array.from({ length: eventCount }, (_, i) => ({
          id: `mock-event-${i}`,
          summary: `Test Event ${i + 1}`,
          description: `Mock calendar event ${i + 1} description`,
          start: {
            dateTime: new Date(Date.now() + i * 86400000).toISOString(),
          },
          end: {
            dateTime: new Date(Date.now() + i * 86400000 + 3600000).toISOString(),
          },
          attendees: [
            { email: `attendee${i}@example.com`, displayName: `Attendee ${i}` },
          ],
          location: `Location ${i + 1}`,
        }));

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: mockEvents,
            nextPageToken: null,
          }),
        });
      });

      this.routes.push(eventsRoute);

      // Mock Calendar list endpoint
      const calendarListRoute = await this.page.route(`**/api/google/calendar/list*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "primary",
                summary: "Primary Calendar",
                primary: true,
                accessRole: "owner",
              },
              {
                id: "work-calendar@example.com",
                summary: "Work Calendar",
                primary: false,
                accessRole: "owner",
              },
              {
                id: "personal-calendar@example.com",
                summary: "Personal Calendar",
                primary: false,
                accessRole: "owner",
              },
            ],
          }),
        });
      });

      this.routes.push(calendarListRoute);
    }
  }

  /**
   * Setup mock status endpoints
   */
  async setupStatusMock(config: {
    googleConnected: boolean;
    serviceTokens: Record<string, boolean>;
    lastSync: Record<string, string | null>;
    grantedScopes: Record<string, string[] | null>;
  }): Promise<void> {
    // Mock Google status endpoint
    const statusRoute = await this.page.route(`**/api/google/status`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          googleConnected: config.googleConnected,
          serviceTokens: config.serviceTokens,
          flags: {
            gmail: true,
            calendar: true,
          },
          lastSync: config.lastSync,
          grantedScopes: config.grantedScopes,
          jobs: {
            queued: 0,
            done: 10,
            error: 0,
          },
          embedJobs: {
            queued: 0,
            done: 5,
            error: 0,
          },
        }),
      });
    });

    this.routes.push(statusRoute);

    // Mock OmniConnect dashboard endpoint
    const dashboardRoute = await this.page.route(`**/api/omni-connect/dashboard`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connection: {
            isConnected: config.googleConnected,
            emailCount: config.googleConnected ? 150 : 0,
            contactCount: config.googleConnected ? 45 : 0,
            lastSync: config.lastSync.gmail,
          },
          emailPreview: {
            emails: [],
            range: null,
            previewRange: null,
          },
          activeJobs: {
            jobs: [],
            currentBatch: null,
          },
          syncStatus: {
            googleConnected: config.googleConnected,
            serviceTokens: config.serviceTokens,
            flags: {
              gmail: true,
              calendar: true,
            },
            lastSync: config.lastSync,
            grantedScopes: config.grantedScopes,
            jobs: {
              queued: 0,
              done: 10,
              error: 0,
            },
            embedJobs: {
              queued: 0,
              done: 5,
              error: 0,
            },
          },
        }),
      });
    });

    this.routes.push(dashboardRoute);
  }

  /**
   * Setup error scenarios for testing error handling
   */
  async setupErrorScenarios(scenarios: {
    networkFailure?: boolean;
    tokenExpiry?: boolean;
    rateLimiting?: boolean;
    serviceUnavailable?: boolean;
  }): Promise<void> {
    const { networkFailure, tokenExpiry, rateLimiting, serviceUnavailable } = scenarios;

    if (networkFailure) {
      // Simulate network failures
      const networkRoute = await this.page.route(`**/api/google/**`, async (route) => {
        await route.abort("failed");
      });
      this.routes.push(networkRoute);
    }

    if (tokenExpiry) {
      // Simulate expired tokens
      const tokenRoute = await this.page.route(`**/api/google/**`, async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "invalid_grant",
            message: "Token has been expired or revoked",
          }),
        });
      });
      this.routes.push(tokenRoute);
    }

    if (rateLimiting) {
      // Simulate API rate limiting
      const rateLimitRoute = await this.page.route(`**/api/google/**`, async (route) => {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: "rate_limit_exceeded",
            message: "Too many requests. Please try again later.",
          }),
        });
      });
      this.routes.push(rateLimitRoute);
    }

    if (serviceUnavailable) {
      // Simulate service unavailability
      const serviceRoute = await this.page.route(`**/api/google/**`, async (route) => {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "service_unavailable",
            message: "Google service temporarily unavailable",
          }),
        });
      });
      this.routes.push(serviceRoute);
    }
  }

  /**
   * Setup progress simulation for sync operations
   */
  async setupProgressSimulation(config: {
    totalItems: number;
    updateInterval: number;
    includeErrors?: boolean;
  }): Promise<void> {
    const { totalItems, updateInterval, includeErrors = false } = config;

    // Mock real-time progress updates
    const progressRoute = await this.page.route(`**/api/sync/progress/*`, async (route) => {
      const progress = {
        stage: "importing",
        imported: Math.floor(totalItems * 0.6),
        total: totalItems,
        processed: Math.floor(totalItems * 0.4),
        failed: includeErrors ? Math.floor(totalItems * 0.1) : 0,
        message: "Processing emails...",
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(progress),
      });
    });

    this.routes.push(progressRoute);

    // Simulate progress updates over time
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.floor(totalItems / 10);
      if (currentProgress >= totalItems) {
        clearInterval(progressInterval);
      }

      void this.page.evaluate(
        ({ progress, total, errors }) => {
          const event = new CustomEvent("sync-progress", {
            detail: {
              stage: progress >= total ? "completed" : "importing",
              imported: progress,
              total,
              processed: Math.floor(progress * 0.8),
              failed: errors,
              message: progress >= total ? "Sync completed" : "Processing...",
            },
          });
          window.dispatchEvent(event);
        },
        {
          progress: currentProgress,
          total: totalItems,
          errors: includeErrors ? Math.floor(currentProgress * 0.1) : 0,
        }
      );
    }, updateInterval);
  }

  /**
   * Cleanup all mock routes
   */
  async cleanup(): Promise<void> {
    for (const route of this.routes) {
      await route.unroute();
    }
    this.routes = [];
  }
}

/**
 * Helper function to create OAuth mock for tests
 */
export async function createOAuthMock(
  page: Page,
  config: {
    service: "gmail" | "calendar";
    connected: boolean;
    emailCount?: number;
    eventCount?: number;
    includeErrors?: boolean;
  }
): Promise<GoogleOAuthMock> {
  const mock = new GoogleOAuthMock(page);

  // Setup OAuth flow
  await mock.setupOAuthMock({
    service: config.service,
    shouldSucceed: config.connected,
    mockTokens: config.connected
      ? {
          accessToken: `mock-access-token-${config.service}`,
          refreshToken: `mock-refresh-token-${config.service}`,
          expiresIn: 3600,
        }
      : undefined,
  });

  // Setup API responses
  if (config.connected) {
    await mock.setupGoogleAPIMock({
      service: config.service,
      emailCount: config.emailCount,
      eventCount: config.eventCount,
      partialFailure: config.includeErrors,
    });

    // Setup status
    await mock.setupStatusMock({
      googleConnected: true,
      serviceTokens: {
        google: true,
        [config.service]: true,
        unified: true,
      },
      lastSync: {
        [config.service]: new Date().toISOString(),
      },
      grantedScopes: {
        [config.service]: [
          config.service === "gmail"
            ? "https://www.googleapis.com/auth/gmail.readonly"
            : "https://www.googleapis.com/auth/calendar.readonly"
        ],
      },
    });
  }

  return mock;
}