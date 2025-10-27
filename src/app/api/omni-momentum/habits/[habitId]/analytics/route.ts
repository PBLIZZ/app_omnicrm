/**
 * Habit Analytics API Route
 * GET /api/omni-momentum/habits/[habitId]/analytics - Get full analytics for habit
 */

import { handleGetWithQueryAuth } from "@/lib/api";
import { getHabitAnalyticsService } from "@/server/services/habits.service";
import {
  HabitAnalyticsQuerySchema,
  HabitAnalyticsResponseSchema,
} from "@/server/db/business-schemas/productivity";

export async function GET(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await context.params;

  return handleGetWithQueryAuth(
    HabitAnalyticsQuerySchema,
    HabitAnalyticsResponseSchema,
    async (query, userId) => {
      const analytics = await getHabitAnalyticsService(
        userId,
        habitId,
        query.days,
      );
      return { analytics };
    },
  )(request);
}
