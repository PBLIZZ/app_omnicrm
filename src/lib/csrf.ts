/**
 * CSRF token utilities for client-side requests
 */

/**
 * Get CSRF token from cookie
 */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";

  const match = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1] ?? "") : "";
}

/**
 * Check if CSRF tokens are available
 */
export function hasCsrfTokens(): boolean {
  if (typeof document === "undefined") return false;

  const csrf = getCsrfToken();
  const csrfSig = document.cookie.match(/(?:^|; )csrf_sig=([^;]+)/);

  return Boolean(csrf && csrfSig);
}

/**
 * Wait for CSRF tokens to be available
 * This is useful when tokens are being set by middleware
 */
export async function waitForCsrfTokens(maxWaitMs = 5000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (hasCsrfTokens()) {
      return true;
    }

    // Wait 100ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

/**
 * Ensure CSRF tokens are available by making a GET request if needed
 */
export async function ensureCsrfTokens(): Promise<string> {
  // If we already have tokens, return the current one
  if (hasCsrfTokens()) {
    return getCsrfToken();
  }

  try {
    // Make a safe request to trigger CSRF token generation
    await fetch("/api/health", {
      method: "GET",
      credentials: "same-origin",
    });

    // Wait for tokens to be set
    const hasTokens = await waitForCsrfTokens(2000);

    if (hasTokens) {
      return getCsrfToken();
    }

    console.warn("Failed to obtain CSRF tokens");
    return "";
  } catch (error) {
    console.error("Error ensuring CSRF tokens:", error);
    return "";
  }
}
