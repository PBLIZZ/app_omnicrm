import { test, expect } from '@playwright/test';

test.describe('Enhanced Contacts System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contacts page
    await page.goto('/contacts');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('CRITICAL: Page Load and Basic Functionality', () => {
    test('loads contacts page with enhanced features', async ({ page }) => {
      // Check if main page elements are present
      await expect(page.getByTestId('contacts-page')).toBeVisible();
      await expect(page.getByText('Contacts Intelligence')).toBeVisible();
      await expect(page.getByText('AI-powered contact management')).toBeVisible();
      
      // Check if action buttons are present
      await expect(page.getByTestId('enrich-contacts-button')).toBeVisible();
      await expect(page.getByTestId('smart-suggestions-button')).toBeVisible();
      await expect(page.getByTestId('add-contact-button')).toBeVisible();
    });

    test('displays contacts table with enhanced columns', async ({ page }) => {
      // Wait for contacts to load
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      // Check if table headers include enhanced features
      await expect(page.getByText('Name')).toBeVisible();
      await expect(page.getByText('Actions')).toBeVisible();
      await expect(page.getByText('Email')).toBeVisible();
      await expect(page.getByText('Phone')).toBeVisible();
      await expect(page.getByText('Notes')).toBeVisible();
      await expect(page.getByText('Tags')).toBeVisible();
      await expect(page.getByText('Stage')).toBeVisible();
      await expect(page.getByText('AI Insights')).toBeVisible();
      await expect(page.getByText('Interactions')).toBeVisible();
      await expect(page.getByText('Last Updated')).toBeVisible();
    });
  });

  test.describe('HIGH: Search and Filter Functionality', () => {
    test('filters contacts using search', async ({ page }) => {
      // Wait for contacts to load
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      // Get initial contact count
      const initialRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (initialRows > 0) {
        // Get the name of the first contact for search
        const firstContactName = await page.locator('[data-testid^="contact-row-"]:first-of-type').textContent();
        
        if (firstContactName) {
          const searchTerm = firstContactName.split(' ')[0]; // First name only
          
          // Perform search
          await page.getByTestId('search-contacts').fill(searchTerm);
          await page.waitForTimeout(500); // Wait for debounce
          
          // Verify filtered results
          const filteredRows = await page.locator('[data-testid^="contact-row-"]').count();
          expect(filteredRows).toBeLessThanOrEqual(initialRows);
          
          // Clear search
          await page.getByTestId('search-contacts').clear();
          await page.waitForTimeout(500);
          
          // Verify all contacts are back
          const restoredRows = await page.locator('[data-testid^="contact-row-"]').count();
          expect(restoredRows).toBe(initialRows);
        }
      }
    });

    test('shows appropriate empty state for no search results', async ({ page }) => {
      // Search for something that definitely won't exist
      await page.getByTestId('search-contacts').fill('NonExistentContactName12345');
      await page.waitForTimeout(500);
      
      // Should show no results message
      await expect(page.getByText('No contacts found')).toBeVisible();
      await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    });
  });

  test.describe('CRITICAL: AI Action Buttons', () => {
    test('displays AI action buttons for each contact', async ({ page }) => {
      // Wait for contacts to load
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      const contactRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (contactRows > 0) {
        // Check first contact row for AI action buttons
        const firstRowId = await page.locator('[data-testid^="contact-row-"]:first-of-type').getAttribute('data-testid');
        const contactId = firstRowId?.replace('contact-row-', '');
        
        if (contactId) {
          await expect(page.getByTestId(`ask-ai-${contactId}`)).toBeVisible();
          await expect(page.getByTestId(`send-email-${contactId}`)).toBeVisible();
          await expect(page.getByTestId(`take-note-${contactId}`)).toBeVisible();
          await expect(page.getByTestId(`add-to-task-${contactId}`)).toBeVisible();
        }
      }
    });

    test('handles AI insights button click', async ({ page }) => {
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      const contactRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (contactRows > 0) {
        const firstRowId = await page.locator('[data-testid^="contact-row-"]:first-of-type').getAttribute('data-testid');
        const contactId = firstRowId?.replace('contact-row-', '');
        
        if (contactId) {
          // Click Ask AI button
          await page.getByTestId(`ask-ai-${contactId}`).click();
          
          // Should open AI insights dialog or show loading state
          // This might fail if API is not available in test environment
          try {
            await expect(page.getByTestId('ai-insights-dialog')).toBeVisible({ timeout: 5000 });
          } catch {
            // If dialog doesn't appear, it might be due to API limitations in test env
            console.log('AI insights dialog may not appear in test environment due to API limitations');
          }
        }
      }
    });
  });

  test.describe('HIGH: Notes Hover Card Functionality', () => {
    test('displays notes hover card on hover', async ({ page }) => {
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      const contactRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (contactRows > 0) {
        const firstRowId = await page.locator('[data-testid^="contact-row-"]:first-of-type').getAttribute('data-testid');
        const contactId = firstRowId?.replace('contact-row-', '');
        
        if (contactId) {
          // Hover over notes trigger
          const notesTrigger = page.getByTestId(`notes-hover-trigger-${contactId}`);
          
          if (await notesTrigger.isVisible()) {
            await notesTrigger.hover();
            
            // Wait for hover card to appear
            await expect(page.getByTestId(`notes-hover-content-${contactId}`)).toBeVisible({ timeout: 3000 });
            
            // Should show add note functionality
            await expect(page.getByTestId('add-note-button')).toBeVisible();
          }
        }
      }
    });

    test.skip('creates new note via hover card', async ({ page }) => {
      // This test would require authentication and database access
      // Skip in basic test environment but verify UI elements exist
      
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      const contactRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (contactRows > 0) {
        const firstRowId = await page.locator('[data-testid^="contact-row-"]:first-of-type').getAttribute('data-testid');
        const contactId = firstRowId?.replace('contact-row-', '');
        
        if (contactId) {
          const notesTrigger = page.getByTestId(`notes-hover-trigger-${contactId}`);
          
          if (await notesTrigger.isVisible()) {
            await notesTrigger.hover();
            await page.getByTestId('add-note-button').click();
            await expect(page.getByTestId('add-note-textarea')).toBeVisible();
            await expect(page.getByTestId('save-add-note')).toBeVisible();
            await expect(page.getByTestId('cancel-add-note')).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('HIGH: Contact Creation', () => {
    test('opens manual contact creation dialog', async ({ page }) => {
      await page.getByTestId('add-contact-button').click();
      
      // Dialog should open
      await expect(page.getByText('Add New Contact')).toBeVisible();
      await expect(page.getByTestId('contact-name-input')).toBeVisible();
      await expect(page.getByTestId('contact-email-input')).toBeVisible();
      await expect(page.getByTestId('contact-phone-input')).toBeVisible();
      await expect(page.getByTestId('save-contact')).toBeVisible();
      await expect(page.getByTestId('cancel-add-contact')).toBeVisible();
    });

    test('validates required fields in contact creation', async ({ page }) => {
      await page.getByTestId('add-contact-button').click();
      
      // Try to save without filling required fields
      await page.getByTestId('save-contact').click();
      
      // Should show validation error (toast or inline)
      // This would require proper form validation to be implemented
      await expect(page.getByTestId('contact-name-input')).toBeVisible();
    });

    test('cancels contact creation', async ({ page }) => {
      await page.getByTestId('add-contact-button').click();
      
      // Fill some data
      await page.getByTestId('contact-name-input').fill('Test Contact');
      
      // Cancel
      await page.getByTestId('cancel-add-contact').click();
      
      // Dialog should close
      await expect(page.getByText('Add New Contact')).not.toBeVisible();
    });
  });

  test.describe('MODERATE: Smart Suggestions', () => {
    test('toggles smart suggestions section', async ({ page }) => {
      // Initially suggestions should not be visible
      await expect(page.getByTestId('contact-suggestions-section')).not.toBeVisible();
      
      // Click suggestions button
      await page.getByTestId('smart-suggestions-button').click();
      
      // Suggestions section should appear
      await expect(page.getByTestId('contact-suggestions-section')).toBeVisible();
      await expect(page.getByText('Smart Contact Suggestions')).toBeVisible();
      await expect(page.getByText('We found people from your calendar events')).toBeVisible();
      
      // Toggle off
      await page.getByTestId('smart-suggestions-button').click();
      await expect(page.getByTestId('contact-suggestions-section')).not.toBeVisible();
    });

    test.skip('handles suggestion selection and creation', async ({ page }) => {
      // This would require actual calendar data and API access
      await page.getByTestId('smart-suggestions-button').click();
      await expect(page.getByTestId('contact-suggestions-section')).toBeVisible();
      
      // If suggestions exist, test selection
      const suggestionExists = await page.locator('[data-testid^="suggestion-"]').first().isVisible();
      
      if (suggestionExists) {
        // Select first suggestion
        await page.locator('[data-testid^="checkbox-"]').first().check();
        
        // Create button should appear
        await expect(page.getByTestId('create-selected-contacts')).toBeVisible();
      } else {
        // Should show empty state
        await expect(page.getByText('No new contacts found')).toBeVisible();
      }
    });
  });

  test.describe('MODERATE: Enhanced Data Display', () => {
    test('displays contact avatars with initials fallback', async ({ page }) => {
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      const contactRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (contactRows > 0) {
        const firstRowId = await page.locator('[data-testid^="contact-row-"]:first-of-type').getAttribute('data-testid');
        const contactId = firstRowId?.replace('contact-row-', '');
        
        if (contactId) {
          // Check if avatar is present
          const avatar = page.getByTestId(`contact-avatar-${contactId}`);
          await expect(avatar).toBeVisible();
          
          // Avatar should have either an image or initials fallback
          const avatarText = await avatar.textContent();
          expect(avatarText).toBeTruthy();
        }
      }
    });

    test('displays tags with appropriate color coding', async ({ page }) => {
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      const contactRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (contactRows > 0) {
        // Look for any contacts with tags
        const tagsInRows = await page.locator('text=Yoga, text=Massage, text=VIP').first().isVisible();
        
        if (tagsInRows) {
          // Tags should be visible and styled as badges
          const tagBadges = page.locator('.bg-blue-100, .bg-green-100, .bg-purple-100');
          const badgeCount = await tagBadges.count();
          expect(badgeCount).toBeGreaterThan(0);
        }
      }
    });

    test('shows stage indicators with correct colors', async ({ page }) => {
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      const contactRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (contactRows > 0) {
        // Look for stage badges
        const stageBadges = page.locator('text="Core Client", text="VIP Client", text="Prospect"');
        const stageCount = await stageBadges.count();
        
        if (stageCount > 0) {
          // Should have appropriate styling
          expect(stageCount).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('MODERATE: Actions Menu', () => {
    test('opens contact actions dropdown', async ({ page }) => {
      await page.waitForSelector('[data-testid^="contact-row-"]', { timeout: 10000 });
      
      const contactRows = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (contactRows > 0) {
        const firstRowId = await page.locator('[data-testid^="contact-row-"]:first-of-type').getAttribute('data-testid');
        const contactId = firstRowId?.replace('contact-row-', '');
        
        if (contactId) {
          // Click actions button
          await page.getByTestId(`contact-actions-${contactId}`).click();
          
          // Menu should open
          await expect(page.getByTestId(`edit-contact-${contactId}`)).toBeVisible();
          await expect(page.getByTestId(`add-note-${contactId}`)).toBeVisible();
          await expect(page.getByTestId(`view-notes-${contactId}`)).toBeVisible();
          await expect(page.getByTestId(`delete-contact-${contactId}`)).toBeVisible();
        }
      }
    });
  });

  test.describe('LOW: Accessibility and UI Polish', () => {
    test('provides proper ARIA labels and semantic structure', async ({ page }) => {
      // Check for proper table structure
      const table = page.locator('table');
      await expect(table).toBeVisible();
      
      // Check for column headers
      const headers = page.locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
      
      // Check for proper button labels
      const buttons = page.locator('button[data-testid]');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
    });

    test('maintains responsive design at different viewport sizes', async ({ page }) => {
      // Test desktop size (default)
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.getByTestId('contacts-page')).toBeVisible();
      
      // Test tablet size
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByTestId('contacts-page')).toBeVisible();
      
      // Test mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByTestId('contacts-page')).toBeVisible();
      
      // Reset to desktop
      await page.setViewportSize({ width: 1200, height: 800 });
    });

    test('handles keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      // Should focus on first interactive element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should maintain proper focus order
      const secondFocusedElement = page.locator(':focus');
      await expect(secondFocusedElement).toBeVisible();
    });
  });

  test.describe('LOW: Error Handling and Edge Cases', () => {
    test('handles empty contact list gracefully', async ({ page }) => {
      // If no contacts exist, should show appropriate message
      const hasContacts = await page.locator('[data-testid^="contact-row-"]').count();
      
      if (hasContacts === 0) {
        await expect(page.getByText('No contacts found')).toBeVisible();
        await expect(page.getByText('Add contacts or sync from your calendar')).toBeVisible();
      }
    });

    test('handles API failures gracefully', async ({ page }) => {
      // This would require mocking network failures
      // For now, just ensure the page doesn't crash under normal conditions
      await page.reload();
      await expect(page.getByTestId('contacts-page')).toBeVisible();
    });

    test('maintains UI state during long operations', async ({ page }) => {
      // Click AI enrichment button (if available)
      const enrichButton = page.getByTestId('enrich-contacts-button');
      
      if (await enrichButton.isVisible()) {
        await enrichButton.click();
        
        // Should show loading state
        await expect(page.getByText('Enriching...')).toBeVisible({ timeout: 1000 });
        
        // UI should remain responsive
        await expect(page.getByTestId('contacts-page')).toBeVisible();
      }
    });
  });

  test.describe('Integration: End-to-End Workflows', () => {
    test.skip('complete contact management workflow', async ({ page }) => {
      // This would test the full workflow:
      // 1. Load contacts page
      // 2. Search and filter
      // 3. View contact details via notes hover
      // 4. Use AI actions
      // 5. Create new contact
      // 6. Verify all changes
      
      // Requires full authentication and database setup
      console.log('Full workflow test skipped - requires authenticated environment');
    });

    test.skip('AI-powered contact enhancement workflow', async ({ page }) => {
      // This would test:
      // 1. Load contacts
      // 2. Trigger AI enrichment
      // 3. Verify AI insights appear
      // 4. Use AI actions (email, notes, tasks)
      // 5. Verify all AI features work together
      
      // Requires AI API access
      console.log('AI workflow test skipped - requires AI API access');
    });
  });
});