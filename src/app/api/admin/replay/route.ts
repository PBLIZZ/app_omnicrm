import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { sql } from 'drizzle-orm';
import { QueueManager } from '@/server/jobs/queue-manager';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user using admin client
    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }
    
    const { data: { user }, error: authError } = await supabaseServerAdmin.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'gmail,google_calendar';
    const days = parseInt(searchParams.get('days') || '30', 10);
    const batchSize = parseInt(searchParams.get('batchSize') || '50', 10);
    const dryRun = searchParams.get('dryRun') === 'true';

    // Validate parameters
    if (days > 90 || days < 1) {
      return NextResponse.json({ 
        error: 'Days must be between 1 and 90' 
      }, { status: 400 });
    }

    if (batchSize > 200 || batchSize < 1) {
      return NextResponse.json({ 
        error: 'Batch size must be between 1 and 200' 
      }, { status: 400 });
    }

    const providers = provider.split(',').map(p => p.trim());
    const validProviders = ['gmail', 'google_calendar', 'twilio'];
    const invalidProviders = providers.filter(p => !validProviders.includes(p));
    
    if (invalidProviders.length > 0) {
      return NextResponse.json({ 
        error: `Invalid providers: ${invalidProviders.join(', ')}` 
      }, { status: 400 });
    }

    // Get unprocessed raw events
    const db = await getDb();
    
    const rawEvents = await db.execute(sql`
      SELECT id, provider, created_at
      FROM raw_events
      WHERE user_id = ${user.id}
        AND provider = ANY(${providers})
        AND created_at >= now() - interval '${days} days'
      ORDER BY created_at ASC
      LIMIT ${Math.min(batchSize * 10, 1000)}
    `);

    if (rawEvents.length === 0) {
      return NextResponse.json({
        message: 'No events found to replay',
        stats: {
          found: 0,
          queued: 0,
          batchId: null,
        }
      });
    }

    // If dry run, just return what would be processed
    if (dryRun) {
      const providerStats = providers.reduce((stats, p) => {
        stats[p] = rawEvents.filter(e => (e as any).provider === p).length;
        return stats;
      }, {} as Record<string, number>);

      return NextResponse.json({
        message: 'Dry run completed',
        stats: {
          found: rawEvents.length,
          queued: 0,
          providers: providerStats,
          batchId: null,
        }
      });
    }

    // Enqueue processing jobs in batches
    const queueManager = new QueueManager();
    const batchJobs: Array<{ payload: any; options?: any }> = [];

    for (const rawEvent of rawEvents.slice(0, batchSize)) {
      batchJobs.push({
        payload: { rawEventId: (rawEvent as any).id },
        options: { priority: 'medium' }
      });
    }

    const jobIds = await queueManager.enqueueBatchJob(
      user.id,
      'normalize',
      batchJobs
    );

    // Log the replay operation
    await db.execute(sql`
      INSERT INTO sync_audit (user_id, provider, action, payload)
      VALUES (
        ${user.id}, 
        'admin_replay', 
        'bulk_replay',
        ${JSON.stringify({
          providers,
          days,
          batchSize,
          eventsQueued: jobIds.length,
          batchId: jobIds.length > 0 ? jobIds[0]?.split('_')[0] || null : null
        })}
      )
    `);

    return NextResponse.json({
      message: `Successfully queued ${jobIds.length} events for replay`,
      stats: {
        found: rawEvents.length,
        queued: jobIds.length,
        batchId: jobIds.length > 0 ? jobIds[0]?.split('_')[0] || null : null,
        jobIds: jobIds.slice(0, 10), // Return first 10 job IDs
      }
    });

  } catch (error) {
    console.error('Replay API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using admin client
    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }
    
    const { data: { user }, error: authError } = await supabaseServerAdmin.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get replay status and statistics
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    const db = await getDb();

    // Get overall stats
    const overallStats = await db.execute(sql`
      SELECT 
        provider,
        count(*) as total_events,
        min(created_at) as oldest_event,
        max(created_at) as newest_event
      FROM raw_events
      WHERE user_id = ${user.id}
        AND created_at >= now() - interval '90 days'
      GROUP BY provider
      ORDER BY total_events DESC
    `);

    // Get recent replay operations
    const recentReplays = await db.execute(sql`
      SELECT created_at, action, payload
      FROM sync_audit
      WHERE user_id = ${user.id}
        AND provider = 'admin_replay'
        AND created_at >= now() - interval '7 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get batch status if batchId provided
    let batchStatus = null;
    if (batchId) {
      const queueManager = new QueueManager();
      batchStatus = await queueManager.getBatchStatus(batchId);
    }

    return NextResponse.json({
      providerStats: overallStats.map(row => ({
        provider: (row as any).provider,
        totalEvents: parseInt((row as any).total_events, 10),
        oldestEvent: (row as any).oldest_event,
        newestEvent: (row as any).newest_event,
      })),
      recentReplays: recentReplays.map(row => ({
        createdAt: (row as any).created_at,
        action: (row as any).action,
        payload: (row as any).payload,
      })),
      batchStatus,
    });

  } catch (error) {
    console.error('Replay status API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}