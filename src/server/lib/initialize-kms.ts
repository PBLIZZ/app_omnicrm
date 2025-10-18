import { initializeKMS, isKMSAvailable } from "./kms-service";
import { env } from "./env";

/**
 * Initialize KMS service at application startup
 * This should be called early in the application lifecycle
 */
export async function initializeSecureCredentials(): Promise<void> {
  try {
    // Check if KMS is configured
    if (!env.AWS_KMS_KEY_ID) {
      console.warn("[KMS] AWS_KMS_KEY_ID not configured, using fallback encryption");
      return;
    }

    // Initialize KMS service
    await initializeKMS();
    console.log("[KMS] Secure credential management initialized successfully");
  } catch (error) {
    console.error("[KMS] Failed to initialize secure credentials:", error);

    // In production, this should be a fatal error
    if (env.NODE_ENV === "production") {
      throw new Error(
        `KMS initialization failed in production: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // In development, log warning but continue
    console.warn("[KMS] Continuing with fallback encryption (development mode)");
  }
}

/**
 * Check if secure credentials are available
 */
export async function isSecureCredentialsAvailable(): Promise<boolean> {
  return await isKMSAvailable();
}

/**
 * Get credential management status for monitoring
 */
export async function getCredentialStatus(): Promise<{
  kmsAvailable: boolean;
  usingSecureCredentials: boolean;
  fallbackMode: boolean;
  error?: string;
}> {
  try {
    const kmsAvailable = await isKMSAvailable();
    return {
      kmsAvailable,
      usingSecureCredentials: kmsAvailable,
      fallbackMode: !kmsAvailable,
    };
  } catch (error) {
    return {
      kmsAvailable: false,
      usingSecureCredentials: false,
      fallbackMode: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
