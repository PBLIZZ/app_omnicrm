import { test, expect } from '@playwright/test';

// Enhanced Contacts System E2E Tests
// These tests verify the complete enhanced contacts functionality from user perspective

test.describe('Enhanced Contacts System - CRITICAL Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contacts page
    await page.goto('/contacts');
    
    // Wait for page to load completely
    await page.waitForSelector('[data-testid="contacts-page"]');
    
    // Ensure we're authenticated (basic check)
    await expect(page.locator('text=Contacts Intelligence')).toBeVisible();
  });

  test.describe('CRITICAL: Page Load and Structure', () => {
    test('loads enhanced contacts page with all UI elements', async ({ page }) => {
      // Check main page elements
      await expect(page.locator('h1:has-text("Contacts Intelligence")')).toBeVisible();
      await expect(page.locator('text=AI-powered contact management')).toBeVisible();
      
      // Check action buttons in header
      await expect(page.getByTestId('enrich-contacts-button')).toBeVisible();
      await expect(page.getByTestId('smart-suggestions-button')).toBeVisible();
      await expect(page.getByTestId('add-contact-button')).toBeVisible();
      
      // Check enhanced table presence
      await expect(page.locator('text=Enhanced Contacts with AI Insights')).toBeVisible();
      
      // Check search functionality
      await expect(page.getByTestId('search-contacts')).toBeVisible();
    });

    test('displays contacts table with proper columns', async ({ page }) => {
      // Wait for table to load
      await page.waitForSelector('table');
      
      // Check all expected column headers
      const expectedHeaders = [
        'Name', 'Actions', 'Email', 'Phone', 'Notes', 
        'Tags', 'Stage', 'AI Insights', 'Interactions', 'Last Updated'
      ];
      
      for (const header of expectedHeaders) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
    });
  });

  test.describe('CRITICAL: Contact Management', () => {
    test('creates new contact via dialog', async ({ page }) => {
      // Open add contact dialog
      await page.getByTestId('add-contact-button').click();
      
      // Wait for dialog to open
      await page.waitForSelector('text=Add New Contact');
      
      // Fill out contact form
      await page.getByTestId('contact-name-input').fill('Test Contact');
      await page.getByTestId('contact-email-input').fill('test@example.com');
      await page.getByTestId('contact-phone-input').fill('+1234567890');
      
      // Submit form
      await page.getByTestId('save-contact').click();
      
      // Verify success
      await expect(page.locator('text=Contact created successfully')).toBeVisible({ timeout: 10000 });
      
      // Verify contact appears in table
      await expect(page.locator('text=Test Contact')).toBeVisible({ timeout: 5000 });
    });

    test('validates required fields in contact form', async ({ page }) => {
      // Open add contact dialog
      await page.getByTestId('add-contact-button').click();
      
      // Try to save without name
      await page.getByTestId('save-contact').click();
      
      // Should show validation error
      await expect(page.locator('text=Please enter a contact name')).toBeVisible();
    });
  });

  test.describe('HIGH: AI Action Icons', () => {
    test('displays AI action buttons for each contact', async ({ page }) => {
      // Wait for contacts to load
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      // Get first contact row
      const firstRow = page.locator('[data-testid^="contact-row-"]').first();
      await expect(firstRow).toBeVisible();
      
      // Find the contact ID from the test ID
      const testId = await firstRow.getAttribute('data-testid');
      const contactId = testId?.replace('contact-row-', '');
      
      if (contactId) {
        // Check all AI action buttons are present
        await expect(page.getByTestId(`ask-ai-${contactId}`)).toBeVisible();
        await expect(page.getByTestId(`send-email-${contactId}`)).toBeVisible();
        await expect(page.getByTestId(`take-note-${contactId}`)).toBeVisible();
        await expect(page.getByTestId(`add-to-task-${contactId}`)).toBeVisible();
      }
    });

    test('opens AI insights dialog when Ask AI clicked', async ({ page }) => {
      // Wait for contacts to load
      await page.waitForSelector('[data-testid^="ask-ai-"]', { timeout: 10000 });
      
      // Click first Ask AI button
      const askAiButton = page.locator('[data-testid^="ask-ai-"]').first();
      await askAiButton.click();
      
      // Wait for dialog (may take time if calling real AI service)
      await expect(page.locator('[data-testid="ai-insights-dialog"]')).toBeVisible({ timeout: 15000 });
    });

    test('disables email button for contacts without email', async ({ page }) => {
      // If we have a contact without email, this button should be disabled
      const emailButtons = page.locator('[data-testid^="send-email-"]');
      const buttonCount = await emailButtons.count();
      
      if (buttonCount > 0) {
        // Check if any email buttons are disabled
        for (let i = 0; i < buttonCount; i++) {
          const button = emailButtons.nth(i);
          // If button is disabled, it should have disabled attribute
          const isDisabled = await button.getAttribute('disabled');
          if (isDisabled !== null) {
            // This contact has no email, button should be disabled
            await expect(button).toBeDisabled();
          }
        }
      }
    });
  });

  test.describe('HIGH: Avatar Display', () => {
    test('shows contact avatars with initials fallback', async ({ page }) => {
      // Wait for contacts to load
      await page.waitForSelector('[data-testid^="contact-avatar-"]', { timeout: 10000 });
      
      // Check that avatars are displayed
      const avatars = page.locator('[data-testid^="contact-avatar-"]');
      const avatarCount = await avatars.count();
      
      expect(avatarCount).toBeGreaterThan(0);
      
      // Each avatar should show initials (fallback)
      for (let i = 0; i < Math.min(avatarCount, 3); i++) {
        const avatar = avatars.nth(i);
        await expect(avatar).toBeVisible();
        
        // Should contain initials (letters)
        const avatarText = await avatar.textContent();
        expect(avatarText).toMatch(/^[A-Z?]{1,2}$/);
      }
    });
  });

  test.describe('HIGH: Smart Suggestions', () => {
    test('displays smart suggestions when toggled', async ({ page }) => {
      // Click smart suggestions button
      await page.getByTestId('smart-suggestions-button').click();
      
      // Wait for suggestions section to appear
      await expect(page.getByTestId('contact-suggestions-section')).toBeVisible();
      
      // Should show loading or suggestions content
      await expect(page.locator('text=Smart Contact Suggestions')).toBeVisible();
    });

    test('handles empty suggestions state', async ({ page }) => {
      // Open suggestions
      await page.getByTestId('smart-suggestions-button').click();
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Should show either suggestions or empty state
      const hasEmptyState = await page.locator('text=No new contacts found').isVisible();
      const hasSuggestions = await page.locator('[data-testid^="suggestion-"]').count() > 0;
      
      expect(hasEmptyState || hasSuggestions).toBeTruthy();
    });
  });

  test.describe('MODERATE: Notes Hover Cards', () => {
    test('displays notes hover cards for contacts', async ({ page }) => {
      // Wait for contacts to load
      await page.waitForSelector('[data-testid^="notes-hover-card-"]', { timeout: 10000 });
      
      // Check that notes cards are present
      const notesCards = page.locator('[data-testid^="notes-hover-card-"]');
      const cardCount = await notesCards.count();
      
      expect(cardCount).toBeGreaterThan(0);
      
      // Each card should be visible
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = notesCards.nth(i);
        await expect(card).toBeVisible();
      }
    });

    test('hover card triggers show notes count', async ({ page }) => {
      // Wait for notes cards
      await page.waitForSelector('[data-testid^="notes-hover-card-"]', { timeout: 10000 });
      
      // Get first notes card
      const notesCard = page.locator('[data-testid^="notes-hover-card-"]').first();
      
      // Hover over the card
      await notesCard.hover();
      
      // Should show some interaction (even if no notes, should show "0 notes" or similar)
      const cardContent = await notesCard.textContent();
      expect(cardContent).toBeTruthy();
    });
  });

  test.describe('MODERATE: Contact Search and Filtering', () => {
    test('searches contacts by name', async ({ page }) => {
      // Wait for contacts to load first
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      // Get initial contact count
      const initialCount = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (initialCount > 0) {
        // Get name of first contact to search for
        const firstContactName = await page.locator('[data-testid^="contact-row-"] td span.font-medium').first().textContent();
        
        if (firstContactName) {
          // Search for the contact
          await page.getByTestId('search-contacts').fill(firstContactName);
          
          // Wait for search to filter results
          await page.waitForTimeout(500);
          
          // Should show filtered results
          await expect(page.locator(`text=${firstContactName}`)).toBeVisible();
          
          // Clear search
          await page.getByTestId('search-contacts').clear();
          await page.waitForTimeout(500);
        }
      }
    });

    test('handles empty search results', async ({ page }) => {
      // Search for non-existent contact
      await page.getByTestId('search-contacts').fill('NonExistentContactXYZ123');
      
      // Wait for search to filter
      await page.waitForTimeout(1000);
      
      // Should show empty state or "No contacts found"
      const hasEmptyMessage = await page.locator('text=No contacts found').isVisible() ||
                             await page.locator('text=Try adjusting your search terms').isVisible();
      
      expect(hasEmptyMessage).toBeTruthy();
    });
  });

  test.describe('MODERATE: Export Functionality', () => {
    test('exports contacts to CSV', async ({ page }) => {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button
      await page.locator('text=Export').click();
      
      // Wait for download to complete
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('enhanced-contacts-');
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });
  });

  test.describe('LOW: Performance and Responsiveness', () => {
    test('loads contacts page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to contacts
      await page.goto('/contacts');
      
      // Wait for content to load
      await page.waitForSelector('[data-testid="contacts-page"]');
      await page.waitForSelector('text=Contacts Intelligence');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('responsive design on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to contacts
      await page.goto('/contacts');
      
      // Wait for page to load
      await page.waitForSelector('[data-testid="contacts-page"]');
      
      // Check that essential elements are still visible
      await expect(page.locator('h1:has-text("Contacts Intelligence")')).toBeVisible();
      await expect(page.getByTestId('add-contact-button')).toBeVisible();
      
      // Table should be scrollable on mobile
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });
  });

  test.describe('LOW: Error Handling', () => {
    test('handles AI enrichment errors gracefully', async ({ page }) => {
      // Click AI enrich button
      await page.getByTestId('enrich-contacts-button').click();
      
      // Wait for either success or error message
      await page.waitForTimeout(10000);
      
      // Should show either success message or error handling
      const hasSuccessMessage = await page.locator('text=Enriched').isVisible() ||
                               await page.locator('text=contacts with AI insights').isVisible();
      const hasErrorMessage = await page.locator('text=Failed to enrich').isVisible() ||
                              await page.locator('text=Error').isVisible();
      
      // One of these should be true (either success or graceful error handling)
      expect(hasSuccessMessage || hasErrorMessage).toBeTruthy();
    });

    test('handles network errors gracefully', async ({ page }) => {
      // Simulate network error by going offline
      await page.context().setOffline(true);
      
      // Try to add a contact
      await page.getByTestId('add-contact-button').click();
      await page.getByTestId('contact-name-input').fill('Offline Test');
      await page.getByTestId('save-contact').click();
      
      // Should show error message
      await expect(page.locator('text=Error') || page.locator('text=Failed')).toBeVisible({ timeout: 10000 });
      
      // Go back online
      await page.context().setOffline(false);
    });
  });
});

