/**
 * Habit Completions API Route (All Habits)
 * GET /api/omni-momentum/habits/completions - List completions across all habits
 */

import { handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";
import { getHabitCompletionsService } from "@/server/services/habits.service";
import { HabitCompletionsResponseSchema } from "@/server/db/business-schemas/productivity";

const GetCompletionsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(365).optional(),
});

export const GET = handleGetWithQueryAuth(
  GetCompletionsQuerySchema,
  HabitCompletionsResponseSchema,
  async (query, userId) => {
    const completions = await getHabitCompletionsService(userId, query);
    return {
      items: completions,
      total: completions.length,
    };
  },
);
