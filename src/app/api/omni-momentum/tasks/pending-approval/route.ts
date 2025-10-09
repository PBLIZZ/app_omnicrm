import { handleGetWithQueryAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { productivityService } from "@/server/services/productivity.service";
import { z } from "zod";

/**
 * Pending Approval Tasks API Route
 *
 * GET /api/omni-momentum/tasks/pending-approval
 * Returns tasks that are AI-generated and awaiting user approval
 * This supports the AI workflow where the system suggests tasks
 * but users must approve them before they become active
 */

const PendingTasksResponseSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      status: z.string(),
      createdAt: z.string(),
      aiGenerated: z.boolean().optional(),
    }),
  ),
  total: z.number(),
});

export const GET = handleGetWithQueryAuth(
  z.object({}), // No query parameters needed
  PendingTasksResponseSchema,
  async (_query, userId): Promise<z.infer<typeof PendingTasksResponseSchema>> => {
    const result = await productivityService.getPendingApprovalTasks(userId);

    if (!result.success) {
      throw ApiError.internalServerError(result.error.message, result.error.details);
    }

    return PendingTasksResponseSchema.parse(result.data);
  },
);
