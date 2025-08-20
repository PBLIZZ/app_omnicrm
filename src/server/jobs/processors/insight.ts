import { supaAdminGuard } from "@/server/db/supabase-admin";

import type { JobRecord } from "../types";

export async function runInsight(job: JobRecord): Promise<void> {
  // Stub: create a placeholder insight row
  // service-role write: ai_insights (allowed)
  await supaAdminGuard.insert("ai_insights", {
    userId: job.userId,
    subjectType: "inbox",
    kind: "summary",
    content: { placeholder: true } as Record<string, unknown>,
    model: null,
  });
}
