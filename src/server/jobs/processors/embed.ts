import { embeddings } from "@/server/db/schema";

export async function runEmbed(job: unknown): Promise<void> {
  // Stub: no-ops for now; in future select interactions/documents missing embeddings
  // and insert into embeddings after generating vectors.
  // Keeping function to satisfy runner wiring during Phase 3.
  // prevent unused warning in strict mode
  void embeddings;
  void job;
}
