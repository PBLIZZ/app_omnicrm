/**
 * Environment variable parsing utilities
 * Provides consistent parsing of boolean environment variables
 */

/**
 * Parse a boolean environment variable with consistent behavior
 * @param value - The environment variable value
 * @param defaultValue - Default value if value is undefined or invalid
 * @returns Parsed boolean value
 */
// Pre-computed sets for O(1) lookup performance
const TRUTHY_VALUES = new Set(["1", "true", "t", "yes", "y"]);
const FALSY_VALUES = new Set(["0", "false", "f", "no", "n", ""]);

export function parseEnvBool(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  // Truthy values
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }

  // Falsy values
  if (FALSY_VALUES.has(normalized)) {
    return false;
  }

  // Invalid values fall back to default
  return defaultValue;
}
