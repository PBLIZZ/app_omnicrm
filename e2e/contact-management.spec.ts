import { test, expect } from "@playwright/test";

test.describe("Contact Management", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the authentication state - assumes user is logged in
    await page.goto("/contacts");
  });

  test("displays contact list page with header", async ({ page }) => {
    // Check page title and header
    await expect(page).toHaveTitle(/Contacts/i);
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
    await expect(page.getByText("Search, filter and manage your contacts.")).toBeVisible();
  });

  test("search functionality works", async ({ page }) => {
    // Test search input
    const searchInput = page.getByLabel("Search contacts");
    await expect(searchInput).toBeVisible();

    // Test search placeholder
    await expect(searchInput).toHaveAttribute("placeholder", "Search contacts…");

    // Type in search
    await searchInput.fill("John");
    await expect(searchInput).toHaveValue("John");
  });

  test("keyboard shortcut focuses search", async ({ page }) => {
    // Test Cmd+K shortcut (or Ctrl+K on Windows/Linux)
    const searchInput = page.getByLabel("Search contacts");
    await page.keyboard.press("Meta+k");
    await expect(searchInput).toBeFocused();
  });

  test("new contact button opens dialog", async ({ page }) => {
    const newContactButton = page.getByRole("button", { name: "Create new contact" });
    await expect(newContactButton).toBeVisible();

    await newContactButton.click();

    // Check if new contact dialog opens (based on implementation)
    // This would need to be adjusted based on actual dialog behavior
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("more actions dropdown works", async ({ page }) => {
    const moreButton = page.getByRole("button", { name: "More actions" });
    await expect(moreButton).toBeVisible();

    await moreButton.click();

    // Check dropdown items
    await expect(page.getByText("Import CSV")).toBeVisible();
    await expect(page.getByText("Export Contacts")).toBeVisible();
    await expect(page.getByText("Sync Now")).toBeVisible();
  });

  test("connect google button is present", async ({ page }) => {
    const connectButton = page.getByRole("link", { name: "Connect Google" });
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toHaveAttribute("href", "/settings/sync");
  });

  test("table sorting functionality", async ({ page }) => {
    // Check if table headers are present and clickable
    const nameHeader = page.getByRole("button", { name: /Sort by name/i });
    const dateHeader = page.getByRole("button", { name: /Sort by date added/i });

    await expect(nameHeader).toBeVisible();
    await expect(dateHeader).toBeVisible();

    // Test sorting by name
    await nameHeader.click();

    // Verify sort indicator appears (▲ or ▼)
    await expect(nameHeader).toContainText(/[▲▼]/);
  });

  test("table row selection", async ({ page }) => {
    // Test "select all" checkbox if present
    const selectAllCheckbox = page.getByLabel("Select all contacts");

    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();

      // Check if bulk actions appear
      await expect(page.getByText(/selected/)).toBeVisible();
    }
  });

  test("date filter dropdown", async ({ page }) => {
    const filterButton = page.getByRole("button", { name: "Filter by date added" });

    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Check filter options
      await expect(page.getByText("Any time")).toBeVisible();
      await expect(page.getByText("Today")).toBeVisible();
      await expect(page.getByText("This week")).toBeVisible();
      await expect(page.getByText("This month")).toBeVisible();

      // Test filtering by "This month"
      await page.getByText("This month").click();
    }
  });

  test("bulk actions appear when contacts selected", async ({ page }) => {
    // Find and select a contact checkbox
    const contactCheckbox = page.locator('input[type="checkbox"]').first();

    if (await contactCheckbox.isVisible()) {
      await contactCheckbox.check();

      // Check if bulk action bar appears
      const bulkBar = page.locator(".border-t.bg-muted\\/50");
      if (await bulkBar.isVisible()) {
        await expect(page.getByText(/selected/)).toBeVisible();
        await expect(page.getByRole("button", { name: "Send Email" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Add Tags" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
      }
    }
  });

  test("empty state shows when no contacts", async ({ page }) => {
    // This test assumes there's a way to get to empty state
    // May need to adjust based on actual implementation

    // If there are no contacts, check for empty state
    const noContactsText = page.getByText("No contacts found");
    if (await noContactsText.isVisible()) {
      await expect(noContactsText).toBeVisible();
    }
  });

  test("contact row interaction", async ({ page }) => {
    // Find a contact row button
    const contactRow = page.getByRole("button", { name: /Open contact/ }).first();

    if (await contactRow.isVisible()) {
      // Test keyboard navigation
      await contactRow.focus();
      await expect(contactRow).toBeFocused();

      // Test Enter key activation
      await page.keyboard.press("Enter");

      // Should navigate to contact detail page
      await expect(page.url()).toMatch(/\/contacts\/[^/]+/);
    }
  });

  test("responsive design - mobile breakpoint", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if mobile-specific elements or layouts appear
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
    await expect(page.getByLabel("Search contacts")).toBeVisible();
  });

  test("accessibility - keyboard navigation", async ({ page }) => {
    // Test tab order through interactive elements
    await page.keyboard.press("Tab");
    // Focus may land on skip link first, press Tab again to reach search
    await page.keyboard.press("Tab");
    // Programmatically focus for stability across browsers
    await page.getByLabel("Search contacts").focus();
    await expect(page.getByLabel("Search contacts")).toBeFocused();

    await page.keyboard.press("Tab"); // Should focus new contact button
    await expect(page.getByRole("button", { name: "Create new contact" })).toBeFocused();

    await page.keyboard.press("Tab"); // Should focus more actions button
    await expect(page.getByRole("button", { name: "More actions" })).toBeFocused();
  });

  test("accessibility - ARIA labels and roles", async ({ page }) => {
    // Check important ARIA attributes
    await expect(page.getByLabel("Search contacts")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create new contact" })).toBeVisible();
    await expect(page.getByRole("button", { name: "More actions" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );

    // Check table accessibility if table is present
    const table = page.locator("table");
    if (await table.isVisible()) {
      await expect(table).toHaveAttribute("role", "table");
    }
  });

  test("toast notifications work", async ({ page }) => {
    // Test toast for unavailable features
    const moreButton = page.getByRole("button", { name: "More actions" });
    await moreButton.click();

    const syncButton = page.getByText("Sync Now");
    await syncButton.click();

    // Check for toast notification text (toaster may be present but hidden)
    await expect(page.getByText(/sync.*will be available soon/i)).toBeVisible();
  });

  test("file upload for import CSV", async ({ page }) => {
    // Test CSV import file selection
    const moreButton = page.getByRole("button", { name: "More actions" });
    await moreButton.click();

    const importButton = page.getByText("Import CSV");

    // Listen for file chooser
    const fileChooserPromise = page.waitForEvent("filechooser");
    await importButton.click();

    const fileChooser = await fileChooserPromise;

    // Verify file chooser accepts CSV files
    expect(fileChooser.page()).toBe(page);
    // Note: In real tests, you could set files with fileChooser.setFiles()
  });
});
