// Time-related constants used across the application

export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const DEFAULT_DAYS_SINCE_LAST_EVENT = 999;

// Additional time constants that might be useful
export const MS_PER_HOUR = 1000 * 60 * 60;
export const MS_PER_MINUTE = 1000 * 60;
export const MS_PER_SECOND = 1000;

// Common time periods in milliseconds
export const TIME_PERIODS = {
  SECOND: MS_PER_SECOND,
  MINUTE: MS_PER_MINUTE,
  HOUR: MS_PER_HOUR,
  DAY: MS_PER_DAY,
  WEEK: MS_PER_DAY * 7,
  MONTH: MS_PER_DAY * 30, // Approximate
  YEAR: MS_PER_DAY * 365, // Approximate
} as const;
