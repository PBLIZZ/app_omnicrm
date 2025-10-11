import { logger } from "@/lib/observability";

// Environment-based configuration
const PRIMARY_KEY = process.env["OPENROUTER_API_KEY"];
const BACKUP_KEYS = (process.env["OPENROUTER_BACKUP_KEYS"] ?? "").split(",").filter(Boolean);
const ROTATION_CHECK_INTERVAL =
  Number(process.env["API_KEY_ROTATION_CHECK_MINUTES"] ?? 60) * 60 * 1000;
const HEALTH_CHECK_TIMEOUT = Number(process.env["API_KEY_HEALTH_CHECK_TIMEOUT_MS"] ?? 10000);

interface ApiKeyStatus {
  key: string;
  isHealthy: boolean;
  lastChecked: Date;
  errorMessage?: string;
  responseTimeMs?: number;
}

interface RotationState {
  currentKey: string;
  keyStatuses: Map<string, ApiKeyStatus>;
  lastRotationCheck: Date;
  rotationCount: number;
}

/**
 * API Key Rotation Manager for OpenRouter
 * Provides automatic failover and health checking for API keys
 */
export class ApiKeyRotator {
  private state: RotationState;
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor() {
    const allKeys = [PRIMARY_KEY, ...BACKUP_KEYS].filter((key): key is string => Boolean(key));

    if (allKeys.length === 0) {
      void logger
        .warn("API key rotation disabled - no keys available", {
          operation: "key_rotation",
          additionalData: {
            op: "key_rotation.no_keys",
            message: "No OpenRouter API keys configured",
          },
        })
        .catch(console.error);
    }

    this.state = {
      currentKey: PRIMARY_KEY ?? "",
      keyStatuses: new Map(),
      lastRotationCheck: new Date(),
      rotationCount: 0,
    };

    // Initialize key statuses
    allKeys.forEach((key) => {
      this.state.keyStatuses.set(key, {
        key: this.maskKey(key),
        isHealthy: true, // Assume healthy until proven otherwise
        lastChecked: new Date(),
      });
    });

    this.startRotationTimer();
  }

  /**
   * Get the current healthy API key
   */
  public getCurrentKey(): string {
    // If current key is healthy, use it
    const currentStatus = this.state.keyStatuses.get(this.state.currentKey);
    if (currentStatus?.isHealthy) {
      return this.state.currentKey;
    }

    // Find first healthy backup key
    for (const [key, status] of this.state.keyStatuses) {
      if (status.isHealthy && key !== this.state.currentKey) {
        void this.rotateToKey(key).catch(console.error);
        return key;
      }
    }

    // No healthy keys found - return current key and log error
    void logger
      .error("No healthy API keys available - using current key", {
        operation: "key_rotation",
        additionalData: {
          op: "key_rotation.no_healthy_keys",
          currentKey: this.maskKey(this.state.currentKey),
          availableKeys: Array.from(this.state.keyStatuses.keys()).map((k) => this.maskKey(k)),
        },
      })
      .catch(console.error);

    return this.state.currentKey;
  }

