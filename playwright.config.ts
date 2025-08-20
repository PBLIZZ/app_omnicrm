import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "pnpm dev",
    port: 3001,
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
  // Ensure tests are snappy and deterministic
  expect: { timeout: 30_000 },
  timeout: 30_000,
  testDir: "e2e",
  use: { baseURL: "http://localhost:3001" },
  // Wait for /api/health to report ready (or skip if not implemented)
  globalSetup: "./e2e/global-setup.ts",
});
