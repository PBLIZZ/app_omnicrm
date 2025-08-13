import { defineConfig } from "@playwright/test";

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
  // Ensure tests are snappy and deterministic
  expect: { timeout: 30_000 },
  timeout: 30_000,
  testDir: "e2e",
  use: { baseURL: "http://localhost:3000", storageState: "e2e/.auth.json" },
  // Wait for /api/health to report ready (or skip if not implemented)
  globalSetup: "./e2e/global-setup.ts",
});
