/** GET/POST /api/debug/process-gmail — extract structured data from Gmail raw_events (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { rawEvents, interactions } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { err, ok } from "@/server/http/responses";
import { log } from "@/server/log";
import { toApiError } from "@/server/jobs/types";

interface GmailPayload {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      headers?: Array<{ name?: string; value?: string }>;
    }>;
  };
  internalDate?: string;
}

function extractEmailData(gmailPayload: GmailPayload): {
  subject: string | null;
  from: string | null;
  to: string | null;
  date: string | null;
  messageId: string | null;
  bodyText: string;
  gmailId: string | undefined;
  threadId: string | undefined;
  labelIds: string[];
} {
  const headers = gmailPayload.payload?.headers ?? [];
  
  // Extract common email fields
  const subject = headers.find(h => h.name?.toLowerCase() === "subject")?.value ?? null;
  const from = headers.find(h => h.name?.toLowerCase() === "from")?.value ?? null;
  const to = headers.find(h => h.name?.toLowerCase() === "to")?.value ?? null;
  const date = headers.find(h => h.name?.toLowerCase() === "date")?.value ?? null;
  const messageId = headers.find(h => h.name?.toLowerCase() === "message-id")?.value ?? null;
  
  // Extract body text
  let bodyText = gmailPayload.snippet ?? "";
  
  // Try to get fuller body from payload
  if (gmailPayload.payload?.body?.data) {
    try {
      // Gmail body data is base64url encoded
      const decoded = Buffer.from(gmailPayload.payload.body.data, "base64url").toString("utf8");
      bodyText = decoded.length > bodyText.length ? decoded : bodyText;
    } catch (decodeError) {
      log.warn({ error: String(decodeError) }, "failed_to_decode_gmail_body");
    }
  }
  
  // Check parts for text content
  if (gmailPayload.payload?.parts) {
    for (const part of gmailPayload.payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        try {
          const decoded = Buffer.from(part.body.data, "base64url").toString("utf8");
          if (decoded.length > bodyText.length) {
            bodyText = decoded;
          }
        } catch (partDecodeError) {
          log.warn({ error: String(partDecodeError) }, "failed_to_decode_gmail_part");
        }
      }
    }
  }
  
  return {
    subject,
    from,
    to,
    date,
    messageId,
    bodyText: bodyText?.slice(0, 5000) ?? "", // Limit body text size
    gmailId: gmailPayload.id,
    threadId: gmailPayload.threadId,
    labelIds: gmailPayload.labelIds ?? [],
  };
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
    rawEventsFetch: { success: false, count: 0, error: null as string | null },
    dataExtraction: { success: false, processed: 0, error: null as string | null },
    interactionInsert: { success: false, insertedId: null as string | null, error: null as string | null },
    extractedData: null as ReturnType<typeof extractEmailData> | null,
  };

  try {
    const db = await getDb();
    
    // Step 1: Get the most recent Gmail raw_event for this user
    log.info({ userId }, "fetching_gmail_raw_events");
    
    const gmailRawEvents = await db
      .select()
      .from(rawEvents)
      .where(and(
        eq(rawEvents.userId, userId),
        eq(rawEvents.provider, "gmail")
      ))
      .orderBy(desc(rawEvents.createdAt))
      .limit(1);
    
    if (gmailRawEvents.length === 0) {
      results.rawEventsFetch.error = "No Gmail raw_events found";
      return ok({ success: false, results, message: "No Gmail messages found in raw_events" });
    }
    
    results.rawEventsFetch.success = true;
    results.rawEventsFetch.count = gmailRawEvents.length;
    
    const rawEvent = gmailRawEvents[0]!;
    
    log.info({ 
      userId, 
      rawEventId: rawEvent.id,
      occurredAt: rawEvent.occurredAt,
      sourceId: rawEvent.sourceId
    }, "processing_gmail_raw_event");
    
    // Step 2: Extract structured data from the Gmail payload
    try {
      const gmailPayload = rawEvent.payload as GmailPayload;
      const extractedData = extractEmailData(gmailPayload);
      
      results.dataExtraction.success = true;
      results.dataExtraction.processed = 1;
      results.extractedData = extractedData;
      
      log.info({ 
        userId, 
        subject: extractedData.subject,
        from: extractedData.from,
        bodyLength: extractedData.bodyText.length,
        gmailId: extractedData.gmailId
      }, "email_data_extracted");
      
      // Step 3: Insert as structured interaction
      try {
        log.info({ userId, gmailId: extractedData.gmailId }, "inserting_structured_interaction");
        
        const interactionData = {
          userId,
          contactId: null, // We'll handle contact matching later
          type: "email" as const,
          subject: extractedData.subject,
          bodyText: extractedData.bodyText,
          bodyRaw: {
            from: extractedData.from,
            to: extractedData.to,
            date: extractedData.date,
            messageId: extractedData.messageId,
            labelIds: extractedData.labelIds,
          },
          occurredAt: rawEvent.occurredAt,
          source: "gmail",
          sourceId: extractedData.gmailId ?? rawEvent.sourceId,
          sourceMeta: {
            ...rawEvent.sourceMeta as Record<string, unknown>,
            processedAt: new Date().toISOString(),
            structuredExtraction: true,
          },
          batchId: rawEvent.batchId,
        };
        
        // Check if this interaction already exists
        const existingInteraction = await db
          .select({ id: interactions.id })
          .from(interactions)
          .where(and(
            eq(interactions.userId, userId),
            eq(interactions.source, "gmail"),
            eq(interactions.sourceId, extractedData.gmailId ?? rawEvent.sourceId ?? "")
          ))
          .limit(1);
        
        if (existingInteraction.length > 0) {
          results.interactionInsert.success = true;
          results.interactionInsert.insertedId = existingInteraction[0]!.id;
          
          log.info({ 
            userId, 
            interactionId: results.interactionInsert.insertedId,
            gmailId: extractedData.gmailId 
          }, "interaction_already_exists");
        } else {
          // Insert new interaction
          const insertedInteractions = await db
            .insert(interactions)
            .values(interactionData)
            .returning({ id: interactions.id });
          
          if (insertedInteractions.length > 0) {
            results.interactionInsert.success = true;
            results.interactionInsert.insertedId = insertedInteractions[0]!.id;
            
            log.info({ 
              userId, 
              interactionId: results.interactionInsert.insertedId,
              subject: extractedData.subject,
              gmailId: extractedData.gmailId 
            }, "interaction_inserted_successfully");
          } else {
            results.interactionInsert.error = "Insert returned no rows";
          }
        }
        
      } catch (insertError) {
        const insertErrorMsg = insertError instanceof Error ? insertError.message : String(insertError);
        results.interactionInsert.error = insertErrorMsg;
        log.error({ userId, error: insertErrorMsg }, "interaction_insert_failed");
      }
      
    } catch (extractError) {
      const extractErrorMsg = extractError instanceof Error ? extractError.message : String(extractError);
      results.dataExtraction.error = extractErrorMsg;
      log.error({ userId, error: extractErrorMsg }, "data_extraction_failed");
    }
    
    const success = results.rawEventsFetch.success && 
                   results.dataExtraction.success && 
                   results.interactionInsert.success;
    
    const message = success 
      ? `Successfully processed Gmail email "${results.extractedData?.subject ?? 'Unknown Subject'}" into structured interaction!`
      : "Processing failed at one or more steps";
    
    log.info({ 
      userId, 
      success,
      interactionId: results.interactionInsert.insertedId,
      subject: results.extractedData?.subject
    }, "gmail_processing_complete");
    
    return ok({ 
      success, 
      results: {
        ...results,
        extractedData: results.extractedData ? {
          subject: results.extractedData.subject,
          from: results.extractedData.from,
          to: results.extractedData.to,
          bodyPreview: results.extractedData.bodyText.slice(0, 200) + "...",
          gmailId: results.extractedData.gmailId,
        } : null,
      },
      message 
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ userId, error: errorMsg }, "gmail_processing_failed");
    
    return ok({ 
      success: false, 
      results, 
      error: errorMsg 
    });
  }
}

export async function GET(): Promise<Response> {
  return handleRequest();
}

export async function POST(): Promise<Response> {
  return handleRequest();
}