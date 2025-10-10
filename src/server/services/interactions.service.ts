/**
 * Interactions Service Layer
 *
 * Business logic and orchestration for interactions.
 * - Uses factory pattern for repository access
 * - Handles business logic and data transformation
 * - Throws AppError on failures
 */

import { createInteractionsRepository } from "@repo";
import type { Interaction, CreateInteraction, UpdateInteraction } from "@/server/db/schema";
import type { InteractionListParams } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";

// ============================================================================
// INTERACTION CRUD OPERATIONS
// ============================================================================

/**
 * Create a new interaction
 */
export async function createInteractionService(
  userId: string,
  data: CreateInteraction,
): Promise<Interaction> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.createInteraction({ ...data, userId });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create interaction",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get single interaction by ID
 */
export async function getInteractionByIdService(
  userId: string,
  interactionId: string,
): Promise<Interaction | null> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.getInteractionById(userId, interactionId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get interaction",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * List interactions with pagination and filtering
 */
export async function listInteractionsService(
  userId: string,
  params: InteractionListParams = {},
): Promise<{ items: Interaction[]; total: number }> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.listInteractions(userId, params);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list interactions",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Update an interaction
 */
export async function updateInteractionService(
  userId: string,
  interactionId: string,
  data: UpdateInteraction,
): Promise<Interaction | null> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.updateInteraction(userId, interactionId, data);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update interaction",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Delete an interaction
 */
export async function deleteInteractionService(
  userId: string,
  interactionId: string,
): Promise<void> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    await repo.deleteInteraction(userId, interactionId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete interaction",
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
 * Find interaction by source + sourceId (used for upsert flows)
 */
export async function findInteractionBySourceService(
  userId: string,
  source: string,
  sourceId: string,
): Promise<Interaction | null> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.findBySource(userId, source, sourceId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to find interaction by source",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Bulk create interactions for ingestion pipelines
 */
export async function createInteractionsBulkService(
  userId: string,
  items: Array<CreateInteraction>,
): Promise<Interaction[]> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.createInteractionsBulk(items.map((item) => ({ ...item, userId })));
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to bulk create interactions",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Count interactions with optional criteria
 */
export async function countInteractionsService(
  userId: string,
  criteria: { contactId?: string; types?: string[] } = {},
): Promise<number> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.countInteractions(userId, criteria);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to count interactions",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get interaction type breakdown
 */
export async function getInteractionTypeBreakdownService(
  userId: string,
): Promise<Array<{ type: string; total: number }>> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.getTypeBreakdown(userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get interaction type breakdown",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get latest interaction for a contact
 */
export async function getLatestInteractionForContactService(
  userId: string,
  contactId: string,
): Promise<Interaction | null> {
  const db = await getDb();
  const repo = createInteractionsRepository(db);

  try {
    return await repo.latestInteractionForContact(userId, contactId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get latest interaction for contact",
      "DB_ERROR",
      "database",
      false,
    );
  }
}
