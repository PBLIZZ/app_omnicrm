import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": "/Users/peterjamesblizzard/projects/app_omnicrm/src",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
    globals: true,
    exclude: ["**/node_modules/**", "**/e2e/**", "**/*.spec.ts"],
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    envDir: ".",
  },
});
