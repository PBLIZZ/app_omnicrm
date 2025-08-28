/** GET /api/debug/raw-events-check — check raw_events table contents (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { rawEvents } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { err, ok } from "@/server/http/responses";
import { log } from "@/server/log";
import { toApiError } from "@/server/jobs/types";

export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  try {
    const db = await getDb();

    // Get recent raw_events for this user
    const userRawEvents = await db
      .select({
        id: rawEvents.id,
        provider: rawEvents.provider,
        occurredAt: rawEvents.occurredAt,
        sourceId: rawEvents.sourceId,
        payload: rawEvents.payload,
        sourceMeta: rawEvents.sourceMeta,
        createdAt: rawEvents.createdAt,
      })
      .from(rawEvents)
      .where(eq(rawEvents.userId, userId))
      .orderBy(desc(rawEvents.createdAt))
      .limit(20);

    // Get Gmail events specifically
    const gmailEvents = userRawEvents.filter(event => event.provider === "gmail");
    
    // Get diagnostic/test events
    const testEvents = userRawEvents.filter(event => 
      event.provider.includes("test") || 
      (event.sourceMeta && typeof event.sourceMeta === 'object' && 
       'diagnostic' in event.sourceMeta)
    );

    // Count by provider
    const providerCounts = userRawEvents.reduce((acc, event) => {
      acc[event.provider] = (acc[event.provider] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    log.info({ 
      userId, 
      totalEvents: userRawEvents.length,
      gmailEvents: gmailEvents.length,
      testEvents: testEvents.length,
      providerCounts 
    }, "raw_events_check_complete");

    return ok({
      success: true,
      summary: {
        totalEvents: userRawEvents.length,
        gmailEvents: gmailEvents.length,
        testEvents: testEvents.length,
        providerCounts,
      },
      recentEvents: userRawEvents.map(event => ({
        id: event.id,
        provider: event.provider,
        sourceId: event.sourceId,
        occurredAt: event.occurredAt,
        createdAt: event.createdAt,
        hasPayload: Boolean(event.payload),
        payloadKeys: event.payload && typeof event.payload === 'object' 
          ? Object.keys(event.payload as Record<string, unknown>)
          : [],
        sourceMeta: event.sourceMeta,
      })),
      gmailEvents: gmailEvents.map(event => ({
        id: event.id,
        sourceId: event.sourceId,
        occurredAt: event.occurredAt,
        createdAt: event.createdAt,
        gmailId: event.payload && typeof event.payload === 'object' 
          ? (event.payload as { id?: string }).id
          : null,
        subject: event.payload && typeof event.payload === 'object' 
          ? (event.payload as { payload?: { headers?: Array<{ name?: string; value?: string }> } })
              .payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value
          : null,
      })),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ userId, error: errorMsg }, "raw_events_check_failed");
    
    return err(500, "Failed to check raw_events table");
  }
}