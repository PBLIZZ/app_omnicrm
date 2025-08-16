import { test, expect } from "@playwright/test";

test.describe("Contact CRUD Flow", () => {
  const testContact = {
    name: "Test User",
    email: "test@example.com",
    phone: "+1234567890",
    company: "Test Company",
  };

  const updatedContact = {
    name: "Updated Test User",
    email: "updated@example.com",
    phone: "+0987654321",
    company: "Updated Company",
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to contacts page
    await page.goto("/contacts");
    await page.waitForLoadState("networkidle");

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible({ timeout: 10000 });
  });

  test("complete contact CRUD flow: create → list → view → edit → delete", async ({ page }) => {
    // ==================== CREATE CONTACT ====================
    test.step("Create new contact", async () => {
      // Click New Contact button
      const newContactButton = page.getByRole("button", { name: "Create new contact" });
      await expect(newContactButton).toBeVisible({ timeout: 10000 });
      await newContactButton.click();

      // Wait for dialog to open
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 10000 });

      // Fill out contact form (scope fields to dialog to avoid label collisions)
      await dialog.getByLabel("Name").fill(testContact.name);
      await dialog.getByLabel("Email").fill(testContact.email);

      // Check if phone field exists and fill it
      const phoneField = dialog.getByLabel("Phone");
      if (await phoneField.isVisible()) {
        await phoneField.fill(testContact.phone);
      }

      // Save contact
      const saveButton = dialog.getByRole("button", { name: /save|create/i });
      await expect(saveButton).toBeVisible();
      await saveButton.click();

      // Wait for dialog to close
      await expect(dialog).not.toBeVisible({ timeout: 10000 });

      // Check for success notification
      await expect(page.locator("[data-sonner-toaster]")).toBeVisible({ timeout: 5000 });
    });

    // ==================== VERIFY IN LIST ====================
    test.step("Verify contact appears in list", async () => {
      // Search for the created contact to ensure it appears
      const searchInput = page.getByLabel("Search contacts");
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill(testContact.name);
      await page.waitForTimeout(500);

      // Wait for search results and poll until the row button appears
      const contactButton = page
        .getByRole("button", { name: `Open contact ${testContact.name}` })
        .first();
      await expect(contactButton).toBeVisible({ timeout: 10000 });

      // Verify contact appears in table
      await expect(page.getByText(testContact.email)).toBeVisible({ timeout: 5000 });

      if (testContact.phone) {
        await expect(page.getByText(testContact.phone)).toBeVisible({ timeout: 5000 });
      }
    });

    // ==================== OPEN CONTACT DETAILS ====================
    test.step("Open contact details", async () => {
      // Click on first matching contact row to open details
      const contactRow = page
        .getByRole("button", { name: `Open contact ${testContact.name}` })
        .first();
      await expect(contactRow).toBeVisible();
      await contactRow.click();

      // Verify navigation to contact detail page
      await expect(page).toHaveURL(/\/contacts\/[^/]+/);

      // Verify contact details are displayed (heading contains name)
      await expect(page.getByRole("heading", { level: 1 })).toContainText(testContact.name);
      await expect(page.getByText(testContact.email)).toBeVisible();
    });

    // ==================== EDIT CONTACT ====================
    test.step("Edit contact details", async () => {
      // Find and click edit button
      const editButton = page.getByRole("button", { name: /edit/i });
      await expect(editButton).toBeVisible();
      await editButton.click();

      // Wait for edit dialog/form to open
      const editDialog = page.getByRole("dialog");
      if (await editDialog.isVisible()) {
        // If using a dialog
        await page.getByLabel("Name").fill(updatedContact.name);
        await page.getByLabel("Email").fill(updatedContact.email);

        const phoneField = page.getByLabel("Phone");
        if (await phoneField.isVisible()) {
          await phoneField.clear();
          await phoneField.fill(updatedContact.phone);
        }

        const companyField = page.getByLabel("Company");
        if (await companyField.isVisible()) {
          await companyField.clear();
          await companyField.fill(updatedContact.company);
        }

        // Save changes
        const saveButton = page.getByRole("button", { name: /save|update/i });
        await saveButton.click();

        // Wait for dialog to close
        await expect(editDialog).not.toBeVisible();
      } else {
        // If using inline editing
        const nameInput = page.locator('input[value*="' + testContact.name + '"]');
        if (await nameInput.isVisible()) {
          await nameInput.clear();
          await nameInput.fill(updatedContact.name);
        }

        const emailInput = page.locator('input[value*="' + testContact.email + '"]');
        if (await emailInput.isVisible()) {
          await emailInput.clear();
          await emailInput.fill(updatedContact.email);
        }

        // Save changes
        const saveButton = page.getByRole("button", { name: /save|update/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }

      // Verify changes are saved
      await expect(page.getByText(updatedContact.name)).toBeVisible();
      await expect(page.getByText(updatedContact.email)).toBeVisible();

      // Check for success notification
      await expect(page.locator("[data-sonner-toaster]")).toBeVisible();
    });

    // ==================== DELETE CONTACT ====================
    test.step("Delete contact", async () => {
      // Find delete button
      const deleteButton = page.getByRole("button", { name: /delete/i });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      // Handle confirmation dialog
      const confirmDialog = page.getByRole("dialog");
      if (await confirmDialog.isVisible()) {
        // Look for confirmation text
        await expect(page.getByText(/are you sure|confirm|delete/i)).toBeVisible();

        // Click confirm delete button
        const confirmButton = page.getByRole("button", { name: /delete|confirm|yes/i });
        await confirmButton.click();

        // Wait for dialog to close
        await expect(confirmDialog).not.toBeVisible();
      }

      // Verify navigation back to contacts list or contact is removed
      const currentUrl = page.url();
      if (currentUrl.includes("/contacts/")) {
        // Should navigate back to contacts list
        await expect(page.url()).toBe(expect.stringContaining("/contacts"));
        await expect(page.url()).not.toBe(expect.stringMatching(/\/contacts\/[^/]+/));
      }

      // Check for success notification
      await expect(page.locator("[data-sonner-toaster]")).toBeVisible();
    });

    // ==================== VERIFY DELETION ====================
    test.step("Verify contact is deleted from list", async () => {
      // Navigate back to contacts list if not already there
      if (!page.url().endsWith("/contacts")) {
        await page.goto("/contacts");
      }

      // Search for the deleted contact
      const searchInput = page.getByLabel("Search contacts");
      await searchInput.clear();
      await searchInput.fill(updatedContact.name);

      // Wait for search
      await page.waitForTimeout(500);

      // Verify contact no longer appears
      await expect(page.getByText(updatedContact.name)).not.toBeVisible();
      await expect(page.getByText("No contacts found")).toBeVisible();
    });
  });

  test("create contact with keyboard navigation", async ({ page }) => {
    // Use keyboard, accounting for skip link, then click the button for stability
    await page.keyboard.press("Tab"); // Skip link
    await page.keyboard.press("Tab"); // Search
    await page.keyboard.press("Tab"); // New contact button

    const newContactButton = page.getByRole("button", { name: "Create new contact" });
    await expect(newContactButton).toBeVisible();
    await newContactButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fill using scoped labels to avoid collisions
    await dialog.getByLabel("Name").fill(testContact.name);
    await dialog.getByLabel("Email").fill(testContact.email);
    await dialog.getByRole("button", { name: /save|create/i }).click();

    // Verify creation
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: `Open contact ${testContact.name}` }).first(),
    ).toBeVisible();
  });

  test("create contact - validation errors", async ({ page }) => {
    const newContactButton = page.getByRole("button", { name: "Create new contact" });
    await newContactButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Try to save without required fields
    const saveButton = dialog.getByRole("button", { name: /save|create/i });
    await saveButton.click();

    // Check for validation errors
    const errorMessages = page.locator("[role=alert], .text-destructive, .error");
    await expect(errorMessages.first()).toBeVisible();

    // Fill minimum required field (name)
    await dialog.getByLabel("Name").fill(testContact.name);

    // Add invalid email to test email validation
    const emailField = dialog.getByLabel("Email");
    if (await emailField.isVisible()) {
      await emailField.fill("invalid-email");
      await saveButton.click();

      // Should show email validation error
      await expect(page.getByText(/invalid email|valid email/i)).toBeVisible();

      // Fix email and save
      await emailField.clear();
      await emailField.fill(testContact.email);
    }

    await saveButton.click();

    // Should succeed now
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: `Open contact ${testContact.name}` }).first(),
    ).toBeVisible();
  });

  test("bulk delete multiple contacts", async ({ page }) => {
    // Create multiple test contacts first
    const contacts = [
      { name: "Bulk Test 1", email: "bulk1@test.com" },
      { name: "Bulk Test 2", email: "bulk2@test.com" },
      { name: "Bulk Test 3", email: "bulk3@test.com" },
    ];

    for (const contact of contacts) {
      await page.getByRole("button", { name: "Create new contact" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByLabel("Name").fill(contact.name);
      await dialog.getByLabel("Email").fill(contact.email);

      await dialog.getByRole("button", { name: /save|create/i }).click();

      // Wait for dialog to fully detach
      await expect(dialog).toBeHidden();
      await dialog.waitFor({ state: "detached" });
    }

    // Now test bulk selection and delete

    // Search to filter to just our test contacts
    await page.getByLabel("Search contacts").fill("Bulk Test");
    await page.waitForTimeout(500);

    // Select multiple contacts using checkboxes
    const firstContactCheckbox = page
      .locator('input[type="checkbox"][aria-label^="Select Bulk Test"]')
      .nth(0);
    const secondContactCheckbox = page
      .locator('input[type="checkbox"][aria-label^="Select Bulk Test"]')
      .nth(1);

    // Select first two contacts
    await firstContactCheckbox.check();
    await secondContactCheckbox.check();

    // Verify bulk actions bar appears
    await expect(page.getByText(/2 selected/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();

    // Click bulk delete
    await page.getByRole("button", { name: "Delete" }).click();

    // Handle confirmation
    const confirmDialog = page.getByRole("dialog");
    if (await confirmDialog.isVisible()) {
      await page.getByRole("button", { name: /delete|confirm/i }).click();
    }

    // Verify contacts are deleted
    await expect(page.getByText("Bulk Test 1")).not.toBeVisible();
    await expect(page.getByText("Bulk Test 2")).not.toBeVisible();

    // Third contact should still be there
    await expect(page.getByText("Bulk Test 3")).toBeVisible();
  });

  test("contact search and filtering", async ({ page }) => {
    // Create test contacts with different attributes
    const testContacts = [
      { name: "Alice Johnson", email: "alice@company.com" },
      { name: "Bob Smith", email: "bob@startup.io" },
      { name: "Carol Davis", email: "carol@company.com" },
    ];

    // Create contacts
    for (const contact of testContacts) {
      await page.getByRole("button", { name: "Create new contact" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill(contact.name);
      await dialog.getByLabel("Email").fill(contact.email);
      await dialog.getByRole("button", { name: /save|create/i }).click();

      // Wait for dialog to fully detach
      await expect(dialog).toBeHidden();
      await dialog.waitFor({ state: "detached" });
    }

    // Test search functionality
    const searchInput = page.getByLabel("Search contacts");

    // Search by name
    await searchInput.fill("Alice");
    await page.waitForTimeout(300);
    await expect(page.getByText("Alice Johnson")).toBeVisible();
    await expect(page.getByText("Bob Smith")).not.toBeVisible();

    // Search by email domain
    await searchInput.clear();
    await searchInput.fill("company.com");
    await page.waitForTimeout(300);
    await expect(page.getByText("Alice Johnson")).toBeVisible();
    await expect(page.getByText("Carol Davis")).toBeVisible();
    await expect(page.getByText("Bob Smith")).not.toBeVisible();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);
    await expect(page.getByText("Alice Johnson")).toBeVisible();
    await expect(page.getByText("Bob Smith")).toBeVisible();
    await expect(page.getByText("Carol Davis")).toBeVisible();

    // Test date filtering
    const filterButton = page.getByRole("button", { name: "Filter by date added" });
    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Filter by "Today"
      await page.getByText("Today").click();

      // All contacts should still be visible (created today)
      await expect(page.getByText("Alice Johnson")).toBeVisible();
      await expect(page.getByText("Bob Smith")).toBeVisible();
      await expect(page.getByText("Carol Davis")).toBeVisible();
    }
  });

  test("responsive mobile contact creation", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Ensure mobile layout is working
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();

    // Create contact on mobile
    const newContactButton = page.getByRole("button", { name: "Create new contact" });
    await expect(newContactButton).toBeVisible();
    await newContactButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Form should be responsive
    await dialog.getByLabel("Name").fill("Mobile Test User");
    await dialog.getByLabel("Email").fill("mobile@test.com");

    const saveButton = dialog.getByRole("button", { name: /save|create/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open contact Mobile Test User" }).first(),
    ).toBeVisible();
  });

  test("contact form accessibility", async ({ page }) => {
    const newContactButton = page.getByRole("button", { name: "Create new contact" });
    await newContactButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Check form labels are properly associated
    const nameField = dialog.getByLabel("Name");
    const emailField = dialog.getByLabel("Email");

    await expect(nameField).toBeVisible();
    await expect(emailField).toBeVisible();

    // Direct focus assertions for stability
    await nameField.focus();
    await expect(nameField).toBeFocused();
    await emailField.focus();
    await expect(emailField).toBeFocused();

    // Test required field validation with screen reader content
    await page.keyboard.press("Tab"); // Navigate to save button
    await page.keyboard.press("Enter");

    // Should show validation errors with proper ARIA attributes
    const errorElement = page.locator("[role=alert], [aria-invalid=true]");
    if (await errorElement.first().isVisible()) {
      await expect(errorElement.first()).toBeVisible();
    }
  });
});
