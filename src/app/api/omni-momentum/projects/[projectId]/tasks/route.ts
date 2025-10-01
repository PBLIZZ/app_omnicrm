import { handleGetWithQueryAuth } from "@/lib/api";
import { productivityService } from "@/server/services/productivity.service";
import { TaskFiltersSchema, TaskSchema } from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";
import { isErr } from "@/lib/utils/result";

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
    async (filters, userId): Promise<z.infer<typeof TaskSchema>[]> => {
      const result = await productivityService.getProjectTasks(params.projectId, userId, filters);
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  );

  return handler(request);
}
