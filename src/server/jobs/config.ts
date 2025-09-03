// Centralized sync configuration with performance-optimized defaults and env overrides

const intFromEnv = (key: string, def: number): number => {
  const raw = process.env[key];
  if (!raw) return def;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : def;
};

// Core sync limits
export const SYNC_MAX_PER_RUN = intFromEnv("SYNC_MAX_PER_RUN", 2000);
export const JOB_HARD_CAP_MS = intFromEnv("JOB_HARD_CAP_MS", 10 * 60 * 1000); // 10 minutes

// Dynamic batching configuration
export const GMAIL_CHUNK_MIN = intFromEnv("SYNC_GMAIL_CHUNK_MIN", 10);
export const GMAIL_CHUNK_MAX = intFromEnv("SYNC_GMAIL_CHUNK_MAX", 100);
export const GMAIL_CHUNK_DEFAULT = intFromEnv("SYNC_GMAIL_CHUNK", 50); // Increased from 25
export const CALENDAR_CHUNK = intFromEnv("SYNC_CALENDAR_CHUNK", 25);

// Parallel processing controls
export const GMAIL_MAX_CONCURRENT = intFromEnv("GMAIL_MAX_CONCURRENT", 5);
export const GMAIL_BATCH_PARALLEL = intFromEnv("GMAIL_BATCH_PARALLEL", 3);

// Timing and backpressure
export const SYNC_SLEEP_MS_MIN = intFromEnv("SYNC_SLEEP_MS_MIN", 50);
export const SYNC_SLEEP_MS_MAX = intFromEnv("SYNC_SLEEP_MS_MAX", 1000);
export const SYNC_SLEEP_MS = intFromEnv("SYNC_SLEEP_MS", 200);
export const API_TIMEOUT_MS = intFromEnv("API_TIMEOUT_MS", 10_000); // 10s per API call
export const RETRIES = intFromEnv("API_RETRIES", 3);

// Caching configuration
export const GMAIL_CACHE_TTL_MS = intFromEnv("GMAIL_CACHE_TTL_MS", 5 * 60 * 1000); // 5 minutes
export const GMAIL_PREVIEW_CACHE_TTL_MS = intFromEnv("GMAIL_PREVIEW_CACHE_TTL_MS", 15 * 60 * 1000); // 15 minutes
export const GMAIL_METADATA_CACHE_TTL_MS = intFromEnv("GMAIL_METADATA_CACHE_TTL_MS", 60 * 60 * 1000); // 1 hour

// Performance monitoring
export const PERF_METRICS_ENABLED = process.env["PERF_METRICS_ENABLED"] !== "false";
export const PERF_DETAILED_LOGGING = process.env["PERF_DETAILED_LOGGING"] === "true";

// Rate limiting and adaptive behavior
export const RATE_LIMIT_BACKOFF_MULTIPLIER = 2;
export const RATE_LIMIT_MAX_DELAY_MS = 10_000;
export const ADAPTIVE_BATCH_SIZE_ENABLED = process.env["ADAPTIVE_BATCH_SIZE_ENABLED"] !== "false";
