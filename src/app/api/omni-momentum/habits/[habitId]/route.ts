/**
 * Habit Detail API Route
 * GET /api/omni-momentum/habits/[habitId] - Get single habit
 * PUT /api/omni-momentum/habits/[habitId] - Update habit
 * DELETE /api/omni-momentum/habits/[habitId] - Delete habit
 */

import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";
import {
  getHabitService,
  updateHabitService,
  deleteHabitService,
} from "@/server/services/habits.service";
import {
  HabitSchema,
  UpdateHabitSchema,
} from "@/server/db/business-schemas/productivity";

export async function GET(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await context.params;

  return handleGetWithQueryAuth(
    z.object({}),
    HabitSchema,
    async (_query, userId) => {
      return await getHabitService(userId, habitId);
    },
  )(request);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await context.params;

  return handleAuth(
    UpdateHabitSchema,
    HabitSchema,
    async (data, userId) => {
      return await updateHabitService(userId, habitId, data);
    },
  )(request);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { habitId } = await context.params;

  return handleAuth(
    z.object({}),
    z.object({ success: z.literal(true) }),
    async (_data, userId) => {
      await deleteHabitService(userId, habitId);
      return { success: true as const };
    },
  )(request);
}
