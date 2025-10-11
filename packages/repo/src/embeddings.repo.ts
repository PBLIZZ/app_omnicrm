import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  isNotNull,
  lte,
  type InferSelectModel,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import {
  embeddings,
  type CreateEmbedding,
  type Embedding,
  type UpdateEmbedding,
} from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

export type EmbeddingListParams = {
  ownerType?: string[];
  ownerId?: string;
  hasEmbedding?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  page?: number;
  pageSize?: number;
  order?: "asc" | "desc";
};

const sortColumn = embeddings.createdAt;
type EmbeddingRow = InferSelectModel<typeof embeddings>;

export class EmbeddingsRepository {
  constructor(private readonly db: DbClient) {}

  async listEmbeddings(
    userId: string,
    params: EmbeddingListParams = {},
  ): Promise<{ items: Embedding[]; total: number }> {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const conditions: SQL<unknown>[] = [eq(embeddings.userId, userId)];

    if (params.ownerType && params.ownerType.length > 0) {
      conditions.push(inArray(embeddings.ownerType, params.ownerType));
    }

    if (params.ownerId) {
      conditions.push(eq(embeddings.ownerId, params.ownerId));
    }

    if (params.hasEmbedding !== undefined) {
      conditions.push(
        params.hasEmbedding ? isNotNull(embeddings.embedding) : isNull(embeddings.embedding),
      );
    }

    if (params.createdAfter) {
      conditions.push(gte(embeddings.createdAt, params.createdAfter));
    }

    if (params.createdBefore) {
      conditions.push(lte(embeddings.createdAt, params.createdBefore));
    }

    const whereClause = and(...conditions);
    const orderFn = params.order === "asc" ? asc : desc;

    const rows = (await this.db
      .select()
      .from(embeddings)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset)) as EmbeddingRow[];

    const totalRow = (await this.db
      .select({ value: count() })
      .from(embeddings)
      .where(whereClause)) as Array<{ value: number | bigint }>;

    return {
      items: rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  }

  async listEmbeddingsForOwner(
    userId: string,
    ownerType: string,
    ownerId: string,
  ): Promise<Embedding[]> {
    return (await this.db
      .select()
      .from(embeddings)
      .where(
        and(
          eq(embeddings.userId, userId),
          eq(embeddings.ownerType, ownerType),
          eq(embeddings.ownerId, ownerId),
        ),
      )
      .orderBy(asc(embeddings.chunkIndex ?? embeddings.createdAt))) as EmbeddingRow[];
  }

  async findByContentHash(userId: string, hash: string): Promise<Embedding | null> {
    const rows = (await this.db
      .select()
      .from(embeddings)
      .where(and(eq(embeddings.userId, userId), eq(embeddings.contentHash, hash)))
      .limit(1)) as EmbeddingRow[];

    return rows[0] ?? null;
  }

  async createEmbedding(data: CreateEmbedding & { userId: string }): Promise<Embedding> {
    const [created] = (await this.db.insert(embeddings).values(data).returning()) as EmbeddingRow[];
    if (!created) {
      throw new Error("Insert returned no data");
    }
    return created;
  }

  async createEmbeddingsBulk(
    items: Array<CreateEmbedding & { userId: string }>,
  ): Promise<Embedding[]> {
    if (items.length === 0) {
      return [];
    }

    return (await this.db.insert(embeddings).values(items).returning()) as EmbeddingRow[];
  }

  async updateEmbedding(
    userId: string,
    embeddingId: string,
    updates: UpdateEmbedding,
  ): Promise<Embedding | null> {
    if (Object.keys(updates).length === 0) {
      throw new Error("No fields provided for update");
    }

    const [updated] = (await this.db
      .update(embeddings)
      .set(updates)
      .where(and(eq(embeddings.userId, userId), eq(embeddings.id, embeddingId)))
      .returning()) as EmbeddingRow[];

    return updated ?? null;
  }

  async deleteEmbeddingsForOwner(
    userId: string,
    ownerType: string,
    ownerId: string,
  ): Promise<number> {
    const deleted = (await this.db
      .delete(embeddings)
      .where(
        and(
          eq(embeddings.userId, userId),
          eq(embeddings.ownerType, ownerType),
          eq(embeddings.ownerId, ownerId),
        ),
      )
      .returning({ id: embeddings.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  async deleteEmbeddingsForUser(userId: string): Promise<number> {
    const deleted = (await this.db
      .delete(embeddings)
      .where(eq(embeddings.userId, userId))
      .returning({ id: embeddings.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  async deleteEmbeddingById(userId: string, embeddingId: string): Promise<number> {
    const deleted = (await this.db
      .delete(embeddings)
      .where(and(eq(embeddings.userId, userId), eq(embeddings.id, embeddingId)))
      .returning({ id: embeddings.id })) as Array<{ id: string }>;

    return deleted.length;
  }
}

export function createEmbeddingsRepository(db: DbClient): EmbeddingsRepository {
  return new EmbeddingsRepository(db);
}
