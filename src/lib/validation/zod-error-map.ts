// src/lib/validation/zod-error-map.ts
import { z } from "zod";

// Zod 4 custom error configuration using the new z.config() API
z.config({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customError: (issue: any) => {
    // Customize error messages based on issue type and context
    switch (issue.code) {
      case "invalid_type":
        if (issue.input === undefined) {
          return "This field is required";
        }
        if (issue.expected === "string") {
          return "Please enter a valid text value";
        }
        if (issue.expected === "number") {
          return "Please enter a valid number";
        }
        if (issue.expected === "boolean") {
          return "Please select a valid option";
        }
        return `Expected ${issue.expected}, but received ${issue['received'] || 'unknown'}`;
      
      case "too_small":
        if (issue['type'] === "string") {
          return `Text must be at least ${issue.minimum} characters long`;
        }
        if (issue['type'] === "number") {
          return `Value must be at least ${issue.minimum}`;
        }
        if (issue['type'] === "array") {
          return `Please select at least ${issue.minimum} item${issue.minimum === 1 ? '' : 's'}`;
        }
        return `Value is too small`;
      
      case "too_big":
        if (issue['type'] === "string") {
          return `Text must be no more than ${issue.maximum} characters long`;
        }
        if (issue['type'] === "number") {
          return `Value must be no more than ${issue.maximum}`;
        }
        if (issue['type'] === "array") {
          return `Please select no more than ${issue.maximum} item${issue.maximum === 1 ? '' : 's'}`;
        }
        return `Value is too large`;
      
      case "invalid_value":
        // In Zod 4, email/url validation uses invalid_value instead of invalid_string
        if (issue['validation'] === "email") {
          return "Please enter a valid email address";
        }
        if (issue['validation'] === "url") {
          return "Please enter a valid URL";
        }
        if (issue['validation'] === "uuid") {
          return "Please enter a valid UUID";
        }
        return "Invalid format";
      
      case "custom":
        // Handle custom validation errors
        return issue.message || "Validation failed";
      
      default:
        // Return undefined to use default error message for other cases
        return undefined;
    }
  },
});

export {};
