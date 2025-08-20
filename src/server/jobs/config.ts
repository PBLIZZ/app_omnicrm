// Centralized sync configuration with sane defaults and env overrides

const intFromEnv = (key: string, def: number): number => {
  const raw = process.env[key];
  if (!raw) return def;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : def;
};

export const SYNC_MAX_PER_RUN = intFromEnv("SYNC_MAX_PER_RUN", 2000);
export const GMAIL_CHUNK = intFromEnv("SYNC_GMAIL_CHUNK", 25);
export const CALENDAR_CHUNK = intFromEnv("SYNC_CALENDAR_CHUNK", 25);
export const SYNC_SLEEP_MS = intFromEnv("SYNC_SLEEP_MS", 200);
export const JOB_HARD_CAP_MS = intFromEnv("JOB_HARD_CAP_MS", 3 * 60 * 1000); // 3 minutes
export const API_TIMEOUT_MS = intFromEnv("API_TIMEOUT_MS", 10_000); // 10s per API call
export const RETRIES = intFromEnv("API_RETRIES", 3);
