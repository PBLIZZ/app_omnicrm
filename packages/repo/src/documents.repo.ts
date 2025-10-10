import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  type InferSelectModel,
} from "drizzle-orm";
import {
  documents,
  type CreateIntelligenceDocument,
  type IntelligenceDocument,
  type UpdateIntelligenceDocument,
} from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

export type DocumentListParams = {
  ownerContactId?: string;
  mimeTypes?: string[];
  search?: string;
  includeUnassigned?: boolean;
  page?: number;
  pageSize?: number;
  order?: "asc" | "desc";
};

const sortColumn = documents.createdAt;
type IntelligenceDocumentRow = InferSelectModel<typeof documents>;

export class DocumentsRepository {
  constructor(private readonly db: DbClient) {}

  async listDocuments(
    userId: string,
    params: DocumentListParams = {},
  ): Promise<{ items: IntelligenceDocument[]; total: number }> {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(documents.userId, userId)];

    if (params.ownerContactId) {
      conditions.push(eq(documents.ownerContactId, params.ownerContactId));
    } else if (!params.includeUnassigned) {
      conditions.push(isNotNull(documents.ownerContactId));
    }

    if (params.mimeTypes && params.mimeTypes.length > 0) {
      conditions.push(inArray(documents.mime, params.mimeTypes));
    }

    if (params.search) {
      const term = `%${params.search}%`;
      const searchCondition = or(ilike(documents.title, term), ilike(documents.text, term));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = and(...conditions);
    const orderFn = params.order === "asc" ? asc : desc;

    const rows = (await this.db
      .select()
      .from(documents)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset)) as IntelligenceDocumentRow[];

    const totalRow = (await this.db
      .select({ value: count() })
      .from(documents)
      .where(whereClause)) as Array<{ value: number | bigint }>;

    return {
      items: rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  }

  async getDocumentById(userId: string, documentId: string): Promise<IntelligenceDocument | null> {
    const rows = (await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.id, documentId)))
      .limit(1)) as IntelligenceDocumentRow[];

    return rows[0] ?? null;
  }

  async createDocument(
    data: CreateIntelligenceDocument & { userId: string },
  ): Promise<IntelligenceDocument> {
    const [created] = (await this.db
      .insert(documents)
      .values(data)
      .returning()) as IntelligenceDocumentRow[];

    if (!created) {
      throw new Error("Insert returned no data");
    }

    return created;
  }

  async updateDocument(
    userId: string,
    documentId: string,
    updates: UpdateIntelligenceDocument,
  ): Promise<IntelligenceDocument | null> {
    if (Object.keys(updates).length === 0) {
      throw new Error("No fields provided for update");
    }

    const [updated] = (await this.db
      .update(documents)
      .set(updates)
      .where(and(eq(documents.userId, userId), eq(documents.id, documentId)))
      .returning()) as IntelligenceDocumentRow[];

    return updated ?? null;
  }

  async deleteDocument(userId: string, documentId: string): Promise<number> {
    const deleted = (await this.db
      .delete(documents)
      .where(and(eq(documents.userId, userId), eq(documents.id, documentId)))
      .returning({ id: documents.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  async deleteDocumentsForUser(userId: string): Promise<number> {
    const deleted = (await this.db
      .delete(documents)
      .where(eq(documents.userId, userId))
      .returning({ id: documents.id })) as Array<{ id: string }>;

    return deleted.length;
  }
}

export function createDocumentsRepository(db: DbClient): DocumentsRepository {
  return new DocumentsRepository(db);
}
