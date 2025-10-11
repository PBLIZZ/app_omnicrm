// Environment-based configuration
const PRIMARY_KEY = process.env["OPENROUTER_API_KEY"];
const BACKUP_KEYS = (process.env["OPENROUTER_BACKUP_KEYS"] ?? "").split(",").filter(Boolean);

interface ApiKeyStatus {
  key: string;
  isHealthy: boolean;
  lastChecked: Date;
  errorMessage?: string;
  responseTimeMs?: number;
}

/**
 * API Key Rotation Manager for OpenRouter
 * Provides automatic failover and health checking for API keys
 */

// Global singleton instance
let globalRotator: ApiKeyRotator | null = null;

/**
 * Get the global API key rotator instance
 */
export function getApiKeyRotator(): ApiKeyRotator {
  globalRotator ??= new ApiKeyRotator();
  return globalRotator;
}

/**
 * Convenience function to get current healthy API key
 */
export function getCurrentApiKey(): string {
  return getApiKeyRotator().getCurrentKey();
}

/**
 * Helper function to wrap API calls with automatic key rotation
 */
export async function withKeyRotation<T>(apiCall: (apiKey: string) => Promise<T>): Promise<T> {
  const rotator = getApiKeyRotator();
  let lastError: Error | null = null;

  // Try current key
  try {
    const currentKey = rotator.getCurrentKey();
    return await apiCall(currentKey);
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));

    // If it's an auth error (401/403), mark current key as unhealthy
    if (
      error instanceof Error &&
      (error.message.includes("401") || error.message.includes("403"))
    ) {
      await rotator.checkKeyHealth(rotator.getCurrentKey());
    }
  }

  // Try backup keys if available
  const status = rotator.getRotationStatus();
  const healthyBackupKeys = status.keyStatuses
    .filter((s) => s.isHealthy && s.key !== status.currentKey)
    .map((s) => s.key);

  for (const maskedKey of healthyBackupKeys) {
    // Find actual key from masked key (this is a limitation of our design)
    // In production, you'd want a better way to map back to actual keys
    const allKeys = [PRIMARY_KEY, ...BACKUP_KEYS].filter((key): key is string => Boolean(key));
    const actualKey = allKeys.find((k) => rotator["maskKey"](k) === maskedKey);

    if (actualKey) {
      try {
        await rotator.rotateToKey(actualKey);
        return await apiCall(actualKey);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }
  }

  // All keys failed
  throw new Error(`All API keys failed. Last error: ${lastError?.message}`);
}
