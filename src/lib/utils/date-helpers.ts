/**
 * Date handling utilities for PostgreSQL timestamptz conversion
 *
 * Handles conversion between JavaScript Date objects and PostgreSQL
 * timestamptz strings for consistent date handling across the application.
 */

import { z } from "zod";

/**
 * Date range type
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Convert Date to PostgreSQL timestamptz string
 */
export function dateToTimestamptz(date: Date): string {
  return date.toISOString();
}

/**
 * Convert PostgreSQL timestamptz string to Date
 */
export function timestamptzToDate(timestamp: string): Date {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
  return date;
}

/**
 * Safe date parsing from unknown input
 */
export function parseDate(value: unknown): Date {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new Error("Invalid Date object");
    }
    return value;
  }

  if (value === null || value === undefined) {
    throw new Error("Invalid date: null or undefined");
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${value}`);
    }
    return date;
  }

  throw new Error(`Invalid date: unsupported type ${typeof value}`);
}

export function parseDateSafe(value: unknown): Date | null {
  try {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    // Return null for boolean, object, symbol, function, bigint types
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert database date fields to proper Date objects
 */
export function normalizeDatabaseDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  return parseDateSafe(value);
}

/**
 * Prepare date for database insertion
 */
export function prepareDateForDb(date: Date | string | null | undefined): string | null {
  if (date === null || date === undefined) {
    return null;
  }

  if (typeof date === "string") {
    const parsed = parseDateSafe(date);
    if (!parsed) {
      return null;
    }
    return dateToTimestamptz(parsed);
  }

  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : dateToTimestamptz(date);
  }

  return null;
}

/**
 * Zod schema for date validation
 */
export const DateStringSchema = z.string().refine(
  (val) => {
    try {
      parseDate(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    message: "Invalid date format",
  },
);

/**
 * Zod transformer for date strings to Date objects
 */
export const DateTransformSchema = DateStringSchema.transform((val) => {
  return parseDate(val);
});

/**
 * Zod schema for optional date strings
 */
export const OptionalDateStringSchema = z.union([DateStringSchema, z.null()]).optional();

/**
 * Current timestamp as timestamptz string
 */
export function nowAsTimestamptz(): string {
  return dateToTimestamptz(new Date());
}

/**
 * Check if a value is a valid date
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if a string is a valid timestamptz
 */
export function isValidTimestamptz(timestamp: string): boolean {
  try {
    parseDate(timestamp);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format date for display (safe version)
 */
export function formatDateSafe(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (date === null || date === undefined) {
    return "—";
  }

  let dateObj: Date;

  if (typeof date === "string") {
    const parsed = parseDateSafe(date);
    if (!parsed) {
      return "Invalid Date";
    }
    dateObj = parsed;
  } else if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    dateObj = date;
  } else {
    return "Invalid Date";
  }

  try {
    return dateObj.toLocaleDateString(undefined, options);
  } catch {
    // Catch invalid options or environment issues (e.g., missing locale data)
    return "Invalid Date";
  }
}

/**
 * Format timestamp for display with time
 */
export function formatTimestampSafe(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  return formatDateSafe(date, options);
}

/**
 * Date range validation
 */

export function validateDateRange(start: unknown, end: unknown): DateRange {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (startDate >= endDate) {
    throw new Error("Start date must be before end date");
  }

  return {
    start: startDate,
    end: endDate,
  };
}

/**
 * Helper to add/subtract time periods safely
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}
