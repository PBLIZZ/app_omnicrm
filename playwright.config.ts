import { defineConfig, devices } from "@playwright/test";
import { cpus } from "os";

export default defineConfig({
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
    env: {
      // Provide a stable dev identity so tests bypass interactive login
      E2E_USER_ID: "3550f627-dbd7-4c5f-a13f-e59295c14676",
    },
  },
  // Improved timeouts and settings for stability
  expect: {
    timeout: 15_000, // Reduced from 30s for faster feedback
    toHaveScreenshot: { threshold: 0.2, mode: "percent" },
    toMatchSnapshot: { threshold: 0.2, mode: "percent" },
  },
  timeout: 60_000, // Increased overall test timeout
  testDir: "e2e",

  // Enhanced browser settings for stability
  use: {
    baseURL: "http://localhost:3000",
    storageState: "e2e/.auth.json",
    // Better viewport for consistency
    viewport: { width: 1280, height: 720 },
    // Enable video on failures for debugging
    video: "retain-on-failure",
    // Enable screenshots on failure
    screenshot: "only-on-failure",
    // Wait for network to be idle
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    // Better trace collection
    trace: "retain-on-failure",
  },

  // Retry configuration for flaky tests
  retries: process.env["CI"] ? 2 : 1,

  // Parallel execution settings
  workers: process.env["CI"] ? 1 : Math.min(3, cpus().length),

  // Report configuration
  reporter: [["list"], ["html", { open: "never" }]],

  // Projects for different browser testing (optional)
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Wait for /api/health to report ready (or skip if not implemented)
  globalSetup: "./e2e/global-setup.ts",
});
