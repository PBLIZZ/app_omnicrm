import { test, expect } from '@playwright/test';

test.describe('GmailConnector Fix Verification', () => {
  test('GmailConnector should render without JavaScript errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the connect page
    await page.goto('/dashboard/connect');

    // Wait for the page to load and render
    await page.waitForLoadState('networkidle');

    // Check that the main heading is present (indicates successful render)
    await expect(page.locator('h1:has-text("Connect Your Gmail")')).toBeVisible();

    // Check that the GmailConnector component is present
    await expect(page.locator('[data-testid="gmail-connector"], .gmail-connector, text=Gmail')).toBeVisible({ timeout: 5000 });

    // Wait a bit more for any async operations
    await page.waitForTimeout(2000);

    // Verify no ReferenceError about checkConnectionStatus
    const hasCheckConnectionError = consoleErrors.some(error => 
      error.includes('checkConnectionStatus') && error.includes('before initialization')
    );
    
    const hasReferenceError = pageErrors.some(error => 
      error.message.includes('checkConnectionStatus') && 
      error.message.includes('before initialization')
    );

    if (hasCheckConnectionError || hasReferenceError) {
      console.log('Console errors:', consoleErrors);
      console.log('Page errors:', pageErrors.map(e => e.message));
    }

    expect(hasCheckConnectionError, 'Should not have checkConnectionStatus initialization error in console').toBe(false);
    expect(hasReferenceError, 'Should not have checkConnectionStatus reference error').toBe(false);

    // General check - no critical React errors
    const hasCriticalErrors = pageErrors.some(error => 
      error.message.includes('ReferenceError') || 
      error.message.includes('Cannot access') ||
      error.message.includes('before initialization')
    );

    expect(hasCriticalErrors, 'Should not have critical JavaScript errors').toBe(false);
  });

  test('Connect page should load without Server/Client Component errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/dashboard/connect');
    await page.waitForLoadState('networkidle');

    // Check for Server/Client Component boundary errors
    const hasServerClientError = consoleErrors.some(error =>
      error.includes('Event handlers cannot be passed to Client Component') ||
      error.includes('onConnectionSuccess') ||
      error.includes('onContactsPreview')
    );

    expect(hasServerClientError, 'Should not have Server/Client Component boundary errors').toBe(false);

    // Verify the page content loaded successfully
    await expect(page.locator('text=Connect Your Gmail')).toBeVisible();
    await expect(page.locator('text=Transform your Gmail contacts')).toBeVisible();
  });
});