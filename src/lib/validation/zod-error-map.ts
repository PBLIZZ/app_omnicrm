// src/lib/validation/zod-error-map.ts
import { z } from "zod";

export const zodErrorMap = (issue: unknown): string => {
  if (typeof issue !== "object" || !issue) {
    return "Invalid value";
  }

  const issueObj = issue as Record<string, unknown>;

  if (typeof issueObj["message"] === "string" && issueObj["message"].length > 0) {
    return issueObj["message"];
  }

  // Default fallback message
  return "Invalid value";
};

// Apply the error map globally
z.setErrorMap(zodErrorMap);

export {};
