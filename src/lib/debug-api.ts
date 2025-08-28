/**
 * Debug utilities for API issues
 */

/**
 * Check API health and CSRF token status
 */
export async function debugApiHealth(): Promise<{
  health: boolean;
  csrfToken: string;
  csrfSig: boolean;
  rateLimitOk: boolean;
  error?: string;
}> {
  const result = {
    health: false,
    csrfToken: "",
    csrfSig: false,
    rateLimitOk: false,
    error: undefined as string | undefined,
  };

  try {
    // Check CSRF tokens
    const csrfMatch = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
    const csrfSigMatch = document.cookie.match(/(?:^|; )csrf_sig=([^;]+)/);

    result.csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1] ?? "") : "";
    result.csrfSig = Boolean(csrfSigMatch);

    // Test API health
    const healthResponse = await fetch("/api/health", {
      method: "GET",
      credentials: "same-origin",
    });

    if (healthResponse.status === 429) {
      result.error = "Rate limited";
      return result;
    }

    result.rateLimitOk = healthResponse.status !== 429;
    result.health = healthResponse.ok;

    if (!healthResponse.ok) {
      const errorData = await healthResponse.json().catch(() => ({}));
      result.error = errorData.error || `HTTP ${healthResponse.status}`;
    }
  } catch (error: any) {
    result.error = error.message || "Unknown error";
  }

  return result;
}

/**
 * Test a simple API call with proper error handling
 */
export async function testApiCall(
  url: string,
  options: RequestInit = {},
): Promise<{
  success: boolean;
  status: number;
  data?: any;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "x-csrf-token": getCsrfToken(),
        ...options.headers,
      },
      ...options,
    });

    const result = {
      success: response.ok,
      status: response.status,
      data: undefined as any,
      error: undefined as string | undefined,
    };

    if (response.ok) {
      try {
        result.data = await response.json();
      } catch {
        result.data = await response.text();
      }
    } else {
      try {
        const errorData = await response.json();
        result.error = errorData.error || `HTTP ${response.status}`;
      } catch {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      status: 0,
      error: error.message || "Network error",
    };
  }
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1] ?? "") : "";
}

// Global debug function for console use
if (typeof window !== "undefined") {
  (window as any).debugApi = {
    health: debugApiHealth,
    test: testApiCall,
    csrfToken: getCsrfToken,
  };
}
