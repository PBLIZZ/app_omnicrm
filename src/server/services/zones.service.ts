/**
 * Zones Service Layer
 *
 * Business logic and orchestration for zones.
 * - Uses factory pattern for repository access
 * - Handles business logic and data transformation
 * - Throws AppError on failures
 * - Zones are global (no userId needed)
 */

import { createZonesRepository } from "@repo";
import type { Zone, CreateZone } from "@/server/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";

// ============================================================================
// ZONE CRUD OPERATIONS
// ============================================================================

/**
 * List all zones
 */
export async function listZonesService(): Promise<Zone[]> {
  const db = await getDb();
  const repo = createZonesRepository(db);

  try {
    return await repo.listZones();
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list zones",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get a single zone by ID
 */
export async function getZoneByIdService(zoneId: number): Promise<Zone | null> {
  const db = await getDb();
  const repo = createZonesRepository(db);

  try {
    return await repo.getZoneById(zoneId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get zone by ID",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get a single zone by name
 */
export async function getZoneByNameService(name: string): Promise<Zone | null> {
  const db = await getDb();
  const repo = createZonesRepository(db);

  try {
    return await repo.getZoneByName(name);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get zone by name",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Create a new zone (admin function)
 */
export async function createZoneService(data: CreateZone): Promise<Zone> {
  const db = await getDb();
  const repo = createZonesRepository(db);

  try {
    return await repo.createZone(data);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create zone",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Update an existing zone (admin function)
 */
export async function updateZoneService(
  zoneId: number,
  data: Partial<CreateZone>,
): Promise<Zone | null> {
  const db = await getDb();
  const repo = createZonesRepository(db);

  try {
    return await repo.updateZone(zoneId, data);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update zone",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Delete a zone (admin function)
 */
export async function deleteZoneService(zoneId: number): Promise<void> {
  const db = await getDb();
  const repo = createZonesRepository(db);

  try {
    const deleted = await repo.deleteZone(zoneId);
    if (!deleted) {
      throw new AppError("Zone not found", "ZONE_NOT_FOUND", "validation", false);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete zone",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// SPECIALIZED OPERATIONS
// ============================================================================

/**
 * Get zones with usage statistics
 */
export async function getZonesWithStatsService(): Promise<
  Array<
    Zone & {
      projectCount: number;
      taskCount: number;
      activeTaskCount: number;
    }
  >
> {
  const db = await getDb();
  const repo = createZonesRepository(db);

  try {
    return await repo.getZonesWithStats();
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get zones with stats",
      "DB_ERROR",
      "database",
      false,
    );
  }
}
