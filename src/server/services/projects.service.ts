/**
 * Projects Service Layer
 *
 * Business logic and orchestration for project operations.
 * - Uses factory pattern for repository access
 * - Handles business logic and data transformation
 * - Throws AppError on failures
 */

import { createProductivityRepository } from "@repo";
import type { Project } from "@/server/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import { sanitizeJsonb } from "@/lib/validation/jsonb";

// ============================================================================
// PROJECT CRUD OPERATIONS
// ============================================================================

/**
 * Create a new project
 */
export async function createProjectService(
  userId: string,
  data: {
    name: string;
    zoneId?: number | null | undefined;
    dueDate?: Date | null | undefined;
    details?: unknown;
    status?: string | undefined;
  },
): Promise<Project> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Business logic: normalize the details field
    const normalizedDetails = data.details && typeof data.details === "object" ? data.details : {};

    // Create project with normalized data
    const project = await repo.createProject(userId, {
      name: data.name,
      zoneId: data.zoneId ?? null,
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      details: normalizedDetails,
      status: (data.status ?? "active") as "active" | "on_hold" | "completed" | "archived",
    });

    return project;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create project",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get a single project by ID
 */
export async function getProjectService(
  userId: string,
  projectId: string,
): Promise<Project | null> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    return await repo.getProject(projectId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get project",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * List projects with optional filters
 */
export async function listProjectsService(
  userId: string,
  filters?: {
    zoneId?: number | undefined;
    status?: string[] | undefined;
  },
): Promise<Project[]> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    return await repo.getProjects(userId, filters);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list projects",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Update an existing project
 */
export async function updateProjectService(
  projectId: string,
  userId: string,
  data: {
    name?: string | undefined;
    zoneId?: number | null | undefined;
    dueDate?: Date | null | undefined;
    details?: unknown;
    status?: string | undefined;
  },
): Promise<Project | null> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    // Business logic: normalize the details field if provided
    const updateData: Record<string, unknown> = {};

    if (data["name"] !== undefined) updateData["name"] = data["name"];
    if (data["zoneId"] !== undefined) updateData["zoneId"] = data["zoneId"];
    if (data["dueDate"] !== undefined) updateData["dueDate"] = data["dueDate"];
    if (data["status"] !== undefined) updateData["status"] = data["status"];

    if (data["details"] !== undefined) {
      updateData["details"] = sanitizeJsonb(data["details"]);
    }

    await repo.updateProject(projectId, userId, updateData);

    // Return updated project
    return await repo.getProject(projectId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update project",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Delete a project
 */
export async function deleteProjectService(userId: string, projectId: string): Promise<void> {
  const db = await getDb();
  const repo = createProductivityRepository(db);

  try {
    await repo.deleteProject(projectId, userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete project",
      "DB_ERROR",
      "database",
      false,
    );
  }
}
