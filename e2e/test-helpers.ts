import { Page, expect } from "@playwright/test";

/**
 * Helper function to clean up test contacts by name pattern
 */
export async function cleanupTestContacts(page: Page, namePattern: string = "Test") {
  try {
    // Navigate to contacts if not already there
    if (!page.url().includes("/contacts")) {
      await page.goto("/contacts", { waitUntil: "networkidle" });
    }

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible({ timeout: 10000 });

    // Search for test contacts
    const searchInput = page.getByLabel("Search contacts");
    if (await searchInput.isVisible()) {
      await searchInput.fill(namePattern);
      await page.waitForTimeout(1000);

      // Check if there are any contacts to delete
      const contactButtons = page.getByRole("button", {
        name: new RegExp(`Open contact.*${namePattern}`),
      });
      const contactCount = await contactButtons.count();

      if (contactCount > 0) {
        // Try individual deletion instead of bulk
        while (true) {
          const firstContact = page
            .getByRole("button", { name: new RegExp(`Open contact.*${namePattern}`) })
            .first();
          if (!(await firstContact.isVisible())) break;

          // Click on the contact to open details
          await firstContact.click();
          await page.waitForTimeout(500);

          // Look for delete button in the contact details
          const deleteButton = page.getByRole("button", { name: /delete/i }).first();
          if (await deleteButton.isVisible()) {
            await deleteButton.click();

            // Handle confirmation dialog
            const confirmDialog = page.getByRole("dialog");
            if (await confirmDialog.isVisible()) {
              const confirmButton = confirmDialog.getByRole("button", { name: /delete|confirm/i });
              await expect(confirmButton).toBeEnabled({ timeout: 5000 });
              await confirmButton.click();
              await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
            }
          }

          // Navigate back to contacts list
          await page.goto("/contacts", { waitUntil: "networkidle" });
          await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible({
            timeout: 5000,
          });
          await searchInput.fill(namePattern);
          await page.waitForTimeout(500);
        }
      }

      // Clear search
      await searchInput.clear();
    }
  } catch (error) {
    console.warn("Test cleanup failed:", error);
    // Try to navigate back to a clean state
    try {
      await page.goto("/contacts", { waitUntil: "networkidle" });
    } catch {}
  }
}

/**
 * Helper function to wait for contacts page to load completely
 */
export async function waitForContactsPageLoad(page: Page) {
  await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible({ timeout: 15000 });

  // Wait for the page to finish loading (either contacts table or empty state)
  await page.waitForFunction(
    () => {
      const hasTable = document.querySelector("table") !== null;
      const hasEmptyState = document.textContent?.includes("No contacts yet") || false;
      const hasContactButtons =
        document.querySelectorAll('[aria-label*="Open contact"]').length > 0;
      const isStillLoading = document.querySelector('[data-slot="skeleton"]') !== null;

      return (hasTable || hasEmptyState || hasContactButtons) && !isStillLoading;
    },
    { timeout: 10000 },
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Helper function to create a test contact
 */
export async function createTestContact(
  page: Page,
  contact: { name: string; email: string; phone?: string; company?: string },
) {
  const newContactButton = page.getByRole("button", { name: "Create new contact" });
  await expect(newContactButton).toBeVisible({ timeout: 5000 });
  await newContactButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5000 });

  await dialog.getByLabel("Name").fill(contact.name);
  await dialog.getByLabel("Email").fill(contact.email);

  if (contact.phone) {
    const phoneField = dialog.getByLabel("Phone");
    if (await phoneField.isVisible()) {
      await phoneField.fill(contact.phone);
    }
  }

  if (contact.company) {
    const companyField = dialog.getByLabel("Company");
    if (await companyField.isVisible()) {
      await companyField.fill(contact.company);
    }
  }

  const saveButton = dialog.getByRole("button", { name: /save|create/i });
  await expect(saveButton).toBeVisible();
  await saveButton.click();

  await expect(dialog).not.toBeVisible({ timeout: 10000 });

  // Wait for the contact to appear in the list
  const contactButton = page.getByRole("button", { name: `Open contact ${contact.name}` }).first();
  await expect(contactButton).toBeVisible({ timeout: 10000 });

  return contact;
}

/**
 * Helper function to check if page has authentication
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check if we're on login page
    if (page.url().includes("/login")) {
      return false;
    }

    // Check if auth header shows user info or sign in button
    const signInButton = page.getByRole("link", { name: "Sign in" });
    return !(await signInButton.isVisible());
  } catch {
    return false;
  }
}
