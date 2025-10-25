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
 * Parse a PostgreSQL timestamptz timestamp string.
 *
 * @param timestamp - The timestamptz string to parse (expected ISO 8601 / PostgreSQL timestamptz format).
 * @returns A `Date` representing the same instant as `timestamp`.
 * @throws Error if `timestamp` cannot be parsed into a valid date.
 */
export function timestamptzToDate(timestamp: string): Date {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
  return date;
}

/**
 * Parse an unknown value into a validated `Date` object.
 *
 * @param value - A `Date`, date string, or numeric timestamp to parse; other types are unsupported.
 * @returns The parsed `Date`.
 * @throws Error if `value` is `null`/`undefined`, cannot be parsed as a valid date, or is an unsupported type.
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

/**
 * Parses various input values into a Date and returns null for invalid or unsupported inputs.
 *
 * @param value - A Date instance, date string, numeric timestamp, null, or undefined to be parsed.
 * @returns A `Date` when `value` represents a valid date, `null` otherwise.
 */
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
 * Normalize a database date value into a valid Date object or `null`.
 *
 * @param value - A value from the database: a `Date`, a date/time string, a numeric timestamp, or `null`/`undefined`.
 * @returns A `Date` representing the same instant when the input is parseable and valid, or `null` when the input is `null`/`undefined` or cannot be converted to a valid `Date`.
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
 * Convert a Date or date string into a PostgreSQL timestamptz-formatted string suitable for database insertion.
 *
 * @param date - A Date object, a date string, or null/undefined. Strings will be parsed; invalid or unsupported inputs produce `null`.
 * @returns A timestamptz-formatted ISO timestamp string, or `null` if the input is null/undefined or cannot be parsed as a valid date.
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
 * Determine whether a string represents a valid PostgreSQL timestamptz.
 *
 * @param timestamp - The timestamptz string to validate
 * @returns `true` if `timestamp` can be parsed into a valid Date, `false` otherwise
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
 * Formats a date value for display, returning human-readable text or a safe placeholder.
 *
 * Accepts a Date, an ISO/parsable date string, or null/undefined. Returns "—" for null/undefined,
 * "Invalid Date" for unparseable or invalid inputs, or the locale-formatted date string otherwise.
 *
 * @param date - The date to format; may be a Date instance, a date string, or null/undefined
 * @param options - Intl.DateTimeFormatOptions passed to toLocaleDateString for formatting
 * @returns The formatted date string, "—" for null/undefined, or "Invalid Date" for invalid inputs
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
 * Validate and return a date range with parsed start and end dates.
 *
 * @param start - Value that can be parsed into the range start date
 * @param end - Value that can be parsed into the range end date
 * @returns The validated DateRange with `start` and `end` as Date objects
 * @throws Error if `start` is not before `end`
 * @throws Error if `start` or `end` cannot be parsed into a valid Date
 */

export function validateDateRange(
  start: unknown,
  end: unknown,
): {
  success: boolean;
  error?: string;
  data?: { start: Date; end: Date };
} {
  try {
    const startDate = parseDate(start);
    const endDate = parseDate(end);

    if (startDate >= endDate) {
      return { success: false, error: "Start date must be before end date" };
    }

    return {
      success: true,
      data: {
        start: startDate,
        end: endDate,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid date range",
    };
  }
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

/**
 * Gets the ordinal suffix for a number (st, nd, rd, th)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Formats a date with ordinal suffix and returns parts for rendering
 * Example: "31st Dec 25" or "1st Jan 26"
 * Returns object with day, suffix, month, year for flexible rendering
 */
export function formatDateWithOrdinal(date: Date): {
  day: number;
  suffix: string;
  month: string;
  year: string;
  formatted: string;
} {
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.toLocaleDateString("en-US", { year: "2-digit" });

  return {
    day,
    suffix,
    month,
    year,
    formatted: `${day}${suffix} ${month} ${year}`,
  };
}

/**
 * Formats a date with ordinal suffix as plain text
 * Example: "31st Dec 25" or "1st Jan 26"
 */
export function formatOrdinal(date: Date): string {
  return formatDateWithOrdinal(date).formatted;
}
