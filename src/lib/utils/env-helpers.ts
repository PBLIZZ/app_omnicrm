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
export function parseEnvBool(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  // Truthy values
  if (["1", "true", "t", "yes", "y"].includes(normalized)) {
    return true;
  }

  // Falsy values
  if (["0", "false", "f", "no", "n", ""].includes(normalized)) {
    return false;
  }

  // Invalid values fall back to default
  return defaultValue;
}
