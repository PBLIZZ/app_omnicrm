import { z } from "zod";

// Centralized Zod error map to produce concise, consistent messages
// This is applied globally when this module is imported.
const errorMap: z.ZodErrorMap = (issue, _ctx) => {
  const message = issue.message ?? "Invalid input";
  return { message };
};

z.setErrorMap(errorMap);

export {}; // side-effect module
