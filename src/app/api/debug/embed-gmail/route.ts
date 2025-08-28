/** GET/POST /api/debug/embed-gmail — generate embeddings for Gmail interactions with pgvector compatibility (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { interactions, embeddings } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { err, ok } from "@/server/http/responses";
import { log } from "@/server/log";
import { toApiError } from "@/server/jobs/types";
import { Pool } from "pg";

// Simple embedding mock - replace with actual OpenAI/embedding service
function generateMockEmbedding(text: string): number[] {
  // Generate a consistent 1536-dimensional mock embedding based on text
  const embedding = new Array(1536);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Generate pseudo-random but consistent values
  for (let i = 0; i < 1536; i++) {
    const seed = hash + i;
    embedding[i] = (Math.sin(seed) * 10000) % 1 - 0.5; // Values between -0.5 and 0.5
  }
  
  // Normalize to unit length
  const magnitude = Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0));
  return embedding.map((val: number) => val / magnitude);
}

async function testPgvectorCompatibility(pool: Pool): Promise<{ 
  available: boolean; 
  schema: string | null; 
  error: string | null 
}> {
  const client = await pool.connect();
  try {
    // Test if vector type is available and in which schema
    const schemaQuery = `
      SELECT n.nspname as schema_name 
      FROM pg_type t 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE t.typname = 'vector'
      ORDER BY CASE WHEN n.nspname = 'public' THEN 1 WHEN n.nspname = 'extensions' THEN 2 ELSE 3 END
      LIMIT 1
    `;
    
    const result = await client.query(schemaQuery);
    
    if (result.rows.length > 0) {
      const schemaName = (result.rows[0] as { schema_name: string }).schema_name;
      
      // Test if we can create a vector value
      const testQuery = `SELECT ARRAY[1,2,3]::${schemaName === 'public' ? '' : schemaName + '.'}vector(3) as test_vector`;
      await client.query(testQuery);
      
      return {
        available: true,
        schema: schemaName,
        error: null,
      };
    } else {
      return {
        available: false,
        schema: null,
        error: "pgvector extension not found",
      };
    }
  } catch (error) {
    return {
      available: false,
      schema: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    client.release();
  }
}

async function handleRequest(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  const results = {
    interactionFetch: { success: false, count: 0, error: null as string | null },
    pgvectorTest: { available: false, schema: null as string | null, error: null as string | null },
    embeddingGeneration: { success: false, dimensions: 0, error: null as string | null },
    embeddingInsert: { success: false, insertedId: null as string | null, error: null as string | null, strategy: null as string | null },
    interactionData: null as { id: string; subject: string | null; bodyPreview: string; occurredAt: Date } | null,
  };

  let pool: Pool | null = null;

  try {
    const db = await getDb();
    
    // Step 1: Get the most recent Gmail interaction for this user
    log.info({ userId }, "fetching_gmail_interactions");
    
    const gmailInteractions = await db
      .select()
      .from(interactions)
      .where(and(
        eq(interactions.userId, userId),
        eq(interactions.source, "gmail")
      ))
      .orderBy(desc(interactions.createdAt))
      .limit(1);
    
    if (gmailInteractions.length === 0) {
      results.interactionFetch.error = "No Gmail interactions found";
      return ok({ success: false, results, message: "No Gmail interactions found. Run process-gmail first." });
    }
    
    results.interactionFetch.success = true;
    results.interactionFetch.count = gmailInteractions.length;
    
    const interaction = gmailInteractions[0]!;
    results.interactionData = {
      id: interaction.id,
      subject: interaction.subject,
      bodyPreview: interaction.bodyText?.slice(0, 200) + "...",
      occurredAt: interaction.occurredAt,
    };
    
    log.info({ 
      userId, 
      interactionId: interaction.id,
      subject: interaction.subject,
    }, "processing_gmail_interaction_for_embedding");
    
    // Step 2: Test pgvector compatibility
    if (!process.env["DATABASE_URL"]) {
      results.pgvectorTest.error = "DATABASE_URL missing";
      return ok({ success: false, results });
    }
    
    pool = new Pool({
      connectionString: process.env["DATABASE_URL"],
      max: 1,
    });
    
    const pgvectorStatus = await testPgvectorCompatibility(pool);
    results.pgvectorTest = pgvectorStatus;
    
    log.info({ 
      userId, 
      pgvectorAvailable: pgvectorStatus.available,
      schema: pgvectorStatus.schema,
    }, "pgvector_compatibility_checked");
    
    // Step 3: Generate embedding for the interaction
    try {
      const textToEmbed = [
        interaction.subject ?? "",
        interaction.bodyText ?? "",
      ].filter(Boolean).join(" ");
      
      if (!textToEmbed.trim()) {
        results.embeddingGeneration.error = "No text content to embed";
        return ok({ success: false, results });
      }
      
      log.info({ 
        userId, 
        interactionId: interaction.id,
        textLength: textToEmbed.length 
      }, "generating_embedding");
      
      // Generate mock embedding (replace with actual OpenAI call)
      const embeddingVector = generateMockEmbedding(textToEmbed);
      
      results.embeddingGeneration.success = true;
      results.embeddingGeneration.dimensions = embeddingVector.length;
      
      log.info({ 
        userId, 
        dimensions: embeddingVector.length,
        sampleValues: embeddingVector.slice(0, 3)
      }, "embedding_generated");
      
      // Step 4: Insert embedding with schema compatibility
      try {
        // Check if embedding already exists
        const existingEmbedding = await db
          .select({ id: embeddings.id })
          .from(embeddings)
          .where(and(
            eq(embeddings.userId, userId),
            eq(embeddings.ownerType, "interaction"),
            eq(embeddings.ownerId, interaction.id)
          ))
          .limit(1);
        
        if (existingEmbedding.length > 0) {
          results.embeddingInsert.success = true;
          results.embeddingInsert.insertedId = existingEmbedding[0]!.id;
          results.embeddingInsert.strategy = "existing";
          
          log.info({ 
            userId, 
            embeddingId: results.embeddingInsert.insertedId,
            interactionId: interaction.id 
          }, "embedding_already_exists");
        } else {
          if (pgvectorStatus.available) {
            // Strategy 1: Use pgvector with proper schema
            log.info({ userId, strategy: "pgvector", schema: pgvectorStatus.schema }, "inserting_with_pgvector");
            
            const client = await pool.connect();
            try {
              const vectorType = pgvectorStatus.schema === 'public' ? 'vector' : `${pgvectorStatus.schema}.vector`;
              
              const insertQuery = `
                INSERT INTO embeddings (user_id, owner_type, owner_id, embedding, meta)
                VALUES ($1, $2, $3, $4::${vectorType}(1536), $5)
                RETURNING id
              `;
              
              const embeddingResult = await client.query(insertQuery, [
                userId,
                "interaction",
                interaction.id,
                JSON.stringify(embeddingVector), // pgvector can accept JSON array
                JSON.stringify({
                  generatedAt: new Date().toISOString(),
                  textLength: textToEmbed.length,
                  dimensions: embeddingVector.length,
                  mockEmbedding: true,
                }),
              ]);
              
              if (embeddingResult.rows.length > 0 && embeddingResult.rows[0]) {
                const row = embeddingResult.rows[0] as { id: string };
                results.embeddingInsert.success = true;
                results.embeddingInsert.insertedId = row.id;
                results.embeddingInsert.strategy = "pgvector";
              }
              
            } finally {
              client.release();
            }
          } else {
            // Strategy 2: Insert without embedding column (metadata only)
            log.info({ userId, strategy: "metadata_only" }, "inserting_embedding_metadata_only");
            
            const insertedEmbeddings = await db
              .insert(embeddings)
              .values({
                userId,
                ownerType: "interaction",
                ownerId: interaction.id,
                meta: {
                  generatedAt: new Date().toISOString(),
                  textLength: textToEmbed.length,
                  dimensions: embeddingVector.length,
                  mockEmbedding: true,
                  pgvectorError: pgvectorStatus.error,
                  embeddingStored: false,
                },
                // embedding: null (not setting the vector field due to pgvector issues)
              })
              .returning({ id: embeddings.id });
            
            if (insertedEmbeddings.length > 0) {
              results.embeddingInsert.success = true;
              results.embeddingInsert.insertedId = insertedEmbeddings[0]!.id;
              results.embeddingInsert.strategy = "metadata_only";
            }
          }
        }
        
      } catch (insertError) {
        const insertErrorMsg = insertError instanceof Error ? insertError.message : String(insertError);
        results.embeddingInsert.error = insertErrorMsg;
        log.error({ userId, error: insertErrorMsg }, "embedding_insert_failed");
      }
      
    } catch (embeddingError) {
      const embeddingErrorMsg = embeddingError instanceof Error ? embeddingError.message : String(embeddingError);
      results.embeddingGeneration.error = embeddingErrorMsg;
      log.error({ userId, error: embeddingErrorMsg }, "embedding_generation_failed");
    }
    
    const success = results.interactionFetch.success && 
                   results.embeddingGeneration.success && 
                   results.embeddingInsert.success;
    
    const message = success 
      ? `Successfully generated embedding for email "${interaction.subject ?? 'Unknown Subject'}" using ${results.embeddingInsert.strategy} strategy!`
      : "Embedding generation failed at one or more steps";
    
    log.info({ 
      userId, 
      success,
      embeddingId: results.embeddingInsert.insertedId,
      strategy: results.embeddingInsert.strategy,
      pgvectorAvailable: results.pgvectorTest.available
    }, "gmail_embedding_complete");
    
    return ok({ 
      success, 
      results,
      message 
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ userId, error: errorMsg }, "gmail_embedding_failed");
    
    return ok({ 
      success: false, 
      results, 
      error: errorMsg 
    });

  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}

export async function GET(): Promise<Response> {
  return handleRequest();
}

export async function POST(): Promise<Response> {
  return handleRequest();
}