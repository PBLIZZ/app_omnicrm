/**
 * Component Integration Gap Tests
 * 
 * This test suite identifies specific frontend components that need updates
 * to work with the new unified OAuth flow and backend APIs.
 */

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function authenticateTestUser(page: Page): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  
  if (page.url().includes("/dashboard") || page.url().includes("/contacts")) {
    return;
  }
  
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill("test-e2e@example.com");
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await passwordInput.fill("test-e2e-password-123");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForLoadState("networkidle");
  }
}

test.describe("Component Integration Gaps - ConnectDataSources", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page);
  });

  test("ConnectDataSources component service token detection", async ({ page }) => {
    await page.goto("/dashboard/connect");
    await page.waitForLoadState("networkidle");

    // Check if the component loads the sync status
    const statusCallPromise = page.waitForResponse(response => 
      response.url().includes('/api/settings/sync/status')
    );

    await page.reload();
    
    try {
      const statusResponse = await statusCallPromise;
      const statusData = await statusResponse.json();
      
      console.log(`ConnectDataSources Status Check:
        - Status API called: ✓
        - Response: ${JSON.stringify(statusData, null, 2)}
        
        SERVICE TOKEN DETECTION ISSUES:
        - Component checks: status?.serviceTokens?.gmail
        - Unified tokens use: service='unified' 
        - Gap: Frontend expects separate gmail/calendar flags
        
        REQUIRED FIXES:
        1. Update getSyncStatus() to handle unified tokens
        2. Map unified token to both gmail/calendar flags  
        3. Update component service checks:
           Lines 420-430: status?.serviceTokens?.gmail checks
           Lines 449-465: Gmail setup flow buttons
      `);
      
    } catch (error) {
      console.log(`Status API call failed: ${error}`);
    }

    // Test the Gmail sync button behavior
    const gmailSection = page.locator('.space-y-6:has-text("Email Integration")');
    if (await gmailSection.isVisible()) {
      const syncButton = gmailSection.getByRole("button", { name: /sync gmail/i });
      const setupButton = gmailSection.getByRole("button", { name: /set up gmail/i });
      
      console.log(`Gmail Section Analysis:
        - Sync button visible: ${await syncButton.isVisible()}
        - Setup button visible: ${await setupButton.isVisible()}
        
        INTEGRATION ISSUE:
        - Setup buttons redirect to /settings/sync-preferences
        - Should redirect to new /api/google/connect OAuth flow
        - Line 453-456 and 461-464 need OAuth flow updates
      `);
    }
  });

  test("ConnectDataSources preview and sync flow", async ({ page }) => {
    await page.goto("/dashboard/connect");
    await page.waitForLoadState("networkidle");

    // Test the preview dialog flow
    const emailCard = page.locator('.hover\\:shadow-md:has-text("Email Integration")');
    const syncButton = emailCard.getByRole("button", { name: /sync gmail/i });
    
    if (await syncButton.isVisible() && await syncButton.isEnabled()) {
      await syncButton.click();
      
      // Should open preview dialog
      const previewDialog = page.locator('[role="dialog"]:has-text("Sync Gmail")');
      await expect(previewDialog).toBeVisible({ timeout: 5000 });
      
      // Test preview option
      const previewButton = previewDialog.getByRole("button", { name: /preview first/i });
      if (await previewButton.isVisible()) {
        await previewButton.click();
        
        // Monitor API calls during preview
        const previewCallPromise = page.waitForResponse(response =>
          response.url().includes('/api/sync/preview/gmail') ||
          response.url().includes('/previewGmailSync')
        );
        
        try {
          const previewResponse = await previewCallPromise;
          console.log(`Preview API Analysis:
            - URL: ${previewResponse.url()}
            - Status: ${previewResponse.status()}
            
            POTENTIAL ISSUES:
            - Preview API may not work with unified tokens
            - Frontend uses previewGmailSync() from lib/api/sync.ts
            - Backend needs to handle service='unified' tokens
          `);
        } catch (error) {
          console.log(`Preview API call failed or timed out`);
        }
      }
    }
  });
});

