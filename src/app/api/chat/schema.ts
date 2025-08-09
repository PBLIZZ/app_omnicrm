import { z } from "zod";

export const chatRequestSchema = z.object({
  prompt: z.string().min(1, "prompt must not be empty").max(4000, "prompt too long"),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
