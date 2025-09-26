import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { momentumService } from "@/server/services/momentum.service";
import { CreateProjectDTOSchema, ProjectFiltersSchema } from "@omnicrm/contracts";

/**
 * API Routes for Momentum Projects (Pathways)
 *
 * Following Technical Debt Elimination guidelines:
 * ✅ NextResponse pattern (Phase 17 - no ApiResponse helper)
 * ✅ Repository pattern with proper error handling
 * ✅ DTO validation with Zod schemas
 * ✅ Explicit return types for TypeScript compliance
 */

/**
 * GET /api/omni-momentum/projects - List projects for user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    // Parse query parameters for filters
    const filters = {
      search: searchParams.get("search") || undefined,
      status: searchParams.getAll("status").filter(Boolean),
      zoneId: searchParams.get("zoneId") ? parseInt(searchParams.get("zoneId") || "0") : undefined,
      dueAfter: searchParams.get("dueAfter") ? new Date(searchParams.get("dueAfter") || "") : undefined,
      dueBefore: searchParams.get("dueBefore")
        ? new Date(searchParams.get("dueBefore") || "")
        : undefined,
    };

    // Validate filters
    const validatedFilters = ProjectFiltersSchema.parse(filters);

    const projects = await momentumService.getProjects(userId, validatedFilters);

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json({ error: "Failed to retrieve projects" }, { status: 500 });
  }
}

/**
 * POST /api/omni-momentum/projects - Create new project
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();

    // ✅ Runtime validation with Zod schema
    const validatedData = CreateProjectDTOSchema.parse(body);

    const project = await momentumService.createProject(userId, validatedData);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);

    // Handle validation errors specifically
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid project data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
