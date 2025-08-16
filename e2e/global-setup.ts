import { request, chromium } from "@playwright/test";

export default async function globalSetup() {
  console.warn("🚀 Starting E2E global setup...");

  // Give the dev server a moment to boot, then poll /api/health
  const baseURL = process.env["PLAYWRIGHT_TEST_BASE_URL"] ?? "http://localhost:3000";
  const healthUrl = `${baseURL}/api/health`;
  const ctx = await request.newContext();
  const deadline = Date.now() + 60_000;

  console.warn("⏳ Waiting for server to be ready...");

  // Poll until 200 or 404 (404 means route not present; skip waiting)
  // If server not up yet, continue retrying until deadline
  while (Date.now() < deadline) {
    try {
      const res = await ctx.get(healthUrl, { timeout: 2_000 });
      const status = res.status();
      if (status === 200) {
        console.warn("✅ Server is ready");
        break;
      }
      if (status === 404) {
        console.warn("⚠️ Health endpoint not found, proceeding anyway");
        break;
      }
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  await ctx.dispose();

  console.warn("🍪 Setting up authentication cookies...");

  // Prepare a storage state file that includes the E2E auth cookie so first navigation is authenticated
  const e2eUserId = process.env["E2E_USER_ID"] ?? "3550f627-dbd7-4c5f-a13f-e59295c14676";
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  // Add the E2E authentication cookie
  // Navigate to the base URL first to establish the domain context
  const page = await context.newPage();
  await page.goto(baseURL);

  await context.addCookies([
    {
      name: "e2e_uid",
      value: e2eUserId,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
      secure: false,
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  ]);

  await page.close();

  // Navigate to a page to trigger CSRF cookie generation
  console.warn("🔐 Triggering CSRF cookie generation...");
  const page2 = await context.newPage();

  try {
    // Navigate to the contacts page which will trigger CSRF cookie creation
    await page2.goto(`${baseURL}/contacts`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for the page to stabilize and CSRF cookies to be set
    await page2.waitForTimeout(2000);

    console.warn("✅ Page loaded successfully");
  } catch (error) {
    console.warn("⚠️ Warning: Page navigation failed, but continuing:", error);
  }

  // Save the storage state with all cookies
  await context.storageState({ path: "e2e/.auth.json" });
  console.warn("💾 Storage state saved to e2e/.auth.json");

  await page2.close();
  await context.close();
  await browser.close();

  console.warn("🎉 Global setup completed successfully");
}
