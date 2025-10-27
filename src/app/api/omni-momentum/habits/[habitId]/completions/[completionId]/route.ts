/**
 * Habit Completion Detail API Route
 * DELETE /api/omni-momentum/habits/[habitId]/completions/[completionId] - Delete completion
 */

import { handleAuth } from "@/lib/api";
import { z } from "zod";
import { deleteHabitCompletionService } from "@/server/services/habits.service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ habitId: string; completionId: string }> }
) {
  const { completionId } = await context.params;

  return handleAuth(
    z.object({}),
    z.object({ success: z.literal(true) }),
    async (_data, userId) => {
      await deleteHabitCompletionService(userId, completionId);
      return { success: true as const };
    },
  )(request);
}
