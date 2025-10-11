// New file for storing email intelligence

import { getDb } from "@/server/db/client";
import { aiInsights } from "@/server/db/schema";
import { logger } from "@/lib/observability";
import { EmailIntelligence } from "@/server/ai/types/connect-types";
import { createHash } from "crypto";

export async function storeEmailIntelligence(
  userId: string,
  rawEventId: string,
  intelligence: EmailIntelligence,
): Promise<void> {
  const db = await getDb();

  // Generate deterministic hash fingerprint
  const normalizedEventId = String(rawEventId || "");
  const hashInput = `email_intel_${normalizedEventId}`;
  const fingerprint = createHash("sha256").update(hashInput).digest("hex").substring(0, 16);

  try {
    await db.insert(aiInsights).values({
      userId,
      subjectType: "inbox",
      subjectId: rawEventId,
      kind: "email_intelligence",
      content: intelligence,
      model: intelligence.processingMeta.model,
      fingerprint,
    });
  } catch (error) {
    await logger.error("Failed to store email intelligence", {
      operation: "llm_call",
      additionalData: {
        op: "email_intelligence.store_failed",
        userId,
        rawEventId,
        model: intelligence.processingMeta.model,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }

  await logger.info("Email intelligence stored successfully", {
    operation: "llm_call",
    additionalData: {
      op: "email_intelligence.stored",
      userId,
      rawEventId,
      category: intelligence.classification.primaryCategory,
    },
  });
}
