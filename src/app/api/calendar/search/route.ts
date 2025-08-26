import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from "@/server/auth/user";
import { CalendarEmbeddingService } from '@/server/services/calendar-embedding.service';

// POST: Search calendar events using vector similarity
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let userId: string;
    try {
      userId = await getServerUserId();
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, limit = 10 } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }
    
    const results = await CalendarEmbeddingService.searchSimilarEvents(userId, query, limit);
    
    return NextResponse.json({
      success: true,
      query,
      results: results.map(result => ({
        event: result.event,
        similarity: Math.round(result.similarity * 100) / 100, // Round to 2 decimal places
        preview: result.textContent.substring(0, 200) + '...',
      })),
    });
  } catch (error) {
    console.error('Calendar search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search calendar events' },
      { status: 500 }
    );
  }
}