test.describe("Component Integration Gaps - Manual Sync Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page);
  });

  test("Manual sync component authorization checks", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping manual sync tests");
    
    await page.goto("/dashboard/manual-sync");
    await page.waitForLoadState("networkidle");

    // Check how the component determines Gmail availability
    const gmailSwitch = page.locator('#gmail-switch');
    const gmailSwitchEnabled = await gmailSwitch.isEnabled();
    
    console.log(`Manual Sync Authorization Analysis:
      - Gmail switch enabled: ${gmailSwitchEnabled}
      
      AUTHORIZATION CHECK ISSUES:
      - Line 121: if (includeGmail && !status?.flags?.gmail)
      - Line 154: const gmailAvailable = Boolean(status?.flags?.gmail)
      - These checks expect status.flags.gmail boolean
      - Unified tokens may not set this flag
      
      REQUIRED FIXES:
      1. Update getSyncStatus() to set flags for unified tokens
      2. Or update component to check unified token presence
      3. Lines 186-190: Gmail switch disabled state handling
    `);

    // Test the generate preview functionality
    if (gmailSwitchEnabled) {
      await gmailSwitch.check();
      
      const previewButton = page.getByRole("button", { name: "Generate Preview" });
      await previewButton.click();
      
      // Monitor preview API calls
      const apiCalls: string[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/sync/preview')) {
          apiCalls.push(`${response.url()}: ${response.status()}`);
        }
      });
      
      await page.waitForTimeout(3000);
      
      console.log(`Manual Sync Preview API Calls:
        ${apiCalls.join('\n        ')}
        
        POTENTIAL ISSUES:
        - Preview APIs may reject unified tokens
        - Job processing may fail with google_not_connected
        - Line 81: previewGmailSync() from lib/api/sync.ts
      `);
    }
  });

  test("Manual sync job execution flow", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping job execution tests");
    
    await page.goto("/dashboard/manual-sync");
    await page.waitForLoadState("networkidle");

    console.log(`Manual Sync Job Execution Analysis:
      
      CURRENT FLOW (Lines 114-152):
      1. Validate authorization per source
      2. Call approveGmailSync() if Gmail enabled  
      3. Call approveCalendarSync() if Calendar enabled
      4. Call runJobs() to process background jobs
      5. Poll job status if live progress enabled
      
      INTEGRATION ISSUES:
      - approveGmailSync() may not work with unified tokens
      - Job processors may not find unified Google credentials
      - Polling logic checks jobs.queued count for completion
      - May need updated job status for unified flow
      
      REQUIRED BACKEND FIXES:
      1. /src/app/api/sync/approve/gmail/route.ts - handle unified tokens
      2. /src/server/jobs/processors/ - use unified credentials  
      3. Job status API - accurate counts for unified jobs
    `);
  });
});