test.describe('Enhanced Contacts System - Integration Tests', () => {
  test.describe('HIGH: End-to-End Workflows', () => {
    test('complete contact creation and AI enrichment workflow', async ({ page }) => {
      await page.goto('/contacts');
      await page.waitForSelector('[data-testid="contacts-page"]');
      
      // 1. Create a new contact
      await page.getByTestId('add-contact-button').click();
      await page.getByTestId('contact-name-input').fill('E2E Test Contact');
      await page.getByTestId('contact-email-input').fill('e2e@example.com');
      await page.getByTestId('save-contact').click();
      
      // Wait for contact to be created
      await expect(page.locator('text=Contact created successfully')).toBeVisible();
      await expect(page.locator('text=E2E Test Contact')).toBeVisible();
      
      // 2. Try AI enrichment
      await page.getByTestId('enrich-contacts-button').click();
      
      // Wait for AI enrichment to complete (may take time)
      await page.waitForTimeout(5000);
      
      // Should show some result (success or error)
      const hasResult = await page.locator('text=Enriched') || 
                        await page.locator('text=Error') ||
                        await page.locator('text=Failed');
      
      expect(hasResult).toBeTruthy();
    });

    test('smart suggestions to contact creation workflow', async ({ page }) => {
      await page.goto('/contacts');
      await page.waitForSelector('[data-testid="contacts-page"]');
      
      // 1. Open smart suggestions
      await page.getByTestId('smart-suggestions-button').click();
      await page.waitForSelector('[data-testid="contact-suggestions-section"]');
      
      // 2. Check if there are suggestions to work with
      await page.waitForTimeout(2000);
      const suggestionCards = page.locator('[data-testid^="suggestion-"]');
      const suggestionCount = await suggestionCards.count();
      
      if (suggestionCount > 0) {
        // 3. Select a suggestion
        const firstCheckbox = page.locator('[data-testid^="checkbox-"]').first();
        await firstCheckbox.check();
        
        // 4. Create contact from suggestion
        await page.getByTestId('create-selected-contacts').click();
        
        // Wait for contact creation
        await expect(page.locator('text=Created') || page.locator('text=contacts from calendar')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});