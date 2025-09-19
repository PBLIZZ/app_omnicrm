/**
 * E2E Test Configuration for Google Sync System
 *
 * Centralized configuration for all test suites covering the 6 phases
 * of the Google Sync System integration testing.
 */

export const TEST_CONFIG = {
  // Test timeouts (in milliseconds)
  timeouts: {
    pageLoad: 10000,
    syncOperation: 120000, // 2 minutes for sync operations
    apiCall: 30000,
    elementVisible: 10000,
    networkResponse: 15000,
  },

  // Performance benchmarks
  performance: {
    maxLoadTime: 3000, // Maximum page load time (ms)
    maxSyncTime: 120000, // Maximum sync completion time (ms)
    maxInteractionDelay: 500, // Maximum UI interaction response time (ms)
    maxMemoryGrowth: 50, // Maximum memory growth percentage
    maxApiCalls: 20, // Maximum API calls during sync
  },

  // Test data configurations
  testData: {
    gmail: {
      smallDataset: 25,
      mediumDataset: 100,
      largeDataset: 500,
      xlDataset: 1000,
      errorRate: 0.2, // 20% error rate for partial failure tests
    },
    calendar: {
      smallDataset: 15,
      mediumDataset: 50,
      largeDataset: 200,
      xlDataset: 500,
      errorRate: 0.15, // 15% error rate for partial failure tests
    },
  },

  // Feature flags for conditional testing
  features: {
    googleOAuth: process.env["FEATURE_GOOGLE_OAUTH"] === "1",
    gmailSync: process.env["FEATURE_GOOGLE_GMAIL_RO"] === "1",
    calendarSync: process.env["FEATURE_GOOGLE_CALENDAR_RO"] === "1",
    largeDatasetTest: process.env["FEATURE_LARGE_SYNC_TEST"] === "1",
    performanceTest: process.env["FEATURE_PERFORMANCE_TEST"] === "1",
    memoryStressTest: process.env["FEATURE_MEMORY_STRESS_TEST"] === "1",
    tokenRefreshTest: process.env["FEATURE_TOKEN_REFRESH"] === "1",
    tokenCorruptionTest: process.env["FEATURE_TOKEN_CORRUPTION_TEST"] === "1",
    conflictDetection: process.env["FEATURE_CONFLICT_DETECTION"] === "1",
  },

  // Test environment validation
  environment: {
    requiresDatabase: !!process.env["DATABASE_URL"],
    requiresGoogleTokens: !!(
      process.env["E2E_GOOGLE_ACCESS_TOKEN"] &&
      process.env["E2E_GOOGLE_REFRESH_TOKEN"]
    ),
    isDevelopment: process.env["NODE_ENV"] === "development",
    isCI: !!process.env["CI"],
  },

  // Test user accounts
  users: {
    gmail: {
      email: "test-gmail@example.com",
      password: "test-gmail-password-123",
      description: "User for Gmail sync testing",
    },
    calendar: {
      email: "test-calendar@example.com",
      password: "test-calendar-password-123",
      description: "User for Calendar sync testing",
    },
    full: {
      email: "test-full@example.com",
      password: "test-full-password-123",
      description: "User for full system integration testing",
    },
  },

  // Mock data templates
  mockData: {
    gmail: {
      messageTemplate: {
        id: "mock-message-{index}",
        threadId: "mock-thread-{threadIndex}",
        snippet: "Mock email message {index} content snippet...",
        payload: {
          headers: [
            { name: "From", value: "sender{index}@example.com" },
            { name: "To", value: "test@example.com" },
            { name: "Subject", value: "Test Email {index}" },
            { name: "Date", value: "{date}" },
          ],
        },
      },
    },
    calendar: {
      eventTemplate: {
        id: "mock-event-{index}",
        summary: "Test Event {index}",
        description: "Mock calendar event {index} description",
        start: { dateTime: "{startTime}" },
        end: { dateTime: "{endTime}" },
        attendees: [{ email: "attendee{index}@example.com", displayName: "Attendee {index}" }],
        location: "Location {index}",
      },
      calendarTemplate: {
        id: "{calendarId}",
        summary: "{calendarName}",
        primary: "{isPrimary}",
        accessRole: "owner",
      },
    },
  },

  // Test suite organization
  testSuites: {
    smoke: {
      description: "Quick smoke tests to verify basic functionality",
      timeout: 30000,
      retries: 1,
    },
    integration: {
      description: "Cross-phase integration tests",
      timeout: 120000,
      retries: 2,
    },
    performance: {
      description: "Performance benchmarking tests",
      timeout: 300000,
      retries: 0, // Performance tests should not retry
    },
    functional: {
      description: "Comprehensive functional requirement validation",
      timeout: 180000,
      retries: 1,
    },
    errorScenarios: {
      description: "Error handling and recovery testing",
      timeout: 60000,
      retries: 2,
    },
  },

  // Browser configurations
  browsers: {
    chromium: {
      enabled: true,
      headless: process.env["CI"] === "true",
      viewport: { width: 1280, height: 720 },
    },
    firefox: {
      enabled: process.env["BROWSER_FIREFOX"] === "1",
      headless: process.env["CI"] === "true",
      viewport: { width: 1280, height: 720 },
    },
    webkit: {
      enabled: process.env["BROWSER_WEBKIT"] === "1",
      headless: process.env["CI"] === "true",
      viewport: { width: 1280, height: 720 },
    },
  },

  // Reporting configuration
  reporting: {
    html: {
      enabled: true,
      outputDir: "e2e-results",
      open: process.env["CI"] !== "true" ? "always" : "never",
    },
    junit: {
      enabled: process.env["CI"] === "true",
      outputFile: "e2e-results/junit.xml",
    },
    json: {
      enabled: true,
      outputFile: "e2e-results/results.json",
    },
  },
} as const;

