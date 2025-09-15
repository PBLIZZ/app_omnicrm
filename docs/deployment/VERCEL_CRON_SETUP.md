# Supabase Cron Job Setup for Job Processing

## Overview

This document explains how to set up Supabase cron jobs to process queued jobs in your OmniCRM application using pg_cron extension.

## Current Setup

Your application has a job processing system that:

1. Enqueues jobs when syncing Gmail/Calendar data
2. Processes jobs via `/api/cron/process-jobs` endpoint
3. Uses a secure `CRON_SECRET` for authentication
4. Uses Supabase pg_cron to call the Vercel API endpoint

## Supabase Cron Configuration

The cron job is configured in `supabase/sql/20_cron_job_processor.sql`:

{{ ... }}

- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Endpoint**: `https://app-omnicrm-omnipotencyai.vercel.app/api/cron/process-jobs`
- **Method**: HTTP POST via `net.http_post`
- **Authentication**: Uses `app.cron_secret` database setting

## Setup Steps

### 1. Set CRON_SECRET in Supabase Database

First, generate a secure secret:

```bash
openssl rand -base64 32
```

Then set it in your Supabase database:

```sql
-- Set the cron secret as a database setting
ALTER DATABASE postgres SET app.cron_secret = 'your-generated-secret-here';
```

### 2. Set CRON_SECRET in Vercel Environment Variables

Add the same secret to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `CRON_SECRET` with the same generated value
3. Set it for Production, Preview, and Development environments

### 3. Deploy the Supabase Migration

Apply the cron job migration:

```bash
supabase db push
```

Or run the SQL directly in Supabase Dashboard → SQL Editor

## Testing

### Manual Test

You can manually trigger the cron job:

```bash
curl -X POST https://app-omnicrm-omnipotencyai.vercel.app/api/cron/process-jobs \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Monitor Logs

- Check Vercel Function logs for cron execution
- Monitor your application logs for job processing activity

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check `CRON_SECRET` is set correctly in Vercel
2. **Timeout**: Jobs taking longer than 5 minutes (increase `maxDuration` if needed)
3. **No jobs processed**: Check if jobs are being enqueued properly

### Debug Commands

```bash
# Check job queue status (run in your app)
SELECT status, COUNT(*) FROM jobs GROUP BY status;

# View recent job logs
SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10;
```

## Security Notes

- The cron endpoint is secured with `CRON_SECRET`
- Only Vercel's cron system should call this endpoint
- The endpoint has no user authentication (by design)
- All requests are logged for security monitoring

## Next Steps

After deployment:

1. Monitor the first few cron executions
2. Verify jobs are moving from 'queued' to 'completed'
3. Check that Gmail/Calendar sync data is being processed
4. Adjust cron frequency if needed (currently every 5 minutes)
