import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from "@/server/auth/user";
import { CalendarEmbeddingService } from '@/server/services/calendar-embedding.service';

// POST: Generate embeddings for calendar events
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let userId: string;
    try {
      userId = await getServerUserId();
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const result = await CalendarEmbeddingService.embedAllEvents(userId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully generated embeddings for ${result.processedEvents} calendar events`,
        processedEvents: result.processedEvents,
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Calendar embedding API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar embeddings' },
      { status: 500 }
    );
  }
}