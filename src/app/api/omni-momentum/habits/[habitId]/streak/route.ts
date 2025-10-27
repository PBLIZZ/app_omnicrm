/**
 * Habit Streak API Route
 * GET /api/omni-momentum/habits/[habitId]/streak - Get streak information
 */

import { handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";
import { getHabitStreakService } from "@/server/services/habits.service";
import { HabitStreakResponseSchema } from "@/server/db/business-schemas/productivity";

export async function GET(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await context.params;

  return handleGetWithQueryAuth(
    z.object({}),
    HabitStreakResponseSchema,
    async (_query, userId) => {
      const streak = await getHabitStreakService(userId, habitId);
      return { streak };
    },
  )(request);
}
