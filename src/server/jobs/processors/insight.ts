import { db } from "@/server/db/client";
import { aiInsights } from "@/server/db/schema";

export async function runInsight(_job: unknown, userId: string) {
  // Stub: create a placeholder insight row
  await db.insert(aiInsights).values({
    userId,
    subjectType: "inbox",
    kind: "summary",
    content: { placeholder: true },
    model: null,
  });
}
