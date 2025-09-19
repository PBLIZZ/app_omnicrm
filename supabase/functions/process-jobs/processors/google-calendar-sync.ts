import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { google } from 'https://esm.sh/googleapis@128'

interface Job {
  id: string
  userId: string
  kind: string
  payload: Record<string, any>
  batchId: string
  status: string
  attempts: number
}

interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  start?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  location?: string
  creator?: {
    email?: string
    displayName?: string
  }
  organizer?: {
    email?: string
    displayName?: string
  }
  status?: string
  htmlLink?: string
  created?: string
  updated?: string
}

export async function processGoogleCalendarSync(job: Job, supabase: any): Promise<void> {
  console.log(`Processing Google Calendar sync job ${job.id} for user ${job.userId}`)

  try {
    // Get user's Google Calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', job.userId)
      .eq('provider', 'google')
      .eq('service', 'calendar')
      .single()

    if (integrationError || !integration) {
      throw new Error(`No Google Calendar integration found for user ${job.userId}`)
    }

    // Set up Google OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get('GOOGLE_CLIENT_ID'),
      Deno.env.get('GOOGLE_CLIENT_SECRET'),
      Deno.env.get('GOOGLE_REDIRECT_URI')
    )

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: integration.expiry_date ? new Date(integration.expiry_date).getTime() : undefined
    })

    // Initialize Google Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Fetch events from the last 30 days to 90 days in the future
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 90)

    console.log(`Fetching calendar events from ${timeMin.toISOString()} to ${timeMax.toISOString()}`)

    let allEvents: CalendarEvent[] = []
    let pageToken: string | undefined = undefined
    let pageCount = 0
    const maxPages = 10 // Prevent infinite loops

    do {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
        pageToken: pageToken
      })

      const events = response.data.items || []
      allEvents = allEvents.concat(events as CalendarEvent[])
      pageToken = response.data.nextPageToken || undefined
      pageCount++

      console.log(`Fetched page ${pageCount}, got ${events.length} events, total: ${allEvents.length}`)
    } while (pageToken && pageCount < maxPages)

    console.log(`Total events fetched: ${allEvents.length}`)

    // Process events in batches to avoid overwhelming the database
    const batchSize = 50
    let processedCount = 0
    let newEventsCount = 0

    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize)
      
      for (const event of batch) {
        try {
          // Check if event already exists
          const { data: existingEvent } = await supabase
            .from('raw_events')
            .select('id')
            .eq('user_id', job.userId)
            .eq('provider', 'google_calendar')
            .eq('external_id', event.id)
            .single()

          if (!existingEvent) {
            // Insert new raw event
            const { error: insertError } = await supabase
              .from('raw_events')
              .insert({
                user_id: job.userId,
                provider: 'google_calendar',
                external_id: event.id,
                raw_data: event,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (insertError) {
              console.error(`Error inserting event ${event.id}:`, insertError)
            } else {
              newEventsCount++
            }
          }

          processedCount++
        } catch (eventError) {
          console.error(`Error processing event ${event.id}:`, eventError)
        }
      }

      // Update job progress
      await supabase
        .from('jobs')
        .update({
          status: 'processing',
          payload: {
            ...job.payload,
            processedEvents: processedCount,
            totalEvents: allEvents.length,
            newEvents: newEventsCount
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      console.log(`Processed ${processedCount}/${allEvents.length} events, ${newEventsCount} new`)
    }

    // Mark job as completed
    await supabase
      .from('jobs')
      .update({
        status: 'done',
        payload: {
          ...job.payload,
          processedEvents: processedCount,
          totalEvents: allEvents.length,
          newEvents: newEventsCount,
          completedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`Google Calendar sync completed: ${processedCount} events processed, ${newEventsCount} new events`)

  } catch (error) {
    console.error(`Error in Google Calendar sync job ${job.id}:`, error)

    // Mark job as failed
    await supabase
      .from('jobs')
      .update({
        status: 'error',
        last_error: error.message,
        attempts: job.attempts + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    throw error
  }
}