/**
 * Helper function to check if a test should be skipped
 */
export function shouldSkipTest(requirements: {
  database?: boolean;
  googleTokens?: boolean;
  feature?: keyof typeof TEST_CONFIG.features;
}): string | false {
  if (requirements.database && !TEST_CONFIG.environment.requiresDatabase) {
    return "No DATABASE_URL; skipping database-dependent test";
  }

  if (requirements.googleTokens && !TEST_CONFIG.environment.requiresGoogleTokens) {
    return "No Google OAuth tokens; skipping token-dependent test";
  }

  if (requirements.feature && !TEST_CONFIG.features[requirements.feature]) {
    return `Feature ${requirements.feature} not enabled; skipping test`;
  }

  return false;
}

/**
 * Helper function to get timeout for test type
 */
export function getTestTimeout(testType: keyof typeof TEST_CONFIG.testSuites): number {
  return TEST_CONFIG.testSuites[testType].timeout;
}

/**
 * Helper function to get retry count for test type
 */
export function getTestRetries(testType: keyof typeof TEST_CONFIG.testSuites): number {
  return TEST_CONFIG.testSuites[testType].retries;
}

/**
 * Helper function to validate test environment
 */
export function validateTestEnvironment(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!TEST_CONFIG.environment.requiresDatabase) {
    issues.push("DATABASE_URL not configured - database tests will be skipped");
  }

  if (!TEST_CONFIG.environment.requiresGoogleTokens) {
    issues.push("Google OAuth tokens not configured - some tests will use mocks only");
  }

  if (!TEST_CONFIG.features.googleOAuth) {
    issues.push("Google OAuth feature not enabled");
  }

  if (!TEST_CONFIG.features.gmailSync && !TEST_CONFIG.features.calendarSync) {
    issues.push("Neither Gmail nor Calendar sync features are enabled");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Test environment information for debugging
 */
export function getEnvironmentInfo(): Record<string, unknown> {
  return {
    config: TEST_CONFIG,
    environment: {
      NODE_ENV: process.env["NODE_ENV"],
      CI: process.env["CI"],
      DATABASE_URL: !!process.env["DATABASE_URL"],
      GOOGLE_TOKENS: TEST_CONFIG.environment.requiresGoogleTokens,
    },
    features: TEST_CONFIG.features,
    validation: validateTestEnvironment(),
  };
}