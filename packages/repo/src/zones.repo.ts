import { eq, asc } from "drizzle-orm";
import { zones } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import type { Zone, CreateZone } from "@/server/db/schema";
import { ok, err, DbResult } from "@/lib/utils/result";

// Local type aliases for repository layer
type ZoneDTO = Zone;
type CreateZoneDTO = CreateZone;
type UpdateZoneDTO = Partial<CreateZone>;

type ZoneWithStatsDTO = Zone & {
  projectCount: number;
  taskCount: number;
  activeTaskCount: number;
};

export class ZonesRepository {
  /**
   * List all zones ordered by name
   */
  static async listZones(): Promise<DbResult<ZoneDTO[]>> {
    try {
      const db = await getDb();

      const rows = await db
        .select({
          id: zones.id,
          name: zones.name,
          color: zones.color,
          iconName: zones.iconName,
        })
        .from(zones)
        .orderBy(asc(zones.name));

      return ok(rows.map((row) => row));
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to list zones",
        details: error,
      });
    }
  }

  /**
   * Get a single zone by ID
   */
  static async getZoneById(zoneId: number): Promise<ZoneDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: zones.id,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      })
      .from(zones)
      .where(eq(zones.id, zoneId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0] ?? null;
  }

  /**
   * Get a single zone by name
   */
  static async getZoneByName(name: string): Promise<ZoneDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: zones.id,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      })
      .from(zones)
      .where(eq(zones.name, name))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0] ?? null;
  }

  /**
   * Create a new zone (admin function)
   */
  static async createZone(data: CreateZoneDTO): Promise<DbResult<ZoneDTO>> {
    try {
      const db = await getDb();

      const insertValues = {
        id: data.id ?? undefined, // Let database handle auto-increment if not provided
        name: data.name,
        color: data.color ?? null,
        iconName: data.iconName ?? null,
      };

      const [newZone] = await db.insert(zones).values(insertValues).returning({
        id: zones.id,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      });

      if (!newZone) {
        return err({
          code: "DB_INSERT_FAILED",
          message: "Failed to create zone - no data returned",
        });
      }

      return ok(newZone);
    } catch (error) {
      return err({
        code: "DB_INSERT_FAILED",
        message: error instanceof Error ? error.message : "Failed to create zone",
        details: error,
      });
    }
  }

  /**
   * Update an existing zone (admin function)
   */
  static async updateZone(zoneId: number, data: UpdateZoneDTO): Promise<ZoneDTO | null> {
    const db = await getDb();

    const updateValues = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color ?? null }),
      ...(data.iconName !== undefined && { iconName: data.iconName ?? null }),
    };

    const [updatedZone] = await db
      .update(zones)
      .set(updateValues)
      .where(eq(zones.id, zoneId))
      .returning({
        id: zones.id,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      });

    if (!updatedZone) {
      return null;
    }

    return updatedZone;
  }

  /**
   * Delete a zone (admin function)
   */
  static async deleteZone(zoneId: number): Promise<boolean> {
    const db = await getDb();

    const result = await db.delete(zones).where(eq(zones.id, zoneId)).returning({ id: zones.id });

    return result.length > 0;
  }

  /**
   * Get zones with usage statistics
   */
  static async getZonesWithStats(): Promise<DbResult<ZoneWithStatsDTO[]>> {
    try {
      const db = await getDb();

      // For now, return zones with zero counts since we'll implement usage stats later
      // TODO: Add actual project and task count queries when those repositories are implemented
      const rows = await db
        .select({
          id: zones.id,
          name: zones.name,
          color: zones.color,
          iconName: zones.iconName,
        })
        .from(zones)
        .orderBy(asc(zones.name));

      const zonesWithStats = rows.map((row) => ({
        ...row,
        projectCount: 0,
        taskCount: 0,
        activeTaskCount: 0,
      }));

      return ok(zonesWithStats.map((row) => row));
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to get zones with stats",
        details: error,
      });
    }
  }
}
