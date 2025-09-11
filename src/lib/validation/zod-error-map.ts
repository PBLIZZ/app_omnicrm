import { z } from "zod";

// Centralized Zod error map to produce concise, consistent messages
// This is applied globally when this module is imported.
const errorMap: z.ZodErrorMap = (issue, ctx) => {
  const message = issue.message ?? "Invalid input";
  // ctx is provided by Zod but not currently used for error customization
  console.warn("Zod validation error:", { issue, ctx });
  return { message };
};

z.setErrorMap(errorMap);

export {}; // side-effect module
