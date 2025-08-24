-- Add service column to support multiple Google services per user
-- This enables separate OAuth tokens for gmail, calendar, drive while keeping login auth separate
-- Migration: 14_add_service_column_user_integrations.sql

BEGIN;

-- Step 1: Add the column with a default value
ALTER TABLE user_integrations ADD COLUMN service text DEFAULT 'auth';

-- Step 2: Update all existing Google integrations to 'auth'
UPDATE user_integrations 
SET service = 'auth' 
WHERE provider = 'google' AND (service IS NULL OR service = '');

-- Step 3: Update any remaining NULL values to 'auth'
UPDATE user_integrations 
SET service = 'auth' 
WHERE service IS NULL;

-- Step 4: Drop existing primary key constraint
ALTER TABLE user_integrations DROP CONSTRAINT user_integrations_pkey;

-- Step 5: Create new composite primary key with service
ALTER TABLE user_integrations ADD PRIMARY KEY (user_id, provider, service);

-- Step 6: Add check constraint for valid service values
ALTER TABLE user_integrations ADD CONSTRAINT user_integrations_service_check 
CHECK (service IN ('auth', 'gmail', 'calendar', 'drive'));

-- Step 7: Alter service column to NOT NULL after populating
ALTER TABLE user_integrations ALTER COLUMN service SET NOT NULL;

COMMIT;