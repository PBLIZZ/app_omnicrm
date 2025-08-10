import { embeddings } from "@/server/db/schema";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function runEmbed(_job: unknown, _userId: string) {
  // Stub: no-ops for now; in future select interactions/documents missing embeddings
  // and insert into embeddings after generating vectors.
  // Keeping function to satisfy runner wiring during Phase 3.
  // prevent unused warning in strict mode
  void embeddings;
}
