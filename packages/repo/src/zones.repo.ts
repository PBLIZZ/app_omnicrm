import { asc, eq } from "drizzle-orm";
import { zones } from "@/server/db/schema";
import type { Zone, CreateZone } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

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
  static async listZones(db: DbClient): Promise<ZoneDTO[]> {
    const rows = await db
      .select({
        id: zones.id,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      })
      .from(zones)
      .orderBy(asc(zones.name));

    return rows.map(row => row);
  }

  /**
   * Get a single zone by ID
   */
  static async getZoneById(db: DbClient, zoneId: number): Promise<ZoneDTO | null> {

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
  static async getZoneByName(db: DbClient, name: string): Promise<ZoneDTO | null> {

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
  static async createZone(db: DbClient, data: CreateZoneDTO): Promise<ZoneDTO> {
    const insertValues = {
      id: data.id ?? undefined,
      name: data.name,
      color: data.color ?? null,
      iconName: data.iconName ?? null,
    };

    const [newZone] = await db
      .insert(zones)
      .values(insertValues)
      .returning({
        id: zones.id,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      });

    if (!newZone) {
      throw new Error("Failed to create zone - no data returned");
    }

    return newZone;
  }

  /**
   * Update an existing zone (admin function)
   */
  static async updateZone(
    db: DbClient,
    zoneId: number,
    data: UpdateZoneDTO,
  ): Promise<ZoneDTO | null> {

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
  static async deleteZone(db: DbClient, zoneId: number): Promise<boolean> {

    const result = await db.delete(zones).where(eq(zones.id, zoneId)).returning({ id: zones.id });

    return result.length > 0;
  }

  /**
   * Get zones with usage statistics
   */
  static async getZonesWithStats(db: DbClient): Promise<ZoneWithStatsDTO[]> {
    const rows = await db
      .select({
        id: zones.id,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      })
      .from(zones)
      .orderBy(asc(zones.name));

    return rows.map(row => ({
      ...row,
      projectCount: 0,
      taskCount: 0,
      activeTaskCount: 0,
    }));
  }
}
