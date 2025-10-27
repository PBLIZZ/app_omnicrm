/**
 * Habit Completions API Route
 * GET /api/omni-momentum/habits/[habitId]/completions - List completions
 * POST /api/omni-momentum/habits/[habitId]/completions - Create completion
 */

import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";
import {
  getHabitCompletionsService,
  createHabitCompletionService,
} from "@/server/services/habits.service";
import {
  HabitCompletionSchema,
  CreateHabitCompletionSchema,
  HabitCompletionsResponseSchema,
} from "@/server/db/business-schemas/productivity";

const GetCompletionsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(365).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await context.params;

  return handleGetWithQueryAuth(
    GetCompletionsQuerySchema,
    HabitCompletionsResponseSchema,
    async (query, userId) => {
      const completions = await getHabitCompletionsService(userId, {
        habitId,
        ...query,
      });
      return {
        items: completions,
        total: completions.length,
      };
    },
  )(request);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await context.params;

  return handleAuth(
    CreateHabitCompletionSchema.omit({ habitId: true }),
    HabitCompletionSchema,
    async (data, userId) => {
      return await createHabitCompletionService(userId, {
        ...data,
        habitId,
      });
    },
  )(request);
}
