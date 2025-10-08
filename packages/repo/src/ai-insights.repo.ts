import { and, asc, count, desc, eq, ilike, inArray, type InferSelectModel } from "drizzle-orm";
import { aiInsights, type AiInsight, type CreateAiInsight, type UpdateAiInsight } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

export type AiInsightListParams = {
  subjectType?: string;
  subjectId?: string;
  kinds?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
  order?: "asc" | "desc";
};

const sortColumn = aiInsights.createdAt;
type AiInsightRow = InferSelectModel<typeof aiInsights>;

export class AiInsightsRepository {
  static async listAiInsights(
    db: DbClient,
    userId: string,
    params: AiInsightListParams = {},
  ): Promise<{ items: AiInsight[]; total: number }> {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(aiInsights.userId, userId)];

    if (params.subjectType) {
      conditions.push(eq(aiInsights.subjectType, params.subjectType));
    }

    if (params.subjectId) {
      conditions.push(eq(aiInsights.subjectId, params.subjectId));
    }

    if (params.kinds && params.kinds.length > 0) {
      conditions.push(inArray(aiInsights.kind, params.kinds));
    }

    if (params.search) {
      const term = `%${params.search}%`;
      conditions.push(ilike(aiInsights.content, term));
    }

    const whereClause = and(...conditions);
    const orderFn = params.order === "asc" ? asc : desc;

    const rows = (await db
      .select()
      .from(aiInsights)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset)) as AiInsightRow[];

    const totalRow = (await db
      .select({ value: count() })
      .from(aiInsights)
      .where(whereClause)) as Array<{ value: number | bigint }>;

    return {
      items: rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  }

  static async getAiInsightById(
    db: DbClient,
    userId: string,
    aiInsightId: string,
  ): Promise<AiInsight | null> {
    const rows = (await db
      .select()
      .from(aiInsights)
      .where(and(eq(aiInsights.userId, userId), eq(aiInsights.id, aiInsightId)))
      .limit(1)) as AiInsightRow[];

    return rows[0] ?? null;
  }

  static async findByFingerprint(
    db: DbClient,
    userId: string,
    fingerprint: string,
  ): Promise<AiInsight | null> {
    const rows = (await db
      .select()
      .from(aiInsights)
      .where(and(eq(aiInsights.userId, userId), eq(aiInsights.fingerprint, fingerprint)))
      .limit(1)) as AiInsightRow[];

    return rows[0] ?? null;
  }

  static async createAiInsight(
    db: DbClient,
    data: CreateAiInsight & { userId: string },
  ): Promise<AiInsight> {
    const [created] = (await db.insert(aiInsights).values(data).returning()) as AiInsightRow[];
    if (!created) {
      throw new Error("Insert returned no data");
    }
    return created;
  }

  static async updateAiInsight(
    db: DbClient,
    userId: string,
    aiInsightId: string,
    updates: UpdateAiInsight,
  ): Promise<AiInsight | null> {
    if (Object.keys(updates).length === 0) {
      throw new Error("No fields provided for update");
    }

    const [updated] = (await db
      .update(aiInsights)
      .set(updates)
      .where(and(eq(aiInsights.userId, userId), eq(aiInsights.id, aiInsightId)))
      .returning()) as AiInsightRow[];

    return updated ?? null;
  }

  static async deleteAiInsight(
    db: DbClient,
    userId: string,
    aiInsightId: string,
  ): Promise<number> {
    const deleted = (await db
      .delete(aiInsights)
      .where(and(eq(aiInsights.userId, userId), eq(aiInsights.id, aiInsightId)))
      .returning({ id: aiInsights.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  static async deleteAiInsightsForUser(
    db: DbClient,
    userId: string,
  ): Promise<number> {
    const deleted = (await db
      .delete(aiInsights)
      .where(eq(aiInsights.userId, userId))
      .returning({ id: aiInsights.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  static async findBySubjectIds(
    db: DbClient,
    userId: string,
    subjectIds: string[],
    options: { subjectType?: string; kind?: string } = {},
  ): Promise<AiInsight[]> {
    if (subjectIds.length === 0) {
      return [];
    }

    const conditions = [
      eq(aiInsights.userId, userId),
      inArray(aiInsights.subjectId, subjectIds),
    ];

    if (options.subjectType) {
      conditions.push(eq(aiInsights.subjectType, options.subjectType));
    }

    if (options.kind) {
      conditions.push(eq(aiInsights.kind, options.kind));
    }

    const rows = (await db
      .select()
      .from(aiInsights)
      .where(and(...conditions))) as AiInsightRow[];

    return rows;
  }
}
