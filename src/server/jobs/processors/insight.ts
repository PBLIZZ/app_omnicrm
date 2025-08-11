import { supaAdminGuard } from "@/server/db/supabase-admin";

export async function runInsight(_job: unknown, userId: string) {
  // Stub: create a placeholder insight row
  // service-role write: ai_insights (allowed)
  await supaAdminGuard.insert("ai_insights", {
    user_id: userId,
    subject_type: "inbox",
    kind: "summary",
    content: { placeholder: true },
    model: null,
  });
}
