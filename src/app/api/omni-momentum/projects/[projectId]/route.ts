import { handleAuth } from "@/lib/api";
import { productivityService } from "@/server/services/productivity.service";
import { 
  UpdateProjectSchema, 
  ProjectSchema,
  type UpdateProject,
  type Project as ProjectType 
} from "@/server/db/business-schemas";
import { z } from "zod";
import { isErr } from "@/lib/utils/result";
import { ApiError } from "@/lib/api/errors";

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

type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

/**
 * GET /api/omni-momentum/projects/[projectId] - Get project by ID
 */
export async function GET(request: Request, context: RouteParams): Promise<Response> {
  // Use an empty schema for GET since we only need the URL parameter
  const handler = handleAuth(z.object({}), ProjectSchema, async (_, userId): Promise<ProjectType> => {
    const params = await context.params;
    const result = await productivityService.getProject(params.projectId, userId);

    if (isErr(result)) {
      const errorMessage = typeof result.error === 'object' && result.error !== null && 'message' in result.error 
        ? String(result.error.message) 
        : 'Failed to get project';
      throw new ApiError(errorMessage, 500);
    }

    if (!result.data) {
      throw new ApiError("Project not found", 404);
    }

    return result.data;
  });

  return handler(request);
}

/**
 * PUT /api/omni-momentum/projects/[projectId] - Update project
 */
export async function PUT(request: Request, context: RouteParams): Promise<Response> {
  const handler = handleAuth(UpdateProjectSchema, ProjectSchema, async (data: UpdateProject, userId): Promise<ProjectType> => {
    const params = await context.params;
    const result = await productivityService.updateProject(params.projectId, userId, data);

    if (isErr(result)) {
      const errorMessage = typeof result.error === 'object' && result.error !== null && 'message' in result.error 
        ? String(result.error.message) 
        : 'Failed to update project';
      throw new ApiError(errorMessage, 500);
    }

    if (!result.data) {
      throw new ApiError("Project not found", 404);
    }

    return result.data;
  });

  return handler(request);
}

/**
 * DELETE /api/omni-momentum/projects/[projectId] - Delete project
 */
export async function DELETE(request: Request, context: RouteParams): Promise<Response> {
  const handler = handleAuth(z.object({}), SuccessResponseSchema, async (_, userId): Promise<SuccessResponse> => {
    const params = await context.params;
    const result = await productivityService.deleteProject(params.projectId, userId);

    if (isErr(result)) {
      const errorMessage = typeof result.error === 'object' && result.error !== null && 'message' in result.error 
        ? String(result.error.message) 
        : 'Failed to delete project';
      throw new ApiError(errorMessage, 500);
    }

    return { success: true };
  });

  return handler(request);
}
