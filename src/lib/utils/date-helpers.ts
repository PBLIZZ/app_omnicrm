/**
 * Date handling utilities for PostgreSQL timestamptz conversion
 *
 * Handles conversion between JavaScript Date objects and PostgreSQL
 * timestamptz strings for consistent date handling across the application.
 */

import { z } from "zod";
import { Result, ok, err } from "./result";

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
export function timestamptzToDate(timestamp: string): Result<Date, string> {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return err(`Invalid timestamp: ${timestamp}`);
    }
    return ok(date);
  } catch {
    return err(`Failed to parse timestamp: ${timestamp}`);
  }
}

/**
 * Safe date parsing from unknown input
 */
export function parseDate(input: unknown): Result<Date, string> {
  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      return err("Invalid Date object");
    }
    return ok(input);
  }

  if (typeof input === "string") {
    return timestamptzToDate(input);
  }

  if (typeof input === "number") {
    try {
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        return err(`Invalid timestamp number: ${input}`);
      }
      return ok(date);
    } catch {
      return err(`Failed to parse timestamp number: ${input}`);
    }
  }

  return err(`Cannot convert ${typeof input} to Date`);
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

  const result = timestamptzToDate(value);
  return result.success ? result.data : null;
}

/**
 * Prepare date for database insertion
 */
export function prepareDateForDb(date: Date | string | null | undefined): string | null {
  if (date === null || date === undefined) {
    return null;
  }

  if (typeof date === "string") {
    const parsed = timestamptzToDate(date);
    if (!parsed.success) {
      return null;
    }
    return dateToTimestamptz(parsed.data);
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
    const result = timestamptzToDate(val);
    return result.success;
  },
  {
    message: "Invalid date format",
  },
);

/**
 * Zod transformer for date strings to Date objects
 */
export const DateTransformSchema = DateStringSchema.transform((val) => {
  const result = timestamptzToDate(val);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
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
  const result = timestamptzToDate(timestamp);
  return result.success;
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
    const parsed = timestamptzToDate(date);
    if (!parsed.success) {
      return "Invalid Date";
    }
    dateObj = parsed.data;
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

export function validateDateRange(start: unknown, end: unknown): Result<DateRange, string> {
  const startResult = parseDate(start);
  const endResult = parseDate(end);

  if (!startResult.success) {
    return err(`Invalid start date: ${startResult.error}`);
  }

  if (!endResult.success) {
    return err(`Invalid end date: ${endResult.error}`);
  }

  if (startResult.data >= endResult.data) {
    return err("Start date must be before end date");
  }

  return ok({
    start: startResult.data,
    end: endResult.data,
  });
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
