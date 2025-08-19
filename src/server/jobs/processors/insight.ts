import { supaAdminGuard } from "@/server/db/supabase-admin";

export async function runInsight(job: unknown, userId: string): Promise<void> {
  // Prevent unused parameter warnings
  void job;
  // Stub: create a placeholder insight row
  // service-role write: ai_insights (allowed)
  await supaAdminGuard.insert("ai_insights", {
    userId,
    subjectType: "inbox",
    kind: "summary",
    content: { placeholder: true } as Record<string, unknown>,
    model: null,
  });
}
