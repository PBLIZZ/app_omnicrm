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
  constructor(private readonly db: DbClient) {}

  /**
   * List all zones ordered by name
   */
  async listZones(): Promise<ZoneDTO[]> {
    const rows = await this.db
      .select({
        uuidId: zones.uuidId,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      })
      .from(zones)
      .orderBy(asc(zones.name));

    return rows;
  }

  /**
   * Get a single zone by UUID
   */
  async getZoneById(zoneUuid: string): Promise<ZoneDTO | null> {
    const rows = await this.db
      .select({
        uuidId: zones.uuidId,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      })
      .from(zones)
      .where(eq(zones.uuidId, zoneUuid))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0] ?? null;
  }

  /**
   * Get a single zone by name
   */
  async getZoneByName(name: string): Promise<ZoneDTO | null> {
    const rows = await this.db
      .select({
        uuidId: zones.uuidId,
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
  async createZone(data: CreateZoneDTO): Promise<ZoneDTO> {
    const insertValues = {
      uuidId: data.uuidId ?? undefined,
      name: data.name,
      color: data.color ?? null,
      iconName: data.iconName ?? null,
    };

    const [newZone] = await this.db.insert(zones).values(insertValues).returning({
      uuidId: zones.uuidId,
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
  async updateZone(zoneUuid: string, data: UpdateZoneDTO): Promise<ZoneDTO | null> {
    const updateValues = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color ?? null }),
      ...(data.iconName !== undefined && { iconName: data.iconName ?? null }),
    };

    const [updatedZone] = await this.db
      .update(zones)
      .set(updateValues)
      .where(eq(zones.uuidId, zoneUuid))
      .returning({
        uuidId: zones.uuidId,
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
  async deleteZone(zoneUuid: string): Promise<boolean> {
    const result = await this.db
      .delete(zones)
      .where(eq(zones.uuidId, zoneUuid))
      .returning({ uuidId: zones.uuidId });

    return result.length > 0;
  }

  /**
   * Get zones with usage statistics
   */
  async getZonesWithStats(): Promise<ZoneWithStatsDTO[]> {
    const rows = await this.db
      .select({
        uuidId: zones.uuidId,
        name: zones.name,
        color: zones.color,
        iconName: zones.iconName,
      })
      .from(zones)
      .orderBy(asc(zones.name));

    return rows.map((row) => ({
      ...row,
      projectCount: 0,
      taskCount: 0,
      activeTaskCount: 0,
    }));
  }
}

export function createZonesRepository(db: DbClient): ZonesRepository {
  return new ZonesRepository(db);
}
