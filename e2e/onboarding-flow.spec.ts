import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the onboarding settings page
    await page.goto("/settings/onboarding");
  });

  test("should generate and manage onboarding tokens", async ({ page }) => {
    // Wait for the page to load
    await expect(page.getByText("Client Onboarding")).toBeVisible();

    // Test token generation
    await test.step("Generate a new onboarding token", async () => {
      // Select duration
      await page.getByRole("combobox", { name: "Select duration" }).click();
      await page.getByText("24 Hours").click();

      // Select max uses
      await page.getByRole("combobox", { name: "Select uses" }).click();
      await page.getByText("3 Uses").click();

      // Generate token
      await page.getByRole("button", { name: "Generate Onboarding Link" }).click();

      // Wait for success message
      await expect(page.getByText("Onboarding link generated successfully!")).toBeVisible();
      // Verify generated link is displayed
      const linkInput = page.locator('input[value*="/onboard/"]');
      await expect(linkInput).toBeVisible();
      await expect(page.getByText("Uses allowed: 3 uses")).toBeVisible();
    });

    // Test copying link
    await test.step("Copy generated link", async () => {
      const copyButton = page.getByLabel("Copy onboarding URL");
      await copyButton.click();

      // Verify success message
      await expect(page.getByText("Link copied to clipboard!")).toBeVisible();
    });

    // Test opening link in new tab
    await test.step("Open link in new tab", async () => {
      const openButton = page.getByLabel("Open onboarding URL in new tab");

      // Listen for new page
      const [newPage] = await Promise.all([
        page.context().waitForEvent("page"),
        openButton.click(),
      ]);

      // Verify new page opened with correct URL pattern
      expect(newPage.url()).toMatch(/\/onboard\/[a-zA-Z0-9_-]+$/);

      // Close the new page
      await newPage.close();
    });

    // Test token management
    await test.step("View and manage active tokens", async () => {
      // Check that the token appears in the active tokens list
      await expect(page.getByText("Active")).toBeVisible();
      await expect(page.getByText("3 uses left")).toBeVisible();
      await expect(page.getByText("0/3 used")).toBeVisible();
    });
  });

  test("should handle token generation errors", async ({ page }) => {
    // Mock API failure
    await page.route("**/api/onboarding/admin/generate-tokens", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Database connection failed" }),
      });
    });

    // Try to generate token
    await page.getByRole("button", { name: "Generate Onboarding Link" }).click();

    // Verify error message
    await expect(
      page.getByText("Failed to generate onboarding link. Please try again."),
    ).toBeVisible();
  });

  test("should validate form inputs", async ({ page }) => {
    // Test that form shows appropriate validation
    await expect(page.getByText("Valid Duration")).toBeVisible();
    await expect(page.getByText("Maximum Uses")).toBeVisible();
    // Verify default values
    await expect(page.locator('select[name="validDuration"]')).toHaveValue("72");
    await expect(page.locator('select[name="maxUses"]')).toHaveValue("1");
  });

  test("should display help information", async ({ page }) => {
    // Check help section
    await expect(page.getByText("How it Works")).toBeVisible();
    await expect(page.getByText(/Generate secure links for new clients/)).toBeVisible();
  });

  test("should handle empty token list", async ({ page }) => {
    // Mock empty response
    await page.route("**/api/onboarding/admin/tokens", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tokens: [] }),
      });
    });

    // Reload page to trigger the mock
    await page.reload();

    // Verify empty state
    await expect(page.getByText("No active onboarding links")).toBeVisible();
    await expect(page.getByText("Generate a link to get started")).toBeVisible();
  });

  test("should handle token deletion", async ({ page }) => {
    // First generate a token
    await page.getByRole("button", { name: "Generate Onboarding Link" }).click();
    await expect(page.getByText("Onboarding link generated successfully!")).toBeVisible();

    // Wait for token to appear in list
    await expect(page.getByText("Active")).toBeVisible();

    // Delete the token
    const deleteButton = page.getByLabel("Delete token");
    await deleteButton.click();

    // Verify success message
    await expect(page.getByText("Onboarding link deleted successfully")).toBeVisible();
  });

  test("should show different token states", async ({ page }) => {
    // Mock different token states
    await page.route("**/api/onboarding/admin/tokens", async (route) => {
      const mockTokens = [
        {
          id: "active-token",
          token: "active-token-123",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          maxUses: 3,
          usedCount: 1,
          disabled: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "expired-token",
          token: "expired-token-123",
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          maxUses: 1,
          usedCount: 0,
          disabled: false,
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "used-token",
          token: "used-token-123",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          maxUses: 2,
          usedCount: 2,
          disabled: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "disabled-token",
          token: "disabled-token-123",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          maxUses: 1,
          usedCount: 0,
          disabled: true,
          createdAt: new Date().toISOString(),
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tokens: mockTokens }),
      });
    });

    // Reload page to trigger the mock
    await page.reload();

    // Verify different states are displayed
    await expect(page.getByText("Active")).toBeVisible();
    await expect(page.getByText("Expired")).toBeVisible();
    await expect(page.getByText("Used Up")).toBeVisible();
    await expect(page.getByText("Disabled")).toBeVisible();

    // Verify summary
    await expect(page.getByText("4 total links • 1 active")).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify layout adapts
    await expect(page.getByText("Client Onboarding")).toBeVisible();
    await expect(page.getByText("Generate New Link")).toBeVisible();
    await expect(page.getByText("Active Links")).toBeVisible();
  });
});