test.describe("Component Integration Gaps - Sync Preferences Page", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page);
  });

  test("Sync preferences component progressive disclosure", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping sync preferences tests");
    
    await page.goto("/settings/sync-preferences");
    await page.waitForLoadState("networkidle");

    // Check the progressive disclosure logic
    const connectSection = page.locator('h2:has-text("1. Connect Services")');
    const configureSection = page.locator('h2:has-text("2. Quick Setup")');
    const previewSection = page.locator('h2:has-text("3. Preview & Import")');
    
    console.log(`Sync Preferences Progressive Disclosure:
      - Connect section visible: ${await connectSection.isVisible()}
      - Configure section visible: ${await configureSection.isVisible()} 
      - Preview section visible: ${await previewSection.isVisible()}
      
      LOGIC ISSUES (Lines 74-76):
      - isConnected = status?.googleConnected && (status?.serviceTokens?.gmail || status?.serviceTokens?.calendar)
      - canConfigure = isConnected
      - canPreview = canConfigure && (selectedLabels.size > 0 || prefs?.calendarIncludeOrganizerSelf)
      
      UNIFIED TOKEN ISSUES:
      - Checks status?.serviceTokens?.gmail specifically
      - Unified tokens stored as service='unified'
      - May not trigger canConfigure=true
      
      REQUIRED FIXES:
      1. Update isConnected logic for unified tokens
      2. Backend getSyncStatus() needs serviceTokens mapping
      3. Lines 140-142: Gmail labels loading depends on status?.serviceTokens?.gmail
    `);
  });

  test("Sync preferences Gmail labels loading", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping labels loading tests");
    
    await page.goto("/settings/sync-preferences");
    await page.waitForLoadState("networkidle");

    // Test Gmail labels loading
    const loadAdvancedButton = page.getByRole("button", { name: "Load Advanced Settings" });
    if (await loadAdvancedButton.isVisible()) {
      await loadAdvancedButton.click();
      
      // Monitor labels API call
      const labelsCallPromise = page.waitForResponse(response =>
        response.url().includes('/api/google/gmail/labels')
      );
      
      try {
        const labelsResponse = await labelsCallPromise;
        console.log(`Gmail Labels API Analysis:
          - URL: ${labelsResponse.url()}
          - Status: ${labelsResponse.status()}
          
          LABELS API ISSUES:
          - /src/app/api/google/gmail/labels/route.ts may require service='gmail'
          - Unified tokens use service='unified'
          - Backend credential lookup may fail
          
          COMPONENT ISSUES (Lines 140-142):
          - Labels loading triggered by status?.serviceTokens?.gmail
          - Should also trigger for unified tokens
        `);
      } catch (error) {
        console.log(`Gmail labels API call failed: ${error}`);
      }
    }
  });

  test("Sync preferences direct sync functionality", async ({ page }) => {
    test.skip(!process.env["DATABASE_URL"], "No DATABASE_URL; skipping direct sync tests");
    
    await page.goto("/settings/sync-preferences");
    await page.waitForLoadState("networkidle");

    // Test direct sync buttons in preview section
    const gmailSyncButton = page.getByRole("button", { name: "Sync Gmail Now" });
    const calendarSyncButton = page.getByRole("button", { name: "Sync Calendar Now" });
    
    console.log(`Direct Sync Buttons Analysis:
      - Gmail sync button visible: ${await gmailSyncButton.isVisible()}
      - Calendar sync button visible: ${await calendarSyncButton.isVisible()}
      
      SYNC FUNCTIONALITY (Lines 228-266):
      - handleGmailSync() calls approveGmailSync() 
      - handleCalendarSync() calls approveCalendarSync()
      - Both call runJobs() after approval
      
      INTEGRATION ISSUES:
      - Approval APIs may not work with unified tokens
      - Job processing may fail with unified credentials
      - Error handling expects specific error messages
    `);
  });
});

