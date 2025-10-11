import { handleGetWithQueryAuth } from "@/lib/api";
import { getProjectTasksService } from "@/server/services/productivity.service";
import { TaskFiltersSchema, TaskSchema } from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * Project Tasks API Route
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET with query params
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * GET /api/omni-momentum/projects/[projectId]/tasks - Get tasks within project
 */
export async function GET(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleGetWithQueryAuth(
    TaskFiltersSchema,
    z.array(TaskSchema),
    async (filters, userId): Promise<z.infer<typeof TaskSchema>[]> => {
      return await getProjectTasksService(params.projectId, userId, filters);
    },
  )(request);
}