  /**
   * Check health of a specific API key
   */
  public async checkKeyHealth(key: string): Promise<ApiKeyStatus> {
    const startTime = Date.now();

    try {
      // Simple health check - get models list with minimal request
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          "User-Agent": "OmniCRM-KeyRotator/1.0",
        },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
      });

      const responseTimeMs = Date.now() - startTime;
      const isHealthy = response.ok;

      const status: ApiKeyStatus = {
        key: this.maskKey(key),
        isHealthy,
        lastChecked: new Date(),
        responseTimeMs,
        ...(isHealthy ? {} : { errorMessage: `HTTP ${response.status}: ${response.statusText}` }),
      };

      this.state.keyStatuses.set(key, status);

      await logger.info("API key health check completed", {
        operation: "key_rotation",
        additionalData: {
          op: "key_rotation.health_check",
          keyMasked: this.maskKey(key),
          isHealthy,
          responseTimeMs,
          errorMessage: status.errorMessage,
        },
      });

      return status;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const status: ApiKeyStatus = {
        key: this.maskKey(key),
        isHealthy: false,
        lastChecked: new Date(),
        responseTimeMs,
        errorMessage,
      };

      this.state.keyStatuses.set(key, status);

      await logger.warn("API key health check failed", {
        operation: "key_rotation",
        additionalData: {
          op: "key_rotation.health_check_failed",
          keyMasked: this.maskKey(key),
          error: errorMessage,
          responseTimeMs,
        },
      });

      return status;
    }
  }

  /**
   * Check health of all configured API keys
   */
  public async checkAllKeysHealth(): Promise<Map<string, ApiKeyStatus>> {
    const allKeys = [PRIMARY_KEY, ...BACKUP_KEYS].filter((key): key is string => Boolean(key));

    const healthChecks = allKeys.map((key) => this.checkKeyHealth(key));
    await Promise.allSettled(healthChecks);

    return this.state.keyStatuses;
  }

  /**
   * Force rotation to a specific key
   */
  public async rotateToKey(newKey: string): Promise<boolean> {
    if (!this.state.keyStatuses.has(newKey)) {
      await logger.error("Attempted to rotate to unknown API key", {
        operation: "key_rotation",
        additionalData: {
          op: "key_rotation.invalid_key",
          keyMasked: this.maskKey(newKey),
        },
      });
      return false;
    }

    const previousKey = this.state.currentKey;
    this.state.currentKey = newKey;
    this.state.rotationCount++;

    await logger.info("API key rotation completed", {
      operation: "key_rotation",
      additionalData: {
        op: "key_rotation.rotated",
        previousKeyMasked: this.maskKey(previousKey),
        newKeyMasked: this.maskKey(newKey),
        rotationCount: this.state.rotationCount,
      },
    });

    return true;
  }

  /**
   * Get rotation status and statistics
   */
  public getRotationStatus(): {
    currentKey: string;
    keyStatuses: ApiKeyStatus[];
    lastRotationCheck: Date;
    rotationCount: number;
    healthyKeysCount: number;
  } {
    const keyStatuses = Array.from(this.state.keyStatuses.values());
    const healthyKeysCount = keyStatuses.filter((status) => status.isHealthy).length;

    return {
      currentKey: this.maskKey(this.state.currentKey),
      keyStatuses,
      lastRotationCheck: this.state.lastRotationCheck,
      rotationCount: this.state.rotationCount,
      healthyKeysCount,
    };
  }

  /**
   * Start automatic health checking and rotation
   */
  private startRotationTimer(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    this.rotationTimer = setInterval(async () => {
      try {
        this.state.lastRotationCheck = new Date();
        await this.checkAllKeysHealth();

        // Auto-rotate if current key is unhealthy
        const currentStatus = this.state.keyStatuses.get(this.state.currentKey);
        if (!currentStatus?.isHealthy) {
          // Find first healthy key to rotate to
          for (const [key, status] of this.state.keyStatuses) {
            if (status.isHealthy && key !== this.state.currentKey) {
              await this.rotateToKey(key);
              break;
            }
          }
        }
      } catch (error) {
        void logger
          .error(
            "Error in API key rotation timer",
            {
              operation: "key_rotation",
              additionalData: {
                op: "key_rotation.timer_error",
                error: error instanceof Error ? error.message : String(error),
              },
            },
            error instanceof Error ? error : undefined,
          )
          .catch(console.error);
      }
    }, ROTATION_CHECK_INTERVAL);

    void logger
      .info("API key rotation timer started", {
        operation: "key_rotation",
        additionalData: {
          op: "key_rotation.timer_started",
          intervalMinutes: ROTATION_CHECK_INTERVAL / (60 * 1000),
          availableKeys: Array.from(this.state.keyStatuses.keys()).map((k) => this.maskKey(k)),
        },
      })
      .catch(console.error);
  }

  /**
   * Stop automatic health checking
   */
  public async stop(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;

      await logger.info("API key rotation timer stopped", {
        operation: "key_rotation",
        additionalData: {
          op: "key_rotation.stopped",
        },
      });
    }
  }

  /**
   * Mask API key for logging (show first 8 and last 4 characters)
   */
  private maskKey(key: string): string {
    if (!key || key.length < 12) {
      return "***";
    }

    const start = key.substring(0, 8);
    const end = key.substring(key.length - 4);
    const middle = "*".repeat(Math.max(0, key.length - 12));

    return `${start}${middle}${end}`;
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
