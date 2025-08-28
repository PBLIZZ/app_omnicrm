import { NextRequest, NextResponse } from "next/server";
import { ContactIntelligenceService } from "@/server/services/contact-intelligence.service";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getServerUserId } from "@/server/auth/user";
import { ok, err } from "@/server/http/responses";

async function handleStreamingEnrichment(request: NextRequest) {
  const userId = await getServerUserId();
  const db = await getDb();

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get contacts that need AI insights
        const contactsToEnrich = await db.select().from(contacts).where(eq(contacts.userId, userId));
        
        // Send initial status
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'start',
          total: contactsToEnrich.length
        })}\n\n`));

        let enrichedCount = 0;
        const errors: string[] = [];

        for (const contact of contactsToEnrich) {
          if (!contact.primaryEmail) {
            continue;
          }

          // Check if contact already has insights - but force re-enrich calendar imports
          if (contact.stage && contact.tags && contact.source !== 'calendar_import') {
            continue;
          }

          try {
            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              contactName: contact.displayName,
              contactId: contact.id,
              enrichedCount,
              total: contactsToEnrich.length
            })}\n\n`));

            // Generate AI insights
            const insights = await ContactIntelligenceService.generateContactInsights(
              userId,
              contact.primaryEmail,
            );

            // Update contact with insights
            await db
              .update(contacts)
              .set({
                stage: insights.stage,
                tags: insights.tags.length > 0 ? JSON.stringify(insights.tags) : null,
                confidenceScore: insights.confidenceScore.toString(),
                updatedAt: new Date(),
              })
              .where(eq(contacts.id, contact.id));

            // Create AI-generated note
            if (insights.noteContent) {
              await ContactIntelligenceService.createAINote(
                contact.id,
                userId,
                insights.noteContent
              );
            }

            enrichedCount++;

            // Send enriched contact update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'enriched',
              contactId: contact.id,
              contactName: contact.displayName,
              stage: insights.stage,
              tags: insights.tags,
              confidenceScore: insights.confidenceScore,
              enrichedCount
            })}\n\n`));

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            const errorMsg = `Failed to enrich ${contact.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
            errors.push(errorMsg);
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              contactId: contact.id,
              contactName: contact.displayName,
              error: errorMsg
            })}\n\n`));
          }
        }

        // Send completion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          enrichedCount,
          totalContacts: contactsToEnrich.length,
          errors
        })}\n\n`));

      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : "Unknown error"
        })}\n\n`));
      }
      
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stream = searchParams.get('stream') === 'true';

  if (stream) {
    return handleStreamingEnrichment(request);
  }

  try {
    const userId = await getServerUserId();
    const db = await getDb();

    console.log("🧠 Starting retroactive contact enrichment...");

    // Get contacts that need AI insights (missing stage, notes, or tags)
    const contactsToEnrich = await db.select().from(contacts).where(eq(contacts.userId, userId));

    console.log(`📊 Found ${contactsToEnrich.length} contacts to potentially enrich`);

    let enrichedCount = 0;
    const errors: string[] = [];

    for (const contact of contactsToEnrich) {
      if (!contact.primaryEmail) {
        console.log(`⚠️ Skipping ${contact.displayName} - no email address`);
        continue;
      }

      // Check if contact already has insights - but force re-enrich calendar imports with old logic
      if (contact.stage && contact.tags && contact.source !== 'calendar_import') {
        console.log(`✅ Skipping ${contact.displayName} - already has insights and not calendar import`);
        continue;
      }

      try {
        console.log(`🔄 Enriching ${contact.displayName} (${contact.primaryEmail})`);

        // Generate AI insights
        const insights = await ContactIntelligenceService.generateContactInsights(
          userId,
          contact.primaryEmail,
        );

        // Update contact with insights (excluding notes)
        await db
          .update(contacts)
          .set({
            stage: insights.stage,
            tags: insights.tags.length > 0 ? JSON.stringify(insights.tags) : null,
            confidenceScore: insights.confidenceScore.toString(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contact.id));

        // Create AI-generated note in notes table
        if (insights.noteContent) {
          await ContactIntelligenceService.createAINote(
            contact.id,
            userId,
            insights.noteContent
          );
        }

        enrichedCount++;
        console.log(
          `✅ Enriched ${contact.displayName} - Stage: ${insights.stage}, Tags: ${insights.tags.length}`,
        );

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        const errorMsg = `Failed to enrich ${contact.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`✅ Completed enrichment: ${enrichedCount} contacts enriched`);

    return ok({
      enrichedCount,
      totalContacts: contactsToEnrich.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ Contact enrichment API error:", error);
    return err(500, error instanceof Error ? error.message : "Unknown error");
  }
}
