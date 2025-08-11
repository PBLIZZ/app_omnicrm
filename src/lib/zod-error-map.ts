import { z } from "zod";

// Centralized Zod error map to produce concise, consistent messages
// This is applied globally when this module is imported.
z.setErrorMap((issue, ctx) => {
  const fallback = ctx.defaultError;
  const message = issue.message ?? fallback;
  return { message };
});

export {}; // side-effect module
