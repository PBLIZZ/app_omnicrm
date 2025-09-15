# Vercel Cron Job Setup for Job Processing

## Overview

This document explains how to set up Vercel cron jobs to process queued jobs in your OmniCRM application.

## Current Setup

Your application has a job processing system that:

1. Enqueues jobs when syncing Gmail/Calendar data
2. Processes jobs via `/api/cron/process-jobs` endpoint
3. Uses a secure `CRON_SECRET` for authentication

## Vercel Configuration

The `vercel.json` file configures:

- **Cron Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Endpoint**: `/api/cron/process-jobs`
- **Timeout**: 5 minutes (300 seconds) for long-running jobs
- **Authentication**: Uses `CRON_SECRET` environment variable

## Environment Variables Required

### 1. Set CRON_SECRET in Vercel Dashboard

```bash
# Generate a secure secret (run this locally)
openssl rand -base64 32
```

Then add this to your Vercel project:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `CRON_SECRET` with the generated value
3. Set it for Production, Preview, and Development environments

### 2. Update Your Local .env Files

Add the same `CRON_SECRET` value to your local environment files:

- `.env.local`
- `.env`

## Deployment Steps

1. **Deploy the updated code** (with `vercel.json`)

   ```bash
   git add vercel.json
   git commit -m "Add Vercel cron job configuration"
   git push
   ```

2. **Set environment variables** in Vercel Dashboard
   - `CRON_SECRET`: Your generated secret
   - Ensure all other required env vars are set

3. **Verify cron job is active**
   - Go to Vercel Dashboard → Functions → Crons
   - You should see the `/api/cron/process-jobs` cron listed

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
