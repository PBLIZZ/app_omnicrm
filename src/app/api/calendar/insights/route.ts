import { NextRequest, NextResponse } from 'next/server';
import { getServerUserId } from "@/server/auth/user";
import { CalendarEmbeddingService } from '@/server/services/calendar-embedding.service';

// GET: Get calendar insights and patterns
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    let userId: string;
    try {
      userId = await getServerUserId();
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get('timeframe') as 'week' | 'month' | 'quarter') || 'month';
    
    const insights = await CalendarEmbeddingService.getCalendarInsights(userId, timeframe);
    
    return NextResponse.json({
      success: true,
      timeframe,
      insights,
    });
  } catch (error) {
    console.error('Calendar insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar insights' },
      { status: 500 }
    );
  }
}