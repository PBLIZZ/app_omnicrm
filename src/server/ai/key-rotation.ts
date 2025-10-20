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

interface RotationStatus {
  currentKey: string;
  keyStatuses: ApiKeyStatus[];
}

/**
 * API Key Rotation Manager for OpenRouter
 * Provides automatic failover and health checking for API keys
 */
class ApiKeyRotator {
  private keys: string[];
  private currentKeyIndex: number = 0;
  private keyStatuses: Map<string, ApiKeyStatus>;

  constructor() {
    // Collect all available keys
    this.keys = [PRIMARY_KEY, ...BACKUP_KEYS].filter((key): key is string => Boolean(key));
    
    if (this.keys.length === 0) {
      throw new Error("No API keys configured for OpenRouter");
    }

    // Initialize key statuses
    this.keyStatuses = new Map();
    this.keys.forEach((key) => {
      this.keyStatuses.set(key, {
        key: this.maskKey(key),
        isHealthy: true,
        lastChecked: new Date(),
      });
    });
  }

  /**
   * Get the current active API key
   */
  getCurrentKey(): string {
    return this.keys[this.currentKeyIndex] ?? this.keys[0] ?? "";
  }

  /**
   * Mask an API key for logging (show only first/last 4 chars)
   */
  private maskKey(key: string): string {
    if (key.length <= 8) return "****";
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  /**
   * Check the health of a specific key
   */
  async checkKeyHealth(key: string): Promise<void> {
    const status = this.keyStatuses.get(key);
    if (!status) return;

    // Mark as unhealthy for now
    status.isHealthy = false;
    status.lastChecked = new Date();
    this.keyStatuses.set(key, status);
  }

  /**
   * Get rotation status for all keys
   */
  getRotationStatus(): RotationStatus {
    return {
      currentKey: this.maskKey(this.getCurrentKey()),
      keyStatuses: Array.from(this.keyStatuses.values()),
    };
  }

  /**
   * Rotate to a specific key
   */
  async rotateToKey(key: string): Promise<void> {
    const index = this.keys.indexOf(key);
    if (index === -1) {
      throw new Error("Key not found in rotation pool");
    }
    this.currentKeyIndex = index;
  }
}

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
    const actualKey = allKeys.find((k) => maskKeyForComparison(k) === maskedKey);

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

/**
 * Helper to mask key for comparison (duplicates private method logic)
 */
function maskKeyForComparison(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
