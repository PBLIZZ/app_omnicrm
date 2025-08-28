// Zod error map for better error messages
import { z } from "zod";

z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === "string") {
      return { message: "Expected string, received " + issue.received };
    }
  }
  if (issue.code === z.ZodIssueCode.custom) {
    return { message: `${issue.message}` };
  }
  return { message: ctx.defaultError };
});