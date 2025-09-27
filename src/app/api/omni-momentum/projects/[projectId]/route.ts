import { handleAuth } from "@/lib/api";
import { momentumService } from "@/server/services/momentum.service";
import { UpdateProjectSchema, ProjectSchema } from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";

/**
 * Individual Project Management API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for all operations
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: {
    projectId: string;
  };
}

// Success response schema
const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * GET /api/omni-momentum/projects/[projectId] - Get project by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  // Use an empty schema for GET since we only need the URL parameter
  const handler = handleAuth(
    z.object({}),
    ProjectSchema,
    async (_, userId) => {
      const project = await momentumService.getProject(params.projectId, userId);

      if (!project) {
        throw new Error("Project not found");
      }

      return project;
    }
  );

  return handler(request);
}

/**
 * PUT /api/omni-momentum/projects/[projectId] - Update project
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const handler = handleAuth(
    UpdateProjectSchema,
    ProjectSchema,
    async (data, userId) => {
      const project = await momentumService.updateProject(params.projectId, userId, data);

      if (!project) {
        throw new Error("Project not found");
      }

      return project;
    }
  );

  return handler(request);
}

/**
 * DELETE /api/omni-momentum/projects/[projectId] - Delete project
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const handler = handleAuth(
    z.object({}),
    SuccessResponseSchema,
    async (_, userId) => {
      await momentumService.deleteProject(params.projectId, userId);
      return { success: true };
    }
  );

  return handler(request);
}
