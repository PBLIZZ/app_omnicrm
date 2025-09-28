/**
 * String manipulation utilities
 * 
 * Pure functions for string operations across client and server
 */

/**
 * Get initials from display name
 * 
 * @param displayName - Full name or display name
 * @returns First two initials, uppercased
 * 
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Mary Jane Watson") // "MJ" 
 * getInitials("Madonna") // "M"
 */
export function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}
