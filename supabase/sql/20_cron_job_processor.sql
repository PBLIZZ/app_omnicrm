-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to process pending jobs every 5 minutes
-- This will call our Vercel API endpoint to process queued jobs
SELECT cron.schedule(
  'process-pending-jobs',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://app-omnicrm-omnipotencyai.vercel.app/api/cron/process-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- View all scheduled cron jobs
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('process-pending-jobs');
