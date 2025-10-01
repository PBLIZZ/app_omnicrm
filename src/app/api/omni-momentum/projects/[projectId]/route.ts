import { handleAuth } from "@/lib/api";
import { productivityService } from "@/server/services/productivity.service";
import { UpdateProjectSchema, ProjectSchema } from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";
import { isErr } from "@/lib/utils/result";

/**
 * Individual Project Management API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for all operations
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

// Success response schema
const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * GET /api/omni-momentum/projects/[projectId] - Get project by ID
 */
export async function GET(request: NextRequest, context: RouteParams) {
  // Use an empty schema for GET since we only need the URL parameter
  const handler = handleAuth(z.object({}), ProjectSchema, async (_, userId) => {
    const params = await context.params;
    const result = await productivityService.getProject(params.projectId, userId);

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      throw new Error("Project not found");
    }

    return result.data;
  });

  return handler(request);
}

/**
 * PUT /api/omni-momentum/projects/[projectId] - Update project
 */
export async function PUT(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(UpdateProjectSchema, ProjectSchema, async (data, userId) => {
    const params = await context.params;
    const result = await productivityService.updateProject(params.projectId, userId, data);

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      throw new Error("Project not found");
    }

    return result.data;
  });

  return handler(request);
}

/**
 * DELETE /api/omni-momentum/projects/[projectId] - Delete project
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  const handler = handleAuth(z.object({}), SuccessResponseSchema, async (_, userId) => {
    const params = await context.params;
    const result = await productivityService.deleteProject(params.projectId, userId);

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    return { success: true };
  });

  return handler(request);
}