test.describe("Component Integration Gaps - API Layer", () => {
  test("lib/api/sync.ts integration issues", async ({ page }) => {
    console.log(`API Layer Integration Analysis:
      
      /src/lib/api/sync.ts FUNCTIONS:
      - getSyncStatus() → /api/settings/sync/status
      - previewGmailSync() → /api/sync/preview/gmail
      - approveGmailSync() → /api/sync/approve/gmail
      - fetchGmailLabels() → /api/google/gmail/labels
      
      BACKEND API COMPATIBILITY ISSUES:
      
      1. /src/app/api/settings/sync/status/route.ts
         - May not recognize service='unified' tokens
         - Frontend expects serviceTokens.gmail boolean
         - Need to map unified → gmail/calendar flags
      
      2. /src/app/api/sync/preview/gmail/route.ts  
         - May check for service='gmail' specifically
         - Need to accept unified tokens
         - Credential lookup may fail
      
      3. /src/app/api/sync/approve/gmail/route.ts
         - Same service token issues as preview
         - Job creation may specify wrong service type
      
      4. /src/app/api/google/gmail/labels/route.ts
         - Credential lookup for Gmail API access
         - May not work with unified service tokens
      
      REQUIRED BACKEND UPDATES:
      1. Update all Gmail APIs to handle unified tokens
      2. Update sync status to map unified → service flags
      3. Update job processors to use unified credentials
      4. Test complete flow with unified tokens
    `);
  });

  test("Job processing integration gaps", async ({ page }) => {
    console.log(`Job Processing Integration Analysis:
      
      JOB FLOW:
      1. Frontend calls approval APIs
      2. APIs create jobs in database
      3. runJobs() processes background jobs
      4. Job processors access Google APIs
      
      PROCESSOR FILES POTENTIALLY AFFECTED:
      - /src/server/jobs/processors/sync.ts
      - /src/server/jobs/processors/extract-contacts.ts  
      - /src/server/jobs/processors/normalize.ts
      - /src/server/jobs/processors/embed.ts
      
      CREDENTIAL LOOKUP ISSUES:
      - Processors may query userIntegrations with service='gmail'
      - Unified tokens stored with service='unified'
      - Google client initialization may fail
      - Results in "google_not_connected" errors
      
      REQUIRED PROCESSOR UPDATES:
      1. Update credential queries to include service='unified'
      2. Test Google API access with unified tokens
      3. Update error handling for new token format
      4. Ensure backward compatibility during migration
    `);
  });
});

test.describe("Component Integration Gaps - Real-time Updates", () => {
  test("SSE integration requirements", async ({ page }) => {
    console.log(`Real-time Updates Integration Analysis:
      
      CURRENT STATE:
      - No SSE integration in existing components
      - Users don't see real-time contact creation
      - No progress updates during sync
      
      SSE INTEGRATION POINTS NEEDED:
      
      1. ConnectDataSources component:
         - Add SSE connection after sync starts
         - Show real-time contact creation count
         - Update sync status dynamically
      
      2. Manual Sync page:
         - Real-time job progress updates
         - Live contact creation feed
         - Dynamic completion status
      
      3. Sync Preferences page:
         - Real-time preview updates
         - Live sync progress
         - Dynamic error reporting
      
      IMPLEMENTATION REQUIREMENTS:
      1. Add EventSource connections in components
      2. Handle SSE events for contact creation
      3. Update UI state based on SSE messages
      4. Proper error handling and reconnection
      5. Cleanup SSE connections on unmount
      
      SSE MESSAGE TYPES NEEDED:
      - contact_created: { id, name, email }
      - sync_progress: { processed, total, percentage }  
      - sync_complete: { contacts_created, contacts_updated }
      - sync_error: { error, message, retry_possible }
    `);
  });

  test("User experience gaps", async ({ page }) => {
    console.log(`User Experience Gap Analysis:
      
      CURRENT UX ISSUES:
      1. Multiple OAuth entry points with different behaviors
      2. No real-time feedback during sync
      3. Confusing error messages for connection issues
      4. No clear path from "Connect" to "See contacts"
      
      REQUIRED UX IMPROVEMENTS:
      
      1. Single OAuth Flow:
         - Replace all "Setup Gmail" buttons with unified OAuth
         - Consistent redirect to /api/google/connect
         - Clear success/error states
      
      2. Real-time Feedback:
         - Progress bars during sync
         - Live contact creation updates
         - Clear completion messages with contact counts
      
      3. Error Handling:
         - User-friendly error messages
         - Clear next steps for resolution
         - Retry mechanisms where appropriate
      
      4. Navigation Flow:
         - Clear path: Connect → Authorize → Preview → Sync → View Contacts
         - Breadcrumbs or progress indicators
         - Consistent styling and messaging
      
      SPECIFIC COMPONENT UPDATES NEEDED:
      1. Replace OAuth redirect URLs throughout codebase
      2. Add SSE integration for real-time updates  
      3. Improve error message consistency
      4. Add loading states and progress indicators
      5. Update success flows to show contact results
    `);
  });
});