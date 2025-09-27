import { handleGetWithQueryAuth } from "@/lib/api";
import { momentumService } from "@/server/services/momentum.service";
import { TaskFiltersSchema, TaskSchema } from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";

/**
 * Project Tasks API Route
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET with query params
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: {
    projectId: string;
  };
}

/**
 * GET /api/omni-momentum/projects/[projectId]/tasks - Get tasks within project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Create a handler that passes the projectId to the service
  const handler = handleGetWithQueryAuth(
    TaskFiltersSchema,
    z.array(TaskSchema),
    async (filters, userId) => {
      return await momentumService.getProjectTasks(params.projectId, userId, filters);
    },
  );

  return handler(request);
}
