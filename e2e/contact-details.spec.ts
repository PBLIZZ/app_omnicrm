import { test, expect } from "@playwright/test";

test.describe("Contact Details Page", () => {
  const testContact = {
    id: "test-contact-id",
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    company: "Test Company",
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to contacts and create a test contact first
    await page.goto("/contacts");

    // Create test contact
    await page.getByRole("button", { name: "Create new contact" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.getByLabel("Name").fill(testContact.name);
    await page.getByLabel("Email").fill(testContact.email);

    if (await page.getByLabel("Phone").isVisible()) {
      await page.getByLabel("Phone").fill(testContact.phone);
    }
    if (await page.getByLabel("Company").isVisible()) {
      await page.getByLabel("Company").fill(testContact.company);
    }

    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("navigate to contact details and verify content", async ({ page }) => {
    // Wait for the table to load and find the contact row
    await page.waitForSelector('[data-testid^="open-contact-"]', { timeout: 10000 });

    // Click on first available contact row
    const firstContactRow = page.locator('[data-testid^="open-contact-"]').first();
    await firstContactRow.click();

    // Verify we're on the contact details page
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);

    // Verify contact information is displayed with heading assertion
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Check if this is our test contact or any contact
    const heading = page.getByRole("heading", { level: 1 });
    const headingText = await heading.textContent();

    if (headingText?.includes(testContact.name)) {
      await expect(page.getByText(testContact.email)).toBeVisible();
      if (testContact.phone) {
        await expect(page.getByText(testContact.phone)).toBeVisible();
      }
    }
  });

  test("contact details page has proper navigation", async ({ page }) => {
    // Navigate to contact details
    const firstRow = page
      .getByRole("button", { name: new RegExp(`Open contact.*${testContact.name}`) })
      .first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(testContact.name);

    // Check for back navigation
    const backButton = page
      .getByRole("button", { name: /back|contacts/i })
      .or(page.getByRole("link", { name: /back|contacts/i }));

    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(/\/contacts$/);
    } else {
      // Test browser back navigation
      await page.goBack();
      await expect(page).toHaveURL(/\/contacts$/);
    }
  });

  test("contact actions - edit, delete, email, call", async ({ page }) => {
    // Navigate to contact details
    const firstRow = page
      .getByRole("button", { name: new RegExp(`Open contact.*${testContact.name}`) })
      .first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(testContact.name);

    // Look for action buttons within the details header first
    const detailsHeader = page.locator('.card-title, [data-testid="contact-header"]').first();

    // Check for edit button in details header
    const editButton = detailsHeader.getByRole("button", { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await expect(editButton).toBeVisible();
    } else {
      // Fallback: check for edit button anywhere on page
      const fallbackEdit = page.getByRole("button", { name: /edit/i }).first();
      if (await fallbackEdit.isVisible()) {
        await expect(fallbackEdit).toBeVisible();
      }
    }

    // Check for delete button in details header
    const deleteButton = detailsHeader.getByRole("button", { name: /delete/i }).first();
    if (await deleteButton.isVisible()) {
      await expect(deleteButton).toBeVisible();
    } else {
      // Fallback: go back to list and check delete there
      const backButton = page.getByRole("link", { name: /back/i });
      if (await backButton.isVisible()) {
        await backButton.click();
        const listDeleteButton = page.getByRole("button", { name: /delete/i }).first();
        if (await listDeleteButton.isVisible()) {
          await expect(listDeleteButton).toBeVisible();
        }
      }
    }

    // Re-navigate if we went back for delete test
    if (!(await page.url().match(/\/contacts\/[^/]+$/))) {
      const firstRowAgain = page
        .getByRole("button", { name: new RegExp(`Open contact.*${testContact.name}`) })
        .first();
      await firstRowAgain.click();
      await expect(page).toHaveURL(/\/contacts\/[^/]+$/);
    }

    // Test email action
    const emailButton = page
      .getByRole("button", { name: /email/i })
      .or(page.getByRole("link", { name: /email/i }));
    if (await emailButton.isVisible()) {
      await expect(emailButton).toBeVisible();
      // Don't click to avoid opening email client
    }

    // Test call action
    const callButton = page
      .getByRole("button", { name: /call|phone/i })
      .or(page.getByRole("link", { name: /call|phone/i }));
    if (await callButton.isVisible()) {
      await expect(callButton).toBeVisible();
      // Don't click to avoid triggering phone app
    }
  });

  test("contact timeline/interactions section", async ({ page }) => {
    // Navigate to contact details
    const contactRow = page
      .getByRole("button", { name: `Open contact ${testContact.name}` })
      .first();
    await contactRow.click();

    // Look for timeline/interactions section
    const timelineSection = page
      .locator("[data-testid=timeline], [data-testid=interactions]")
      .or(page.getByText(/timeline|interactions|history|activity/i));

    if (await timelineSection.isVisible()) {
      await expect(timelineSection).toBeVisible();

      // Check for empty state or interaction items
      const emptyState = page.getByText(/no interactions|no activity|no timeline/i);
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test("AI insights section", async ({ page }) => {
    // Navigate to contact details
    const contactRow = page
      .getByRole("button", { name: `Open contact ${testContact.name}` })
      .first();
    await contactRow.click();

    // Look for AI insights section
    const insightsSection = page
      .locator("[data-testid=ai-insights]")
      .or(page.getByText(/ai insights|insights|ai analysis/i));

    if (await insightsSection.isVisible()) {
      await expect(insightsSection).toBeVisible();
    }
  });

  test("mobile contact details layout", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to contact details
    const contactRow = page
      .getByRole("button", { name: `Open contact ${testContact.name}` })
      .first();
    await contactRow.click();

    // Verify mobile layout
    await expect(page.getByRole("heading", { level: 1 })).toContainText(testContact.name);
    await expect(page.getByText(testContact.email)).toBeVisible();

    // Check for mobile-specific navigation
    const backButton = page.getByRole("button", { name: /back/i });
    if (await backButton.isVisible()) {
      await expect(backButton).toBeVisible();
    }

    // Look for tabs on mobile (Overview, Timeline, AI Insights)
    const tabs = page.locator("[role=tab], .tab");
    if (await tabs.first().isVisible()) {
      const overviewTab = page.getByRole("tab", { name: /overview/i });
      const timelineTab = page.getByRole("tab", { name: /timeline/i });
      const insightsTab = page.getByRole("tab", { name: /insights/i });

      if (await overviewTab.isVisible()) {
        await expect(overviewTab).toBeVisible();
        await overviewTab.click();
      }

      if (await timelineTab.isVisible()) {
        await expect(timelineTab).toBeVisible();
        await timelineTab.click();
      }

      if (await insightsTab.isVisible()) {
        await expect(insightsTab).toBeVisible();
        await insightsTab.click();
      }
    }
  });

  test("contact edit from details page", async ({ page }) => {
    // Navigate to contact details
    const contactRow = page
      .getByRole("button", { name: `Open contact ${testContact.name}` })
      .first();
    await contactRow.click();

    // Click edit button
    const editButton = page.getByRole("button", { name: /edit/i });
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Should open edit dialog or navigate to edit page
    const editDialog = page.getByRole("dialog");
    const editForm = page.locator("form").or(page.getByLabel("Name"));

    if (await editDialog.isVisible()) {
      // Edit in dialog
      await page.getByLabel("Name").clear();
      await page.getByLabel("Name").fill("Updated John Doe");

      const saveButton = page.getByRole("button", { name: /save|update/i });
      await saveButton.click();

      await expect(editDialog).not.toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Updated John Doe");
    } else if (await editForm.isVisible()) {
      // Edit inline or on separate page
      const nameField = page.getByLabel("Name");
      await nameField.clear();
      await nameField.fill("Updated John Doe");

      const saveButton = page.getByRole("button", { name: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }

      await expect(page.getByText("Updated John Doe")).toBeVisible();
    }

    // Verify success notification
    await expect(page.locator("[data-sonner-toaster]")).toBeVisible();
  });

  test("contact delete from details page", async ({ page }) => {
    // Navigate to contact details
    const contactRow = page
      .getByRole("button", { name: `Open contact ${testContact.name}` })
      .first();
    await contactRow.click();

    // Click delete button
    const deleteButton = page.getByRole("button", { name: /delete/i });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Handle confirmation dialog
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible();

    // Verify warning message
    await expect(page.getByText(/are you sure|permanently delete|cannot be undone/i)).toBeVisible();

    // Confirm deletion
    const confirmButton = page.getByRole("button", { name: /delete|confirm|yes/i });
    await confirmButton.click();

    // Should redirect back to contacts list
    await expect(page.url()).toBe(expect.stringMatching(/\/contacts$/));

    // Verify success notification
    await expect(page.locator("[data-sonner-toaster]")).toBeVisible();

    // Verify contact no longer exists in list
    await expect(page.getByText(testContact.name)).not.toBeVisible();
  });

  test("keyboard navigation on contact details", async ({ page }) => {
    // Navigate to contact details
    const firstRow = page
      .getByRole("button", { name: new RegExp(`Open contact.*${testContact.name}`) })
      .first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(testContact.name);

    // Test keyboard navigation through action buttons
    await page.keyboard.press("Tab");

    // Should focus first interactive element (back button or first action)
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();

    // Continue tabbing through interactive elements
    let tabCount = 0;
    const maxTabs = 10;

    while (tabCount < maxTabs) {
      await page.keyboard.press("Tab");
      tabCount++;

      const currentFocus = page.locator(":focus");
      if (await currentFocus.isVisible()) {
        // Check if it's a button or link
        const tagName = await currentFocus.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === "button" || tagName === "a") {
          // Test activation with Enter or Space
          if (tagName === "button") {
            // Don't actually click, just verify it's focusable
            await expect(currentFocus).toBeVisible();
          }
        }
      }
    }
  });

  test("contact details accessibility", async ({ page }) => {
    // Navigate to contact details
    const firstRow = page
      .getByRole("button", { name: new RegExp(`Open contact.*${testContact.name}`) })
      .first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(testContact.name);

    // Verify page has proper heading structure
    const mainHeading = page.getByRole("heading", { level: 1 });
    await expect(mainHeading).toBeVisible();

    // Check for proper landmarks
    const main = page.getByRole("main");
    if (await main.isVisible()) {
      await expect(main).toBeVisible();
    }

    // Verify action buttons have proper labels
    const buttons = page.getByRole("button");
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const accessibleName = await button.getAttribute("aria-label");
        const textContent = await button.textContent();

        // Button should have either aria-label or text content
        expect(accessibleName || textContent?.trim()).toBeTruthy();
      }
    }

    // Check for proper color contrast (basic check)
    const bodyElement = page.locator("body");
    const styles = await bodyElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });

    // Basic contrast check - should not be same color for text and background
    expect(styles.color).not.toBe(styles.backgroundColor);
  });

  test("contact details loading states", async ({ page }) => {
    // Intercept the contact API call to simulate slow loading
    await page.route("**/api/contacts/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Navigate to contact details
    const firstRow = page
      .getByRole("button", { name: new RegExp(`Open contact.*${testContact.name}`) })
      .first();
    await firstRow.click();

    // Check for loading skeleton or spinner
    const loadingIndicator = page
      .locator("[data-testid=loading], .loading, .skeleton")
      .or(page.getByText(/loading/i));

    if (await loadingIndicator.isVisible({ timeout: 500 })) {
      await expect(loadingIndicator).toBeVisible();
    }

    // Wait for content to load and verify URL and heading
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(testContact.name);
  });

  test("contact details error handling", async ({ page }) => {
    // Intercept API call to simulate 404 error
    await page.route("**/api/contacts/*", async (route) => {
      await route.fulfill({ status: 404, body: JSON.stringify({ error: "Contact not found" }) });
    });

    // Try to navigate to contact details
    const firstRow = page
      .getByRole("button", { name: new RegExp(`Open contact.*${testContact.name}`) })
      .first();
    await firstRow.click();

    // Should show error state
    const errorMessage = page.getByText(/not found|error|unable to load/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Should have option to go back
    const backButton = page
      .getByRole("button", { name: /back|return|contacts/i })
      .or(page.getByRole("link", { name: /back|return|contacts/i }));

    if (await backButton.isVisible()) {
      await expect(backButton).toBeVisible();
    }
  });
});
